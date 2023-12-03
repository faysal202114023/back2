// db.js
// Import the Mongoose library
const mongoose = require('mongoose');

// Define the MongoDB connection URL
const mongoUrl = 'mongodb+srv://nahiduzzaman1106:123@sdproject.pxifhru.mongodb.net/SDP-Project'; // Replace with your MongoDB URL

// Use Mongoose to connect to the MongoDB database

mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Get a reference to the Mongoose connection object
const db = mongoose.connection;

// Listen for database connection errors
db.on('error', (error) => {
  console.error('Database connection error:', error);
});

// Listen for a successful database connection
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Export the Mongoose connection object for use in other parts of the application
module.exports = db;
