import express from "express";
import morgan from "morgan";
import createError from "http-errors";
import crypto from "crypto";
import fs from "fs/promises";

const port = process.env.PORT || 8080;
const host = "0.0.0.0";

const app = express();

if (app.get("env") === "development") app.use(morgan("dev"));

app.set("view engine", "ejs");

app.use(express.static("static"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function generateShortId() {
    return crypto.randomBytes(3).toString('hex');
}

async function readLinksJSON() {
    try {
        const data = await fs.readFile("./static/links.json", "utf-8"); 
        return JSON.parse(data);
    } catch (error) {
        console.error(error);
        return {};
    }
}

async function writeLinksJSON(linksJSON) {
    try {
        const data = JSON.stringify(linksJSON, null, 4);
        await fs.writeFile("./static/links.json", data);
    } catch (error) {
        console.error(error);
    }
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

    let linksJSON = await readLinksJSON();
    let finalLink;
    let lienExistant = false;
    for (let key in linksJSON) {
        if (linksJSON[key] === originalLink) {
            lienExistant = true;
            finalLink = key;
            break;
        }
    }

    if (!lienExistant) {
        const shortLink = generateShortId();
        finalLink = `${request.protocol}://${request.get('host')}/${shortLink}`;
        while (linksJSON[finalLink] === undefined) {
            shortLink = generateShortId();
            finalLink = `${request.protocol}://${request.get('host')}/${shortLink}`;
        }
        linksJSON[finalLink] = originalLink;
        await writeLinksJSON(linksJSON);
    }

    return response.redirect(`/accueil?link=${encodeURIComponent(finalLink)}`);
});

app.get("/:shortLink", async function (request, response, next) {
    const shortLink = request.params.shortLink;

    let linksJSON = await readLinksJSON();
    try {
        const originalLink = linksJSON[`${request.protocol}://${request.get('host')}/${shortLink}`];
        return response.redirect(originalLink);
    } catch (error) {
        console.error(error);
        return next(createError(404));
    }
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
        `HTTP listening on http://${host}:${port} with mode '${process.env.NODE_ENV}'`,
    ),
);

console.info(`File ${import.meta.url} executed.`);