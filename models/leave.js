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

checkLeavePeriod = async (start, end, res) => {

    let iteratorDate = start;
    const leaveDates = [];

    //Save leave dates into an array
    while (iteratorDate <= end) {
        leaveDates.push(iteratorDate.toLocaleDateString());
        iteratorDate.setDate(iteratorDate.getDate()+1);
    }

    // Retrieve holidays from database
    const holidays = [];

    await Holiday.find((err, result) => {
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
                console.log("Date removed => " + date.toDateString());
                leaveDates.splice(i, 1);
            }
        }

        //Ignore holidays
        holidays.forEach(holiday => {
            if (leaveDates.includes(holiday)) {
                let index = leaveDates.indexOf(holiday);
                let duration = Holiday.findOn
                leaveDates.splice(index, 1);
            }
        });

        let days = leaveDates.length;
        return days;
        // res.render("duration", {pageTitle: "Test duration", duration: days});
    })
}

/********************************************************************/

// Create new leave

module.exports.newLeaveAdmin = (req,res) => {
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
                    matricule: req.body.employeeId.toUpperCase(),
                    startDate: req.body.startDate,
                    endDate: req.body.endDate,
                    type: "Administratif",
                    // numberOfDays: date.calculDays(req.body.startDate, req.body.endDate)
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