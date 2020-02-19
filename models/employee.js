const mongoose = require("mongoose");

let list = [];

/* Making connection */
mongoose.connect('mongodb://localhost:27017/leaveDB', {useNewUrlParser: true, useUnifiedTopology: true});

/* Creating a schema */
const employeeSchema = new mongoose.Schema({
    matricule: {type: String, required: true},
    lastName: {type: String, required: true},
    firstName: {type: String, required: true},
    birthDate: {type: String, required: true},
    function: {type: String, required: true},
    entity: {type: String, required: true},
})

/* Creating a model from the previous schema */
const Employee = new mongoose.model("Personnel", employeeSchema);

/* Read objects from database */
Employee.find((err, employees) => {
    if (err) {
        console.log(err);
    } else {
        mongoose.connection.close();
        employees.forEach(employee => {
            console.log(employee);
        });
    }
})

module.exports.list;