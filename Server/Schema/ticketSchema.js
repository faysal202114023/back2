const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  trainRouteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainRoute', // Reference to the TrainRoute model
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserDetails', // Reference to the UserDetails model
    required: true,
  },
  bookedSeat: [Number], // Array of booked seat numbers
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
