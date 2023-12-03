const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  total: {
    type: Number,
    required: true,
  },
  seatNumber: {
    type: Number,
    required: true,
  },
  cabinNumber: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
