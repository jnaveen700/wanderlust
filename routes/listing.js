const express = require('express');
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const {isLoggedIn , isOwner, validateListing} = require("../middleware.js");
const listingsController = require("../controllers/listings.js");

// Index route
router.get("/", wrapAsync(listingsController.index));

// New form route
router.get("/new", isLoggedIn , listingsController.renderNewForm);

// Show listing
router.get("/:id", wrapAsync(listingsController.showListing));


// Create listing   
router.post("/", validateListing, wrapAsync(listingsController.createListing));

// Edit form
router.get("/:id/edit", isLoggedIn ,isOwner,  wrapAsync(listingsController.renderEditForm));

// Update listing
router.put("/:id", isLoggedIn, isOwner, listingsController.updateListing);

// Delete listing
router.delete("/:id",isLoggedIn ,isOwner, wrapAsync(listingsController.destroyListing));


module.exports = router;