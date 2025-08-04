const express = require('express');
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const userController = require("../controllers/user.js");

router.route("/signup")
    // Render signup form
    .get(userController.renderSignupForm)
    // Handle signup
    .post(wrapAsync(userController.signup)
);

router.route("/login")
    // Render login form    
    .get(userController.renderLoginForm)
    // Handle login         
    .post(saveRedirectUrl, 
        passport.authenticate("local", {
            failureFlash: true,
            failureRedirect: "/login"
        }), 
        wrapAsync(userController.login)
    );

    
router.get("/logout", userController.logout);  

module.exports = router;
