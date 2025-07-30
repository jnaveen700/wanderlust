const express = require('express');
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const {isLoggedIn , isOwner, validateListing} = require("../middleware.js");


// Index route
router.get("/", wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listing/index", { allListings });
}));

// New form route
router.get("/new", isLoggedIn ,(req, res) => {
    res.render("listing/new");
});

// Show listing
router.get("/:id", wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id).populate({
        path: "reviews",
        populate: {
            path: "author",
        }
    }).populate("owner");
    if (!listing) {
        req.flash("error", "Listing not found!");
        res.redirect("/listings");
    }
    console.log(listing);
    res.render("listing/show", { listing });
}));


// Create listing   
router.post("/", validateListing, wrapAsync(async (req, res , next) => {
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    await newListing.save();
    req.flash("success", "New listing created successfully!!!");
    res.redirect("/listings");
}));

// Edit form
router.get("/:id/edit", isLoggedIn ,isOwner,  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing not found!");
        res.redirect("/listings");
    }
    res.render("listing/edit", { listing });
}));

// Update listing
router.put("/:id", isLoggedIn, isOwner, async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findByIdAndUpdate(id, req.body.listing, { new: true });
    req.flash("success", "Listing updated successfully!");
    res.redirect(`/listings/${listing._id}`);
});


// Delete listing
// Delete listing
router.delete("/:id",isLoggedIn ,isOwner, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const deletedListing = await Listing.findByIdAndDelete(id);
    if (!deletedListing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }
    req.flash("success", "Listing deleted successfully!");
    res.redirect("/listings");
}));


module.exports = router;