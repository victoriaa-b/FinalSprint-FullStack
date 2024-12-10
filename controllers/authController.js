const User = require("../models/user");
const bcrypt = require("bcryptjs");


// For user to register
// NOT WORKING
exports.register = async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send("Username already taken");
    }

    // password needs to be hashed with bcrypt 
    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashPassword });

    await newUser.save();
    res.redirect("/user/login");
  } catch (error) {
    res.status(500).send("Error registering user");
  }
};

//  For user to login
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).send("Invalid username or password");
    }

    req.session.user = user;
    res.redirect("/chat");
  } catch (error) {
    res.status(500).send("Error logging in");
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};
