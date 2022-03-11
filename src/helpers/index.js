const Question = require('../models/question');

const dynamicPrice = async (response, quantity, name) => {

    const TotalValue = 100;

    let yesValue = TotalValue / 2;
    let noValue = TotalValue / 2;

    if (response === 'yes') {
        if (yesValue < 95) {
            yesValue = yesValue + (yesValue * 1) / 100 + (quantity * 1) / 100;
            noValue = TotalValue - yesValue;

            // update yesvalue and noValue of that question

            await Question.updateOne({ name: name }, { yesValue: yesValue, noValue: noValue });
        }
    } else {
        if (noValue < 95) {
            noValue = noValue + (noValue * 1) / 100 + (quantity * 1) / 100;
            yesValue = TotalValue - noValue;

            // update yesvalue and noValue of that question

            await Question.updateOne({ name: name }, { yesValue: yesValue, noValue: noValue });


        }
    }

}


module.exports = dynamicPrice;