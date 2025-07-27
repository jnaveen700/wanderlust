const express = require('express');
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");

router.get("/signup", (req, res) => {
    res.render("users/signup.ejs");
});

router.post("/signup",wrapAsync(async (req ,res) => {
    try{
        const {username,email,password} = req.body;
        const newUser = new User({username,email});
        const registeredUser = await User.register(newUser, password);
        console.log(registeredUser);
        req.flash("success","Welcome to Wanderlust!");
        res.redirect("/listings");
    } catch (e) {
        req.flash("error" , e.mrsessage);
        res.redirect("/signup");
    }
}));

router.get("/login", (req, res) => {
    res.render("users/login.ejs");
});

router.post("/login", passport.authenticate("local", {
    failureFlash: true,
    failureRedirect: "/login"
}), async (req, res) => {
    req.flash("success", "Welcome back!");
    res.redirect("/listings");
});

module.exports = router;
