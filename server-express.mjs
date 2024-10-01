import express from "express";
import morgan from "morgan";
import createError from "http-errors";
import crypto from "crypto";

const host = "localhost";
const port = 8080;

const app = express();

// A REMPLACER PAR DU JSON
const urlDatabase = new Map();

if (app.get("env") === "development") app.use(morgan("dev"));

app.set("view engine", "ejs");

app.use(express.static("static"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function generateShortId() {
    return crypto.randomBytes(3).toString('hex');
}

app.get("/", async function (request, response, next) {
    return response.redirect("/accueil");
});

app.get("/accueil", async function (request, response, next) {
    const link = request.query.link;
    return response.render("accueil", { link });
});

app.post("/shortenLink", async function (request, response, next) {
    const originalLink = request.body.url;

    const shortLink = generateShortId();

    urlDatabase.set(shortLink, originalLink);

    const finalLink = `http://${host}:${port}/${shortLink}`;
    return response.redirect(`/accueil?link=${encodeURIComponent(finalLink)}`);
});

app.get("/:shortLink", async function (request, response, next) {
    const shortLink = request.params.shortLink;

    const originalLink = urlDatabase.get(shortLink);

    return response.redirect(originalLink);
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
    console.info(
        `HTTP listening on http://localhost:${server.address().port} with mode '${process.env.NODE_ENV}'`,
    ),
);

console.info(`File ${import.meta.url} executed.`);