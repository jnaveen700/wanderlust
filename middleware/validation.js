const { body, validationResult } = require('express-validator');

const validateListing = [
    body('listing.title').trim().notEmpty().withMessage('Title is required')
        .isLength({ max: 100 }).withMessage('Title must be less than 100 characters'),
    body('listing.description').trim().optional()
        .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    body('listing.price').isNumeric().withMessage('Price must be a number')
        .isFloat({ min: 0 }).withMessage('Price cannot be negative'),
    body('listing.location').trim().notEmpty().withMessage('Location is required'),
    body('listing.country').trim().notEmpty().withMessage('Country is required'),
    body('listing.category').trim().isIn(['trending', 'rooms', 'iconic cities', 'mountains', 'castles', 'pools', 'camping', 'arctic', 'forests', 'miscellaneous'])
        .withMessage('Invalid category'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array().map(e => e.msg).join(', '));
            return res.redirect('back');
        }
        next();
    }
];

const validateReview = [
    body('review.rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review.comment').trim().notEmpty().withMessage('Comment is required')
        .isLength({ max: 500 }).withMessage('Comment must be less than 500 characters'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array().map(e => e.msg).join(', '));
            return res.redirect('back');
        }
        next();
    }
];

module.exports = {
    validateListing,
    validateReview
};
