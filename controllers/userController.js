// Middleware checks
const User = require("../models/user");

// Checks if the user is logged into their account
function isLoggedIn(req, res,next){
    if(req.session.user) {
        return next();
    }
    res.redirect("/login"); // sends to login in pages if not
}

// Check to see if the user is the role of Admin 
function isAdmin(req, res, next) {
    if( req.session.user && req.session.user.role === "admin") {
        return next();
    }
    res.status(403).render("error", { message: "Access denied" });// gives 403 error 
}
// Need to take all of user in the database 
async function getAllUsers() {
  try {
    const users = await User.find(); // Fetch all registered users from MongoDB
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

module.exports = { isLoggedIn, isAdmin, getAllUsers };