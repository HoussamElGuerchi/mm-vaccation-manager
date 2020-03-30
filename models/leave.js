const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const ejs = require("ejs");
const employee = require(__dirname + "/employee.js");
const mongoose = require("mongoose");

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

/***** Database Manipulation *****/

mongoose.connect('mongodb://localhost:27017/leaveDB', {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

const holidaySchema = new mongoose.Schema({
    title: {type: String, required: true},
    date: {type: String, required: true},
    duration: {type: Number, required: true}
})

const Holiday = new mongoose.model("Holiday", holidaySchema);

const leaveSchema = new mongoose.Schema({
    empId: {type: String, required: true},
    matricule: {type: String, required: true},
    startDate: {type: String, required: true},
    endDate: {type: String, required: true},
    numberOfDays: {type: Number},
    type: {type: String, required: true},
})

const Leave = new mongoose.model("Leave", leaveSchema);

/********************************************************************/

checkLeavePeriod = (start, end, req, res, employee) => {

    let iteratorDate = new Date(start);
    const leaveDates = [];

    //Save leave dates into an array
    while (iteratorDate <= new Date(end)) {
        leaveDates.push(iteratorDate.toLocaleDateString());
        iteratorDate.setDate(iteratorDate.getDate()+1);
    }

    // Retrieve holidays from database
    const holidays = [];

    Holiday.find((err, result) => {
        if (err) {
            console.log(err);
        } else {
            result.forEach(holiday => {
                holidayDate = new Date(holiday.date);

                for (let i=0; i<holiday.duration; i++) {
                    holidays.push(holidayDate.toLocaleDateString());
                    holidayDate.setDate(holidayDate.getDate()+1);
                }
            });
        }

        // Ignore sundays
        for (let i=0; i<leaveDates.length; i++) {
            let date = new Date(leaveDates[i]);
            if (date.getDay() === 0) {
                // console.log("Date removed => " + date.toDateString());
                leaveDates.splice(i, 1);
            }
        }

        //Ignore holidays
        holidays.forEach(holiday => {
            if (leaveDates.includes(holiday)) {
                let index = leaveDates.indexOf(holiday);
                leaveDates.splice(index, 1);
            }
        });

        let days = leaveDates.length;
        
        //check employee rights
        const rights = employee.droitN_1 + employee.droitN;

        if (days>rights) {
            //Not enough rights
            const alert = {
                type: "danger",
                message: "Le nombre de jours du congeé est supérieure que les droits du personnels."
            }
            res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: alert});
        } else {
            //Enough rights

            // Update employee rights
            let newDroitN_1 = parseInt(employee.droitN_1) - days;
            let newDroitN = parseInt(employee.droitN);
            let departure = parseInt(employee.departsAutorisees);

            if (newDroitN_1 < 0) {
                const remaining = newDroitN_1;
                newDroitN_1 = 0;
                newDroitN = newDroitN + remaining;
            }
            departure --;
            
            const fieldsToUpdate = {
                departsAutorisees: departure,
                droitN_1: newDroitN_1,
                droitN: newDroitN
            }
            
            //Update employee leave fields
            employee.departsAutorisees = departure;
            employee.droitN_1 = newDroitN_1;
            employee.droitN = newDroitN;

            employee.save();

            //Create new leave to database
            let newLeave = Leave({
                empId: employee._id,
                matricule: req.body.employeeId.toUpperCase(),
                startDate: req.body.startDate,
                endDate: req.body.endDate,
                type: "Administratif",
                numberOfDays: days
            });
            
            newLeave.save((err) => {
                if (!err) {
                    const successAlert = {
                        type: "success",
                        message: "Congé ajouter avec succès."
                    }
                    res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: successAlert});
                } else {
                    const noResult = {
                        type: "danger",
                        message: err
                    }
                    res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: noResult});
                }
            });

        }

    })
}

/********************************************************************/

// Create new leave

