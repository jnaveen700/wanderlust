const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync"); 
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");

// Import all controller functions from the user controller file
const userController = require("../controllers/user.js");

// Routes for signup
router
  .route("/signup")
  .get(userController.renderSignupForm)
  .post(wrapAsync(userController.signup));

// Routes for login
router
  .route("/login")
  .get(userController.renderLoginForm)
  .post(
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userController.login
  );

// Route for logout
router.get("/logout", userController.logout);

module.exports = router;
