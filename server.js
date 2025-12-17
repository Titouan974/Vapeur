// server.js
// Point d'entrée de l'application Express
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const hbs = require("hbs");
const { ensureGenres, prisma } = require("./prisma/seed");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration des vues et du moteur Handlebars
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
hbs.registerPartials(path.join(__dirname, "views", "partials"));

// Middleware pour servir les fichiers statiques (public/)
app.use(express.static(path.join(__dirname, "public")));

// Parser pour les formulaires (application/x-www-form-urlencoded)
app.use(bodyParser.urlencoded({ extended: true }));

// Helpers HBS
hbs.registerHelper("formatDate", (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString();
});

hbs.registerHelper("ifCond", function (v1, v2, options) {
  return (v1 === v2) ? options.fn(this) : options.inverse(this);
});


// Routes
const gamesRouter = require("./routes/games");
const genresRouter = require("./routes/genres");
const publishersRouter = require("./routes/publishers");

app.use("/", gamesRouter);
app.use("/genres", genresRouter);
app.use("/publishers", publishersRouter);

// Middleware pour gérer différentes erreurs HTTP
// À placer avant le middleware 404 existant

// 301 - Redirection permanente (généralement utilisé pour des redirections spécifiques)
app.get("/old-route", (req, res) => {
  res.status(301).redirect("/new-route");
});

// 400 - Bad Request
app.use((req, res, next) => {
  if (req.query.error === "bad-request") {
    return res.status(400).render("error", {
      title: "Requête invalide",
      status: 400,
      message: "La requête envoyée est mal formée ou invalide."
    });
  }
  next();
});

// 401 - Non autorisé (authentification requise)
app.get("/protected-route", (req, res) => {
  const isAuthenticated = false; // Logique d'authentification ici
  
  if (!isAuthenticated) {
    return res.status(401).render("error", {
      title: "Non autorisé",
      status: 401,
      message: "Vous devez être authentifié pour accéder à cette ressource."
    });
  }
  res.send("Contenu protégé");
});

// 403 - Interdit (accès refusé)
app.get("/forbidden-route", (req, res) => {
  const hasPermission = false; // Logique de permissions ici
  
  if (!hasPermission) {
    return res.status(403).render("error", {
      title: "Accès interdit",
      status: 403,
      message: "Vous n'avez pas les permissions nécessaires pour accéder à cette ressource."
    });
  }
  res.send("Contenu autorisé");
});

// 404 (déjà existant dans votre code)
app.use((req, res) => {
  res.status(404).render("error", {
    title: "Page introuvable",
    status: 404,
    message: `La ressource ${req.originalUrl} est introuvable.`
  });
});

// Erreurs serveur (déjà existant)
app.use((err, req, res, next) => {
  console.error("Erreur serveur :", err);
  res.status(err.status || 500).render("error", {
    title: "Erreur serveur",
    status: err.status || 500,
    message: err.message || "Une erreur est survenue."
  });
});


// Avant d'écouter, s'assurer que les genres existent
async function start() {
  try {
    await ensureGenres(); // crée les genres si nécessaire
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Erreur au démarrage :", err);
    process.exit(1);
  }
}

start();

// Gestion propre de la fermeture
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
