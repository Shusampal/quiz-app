require('dotenv').config();

const { DB_URL , DATABASE_NAME } = process.env;


const mongo = {
    url : `${DB_URL}/${DATABASE_NAME}`
}


module.exports = mongo;