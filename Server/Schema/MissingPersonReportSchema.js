const mongoose = require('mongoose');

const missingPersonReportSchema = new mongoose.Schema({
  reporterName: String,
  missingPersonName: String,
  photos: [
    {
      data: Buffer,
      contentType: String,
    },
  ],
});

module.exports = mongoose.model('MissingPersonReport', missingPersonReportSchema);

