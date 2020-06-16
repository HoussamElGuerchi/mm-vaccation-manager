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
    executedRights: String,
})

const Leave = new mongoose.model("Leave", leaveSchema);

const excepLeaveSchema = new mongoose.Schema({
    nature: {type: String, required: true},
    duree: {type: Number, required: true}
})

const ExcepLeave = new mongoose.model("ExcepLeave", excepLeaveSchema);

/********************************************************************/

checkLeavePeriod = (start, end, req, res, emp) => {

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
        const rights = emp.droitN_1 + emp.droitN;

        if (days>rights) {
            //Not enough rights
            const alert = {
                type: "danger",
                message: "Le nombre de jours du congeé est supérieure que les droits du personnels."
            }
            res.render("leave-form-admin", {pageTitle: "Nouveau Congé", alert: alert});
        } else {
            //Enough rights
            const date = new Date();
            let rights = "";

            // Update employee rights
            const tempDroitN_1 = parseInt(emp.droitN_1);
            let newDroitN_1 = parseInt(emp.droitN_1) - days;
            let newDroitN = parseInt(emp.droitN);
            let departure = parseInt(emp.departsAutorisees);

            if (newDroitN_1 < 0) {
                const remaining = newDroitN_1;
                rights = (days+remaining)+" jours "+(date.getFullYear()-1);
                newDroitN_1 = 0;
                newDroitN = newDroitN + remaining;
                rights += " + "+((-1)*remaining)+" jours "+date.getFullYear();
            } else {
                rights = days+" jours "+(date.getFullYear()-1);
            }
            departure--;
            
            const fieldsToUpdate = {
                departsAutorisees: departure,
                droitN_1: newDroitN_1,
                droitN: newDroitN
            }
            // employee.update(emp._id, fieldsToUpdate);
            
            //Update employee leave fields
            emp.departsAutorisees = departure;
            emp.droitN_1 = newDroitN_1;
            emp.droitN = newDroitN;

            //Create new leave to database
            let newLeave = Leave({
                empId: emp._id,
                matricule: emp.matricule,
                startDate: req.body.startDate,
                endDate: req.body.endDate,
                type: "Administratif",
                numberOfDays: days,
                executedRights: rights
            });
            
            newLeave.save((err) => {
                if (!err) {
                    emp.save();
                    res.render("titre-conge-admin", {employee: emp, leave: newLeave});
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

//Cancel employee's leave
module.exports.cancelLeave = (leaveId, req, res) => {
    Leave.findById(leaveId, (err, foundLeave) => {
        if (!err) {
            const numberOfDays = foundLeave.numberOfDays;
            const concernedEmployee = employee.getEmployeeById(foundLeave.empId);

            concernedEmployee.then((foundEmployee) => {

                if (foundEmployee.droitN === "26") {
                    foundEmployee.droitN_1 = parseInt(foundEmployee.droitN_1) + numberOfDays;
                } else {
                    const temp = parseInt(foundEmployee.droitN) + numberOfDays;
                    if (temp > 26) {
                        temp = (parseInt(foundEmployee.droitN) + numberOfDays) - 26;
                        foundEmployee.droitN = (parseInt(foundEmployee.droitN) + numberOfDays) - temp;
                        foundEmployee.droitN_1 = parseInt(foundEmployee.droitN_1) + temp;
                    } else {
                        foundEmployee.droitN = parseInt(foundEmployee.droitN) + numberOfDays;
                    }
                }
                foundEmployee.departsAutorisees = parseInt(foundEmployee.departsAutorisees) + 1;
                foundEmployee.save();

            });

            Leave.findByIdAndRemove(leaveId, () => {
                res.redirect("/historique");
            });
        }
    });
}

//Placed here to be used by the next function below this one
const getHolidays = async () => {
    const holidays = await Holiday.find();
    return holidays;
}

//Stop employee's leave before it copmletes
module.exports.stopLeave = (leaveId, req, res) => {
    const resumeDate = new Date(req.body.resumeDate);
    Leave.findById(leaveId, (err, leave) => {
        if (!err) {
            const beginning = new Date(leave.startDate);
            const end = new Date(leave.endDate);

            //check if the resume date is between the begining and the end of the leave
            if (resumeDate < beginning || resumeDate > end) {
                const alert = {
                    type : "danger",
                    message : "La date de reprise du travail ne correspond pas à la période du congé"
                }
                res.render("resume-work", {pageTitle: "Reprise de travail", leave: leave, alert: alert});
            } else {
                const tempDate = resumeDate;
                let days = countLeaveDays(resumeDate, end)+1;
                const daysToWork = [];

                for (let index = 0; index < days; index++ ) {
                    daysToWork.push(tempDate.toLocaleDateString());
                    tempDate.setDate(tempDate.getDate()+1);
                }

                for (let i=0; i<daysToWork.length; i++) {
                    let date = new Date(daysToWork[i]);
                    if (date.getDay() === 0) {
                        daysToWork.splice(i, 1);
                    }
                }

                const holidaysToIgnore = getHolidays();
                holidaysToIgnore.then((foundHolidays) => {
                    foundHolidays.forEach(holiday => {
                        const holidayDate = new Date(holiday.date);
                        if (daysToWork.includes(holidayDate.toLocaleDateString())) {
                            let index = daysToWork.indexOf(holidayDate.toLocaleDateString());
                            daysToWork.splice(index, holiday.duration);
                        }
                    });
                    //Rights to be returned to the employee
                    days = daysToWork.length;

                    //Update the changes to the employee
                    const concernedEmployee = employee.getEmployeeById(leave.empId);

                    concernedEmployee.then((foundEmployee) => {
                        if (foundEmployee.droitN == 26) {
                            foundEmployee.droitN_1 = parseInt(foundEmployee.droitN_1) + days;
                        } else {
                            const temp = (parseInt(foundEmployee.droitN) + days) - 26;
                            foundEmployee.droitN = (parseInt(foundEmployee.droitN) + days) - temp;
                            foundEmployee.droitN_1 = parseInt(foundEmployee.droitN_1) + temp;
                        }
                        foundEmployee.save();
                    });

                    //Update leave's changes
                    const newEnd = new Date(req.body.resumeDate);
                    newEnd.setDate(newEnd.getDate() - 1);
                    console.log(newEnd);
                    leave.endDate = newEnd.toLocaleDateString();
                    leave.numberOfDays = leave.numberOfDays - days;
                    leave.save((err) => {
                        if (!err) {
                            res.redirect("/historique");
                        }
                    })
                })
            }
        }
    })
}

//Delete leave by id
module.exports.deleteLeave = (leaveId, res) => {
    Leave.findByIdAndRemove(leaveId, () => {
        res.redirect("/historique");
    })
}

//Delete employee's leaves
module.exports.deleteEmployeeLeaves = (employeeId, res) => {
    Leave.deleteMany({empId: employeeId}, (err) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/list-personnel");
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

/********************************************************************/

module.exports.addExcepLeave = (object, response) => {
    const newExcepLeave = new ExcepLeave(object);
    newExcepLeave.save().then(() => response.render("excep-leaves-list", {pageTitle: "Congés Exceptionnels"}));
}

module.exports.getExcepLeaves = async () => {
    const excepLeaves = await ExcepLeave.find();
    return excepLeaves;
}