

const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  emergencyType: {
    type: String,
    required: true,
  },
  additionalDetails: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Emergency = mongoose.model('Emergency', emergencySchema);

module.exports = Emergency;
