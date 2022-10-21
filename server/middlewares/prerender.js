import puppeteer from "puppeteer";
import { ssr } from "../services/ssr.js";

let browserWSEndpoint = null;

const prerender = async (req, res, next) => {
	const userAgent = req.headers["user-agent"];
	//Create the Regex expression to test if our user-agent is a bot
	const prerender =
		/bot|googlebot|Chrome-Lighthouse|DuckDuckBot|EspritBot|ia_archiver|bingbot|yandex|baiduspider|Facebot|facebookexternalhit|facebookexternalhit\/1.1|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkShare|W3C_Validator/i.test(
			userAgent
		);
	//Test if the request url exists, if it's a bot and the route exclusions we don't want to prerender (or can't because they're files or REST responses)
	if (
		prerender &&
		!req.originalUrl.includes("/api/") &&
		!req.originalUrl.includes("/uploads/") &&
		!req.originalUrl.includes("/admin/") &&
		!req.originalUrl.includes("/static/")
	) {
		if (!browserWSEndpoint) {
			const browser = await puppeteer.launch();
			browserWSEndpoint = await browser.wsEndpoint();
		}
		//If you're a bot we're sending you a fully rendered page with our ssr function
		const url = req.protocol + "://" + req.get("host") + req.originalUrl;
		const { html, ttRenderMs, status } = await ssr(
			url,
			browserWSEndpoint
		);
		res.set(
			"Server-Timing",
			`Prerender;dur=${ttRenderMs};desc="Headless render time (ms)"`
		  );
		return res.status(status).send(html);
	} else {
		//If not continue your way!
		next();
	}
};

export { prerender };
