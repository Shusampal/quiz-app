const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({
  questionName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerResponse: {
    type: String,
    required: true,
    enum: ['yes', 'no']
  },
  orderPrice: {
    type: Number,
    required: true
  },
  orderQuantity: {
    type: Number,
    required: true
  },
  cancel: {
    type:Boolean,
    required:false
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;