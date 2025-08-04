const express = require('express');
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const {isLoggedIn , isOwner, validateListing} = require("../middleware.js");
const listingsController = require("../controllers/listings.js");
const multer = require("multer");
const {cloudinary, storage} = require("../cloudConfing.js");
const upload = multer({ storage });

router
    .route("/")
    // Index route
    .get(wrapAsync(listingsController.index))
    //createListing
    .post(upload.single("image") , validateListing ,isLoggedIn,wrapAsync(listingsController.createListing)
);


// New form route
router.get("/new", isLoggedIn , listingsController.renderNewForm);

router.route("/:id")
    //showListings
    .get(wrapAsync(listingsController.showListing))
    //updateListings
    .put(isLoggedIn, isOwner, listingsController.updateListing)
    // Delete listing
    .delete(isLoggedIn ,isOwner, wrapAsync(listingsController.destroyListing)
);


// Show listing
router


// Edit form
router.get("/:id/edit", isLoggedIn ,isOwner,  wrapAsync(listingsController.renderEditForm));


module.exports = router;