const mongoose = require('mongoose');

const trainRouteSchema = new mongoose.Schema(
  {
    trainName: {
      type: String,
      unique: true,
      required: true,
    },
    routes: [{
      stationName: String,
      arrivalTime: Date,
      departureTime: Date,
      ticketPrice: Number,
    }],
    departureTime: Date,
    startingPoint: String,
    endingPoint: String,
  },
  {
    collection: 'TrainRoutes',
  }
);

const TrainRoute = mongoose.model('TrainRoute', trainRouteSchema);

module.exports = TrainRoute;

