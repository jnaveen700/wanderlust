const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: String,
    image: {
        type: {
            filename: { type: String, default: "default-image" },
            url: {
                type: String,
                default: "https://images.unsplash.com/photo-1618005182384-a79c56be0d88",
            },
        },
        default: {}, // Ensures the field is always an object
    },
    price: Number,
    location: String,
    country: String,
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review",
        },
    ], 
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
