const mongoose = require("mongoose");

const userDetailsSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
    },
    password: String,
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: "UserDetails",
  }
);

const User = mongoose.model("UserDetails", userDetailsSchema);
module.exports = User;