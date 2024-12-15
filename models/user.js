// User records include at least: the username, hashed password and role
// harsh password should prob be found index

const mongoose = require('mongoose');
const { array } = require('prop-types');
const bcrypt = require("bcryptjs");

const userModel = new mongoose.Schema({
  email: { type: String, required: true, unique: true }, // Need the user to have a email and not an already existing one
  username: { type: String, required: true, unique: true }, // need a orginal username
  password: { type: String, required: true }, // account can have matching passwords
  role: { type: String, enum: ["admin", "user"], required: true },
  joinDate: { type: Date, default: Date.now },
  status: { type: String, default: "active" }, // need to know if the user is banned or not
});

// Password needs to be hashed
userModel.pre('save', async function(next) {
if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
}
next();
});

const User = mongoose.model("User", userModel);
module.exports = User;