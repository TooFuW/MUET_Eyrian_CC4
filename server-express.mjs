import express from "express";
import morgan from "morgan";
import createError from "http-errors";
import logger from "loglevel";

const host = "localhost";
const port = 8000;
logger.setLevel(logger.levels.DEBUG);

const app = express();

if (app.get("env") === "development") app.use(morgan("dev"));

app.set("view engine", "ejs");

app.use(express.static("static"));

app.get("/", async function (request, response, next) {
    return response.redirect("/accueil");
});

app.get("/accueil", async function (request, response, next) {
    return response.render("accueil", { link: null });
});

app.use((request, response, next) => {
    console.debug(`default route handler : ${request.url}`);
    return next(createError(404));
});

app.use((error, _request, response, _next) => {
    console.debug(`default error handler: ${error}`);
    const status = error.status ?? 500;
    const stack = app.get("env") === "development" ? error.stack : "";
    const result = { code: status, message: error.message, stack };
    return response.render("error", result);
});

const server = app.listen(port, host);

server.on("listening", () =>
    logger.info(
        `HTTP listening on http://localhost:${server.address().port} with mode '${process.env.NODE_ENV}'`,
    ),
);

logger.info(`File ${import.meta.url} executed.`);