
const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const ejs = require("ejs");
const mongoose = require("mongoose");
const employee = require(__dirname + "/models/employee.js");
const leave = require(__dirname + "/models/leave.js");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
let port = process.env.PORT;

/***** Application Config *****/

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
    secret : "m@rs@_m@r0c_@g@d1r",
    resave : false,
    saveUninitialized : false
}));
app.use(passport.initialize());
app.use(passport.session());

/***** Database Config *****/
// mongoose.connect('mongodb://localhost:27017/leaveDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.connect('mongodb+srv://admin-houssam:marsamarocagadir@cluster0-kgxxn.mongodb.net/leaveDB', {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
mongoose.set('useCreateIndex', true);

const adminSchema = new mongoose.Schema({
    username : String,
    nom : String,
    prenom : String,
    fonction : String,
    entite : String,
    password : String
})

adminSchema.plugin(passportLocalMongoose);

const Admin = new mongoose.model("Admin", adminSchema);

passport.use(Admin.createStrategy());
 
passport.serializeUser(Admin.serializeUser());
passport.deserializeUser(Admin.deserializeUser());

/********************************** Buisiness **********************************/

// Authentication Page
app.get("/authent", (req, res) => {
    res.render("authent", {pageTitle: "Authentification"});
});

app.post("/authent", (req,res) => {
    const user = new Admin({
        username : req.body.username,
        password : req.body.password
    });

    req.login(user, (err) => {
        if (err) {
            res.redirect("/authent");
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/accueil");
            })
        }
    })
})

app.get("/register", (req,res) => {
    res.render("register", {pageTitle: "Register"});
})

app.post("/register", (req,res) => {
    Admin.register({
        username : req.body.username,
        nom : req.body.nom,
        prenom : req.body.prenom,
        fonction : req.body.fonction,
        entite : req.body.entite
    }, req.body.password, (err, user) => {
        if (err) {
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/accueil");
            });
        }
    })
})

// Home page
app.get("/accueil", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("index", {pageTitle: "Accueil"});
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
});

app.get("/", (req, res) => {
    res.redirect("/accueil");
});

app.get("/logout", (req,res) => {
    req.logout();
    res.redirect("/");
})

/********************************** Leave Section **********************************/
//Leave form
app.get("/nouveau-conge-admin", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: null});
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.post("/nouveau-conge-admin", (req, res) => {
    leave.newLeaveAdmin(req,res);
})

