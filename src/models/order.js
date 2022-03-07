const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define("Order", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  questionId: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  response: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: { isIn: [['yes', 'no']] }
  }
});

module.exports = Order;