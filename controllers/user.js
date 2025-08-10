const User = require("../models/user.js");

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
};

// Add 'next' to the function parameters
module.exports.signup = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const newUser = new User({ username, email });
        const registeredUser = await User.register(newUser, password);
        console.log(registeredUser);
        // req.login() is a passport function that establishes a login session.
        req.login(registeredUser, (err) => {
            // This callback is executed after the login process.
            if (err) {
                // If there's an error during login, pass it to the error handler.
                return next(err);
            }
            // If login is successful, flash a success message and redirect.
            req.flash("success", "Welcome to Wanderlust!");
            res.redirect("/listings");
        });
    } catch (e) {
        // This catches errors from User.register (e.g., duplicate username)
        req.flash("error", e.message);
        console.error("Error during signup:", e);
        // UPDATED: Redirect on error to show the flash message
        res.redirect("/signup");
    }
};

module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};

// This function runs AFTER passport.authenticate successfully logs the user in.
// Added next and a try...catch block for robust error handling.
module.exports.login = async (req, res, next) => {
    try {
        req.flash("success", "Welcome back!");
        // Redirect to the URL the user was trying to access, or to the listings page.
        let redirectUrl = res.locals.redirectUrl || "/listings";
        res.redirect(redirectUrl);
    } catch (e) {
        // If any error occurs, pass it to the main error handler
        next(e);
    }
}

// Add 'next' to the function parameters
module.exports.logout = (req, res, next) => {
    // req.logout() is a passport function that terminates the login session.
    req.logout((err) => {
        // This callback is executed after the logout process.
        if (err) {
            // If there's an error during logout, pass it to the error handler.
            return next(err);
        }
        // If logout is successful, flash a message and redirect.
        req.flash("success", "Logged out successfully!");
        res.redirect("/listings");
    });
};
