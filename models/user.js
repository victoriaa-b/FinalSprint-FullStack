// User records include at least: the username, hashed password and role
// harsh password should prob be found index

const mongoose = require('mongoose');
const { array } = require('prop-types');

const userModel = new mongoose.Schema({
  email: { type: String, required: true, unique: true }, // Need the user to have a email and not an already existing one
  username: { type: String, required: true, unique: true }, // need a orginal username
  password: { type: String, required: true }, // account can have matching passwords
  role: { type: String, array: [ "admin", "buyer", "seller"], required: true },
});

const User = mongoose.model("User", userModel);
module.exports = User;