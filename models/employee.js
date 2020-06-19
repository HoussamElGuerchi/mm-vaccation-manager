const mongoose = require("mongoose");
const _ = require("lodash");
const leave = require(__dirname + "/leave.js");

/* Making connection */
// mongoose.connect('mongodb://localhost:27017/leaveDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.connect('mongodb+srv://admin-houssam:marsamarocagadir@cluster0-kgxxn.mongodb.net/leaveDB', {useNewUrlParser: true, useUnifiedTopology: true});

/* Creating a schema */
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

/* Creating a model from the previous schema */
const Employee = new mongoose.model("Personnel", employeeSchema);

const updateSchema = new mongoose.Schema({
    year : Number,
    isUpdated : Boolean
})

const Update = new mongoose.model("Update", updateSchema);

/* Get employees from database */
module.exports.getEmployees = async () => {
    const employees = await Employee.find();
    return employees;
}

// Get employee by matricule
module.exports.getEmployeeByMatricule = async (matricule) => {
    const employee = await Employee.findOne({matricule: matricule});
    return employee;
}

// Get employee by id
module.exports.getEmployeeById = async (id) => {
    const employee = await Employee.findOne({_id: id});
    return employee;
}

//Find one or more employees by a custom field
module.exports.findEmployees = async (query) => {
    const employees = await Employee.find(query);
    return employees;
}

//Delete employee
module.exports.deleteEmployee = (employeeId, res) => {
    Employee.findByIdAndRemove(employeeId, (err) => {
        if (err) {
            const alert = {
                type: "danger",
                message: err
            };
            res.render("employee-profile", {pageTitle: "Personnel", employee: foundEmployee, alert: alert});
        } else {
            leave.deleteEmployeeLeaves(employeeId, res);
        }
    })
}

// Update employee
module.exports.updateEmployee = (employeeId, req, res) => {
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
}

module.exports.update = (employeeId , fields) => {
    Employee.findByIdAndUpdate(employeeId, fields, (err, emp) => {
        if (!err) {
            console.log("Employee updated");
        }
    })
}

// Add employee
module.exports.newEmployee = (empMatricule, req,res) => {
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
                    message: "Un personnel existe avec le même matricule"
                }

                res.render("new-employee", {pageTitle: "Nouveau Personnel", alert: alert});
            } else {
                
                const startOfWork = new Date(req.body.startOfWorkDate);
                const endOfYear = new Date(new Date().getFullYear(), 11, 31);
                
                const workingDays = Math.round((endOfYear.getTime() - startOfWork.getTime())/(1000*60*60*24));
                const currentYearRights = Math.round((workingDays*26)/365);

                const newEmployee = new Employee({
                    matricule: req.body.matricul.toUpperCase(),
                    nom: _.upperCase(req.body.lastName),
                    prenom: _.upperCase(req.body.firstName),
                    dateDeNaissance: req.body.birthDate,
                    fonction: _.capitalize(req.body.function),
                    entite: _.capitalize(req.body.entity),
                    departsAutorisees: 5,
                    droitN_1: 0,
                    droitN: currentYearRights
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
}

// Reliquats
module.exports.getReliquats = (res) => {
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
        res.render("reliquats", {pageTitle: "Reliquats", reliquats: reliquats, alert: null});
    })
}

module.exports.updateReliquats = (req,res) => {
    const date = new Date();
    
    const employees = Employee.find().exec();
    employees.then((result) => {

        Update.findOne({year: date.getFullYear()}, (err, update) => {
            if (!err) {
                if (update) {
                    //There will be no updates to be done
                    const updateAlert = {
                        type: "success",
                        message: "Les droits de l'année " + date.getFullYear() + " sont à jours"
                    };
                    const reliquats = [];

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

                    res.render("reliquats", {pageTitle: "Reliquats", reliquats: reliquats, alert: updateAlert});
                } else {
                    //Updating new year rights
                    result.forEach(employee => {
                        const temp = parseInt(employee.droitN);
                        const birthDate = new Date(emp.dateDeNaissance);
                        const retirementAge = date.getFullYear() - birthDate.getFullYear();

                        employee.departsAutorisees = 5;
                        employee.droitN_1 = temp;

                        if (retirementAge !== 60) {
                            //No retirement for the employee this year
                            employee.droitN = 26;
                        } else {
                            //The employee will retire this year, current year rights will be != 26
                            let retirementDate = new Date(date.getFullYear(), birthDate.getMonth(), birthDate.getDate());
                            const newYear = new Date(date.getFullYear(), 0, 1);
                            const remainingWorkDays = (retirementDate.getTime() - newYear.getTime())/(1000*3600*24);
                            let droits = ((remainingWorkDays*26)/355);
            
                            if (droits>26) {
                                employee.droitN = 26;
                            } else {
                                employee.droitN = Math.round(droits);
                            }
                        }

                        employee.save();
                    })
                }
            }
        });
    });
}