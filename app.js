// At the top of your app.js file
require('global-agent/bootstrap');
// Moved dotenv config here to ensure it always runs
if(process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
// Trust proxy settings for rate limiting behind Render's proxy
app.set('trust proxy', 1);
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const aiRouter = require("./routes/ai.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const seedDatabase = require("./init/seedDatabase.js");

const dbUrl = process.env.ATLASDB_URL;

async function main() {
    await mongoose.connect(dbUrl);
    console.log("connected to db");
    // Seed database with sample listings if needed
    await seedDatabase();
}

main().catch(err => {
    console.error("Database connection error:", err);
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);
app.use(express.json()); // Add JSON parsing middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 3600, // time period in seconds
    crypto: {
        secret: process.env.SECRET
    }
}); 

const sessionOptions = {
    store: store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized : true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge : 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};



app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// 🚨 DEPLOYMENT FIX: Add a root route to redirect to the main page
app.get("/", (req, res) => {
    res.redirect("/listings");
});

// ROUTE ORDER
// The most specific routes should come first.
app.use("/listings/:id/reviews", reviewRouter);
app.use("/listings", listingRouter);
app.use("/", aiRouter);
app.use("/", userRouter); // General routes come last

// 404 handler
app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!!!"));
});

// Error handler
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "There was an error on our side" } = err;
    console.error(err.stack);
    res.status(statusCode).render("error", { message });
});

// Start server
app.listen(8080, () => {
    console.log("Server is listening on port 8080");
});
