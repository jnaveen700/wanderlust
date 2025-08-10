const express = require('express');
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const {isLoggedIn , isOwner, validateListing} = require("../middleware.js");
const listingsController = require("../controllers/listings.js");
const multer = require("multer");
const {cloudinary, storage} = require("../cloudConfing.js");
const upload = multer({ storage });

// Combined Index and Create routes
router
    .route("/")
    .get(wrapAsync(listingsController.index)) // Index route
    .post(isLoggedIn, upload.single("image"), validateListing, wrapAsync(listingsController.createListing)); // Create route

// Search route - specific, so it comes before general routes
router.get("/search", wrapAsync(listingsController.searchListings));

// New form route - specific, so it comes before routes with /:id
router.get("/new", isLoggedIn , listingsController.renderNewForm);

// Edit form route - MORE SPECIFIC, so it must come BEFORE the general /:id route
router.get("/:id/edit", isLoggedIn ,isOwner,  wrapAsync(listingsController.renderEditForm));

// Combined Show, Update, and Delete routes - This is a general route with a parameter, so it comes last.
router.route("/:id")
    .get(wrapAsync(listingsController.showListing)) // Show route
    .put(isLoggedIn, isOwner, upload.single("image"), validateListing, wrapAsync(listingsController.updateListing)) // Update route
    .delete(isLoggedIn, isOwner, wrapAsync(listingsController.destroyListing)); // Delete route

module.exports = router;
