import express from "express";
import morgan from "morgan";
import createError from "http-errors";

const host = "localhost";
const port = 8080;

const app = express();

if (app.get("env") === "development") app.use(morgan("dev"));

app.set("view engine", "ejs");

app.use(express.static("static"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", async function (request, response, next) {
    return response.redirect("/accueil");
});

app.get("/accueil", async function (request, response, next) {
    const link = request.query.link || null;
    return response.render("accueil", { link });
});

app.post("/shortenLink", async function (request, response, next) {
    const link = request.body.url;
    return response.redirect(`/accueil?link=${encodeURIComponent(link)}`);
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