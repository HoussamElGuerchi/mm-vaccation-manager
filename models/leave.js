const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const ejs = require("ejs");
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

/********************************************************************/

module.exports.checkLeavePeriod = (start, end) => {

    let iteratorDate = start;
    const leaveDates = [];

    //Save leave dates into an array
    while (iteratorDate <= end) {
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
                holidays.push(holidayDate.toLocaleDateString());
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
                leaveDates.splice(index, 1);
            }
        });

        // console.log("|====== Holidays ======|");
        // console.table(holidays);
        // console.log("|==== Leave Period ====|");
        // console.table(leaveDates);

        let days = leaveDates.length;
        res.render("duration", {pageTitle: "Test duration", duration: days});
    })
}

/********************************************************************/