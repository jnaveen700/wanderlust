const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const review = require("./review.js");
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

listingSchema.post("findOneAndDelete", async(listing)=>{
   if(listing){
     await review.deleteMany({_id : {$in : listing.reviews}});
   }
});


const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
