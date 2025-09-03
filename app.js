// At the top of your app.js file
require('global-agent/bootstrap');
// Moved dotenv config here to ensure it always runs
if(process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const dbUrl = process.env.ATLASDB_URL;

async function main() {
    await mongoose.connect(dbUrl);
    console.log("connected to db");
}

main().catch(err => {
    console.error("Database connection error:", err);
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// Cache static assets
app.use(express.static(path.join(__dirname, "/public"), {
    maxAge: '1h',
    setHeaders: (res, path) => {
        if (path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
        } else if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.gif')) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
        }
    }
}));

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
    saveUninitialized: true,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Only use secure cookies in production
        sameSite: 'lax' // Protects against CSRF while allowing normal navigation
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

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// ROUTE ORDER
// The most specific routes should come first.
app.use("/listings/:id/reviews", reviewRouter);
app.use("/listings", listingRouter);
app.use("/", userRouter); // General routes come last

// 404 handler
app.all("*", (req, res, next) => {
    // Suppress Chrome DevTools probe requests from logging as errors
    if (req.originalUrl === '/.well-known/appspecific/com.chrome.devtools.json') {
        return res.status(204).end(); // No Content, no error
    }
    console.log(`[404] No route found for ${req.method} ${req.originalUrl}`);
    next(new ExpressError(404, "Page Not Found!!!"));
});

// Error handler
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "There was an error on our side" } = err;
    console.error(err.stack);
    res.status(statusCode).render("error", { message });
});

// Start server with port from environment variable or fallback to 8080
const startServer = (initialPort) => {
    const server = app.listen(initialPort)
        .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${initialPort} is busy, trying ${initialPort + 1}...`);
                startServer(initialPort + 1);
            } else {
                console.error('Server error:', err);
            }
        })
        .on('listening', () => {
            const actualPort = server.address().port;
            console.log(`Server is running at http://localhost:${actualPort}`);
        });
};

const initialPort = process.env.PORT || 8080;
startServer(initialPort);
