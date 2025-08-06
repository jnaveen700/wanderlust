const Listing = require('../models/listing.js');

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listing/index", { allListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listing/new");
};

module.exports.showListing = async (req, res) => {
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
    res.render("listing/show", { listing });
};

module.exports.createListing = async (req, res , next) => {
    let url = req.file.path;
    let filename = req.file.filename;
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = {
        url: url,
        filename: filename
    }
    await newListing.save();
    req.flash("success", "New listing created successfully!!!");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload","/upload/,w_250");
    res.render("listing/edit", { listing , originalImageUrl});
};

module.exports.updateListing = async (req, res) => {
    const { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, req.body.listing, { new: true }); 
    // Check if a file was uploaded
    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;

        listing.image = {
            url: url,
            filename: filename
        };
    await listing.save();}
    req.flash("success", "Listing updated successfully!");
    res.redirect(`/listings/${listing._id}`);
};


module.exports.destroyListing = async (req, res) => {
    const { id } = req.params;
    const deletedListing = await Listing.findByIdAndDelete(id);
    if (!deletedListing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }
    req.flash("success", "Listing deleted successfully!");
    res.redirect("/listings");
};