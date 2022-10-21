import * as dotenv from "dotenv";
import express from "express";
import path from "path";
import { prerender } from "./middlewares/prerender.js";

const __dirname = path.dirname("");

dotenv.config();
const app = express();
const PORT = 3000;

app.use(express.json({ extended: true }));
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	next();
});
app.use(prerender);
app.use(express.static(path.join(__dirname, "client", "build")));
app.get("*", (req, res, next) => {
	res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
});

const start = () => {
	try {
		app.listen(PORT, () =>
			console.log(`Express! http://localhost:${PORT}`)
		);
	} catch (error) {
		console.log(error);
		process.exit(1);
	}
};

start();
