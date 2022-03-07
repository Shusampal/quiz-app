const Sequelize = require('sequelize');
require('dotenv').config();

const { DATABASE_NAME, USER_NAME, PASSWORD, HOST, DIALECT } = process.env;


const sequelize = new Sequelize(DATABASE_NAME, USER_NAME, PASSWORD, {
    host: HOST,
    dialect: DIALECT
});


module.exports = sequelize;