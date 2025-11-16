const Listing = require("../models/listing.js");
const { generateSearchQuery } = require("../utils/aiService.js");

module.exports.showRecommendationForm = (req, res) => {
    res.render("listing/aiRecommendation.ejs");
};

module.exports.getAIRecommendations = async (req, res) => {
    try {
        const { userPreferences } = req.body;

        if (!userPreferences || userPreferences.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please describe your travel preferences",
            });
        }

        // Generate search query from user preferences using AI
        const result = await generateSearchQuery(userPreferences);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: "Error processing your preferences",
                error: result.error,
            });
        }

        // Build redirect URL with search parameters
        let searchUrl = `/listings/search?query=${encodeURIComponent(result.query)}`;
        
        // Handle countries filtering
        if (result.countries && result.countries.length > 0) {
            searchUrl += `&countries=${encodeURIComponent(result.countries.join(','))}`;
        }
        
        // Add fallback queries for smart fallback
        if (result.fallbackQueries && result.fallbackQueries.length > 0) {
            searchUrl += `&fallbackQueries=${encodeURIComponent(result.fallbackQueries.join(','))}`;
        }
        
        if (result.category) {
            searchUrl += `&category=${encodeURIComponent(result.category)}`;
        }

        res.json({
            success: true,
            redirect: searchUrl,
            searchTerms: result,
        });
    } catch (error) {
        console.error("Error in getAIRecommendations:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while processing your preferences",
            error: error.message,
        });
    }
};