module.exports.newLeaveAdmin = (req,res) => {
    //Check duration validity
    if (req.body.startDate > req.body.endDate) {
        const alert = {
            type: "danger",
            message: "Période du congé invalide, veuillez vérifier la date de début et de la fin du congé."
        }
        res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: alert});
    } else {
        const empMatricule = req.body.employeeId.toUpperCase();

        const searchResult = employee.getEmployeeByMatricule(empMatricule);
        searchResult.then((foundEmployee) => {

            //No employee found
            if (!foundEmployee) {
                const noResult = {
                    type: "danger",
                    message: "Le matricule ne correspond à aucun personnel."
                }
                res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: noResult});
            } else {
                
                if (foundEmployee.departsAutorisees <= 0) {
                    //Employee doesn't have the rights to leave
                    const alert = {
                        type: "danger",
                        message: "Le personnel n'a aucun départ autorisé."
                    }
                    res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: alert});
                } else {
                    //Employee has the rights to leave
                    checkLeavePeriod(req.body.startDate, req.body.endDate, req, res, foundEmployee)
                }
            }

        })
    }
}

module.exports.newLeaveExcep = (req, res) => {

    if (req.body.startDate > req.body.endDate) {
        const alert = {
            type: "danger",
            message: "Période du congé invalide, veuillez vérifier la date de début et de la fin du congé."
        }
        res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: alert});
    } else {
        const empMatricule = req.body.employeeId.toUpperCase();

        const searchResult = employee.getEmployeeByMatricule(empMatricule);
        searchResult.then((foundEmployee) => {

            if (foundEmployee.length === 0) {
                const noResult = {
                    type: "danger",
                    message: "Le matricule ne correspond à aucun personnel."
                }
                res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: noResult});
            } else {
                console.log(foundEmployee);
                
                const newLeave = Leave({
                    empId: foundEmployee._id,
                    matricule: empMatricule,
                    startDate: req.body.startDate,
                    endDate: req.body.endDate,
                    type: req.body.leaveType,
                    numberOfDays: 0
                });
                
                newLeave.save((err) => {
                    if (!err) {
                        const successAlert = {
                            type: "success",
                            message: "Congé ajouter avec succès."
                        }
                        res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: successAlert});
                    } else {
                        const noResult = {
                            type: "danger",
                            message: err
                        }
                        res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: noResult});
                    }
                });
            }

        })
    }

}

//Read leaves
module.exports.getLeaves = (res) => {
    Leave.find((err, leaveList) => {
        if (err) {
            console.log(err);
        } else {
            res.render("leave-history", ({pageTitle: "Historique des Congés", leaveList, alert: null}));
        }
    })
}

module.exports.getEmployeeLeaves = (matricule, res) => {
    Leave.find({matricule: matricule.toUpperCase()}, (err,leaves) => {
        if (err) {
            const errAlert = {
                type: "danger",
                message: err
            }
            res.render("leave-history", {pageTitle: "Liste des Personnels", leaveList: leaves, alert: errAlert});
        } else {
            if (leaves.length === 0) {
                const errAlert = {
                    type: "warning",
                    message: "Aucun personnel trouvé"
                }
                res.render("leave-history", {pageTitle: "Liste des Personnels", leaveList: leaves, alert: errAlert});
            } else {
                res.render("leave-history", {pageTitle: "Liste des Personnels", leaveList: leaves, alert: null});
            }
        }
    })
}

module.exports.getLeavesById = async (employeeId) => {
    const leaveList = await Leave.find({empId: employeeId});
    return leaveList;
}

// Create Holiday
module.exports.newHoliday = (req ,res) => {
    const newHoliday = new Holiday({
        title: req.body.holidayTitle,
        date: req.body.startDate,
        duration: req.body.duration
    })

    newHoliday.save((err) => {
        if (err) {
            const errAlert = {
                type: "danger",
                message: err
            }
            res.render("new-holiday", {pageTitle: "Nouveau Jours Férié", alert: errAlert});
        } else {
            const success = {
                type: "success",
                message: "Le jours férié est ajouté avec succès"
            }
            res.render("new-holiday", {pageTitle: "Nouveau Jours Férié", alert: success});
        }
    })
}

//Read holidays
module.exports.getHolidays = (res) => {
    Holiday.find((err, allHolidays) => {
        if (!err) {
            res.render("holidays-list", {pageTitle: "Jours Fériés", holidays: allHolidays});
        }
    })
}

//Delete Holiday
module.exports.deleteHoliday = (holidayId, res) => {
    Holiday.findByIdAndRemove({_id: holidayId}, (err) => {
        if (!err) {
            res.redirect("/liste-jours-feries");
        }
    })
}