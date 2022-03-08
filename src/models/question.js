const mongoose = require('mongoose');
const { Schema } = mongoose;

const questionSchema = new Schema({

  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  logoUrl: {
    type: String,
    required: true
  },
  yesValue: {
    type: Number,
    required: true
  },
  noValue: {
    type: Number,
    required: true
  }

});

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;