
const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// Authentication Page
app.get("/authent", (req, res) => {
    res.render("authent", {pageTitle: "Authentification"});
});

// Home page
app.get("/acceuil", (req, res) => {
    res.render("index", {pageTitle: "Acceuil"});
});

app.get("/", (req, res) => {
    res.render("index", {pageTitle: "Acceuil"});
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
})