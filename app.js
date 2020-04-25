
const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
// const date = require(__dirname + "/date.js");
const pdf = require('html-pdf');
const puppeteer = require('puppeteer');
const path = require("path");
const fs = require('fs');
const ejs = require("ejs");
const mongoose = require("mongoose");
// const leave = require(__dirname + "/models/leave.js");
const employee = require(__dirname + "/models/employee.js");
const leave = require(__dirname + "/models/leave.js");

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

/***** Database Manipulation *****/

mongoose.connect('mongodb://localhost:27017/leaveDB', {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

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

/********************************** Leave Section **********************************/
//Leave form
app.get("/nouveau-conge-admin", (req, res) => {
    res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: null});
})

app.post("/nouveau-conge-admin", (req, res) => {
    leave.newLeaveAdmin(req,res);
})

app.get("/nouveau-conge-excep", (req, res) => {
    res.render("leave-form-excep", {pageTitle: "Nouveau Congé", alert: null});
})

app.post("/nouveau-conge-excep", (req, res) => {
    leave.newLeaveExcep(req, res);
})

//Leave History
app.get("/historique", (req,res) => {
    leave.getLeaves(res);
})

app.post("/historique", (req,res) => {
    const searchedMatricule = req.body.searchedMatricule;
    leave.getEmployeeLeaves(searchedMatricule, res);
})

/********************************** Employee Section **********************************/
//Employee List
app.get("/list-personnel", (req, res) => {
    const employeeList =  employee.getEmployees();
    employeeList.then((list) => {
        res.render("employee-list", {pageTitle: "Liste des Personnels", employees: list});
    })
})

app.post("/list-personnel", (req,res) => {
    const searchedMatricule = req.body.searchedMatricule.toUpperCase();
    
    const searchResult = employee.getEmployeeByMatricule(searchedMatricule);
    searchResult.then((foundEmployee) => {
        res.render("employee-list", {pageTitle: "Liste des Personnels", employees: [foundEmployee]});
    })
})

//Employee profile
app.get("/personnel/:empId", (req,res) => {
    const empId = req.params.empId;

    const result = employee.getEmployeeById(empId);
    result.then((desiredEmployee) => {
        const leaveList = leave.getLeavesById(empId);
        leaveList.then((foundLeaves) => {
            res.render("employee-profile", {pageTitle: "Personnel", employee: desiredEmployee, employeeLeaves: foundLeaves, alert: null});
        })
    })
})

app.post("/personnel/:empId", (req,res) => {
    const empId = req.params.empId;
    employee.deleteEmployee(empId, res);
})

//Employee edit
app.get("/modifier-personnel/:empId", (req,res) => {
    const employeeId = req.params.empId;
    
    const result = employee.getEmployeeById(employeeId);
    result.then((foundEmployee) => {
        res.render("modify-employee", {pageTitle: "Modification", employee: foundEmployee, alert: null});
    })
})

app.post("/modifier-personnel/:empId", (req,res) => {
    const employeeId = req.params.empId;
    employee.updateEmployee(employeeId, req, res);
})

//New Employee
app.get("/nouveau-personnel", (req,res) => {
    res.render("new-employee", {pageTitle: "Nouveau Personnel", alert: null});
})

app.post("/nouveau-personnel", (req,res) => {
    const empMatricule = req.body.matricul.toUpperCase();
    employee.newEmployee(empMatricule, req, res);
})

// Reliquats

app.get("/reliquats", (req,res) => {
    employee.getReliquats(res);
})

/********************************** Holidays Section **********************************/
app.get("/nouveau-jours-ferie", (req,res) => {
    res.render("new-holiday", {pageTitle: "Nouveau Jours Férié", alert: null});
})

app.post("/nouveau-jours-ferie", (req,res) => {
    leave.newHoliday(req, res);
})

app.get("/liste-jours-feries", (req,res) => {
    leave.getHolidays(res);
})

app.get("/liste-jours-feries/:holidayId", (req,res) => {
    const holidayId = req.params.holidayId;
    leave.deleteHoliday(holidayId, res);
})

/********************************** Server listener **********************************/

app.listen(3000, () => {
    console.log("Server started on port 3000");
})