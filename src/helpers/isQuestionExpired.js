const Question = require('../models/question');

const isQuestionExpired = async (name) => {

    const qsn = await Question.findOne({ name }).lean();

    const date = qsn.expiryDate.split('-');
    const time = qsn.expiryTime.split(':');


    const dbDateObj = {
        "year": date[0],
        "month": date[1],
        "day": date[2],
        "hr": time[0],
        "min": time[1]
    }


    console.log("DB DATE OBJECT");
    console.log(JSON.stringify(dbDateObj));


    const currentDate = new Date().toLocaleDateString().split('/');
    const currentHour = new Date().getHours();
    const currentMin = new Date().getMinutes();

    const currDateObj = {
        "year": currentDate[2],
        "month": currentDate[1],
        "day": currentDate[0],
        "hr": currentHour,
        "min": currentMin
    }

    console.log("CURRENT DATE OBJECT");
    console.log(JSON.stringify(currDateObj));


    if (currDateObj["year"] > dbDateObj["year"]) {
        return true;
    } else if (currDateObj["month"] > dbDateObj["month"]) {
        return true;
    } else if (currDateObj["day"] > dbDateObj["day"]) {
        return true;
    } else if (currDateObj["hr"] > dbDateObj["hr"]) {
        return true;
    } else if (currDateObj["hr"] == dbDateObj["hr"]) {
        return true;
    } else {

        return false;
    }


}


module.exports = isQuestionExpired;



