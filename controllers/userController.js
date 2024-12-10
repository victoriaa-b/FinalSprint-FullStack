// Middleware checks

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
module.exports = { isLoggedIn, isAdmin };