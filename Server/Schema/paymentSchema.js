const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentMethod: {
    type: String,
    required: true,
  },
  
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket', // Reference to the TrainRoute model
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'success', // You can use this field to track payment status
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
