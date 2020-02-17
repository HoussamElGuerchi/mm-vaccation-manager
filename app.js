
const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const $ = require("jquery");

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const leaveList = [];

/***** Variables & functions Declaration *****/

/*********************************/

// Authentication Page
app.get("/authent", (req, res) => {
    res.render("authent", {pageTitle: "Authentification"});
});

app.post("/authent", (req,res) => {
    console.log(req.body.userName+": "+req.body.userPass);
    res.redirect("/accueil");
})

// Home page
app.get("/accueil", (req, res) => {
    res.render("index", {pageTitle: "Accueil"});
});

app.get("/", (req, res) => {
    res.redirect("/authent");
});

//Leave form
app.get("/nouveau-conge", (req, res) => {
    res.render("leave-form", {pageTitle: "Nouveau Congé", error: false, success: false});
})

app.post("/nouveau-conge", (req, res) => {
    if (req.body.startDate > req.body.endDate) {
        res.render("leave-form", {pageTitle: "Nouveau Congé", error: true, success: false});
    } else {
        const newLeave = {
            employeeId: req.body.employeeId,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            type: req.body.leaveType
        }
        leaveList.push(newLeave);
        res.render("leave-form", {pageTitle: "Nouveau Congé", error: false, success: true});
    }
})


//Leave History
app.get("/historique", (req,res) => {
    res.render("leave-history", ({pageTitle: "Historique des Congés", leaveList}));
})

//Error Page
app.get("/erreur", (req,res) => {
    res.render("error-page", ({pageTitle: "Erreur d'ajout"}));
})

app.listen(3000, () => {
    console.log("Server started on port 3000");
})