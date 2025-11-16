const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const sampleListings = require("./data.js").data;

async function seedDatabase() {
    try {
        // Check if listings already exist
        const existingListings = await Listing.countDocuments();
        const expectedListingCount = sampleListings.length;
        
        // Only seed if we have fewer listings than expected (allows adding new listings)
        if (existingListings >= expectedListingCount) {
            console.log("Database already seeded with", existingListings, "listings");
            return;
        }

        // Create a default user for listings owner
        let owner = await User.findOne({ username: "admin" });
        
        if (!owner) {
            owner = new User({
                username: "admin",
                email: "admin@wanderlust.com"
            });
            await User.register(owner, "admin123");
            console.log("Created admin user");
        }

        // Delete existing listings and reseed with complete list
        if (existingListings < expectedListingCount) {
            console.log(`Found ${existingListings} listings but expected ${expectedListingCount}. Reseeding...`);
            await Listing.deleteMany({});
        }

        // Prepare listings with owner
        const listingsToInsert = sampleListings.map(listing => ({
            ...listing,
            owner: owner._id
        }));

        // Insert listings
        await Listing.insertMany(listingsToInsert);
        console.log(`Seeded database with ${listingsToInsert.length} listings`);
        
    } catch (error) {
        console.error("Error seeding database:", error);
    }
}

module.exports = seedDatabase;
