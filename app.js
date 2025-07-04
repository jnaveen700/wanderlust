const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const listings = require("./routes/listing.js");
const reviews = require("./routes/review.js");
const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const session = require("express-session");
const flash = require("connect-flash");

async function main() {
    await mongoose.connect(MONGO_URL);
    console.log("connected to db");
}

main().catch(err => console.log(err));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));
const sessionOptions = {
    secret: "mysecretkey",
    resave: false,
    saveUninitialized : true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge : 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.get("/", (req, res) => {
    res.send("Hi, I am root");
});


app.use(session(sessionOptions))
app.use(flash());

app.use((req,res,next) => {
    res.locals.success = req.flash("success");
    next();
})

// Routes
//listings routes   
app.use("/listings",listings);
//Review routes
app.use("/listings/:id/reviews", reviews);



// 404 handler
app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!!!"));
});

// Error handler
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "There was an error on our side" } = err;
    res.status(statusCode).render("error", { message });
});

// Start server
app.listen(8080, () => {
    console.log("Server is listening on port 8080");
});
