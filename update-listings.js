const mongoose = require('mongoose');
const Listing = require('./models/listing');
const NodeGeocoder = require('node-geocoder');

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

async function main() {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to database for listing updates.");
}

main().catch(err => console.log(err));

// 🚨 NEW CODE: Add a custom user-agent to the options
const options = {
    provider: 'openstreetmap',
    // It's a good practice to include a descriptive user agent to adhere to the provider's policy
    userAgent: 'Wanderlust-Geocoding-Service'
};
const geocoder = NodeGeocoder(options);

// Helper function to create a delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function updateAllListings() {
    try {
        console.log("Finding listings without coordinates...");
        const listings = await Listing.find({ 'geometry.coordinates': { $exists: false } });

        if (listings.length === 0) {
            console.log("All listings already have coordinates. No updates needed.");
            return;
        }

        console.log(`Found ${listings.length} listings to update.`);

        for (let listing of listings) {
            try {
                // Add a small delay between each request to avoid being blocked
                await delay(2000); // Wait for 2 seconds

                const fullAddress = `${listing.location}, ${listing.country}`;
                const geocodingResponse = await geocoder.geocode(fullAddress);

                if (geocodingResponse && geocodingResponse.length > 0) {
                    listing.geometry = {
                        type: "Point",
                        coordinates: [geocodingResponse[0].longitude, geocodingResponse[0].latitude]
                    };
                    await listing.save();
                    console.log(`Updated coordinates for listing: "${listing.title}"`);
                } else {
                    console.warn(`Could not geocode address for listing: "${listing.title}"`);
                }
            } catch (err) {
                console.error(`Error geocoding listing "${listing.title}":`, err);
            }
        }
        console.log("All listings have been processed.");
    } catch (err) {
        console.error("An error occurred during the update:", err);
    } finally {
        mongoose.disconnect();
        console.log("Disconnected from database.");
    }
}

updateAllListings();