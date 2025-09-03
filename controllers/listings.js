const Listing = require('../models/listing.js');
const NodeGeocoder = require('node-geocoder');

// User-Agent header for the geocoding service to avoid being blocked.
const options = {
    provider: 'openstreetmap',
    httpAdapter: 'https',
    headers: {
        'User-Agent': 'Wanderlust-App/1.0 (support@wanderlust.com)'
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
    try {
        const fullAddress = `${req.body.listing.location}, ${req.body.listing.country}`;
        
        // Add retry logic for geocoding
        let geocodingResponse;
        let retries = 3;
        while (retries > 0) {
            try {
                geocodingResponse = await geocoder.geocode(fullAddress);
                break;
            } catch (error) {
                retries--;
                if (retries === 0) {
                    throw new Error('Geocoding service is not responding. Please try again later.');
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
        }

        // Validate geocoding response
        if (!Array.isArray(geocodingResponse) || geocodingResponse.length === 0) {
            req.flash("error", "Could not find coordinates for that location. Please verify the address and try again.");
            return res.redirect("/listings/new");
        }

        if (!geocodingResponse[0].latitude || !geocodingResponse[0].longitude) {
            req.flash("error", "Invalid location coordinates received. Please try a different address.");
            return res.redirect("/listings/new");
        }

        // Create the new listing. Mongoose will apply the default image here.
        const newListing = new Listing(req.body.listing);
        
        newListing.geometry = {
            type: "Point",
            coordinates: [geocodingResponse[0].longitude, geocodingResponse[0].latitude]
        };
        
        newListing.owner = req.user._id;

        if (req.file) {
            let url = req.file.path;
            let filename = req.file.filename;
            newListing.image = { url, filename };
        }

        await newListing.save();
        req.flash("success", "New listing created successfully!!!");
        res.redirect("/listings");
    } catch (error) {
        console.error('Error creating listing:', error);
        req.flash("error", error.message || "Failed to create listing. Please try again.");
        res.redirect("/listings/new");
    }
    
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
    try {
        const { id } = req.params;
        
        // Make sure category is lowercase for consistency
        if (req.body.listing.category) {
            req.body.listing.category = req.body.listing.category.toLowerCase();
        }

        let listing = await Listing.findByIdAndUpdate(id, 
            { ...req.body.listing },
            { new: true, runValidators: true }
        );

        // Update coordinates if location or country changed
        if (req.body.listing.location || req.body.listing.country) {
            const fullAddress = `${listing.location}, ${listing.country}`;
            try {
                const geocodingResponse = await geocoder.geocode(fullAddress);
                if (Array.isArray(geocodingResponse) && geocodingResponse.length > 0) {
                    listing.geometry = {
                        type: "Point",
                        coordinates: [geocodingResponse[0].longitude, geocodingResponse[0].latitude]
                    };
                }
            } catch (error) {
                console.error('Geocoding error:', error);
                // Don't block the update if geocoding fails
            }
        }

        // This check correctly handles updating the image only if a new one is provided.
        if (typeof req.file !== "undefined") {
            let url = req.file.path;
            let filename = req.file.filename;
            listing.image = { url, filename };
        }

        await listing.save();
        req.flash("success", "Listing updated successfully!");
        res.redirect(`/listings/${id}`);
    } catch (error) {
        console.error('Update error:', error);
        req.flash("error", "Error updating listing. Please try again.");
        res.redirect(`/listings/${id}/edit`);
    }
};

// Enhanced search function with better error handling and category support
module.exports.searchListings = async (req, res) => {
    try {
        console.log('Search request:', req.query);
        const { query, category } = req.query;
        let searchQuery = {};

        // If no search criteria, show all listings
        if (!query && !category) {
            console.log('No search criteria, showing all listings');
            const allListings = await Listing.find({});
            return res.render("listing/index", { allListings });
        }

        // Build search query
        if (query && query.trim()) {
            searchQuery.$or = [
                { title: { $regex: new RegExp(query.trim(), 'i') } },
                { description: { $regex: new RegExp(query.trim(), 'i') } },
                { location: { $regex: new RegExp(query.trim(), 'i') } },
                { country: { $regex: new RegExp(query.trim(), 'i') } }
            ];
        }

        if (category) {
            if (query) {
                // If we have both query and category, we need to ensure both conditions are met
                searchQuery = {
                    $and: [
                        { category: category.toLowerCase() },
                        { $or: searchQuery.$or }
                    ]
                };
            } else {
                // If we only have category, just filter by that
                searchQuery.category = category.toLowerCase();
            }
        }

        console.log('Final search query:', JSON.stringify(searchQuery, null, 2));
        const allListings = await Listing.find(searchQuery);
        
        console.log(`Found ${allListings.length} listings`);
        if (allListings.length === 0) {
            req.flash("error", "No listings found matching your search criteria.");
            return res.redirect('/listings');
        }

        return res.render("listing/index", { 
            allListings,
            searchQuery: query,
            activeCategory: category
        });
    } catch (error) {
        console.error('Search error:', error);
        req.flash("error", "An error occurred while searching. Please try again.");
        return res.redirect('/listings');
    }
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
