const mongoose = require("mongoose");

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
    matricule: {type: String, required: true},
    startDate: {type: String, required: true},
    endDate: {type: String, required: true},
    numberOfDays: {type: Number},
    type: {type: String, required: true},
})

const Leave = new mongoose.model("Leave", leaveSchema);

/*********************************/

module.exports.updateRights = () => {
    Employee.find((err, result) => {
        if (err) {
            console.log(err);
        } else {
            const retirement = []
            result.forEach(emp => {
                const birthDate = new Date(emp.dateDeNaissance);
    
                const retirementAge = currentDate.getFullYear() - birthDate.getFullYear();
                
                if (retirementAge === 60) {
                    let retirementDate = new Date(currentDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
                    const newYear = new Date(currentDate.getFullYear(), 0, 1);
    
                    const remainingWorkDays = (retirementDate.getTime() - newYear.getTime())/(1000*3600*24);
    
                    let droits = ((remainingWorkDays*26)/355);
    
                    if (droits>26) {
                        droits = 26;
                    }
    
                    Employee.updateOne({matricule: emp.matricule}, {droitN: Math.round(droits)}, (err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("Updated");
                        }
                    })
                }
            })
        }
    })
}