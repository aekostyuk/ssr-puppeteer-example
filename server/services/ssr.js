import puppeteer from "puppeteer";

const blockedResourceTypes = [
	"image",
	"media",
	"font",
	"texttrack",
	"object",
	"beacon",
	"csp_report",
	"imageset",
];

const skippedResources = [
	"quantserve",
	"adzerk",
	"doubleclick",
	"adition",
	"exelator",
	"sharethrough",
	"cdn.api.twitter",
	"google-analytics",
	"googletagmanager",
	"google",
	"fontawesome",
	"facebook",
	"analytics",
	"optimizely",
	"clicktale",
	"mixpanel",
	"zedo",
	"clicksor",
	"tiqcdn",
];

const RENDER_CACHE = new Map();

async function ssr(url, browserWSEndpoint) {
	if (RENDER_CACHE.has(url)) {
		const cached = RENDER_CACHE.get(url);
		return { html: cached, ttRenderMs: 0, status: 200 };
	}
	const start = Date.now();
	const stylesheetContents = {};

	const browser = await puppeteer.connect({ browserWSEndpoint });

	const page = await browser.newPage();
	await page.setCacheEnabled(false);
	await page.setUserAgent(
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36            (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36"
	);

	await page.setRequestInterception(true);
	//Intercept the requests, if one of them is requesting a blocked ressource or something we don't need just abort it to gain time
	page.on("request", (request) => {
		const requestUrl = request.url().split("?")[0].split("#")[0];
		if (
			blockedResourceTypes.indexOf(request.resourceType()) !== -1 ||
			skippedResources.some((resource) => requestUrl.indexOf(resource) !== -1)
		) {
			request.abort();
		} else {
			request.continue();
		}
	});
	//Now let's intercept the responses as well and see if it's a style sheet
	page.on("response", async (resp) => {
		const responseUrl = resp.url();
		const sameOrigin = new URL(responseUrl).origin === new URL(url).origin;
		const isStylesheet = resp.request().resourceType() === "stylesheet";
		//Okay is our ressource valid and a style sheet?
		if (sameOrigin && isStylesheet) {
			//Add it to stylesheetContents to render it later as tags
			stylesheetContents[responseUrl] = await resp.text();
		}
	});
	//Now let's load our page, with a timeout of 250000ms and wait until our network is idle with 0 requests remaining
	const response = await page.goto(url, {
		timeout: 25000,
		waitUntil: "networkidle2",
	});
	// Inject <base> on page to relative resources load properly.
	await page.evaluate((url) => {
		const base = document.createElement("base");
		base.href = url;
		// Add to top of head, before all other resources.
		document.head.prepend(base);
	}, url);
	// Remove scripts and html imports. They've already executed.
	// await page.evaluate(() => {
	// 	const elements = document.querySelectorAll('script,  link[rel="import"]');
	// 	elements.forEach((e) => {
	// 		e.remove();
	// 	});
	// });
	// Replace stylesheets in the page with their equivalent <style>.
	await page.$$eval(
		'link[rel="stylesheet"]',
		(links, content) => {
			links.forEach((link) => {
				const cssText = content[link.href];
				if (cssText) {
					const style = document.createElement("style");
					style.textContent = cssText;
					link.replaceWith(style);
				}
			});
		},
		stylesheetContents
	);

	//const response = await page.goto(url, { waitUntil: "networkidle0" });
	const html = await page.content(); // serialized HTML of page DOM.
	const ttRenderMs = Date.now() - start;
	await page.close();
	RENDER_CACHE.set(url, html);
	return {
		html,
		ttRenderMs,
		status: response.status(),
	};
}

function clearCache() {
	RENDER_CACHE.clear();
}
export { ssr, clearCache };
