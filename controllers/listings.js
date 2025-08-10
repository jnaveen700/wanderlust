const Listing = require('../models/listing.js');
const NodeGeocoder = require('node-geocoder');

// User-Agent header for the geocoding service to avoid being blocked.
const options = {
    provider: 'openstreetmap',
    httpAdapter: 'https',
    headers: {
        'User-Agent': 'Wanderlust-App/1.0 (your-email@example.com)' // It's good practice to use a real contact email here.
    }
};

const geocoder = require('node-geocoder')(options);

// MERGED: A single, powerful index function to handle both all listings and category filters.
module.exports.index = async (req, res) => {
    let filter = {}; // Default is no filter

    // Check if a category query parameter exists and add it to the filter
    if (req.query.category) {
        filter.category = req.query.category.toLowerCase();
    }

    const allListings = await Listing.find(filter);
    res.render("listing/index", { allListings });
};


module.exports.renderNewForm = (req, res) => {
    res.render("listing/new");
};

module.exports.showListing = async (req, res) => {
    const { id } = req.params;
    // This is a great use of populate to get all the related data at once!
    const listing = await Listing.findById(id).populate({
        path: "reviews",
        populate: {
            path: "author",
        }
    }).populate("owner");

    if (!listing) {
        req.flash("error", "The listing you requested does not exist!");
        return res.redirect("/listings");
    }

    res.render("listing/show", { listing });
};

module.exports.createListing = async (req, res, next) => {
    const fullAddress = `${req.body.listing.location}, ${req.body.listing.country}`;
    const geocodingResponse = await geocoder.geocode(fullAddress);

    // Robust check to make sure we got valid coordinates
    if (!Array.isArray(geocodingResponse) || geocodingResponse.length === 0) {
        req.flash("error", "Could not find coordinates for that location. Please try a different address.");
        return res.redirect("/listings/new");
    }

    // Create the new listing. Mongoose will apply the default image here.
    const newListing = new Listing(req.body.listing);
    
    newListing.geometry = {
        type: "Point",
        coordinates: [geocodingResponse[0].longitude, geocodingResponse[0].latitude]
    };
    
    newListing.owner = req.user._id;

    // 🚨 NEW LOGIC: Overwrite the default image ONLY if a new file was uploaded.
    if (req.file) {
        let url = req.file.path;
        let filename = req.file.filename;
        newListing.image = { url, filename };
    }

    await newListing.save();
    req.flash("success", "New listing created successfully!!!");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "The listing you requested to edit does not exist!");
        return res.redirect("/listings");
    }

    // Smart way to get a smaller image for the edit page!
    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload","/upload/w_250");
    res.render("listing/edit", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
    const { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    // This check correctly handles updating the image only if a new one is provided.
    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }

    req.flash("success", "Listing updated successfully!");
    res.redirect(`/listings/${id}`);
};

// This search function looks solid!
module.exports.searchListings = async (req, res) => {
    const { query } = req.query; // Get the search query from the URL
    const allListings = await Listing.find({
        $or: [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
            { location: { $regex: query, $options: "i" } },
            { country: { $regex: query, $options: "i" } },
        ],
    });
    res.render("listing/index", { allListings });
};

module.exports.destroyListing = async (req, res) => {
    const { id } = req.params;
    const deletedListing = await Listing.findByIdAndDelete(id);

    if (!deletedListing) {
        req.flash("error", "The listing you requested to delete does not exist!");
        return res.redirect("/listings");
    }

    req.flash("success", "Listing deleted successfully!");
    res.redirect("/listings");
};
