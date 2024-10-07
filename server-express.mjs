import express from "express";
import morgan from "morgan";
import createError from "http-errors";
import crypto from "crypto";
import fs from "fs/promises";

const port = process.env.PORT || 10000;
const host = "0.0.0.0";

const app = express();

if (app.get("env") === "development") app.use(morgan("dev"));

app.set("view engine", "ejs");

app.use(express.static("static"));
// On utilise express.urlencoded pour traiter les requêtes POST
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.disable("x-powered-by");

// Middleware pour ajouter le header X-API-Version
app.use((req, res, next) => {
    res.setHeader('X-API-Version', '1.0.0');
    next();
});

// Fonction qui va générer les identifiants courts
function generateShortId() {
    return crypto.randomBytes(3).toString('hex');
}

// Fonction pour récupérer les infos dans links.json
async function readLinksJSON() {
    try {
        const data = await fs.readFile("./static/links.json", "utf-8"); 
        return JSON.parse(data);
    } catch (error) {
        console.error(error);
        return {};
    }
}

// Fonction pour écrire dans links.json
async function writeLinksJSON(linksJSON) {
    try {
        const data = JSON.stringify(linksJSON, null, 4);
        await fs.writeFile("./static/links.json", data);
    } catch (error) {
        console.error(error);
    }
}

app.get("/", async function (request, response, next) {
    // On renvoie vers l'accueil si aucun chemin spécifique n'est donné
    return response.redirect("/accueil");
});

app.get("/accueil", async function (request, response, next) {
    /* On gère l'affichage de la page d'accueil :
        - S'il n'y a pas de lien dans l'URL on affiche la page d'accueil normalement 
        - Sinon on affichera le lien dans une box en plus en-dessous
    */
    const link = request.query.link;
    const tailleLinks = Object.keys(await readLinksJSON()).length;
    return response.render("accueil", { tailleLinks, link });
});

app.get("/links", async function (request, response, next) {
    // On affiche la page avec tous les liens créés
    const tailleLinks = Object.keys(await readLinksJSON()).length;
    const links = await readLinksJSON();
    return response.render("links", { tailleLinks, links });
});

app.post("/shortenLink", async function (request, response, next) {
    //Cette partie s'active lorsque l'utilisateur demande à réduire une url avant de renvoyer sur la page d'accueil
    const originalLink = request.body.url;

    let linksJSON = await readLinksJSON();
    let finalLink;
    let lienExistant = false;
    // Si le lien à transformer est déjà associé à un lien réduit on va donner le lien réduit directement au lieu de créer plusieurs liens réduits pour une même url
    for (let key in linksJSON) {
        if (linksJSON[key][0] === originalLink) {
            lienExistant = true;
            finalLink = key;
            break;
        }
    }

    // Si le lien n'est pas déjà associé à un lien réduit on va l'ajouter dans links.json
    if (!lienExistant) {
        const shortLink = generateShortId();
        finalLink = `${request.protocol}://${request.get('host')}/${shortLink}`;
        while (linksJSON[finalLink]) {
            shortLink = generateShortId();
            finalLink = `${request.protocol}://${request.get('host')}/${shortLink}`;
        }
        // On enregistre le lien raccourci avec comme valeurs le lien associé, la date et l'heure actuelle
        linksJSON[finalLink] = [`${originalLink}`, `${new Date().toLocaleString().split(' ')[0]}`, `${new Date().toLocaleString().split(' ')[1]}`];
        await writeLinksJSON(linksJSON);
    }

    // On redirect vers la page d'accueil en mettant en paramètre le lien créé
    return response.redirect(`/accueil?link=${encodeURIComponent(finalLink)}`);
});

app.get("/:shortLink", async function (request, response, next) {
    //Cette partie sert à rediriger une requête vers un lien réduit vers le lien original
    const shortLink = request.params.shortLink;

    let linksJSON = await readLinksJSON();
    // Si le lien réduit existe on redirige vers la page associée
    const fullShortLink = `${request.protocol}://${request.get('host')}/${shortLink}`;
    if (linksJSON[fullShortLink]) {
        return response.redirect(linksJSON[fullShortLink]);
    } else {
        // Si le lien n'existe pas, on génère une erreur 404
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