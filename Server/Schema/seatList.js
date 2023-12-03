const mongoose = require('mongoose');

const seatListSchema = new mongoose.Schema(
  {
    trainName: {
      type: String,
      unique: true,
      required: true,
    },
    seats: [
      {
        coachName: String,
        seatNumber: String,
        isBooked: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    collection: 'SeatLists',
  }
);

mongoose.model('SeatLists', seatListSchema);
