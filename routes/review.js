const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const { isLoggedIn, validateReview ,isReviewAuthor } = require("../middleware.js");
const reviewsController = require("../controllers/review.js");

// Create review
router.post("/", isLoggedIn, validateReview, wrapAsync(function(req, res, next) {
    return reviewsController.createReviews(req, res, next);
}));

// Delete review
router.delete("/:reviewId", isLoggedIn, isReviewAuthor, wrapAsync(function(req, res, next) {
    return reviewsController.destroyReviews(req, res, next);
}));

module.exports = router;
