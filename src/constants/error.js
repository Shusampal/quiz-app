const errorObjects = {
    'internal server error':{
        statusCode : 500,
        message: 'internal server error'
    },
    'credentials or data missing' : {
        statusCode : 400,
        message: 'credentials or data missing'
    },
    'unauthenticated request' : {
        statusCode : 401,
        message: 'unauthenticated request'
    },
    'unauthorized request' : {
        statusCode : 403,
        message: 'unauthorized request'
    },
    'resource not found' : {
        statusCode : 404,
        message: 'resource not found'
    },
    'db resource not found' : {
        statusCode : 400,
        message: 'db resource not found'
    }

}

const errorMessages = {
    'server' : 'internal server error',
    'client' : 'credentials or data missing',
    'unauthenticated': 'unauthenticated request',
    'unauthorized': 'unauthorized request',
    'notFound': 'resource not found',
    'unavailableInDB': 'db resource not found'
}

module.exports.errorObjects = errorObjects;
module.exports.errorMessages = errorMessages;