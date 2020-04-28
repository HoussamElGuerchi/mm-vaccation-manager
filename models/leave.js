const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const ejs = require("ejs");
const employee = require(__dirname + "/employee.js");
const mongoose = require("mongoose");
const pdf = require('html-pdf');
const fs = require('fs');

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

        let days = (leaveDates.length == 0) ? 0 : leaveDates.length;
        
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

                    res.render("titre-conge-admin", {employee: employee, leave: newLeave});

                    // res.render("titre-conge-admin", {employee: employee, leave: newLeave}, (err, html) => {
                    //     const currentDate = new Date();
                    //     const fileTitle = "conge_admin_"+employee.matricule+"_"+currentDate.toISOString();
                    //     pdf.create(html, {format: 'A4', orientation: 'portrait'}).toFile('./titres_conges/'+fileTitle+'.pdf', function(err, result) {
                    //         if (err){
                    //             return console.log(err);
                    //         }
                    //          else{
                    //             var datafile = fs.readFileSync('./titres_conges/'+fileTitle+'.pdf');
                    //             res.header('content-type','application/pdf');
                    //             res.send(datafile);
                    //         }
                    //     });
                    // })

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

const countLeaveDays = (beginning, end) => {
    // The number of milliseconds in one day
    const ONE_DAY = 1000 * 60 * 60 * 24;

    // Calculate the difference in milliseconds
    const differenceInMs = Math.abs(beginning - end);

    // Convert back to days and return
    return Math.round(differenceInMs / ONE_DAY);
} 

/********************************************************************/

// Create new leave

module.exports.newLeaveAdmin = (req,res) => {
    //Check duration validity
    if ((req.body.startDate > req.body.endDate)) {
        const alert = {
            type: "danger",
            message: "Période du congé invalide, veuillez vérifier la date de début et la date du fin."
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

    if ((req.body.startDate > req.body.endDate)) {
        const alert = {
            type: "danger",
            message: "Période du congé invalide, veuillez vérifier la date de début et la date du fin."
        }
        res.render("leave-form-excep", {pageTitle: "Nouveau Congé", alert: alert});
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
                const newLeave = Leave({
                    empId: foundEmployee._id,
                    matricule: empMatricule,
                    startDate: req.body.startDate,
                    endDate: req.body.endDate,
                    type: req.body.leaveType,
                    numberOfDays: countLeaveDays(new Date(req.body.startDate), new Date(req.body.endDate))+1
                });
                
                newLeave.save((err) => {
                    if (!err) {
                        res.render("titre-conge-excep", {employee: foundEmployee, leave: newLeave});
                        // res.render("titre-conge-excep", {employee: foundEmployee, leave: newLeave}, (err, html) => {
                        //     const currentDate = new Date();
                        //     const fileTitle = "conge_admin_"+foundEmployee.matricule+"_"+currentDate.toISOString();
                        //     pdf.create(html, {format: 'A4', orientation: 'portrait'}).toFile('./titres_conges/'+fileTitle+'.pdf', function(err, result) {
                        //         if (err){
                        //             return console.log(err);
                        //         }
                        //         else{
                        //             var datafile = fs.readFileSync('./titres_conges/'+fileTitle+'.pdf');
                        //             res.header('content-type','application/pdf');
                        //             res.send(datafile);
                        //         }
                        //     });
                        // });
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

module.exports.getLeaveById = async (leaveId) => {
    const leave = await Leave.findById(leaveId);
    return leave;
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