const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const Question = sequelize.define("Question", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  description: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  logoUrl: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  yesValue: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  noValue: {
    type: Sequelize.STRING,
    allowNull: false,
  }

});

module.exports = Question;