
const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const date = require(__dirname + "/date.js");
// const employeeModel = require(__dirname + "/models/employee.js");
const mongoose = require("mongoose");

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const leaveList = [];

/***** Database Manipulation *****/

mongoose.connect('mongodb://localhost:27017/leaveDB', {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

const employeeSchema = new mongoose.Schema({
    matricule: {type: String, required: true},
    nom: {type: String, required: true},
    prenom: {type: String, required: true},
    dateDeNaissance: {type: String, required: true},
    fonction: {type: String, required: true},
    entite: {type: String, required: true},
})

const Employee = new mongoose.model("Personnel", employeeSchema);

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
    res.render("leave-form", {pageTitle: "Nouveau Congé", alert: null});
})

app.post("/nouveau-conge", (req, res) => {
    if (req.body.startDate > req.body.endDate) {
        const alert = {
            type: "danger",
            message: "Période du congé invalide, veuillez vérifier la date de début et de la fin du congé."
        }
        res.render("leave-form", {pageTitle: "Nouveau Congé", alert: alert});
    } else {
        const newLeave = {
            employeeId: req.body.employeeId,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            type: req.body.leaveType,
            numberOfDays: date.calculDays(req.body.startDate, req.body.endDate)
        }
        
        leaveList.push(newLeave);

        const alert = {
            type: "success",
            message: "Congé ajouter avec succès."
        }
        res.render("leave-form", {pageTitle: "Nouveau Congé", alert: alert});
    }
})

//Employee List
app.get("/list-personnel", (req, res) => {
    Employee.find((err,employeeList) => {
        if (!err) {
            res.render("employee-list", {pageTitle: "Liste des Personnels", employees: employeeList});
        }
    })
})

app.post("/list-personnel", (req,res) => {
    const searchedMatricule = req.body.searchedMatricule;
    Employee.find({matricule: searchedMatricule.toUpperCase()}, (err,result) => {
        if (err) {
            res.render("employee-list", {pageTitle: "Liste des Personnels", employees: result});
        }
        res.render("employee-list", {pageTitle: "Liste des Personnels", employees: result});
    })
})

//Employee profile
app.get("/personnel/:empId", (req,res) => {
    const empId = req.params.empId;

    Employee.findById(empId, (err, foundEmployee) => {
        if(!err) {
            if (foundEmployee) {
                res.render("employee-profile", {pageTitle: "Personnel", employee: foundEmployee});
            }
        }
    })
    
})

app.post("/personnel/:empId", (req,res) => {
    const empId = req.params.empId;

    Employee.findByIdAndRemove(empId, (err) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/list-personnel");
        }
    })
    
})

//Employee edit
app.get("/modifier-personnel/:empId", (req,res) => {
    const employeeId = req.params.empId;
    
    Employee.findById(employeeId, (err, foundEmployee) => {
        if (!err) {
            res.render("modify-employee", {pageTitle: "Modification", employee: foundEmployee})
        }
    })
})

app.post("/modifier-personnel/:empId", (req,res) => {
    const employeeId = req.params.empId;
    
    Employee.findByIdAndUpdate(employeeId, {
        matricule: req.body.matricul,
        nom: req.body.lastName,
        prenom: req.body.firstName,
        dateDeNaissance: req.body.birthDate,
        fonction: req.body.function,
        entite: req.body.entity
    }, (err) => {
        if (!err) {
            res.redirect("/personnel/"+employeeId);
        }
    })
})

//New Employee
app.get("/nouveau-personnel", (req,res) => {
    res.render("new-employee", {pageTitle: "Nouveau Personnel", alert: null});
})

app.post("/nouveau-personnel", (req,res) => {
    const empMatricule = req.body.matricul.toUpperCase();

    Employee.findOne({matricule: empMatricule}, (err,foundEmployee) =>{
        if (err) {
            const alert = {
                type: "danger",
                message: err
            }
            res.render("new-employee", {pageTitle: "Nouveau Personnel", alert: alert});
        } else {
            if (foundEmployee) {
                const alert = {
                    type: "danger",
                    message: "Un personnel existant est trouvé avec le même matricule"
                }

                res.render("new-employee", {pageTitle: "Nouveau Personnel", alert: alert});
            } else {
                const newEmployee = new Employee({
                    matricule: req.body.matricul.toUpperCase(),
                    nom: _.upperCase(req.body.lastName),
                    prenom: _.upperCase(req.body.firstName),
                    dateDeNaissance: req.body.birthDate,
                    fonction: _.capitalize(req.body.function),
                    entite: _.capitalize(req.body.entity)
                })

                newEmployee.save();

                const alert = {
                    type: "success",
                    message: "Le nouveau personnel est ajouté avec succès"
                }
                res.render("new-employee", {pageTitle: "Nouveau Personnel", alert: alert});
            }
        }
    })
    
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