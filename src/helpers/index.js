const {errorObjects} = require('../constants/error');

function errorObjectCreate(message) {

    const errorObj = errorObjects[message];

    if (!errorObj) {
        return errorObjects['internal server error'];
    }

    return errorObj;

}

module.exports.errorObjectCreate = errorObjectCreate;