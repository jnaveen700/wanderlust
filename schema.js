const Joi = require('joi');

const listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        price: Joi.number().required().min(0),
        location: Joi.string().required(),
        country: Joi.string().required(),
        image: Joi.string().optional(),
        category: Joi.string().valid('trending', 'rooms', 'iconic cities', 'mountains', 'castles', 'pools', 'camping', 'arctic', 'forests', 'miscellaneous').default('miscellaneous')
    }).required()
});

const reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        comment: Joi.string().required(),
    }).required(),
});

module.exports = {
  listingSchema,
  reviewSchema,
};