app.get("/nouveau-conge-excep", (req, res) => {
    if (req.isAuthenticated()) {
        const excepLeaves = leave.getExcepLeaves();
        excepLeaves.then((result) => {
            res.render("leave-form-excep", {pageTitle: "Nouveau Congé", excepLeaves: result, alert: null});
        })
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.post("/nouveau-conge-excep", (req, res) => {
    leave.newLeaveExcep(req, res);
})

//Leave History
app.get("/historique", (req,res) => {
    if (req.isAuthenticated()) {
        leave.getLeaves(res);
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.post("/historique", (req,res) => {
    const searchedMatricule = req.body.searchedMatricule;
    leave.getEmployeeLeaves(searchedMatricule, res);
})

app.get("/annuler-conge/:leaveId", (req,res) => {
    leave.cancelLeave(req.params.leaveId, req, res);
})

app.get("/reprise-travail/:leaveId", (req,res) => {
    if (req.isAuthenticated()) {
        const leaveToStop = leave.getLeaveById(req.params.leaveId);
        leaveToStop.then((foundLeave) => {
            res.render("resume-work", {pageTitle: "Reprise de travail", leave: foundLeave, alert: null});
        })
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.post("/reprise-travail/:leaveId", (req,res) => {
    leave.stopLeave(req.params.leaveId, req, res);
})

app.get("/historique-personnel/:employeeId", (req,res) => {
    const concernedEmployee = employee.getEmployeeById(req.params.employeeId);
    concernedEmployee.then((foundEmployee) => {
        const leaves = leave.getLeavesById(req.params.employeeId);
        leaves.then((foundLeaves) => {
            res.render("employee-leave-history", {employee: foundEmployee ,employeeLeaves: foundLeaves});
        })
    })
})

app.get("/conges-excep", (req,res) => {
    if (req.isAuthenticated()) {
        const excepLeaves = leave.getExcepLeaves();
        excepLeaves.then((result) => {
            res.render("excep-leaves-list", {pageTitle: "Congés Exceptionnels", excepLeaves: result});
        })
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.post("/conges-excep", (req,res) => {
    if (req.isAuthenticated()) {
        const newExcepLeave = {
            nature: req.body.nature,
            duree: req.body.duree
        }
        leave.addExcepLeave(newExcepLeave, res);
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.get("/supprimer-conge-excep/:excepLeaveId", (req,res) => {
    if (req.isAuthenticated()) {
        leave.deleteExcepLeave(req.params.excepLeaveId, res);
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

/********************************** Employee Section **********************************/
//Employee List
app.get("/list-personnel", (req, res) => {
    if (req.isAuthenticated()) {
        const employeeList =  employee.getEmployees();
        employeeList.then((list) => {
            res.render("employee-list", {pageTitle: "Liste des Personnels", employees: list});
        })
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.post("/list-personnel", (req,res) => {
    const query = {
        [req.body.searchField]: req.body.searchValue
    }

    const result = employee.findEmployees(query);
    result.then(
        (foundEmployees) => res.render("employee-list", {pageTitle: "Liste des Personnels", employees: foundEmployees})
    );
})

//Employee profile
app.get("/personnel/:empId", (req,res) => {
    if (req.isAuthenticated()) {
        const empId = req.params.empId;

        const result = employee.getEmployeeById(empId);
        result.then((desiredEmployee) => {
            const leaveList = leave.getLeavesById(empId);
            leaveList.then((foundLeaves) => {
                res.render("employee-profile", {pageTitle: "Personnel", employee: desiredEmployee, employeeLeaves: foundLeaves, alert: null});
            })
        })
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.post("/personnel/:empId", (req,res) => {
    const empId = req.params.empId;
    employee.deleteEmployee(empId, res);
})

//Employee edit
app.get("/modifier-personnel/:empId", (req,res) => {
    
    if (req.isAuthenticated()) {
        const employeeId = req.params.empId;
    
        const result = employee.getEmployeeById(employeeId);
        result.then((foundEmployee) => {
            res.render("modify-employee", {pageTitle: "Modification", employee: foundEmployee, alert: null});
        })
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.post("/modifier-personnel/:empId", (req,res) => {
    const employeeId = req.params.empId;
    employee.updateEmployee(employeeId, req, res);
})

//Employee leave title printing
app.get("/imprimer-titre/:leaveId", (req, res) => {
    
    if (req.isAuthenticated()) {
        const leaveId = req.params.leaveId;
        const leaveToPrint = leave.getLeaveById(leaveId);
        leaveToPrint.then((foundLeave) => {
            const employeeLeave = employee.getEmployeeById(foundLeave.empId);
            employeeLeave.then((foundEmployee) => {
                if (foundLeave.type == "Administratif") {
                    res.render("titre-conge-admin", {employee: foundEmployee, leave: foundLeave});
                } else {
                    res.render("titre-conge-excep", {employee: foundEmployee, leave: foundLeave});
                }
            })
        });
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

//New Employee
app.get("/nouveau-personnel", (req,res) => {
    if (req.isAuthenticated()) {
        res.render("new-employee", {pageTitle: "Nouveau Personnel", alert: null});
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.post("/nouveau-personnel", (req,res) => {
    const empMatricule = req.body.matricul.toUpperCase();
    employee.newEmployee(empMatricule, req, res);
})

//Drop employee
app.get("/confirmation-supression/:employeeId", (req,res) => {
    if (req.isAuthenticated()) {
        const employeeToDelete = employee.getEmployeeById(req.params.employeeId)
        employeeToDelete.then((foundEmployee) => {
            res.render("dropemp-confirmation", {pageTitle: "Confirmation du supression", employee: foundEmployee});
        })
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.post("/confirmation-supression/:employeeId", (req,res) => {
    employee.deleteEmployee(req.params.employeeId, res);
})

// Reliquats

app.get("/reliquats", (req,res) => {
    if (req.isAuthenticated()) {
        employee.getReliquats(res);
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.post("/reliquats", (req,res) => {
    employee.updateReliquats(req,res);
})

app.get("/impression-reliquat", (req, res) => {
    const employees = employee.getEmployees();
    employees.then((result) => {
        const reliquats = [];

        result.forEach(rslt => {
            const reliquat = {
                matricule: rslt.matricule,
                nom: rslt.nom,
                prenom: rslt.prenom,
                departs: rslt.departsAutorisees,
                droitN_1: rslt.droitN_1,
                droitN: rslt.droitN
            }

            reliquats.push(reliquat);
        });

        res.render("impression-reliquats", {reliquats: reliquats});
    }) 
})

/********************************** Holidays Section **********************************/
app.get("/nouveau-jours-ferie", (req,res) => {
    if (req.isAuthenticated()) {
        res.render("new-holiday", {pageTitle: "Nouveau Jours Férié", alert: null});
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.post("/nouveau-jours-ferie", (req,res) => {
    leave.newHoliday(req, res);
})

app.get("/liste-jours-feries", (req,res) => {
    if (req.isAuthenticated()) {
        leave.getHolidays(res);
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

app.get("/liste-jours-feries/:holidayId", (req,res) => {
    if (req.isAuthenticated()) {
        const holidayId = req.params.holidayId;
        leave.deleteHoliday(holidayId, res);
    } else {
        res.render("authent", {pageTitle: "Authentification"});
    }
})

/********************************** Server listener **********************************/
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, () => {
    console.log("Server started on port 3000");
})