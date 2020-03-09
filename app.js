
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
    departsAutorisees: {type: String, required: true},
    droitN_1: {type: String, required: true},
    droitN: {type: String, required: true}
})

const Employee = new mongoose.model("Personnel", employeeSchema);

const leaveSchema = new mongoose.Schema({
    empId: {type: String, required: true},
    matricule: {type: String, required: true},
    startDate: {type: String, required: true},
    endDate: {type: String, required: true},
    numberOfDays: {type: Number},
    type: {type: String, required: true},
})

const Leave = new mongoose.model("Leave", leaveSchema);

const holidaySchema = new mongoose.Schema({
    title: {type: String, required: true},
    date: {type: String, required: true},
    duration: {type: Number, required: true}
})

const Holiday = new mongoose.model("Holiday", holidaySchema);

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
app.get("/nouveau-conge-admin", (req, res) => {
    res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: null});
})

app.post("/nouveau-conge", (req, res) => {
    if (req.body.startDate > req.body.endDate) {
        const alert = {
            type: "danger",
            message: "Période du congé invalide, veuillez vérifier la date de début et de la fin du congé."
        }
        res.render("leave-form", {pageTitle: "Nouveau Congé", alert: alert});
    } else {
        const empMatricule = req.body.employeeId.toUpperCase();

        Employee.findOne({matricule: empMatricule}, (err,result) => {
            if (err) {
                const errAlert = {
                    type: "danger",
                    message: err
                }
                res.render("leave-form", {pageTitle: "Nouveau Congé", alert: errAlert});
            } else {
                if (!result) {
                    const noResult = {
                        type: "danger",
                        message: "Le matricule ne correspond à aucun personnel."
                    }
                    res.render("leave-form", {pageTitle: "Nouveau Congé", alert: noResult});
                } else {
                    const newLeave = Leave({
                        matricule: empMatricule,
                        startDate: req.body.startDate,
                        endDate: req.body.endDate,
                        type: req.body.leaveType,
                        numberOfDays: date.calculDays(req.body.startDate, req.body.endDate)
                    });
                    
                    newLeave.save();

                    const successAlert = {
                        type: "success",
                        message: "Congé ajouter avec succès."
                    }
                    res.render("leave-form", {pageTitle: "Nouveau Congé", alert: successAlert});
                }
            }
        })
    }
})

app.get("/nouveau-conge-excep", (req, res) => {
    res.render("leave-form-excep", {pageTitle: "Nouveau Congé", alert: null});
})

app.post("/nouveau-conge-excep", (req, res) => {
    res.render("leave-form-excep", {pageTitle: "Nouveau Congé", alert: null});
})

//Leave History
app.get("/historique", (req,res) => {
    Leave.find((err, leaveList) => {
        if (err) {
            console.log(err);
        } else {
            res.render("leave-history", ({pageTitle: "Historique des Congés", leaveList}));
        }
    })
})

app.post("/historique", (req,res) => {
    
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
                res.render("employee-profile", {pageTitle: "Personnel", employee: foundEmployee, alert: null});
            }
        }
    })
    
})

app.post("/personnel/:empId", (req,res) => {
    const empId = req.params.empId;

    Employee.findByIdAndRemove(empId, (err) => {
        if (err) {
            const alert = {
                type: "danger",
                message: err
            };
            res.render("employee-profile", {pageTitle: "Personnel", employee: foundEmployee, alert: alert});
        } else {
            res.redirect("/list-personnel");
        }
    })
    
})

//Employee edit
app.get("/modifier-personnel/:empId", (req,res) => {
    const employeeId = req.params.empId;
    
    Employee.findById(employeeId, (err, foundEmployee) => {
        if (err) {
            const errAlert = {
                type: "danger",
                message: err
            }
            res.render("modify-employee", {pageTitle: "Modification", employee: foundEmployee, alert: errAlert});
        } else {
            res.render("modify-employee", {pageTitle: "Modification", employee: foundEmployee, alert: null});
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
        entite: req.body.entity,
        departsAutorisees: req.body.authorizedDeaprture,
        droitN_1: req.body.rightsN_1,
        droitN: req.body.rightsN
    }, (err) => {
        if (err) {
            const errAlert = {
                type: "danger",
                message: err
            }
            res.render("modify-employee", {pageTitle: "Modification", employee: foundEmployee, alert: errAlert});
        } else {
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

// Reliquats

app.get("/reliquats", (req,res) => {

    const reliquats = [];

    Employee.find((err,result) => {
        if (!err) {
            result.forEach(emp => {
                const reliquat = {
                    rid: emp._id,
                    matricule: emp.matricule,
                    departs: emp.departsAutorisees,
                    droitN_1: emp.droitN_1,
                    droitN: emp.droitN
                }

                reliquats.push(reliquat);
            })
        }
        res.render("reliquats", {pageTitle: "Reliquats", reliquats: reliquats});
    })
})

// Test
app.get("/duration", (req,res) => {
    res.render("duration", {pageTitle: "Test duration", duration: null});
})

app.post("/duration", (req,res) => {
    // Create begining and end dates
    const start = new Date(req.body.startDate);
    const end = new Date(req.body.endDate);

    // Calculate duration betwen the begining and the end 
    let days = date.calculDays(start, end);

    // Retrieve holidays from database
    const holidays = [];

    // Holiday.find((err, result) => {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         result.forEach(holiday => {
    //             let hldy = {

    //             }
    //         })
    //     }
    // })

    // Ignore sundays and holidays from leave period
    for (let i=0; i<=days; i++) {
        const dayIndex = start.getDay();

        if (dayIndex === 0) {
            days--;
        }

        // console.log(dayIndex);
        start.setDate(start.getDate()+1);
    }
    
    res.render("duration", {pageTitle: "Test duration", duration: days});
})

//Error Page
app.get("/erreur", (req,res) => {
    res.render("error-page", ({pageTitle: "Erreur d'ajout"}));
})

app.listen(3000, () => {
    console.log("Server started on port 3000");
})