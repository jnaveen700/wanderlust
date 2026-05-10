const Listing = require("../models/listing.js");
const { generateSearchQuery, getManualRecommendations } = require("../utils/aiService.js");
const { wrapGeminiHandler } = require("../middleware/geminiErrorHandler.js");

module.exports.showRecommendationForm = (req, res) => {
    res.render("listing/aiRecommendation.ejs");
};

/**
 * Get AI recommendations with fallback support
 * Flow: Gemini 2.0 → Gemini 1.5 → Manual recommendations
 */
module.exports.getAIRecommendations = wrapGeminiHandler(async (req, res) => {
    try {
        const { userPreferences } = req.body;

        // Input validation
        if (!userPreferences || userPreferences.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please describe your travel preferences",
                code: "EMPTY_INPUT",
            });
        }

        // Generate search query from user preferences using AI
        // This handles: Gemini 2.0 → Gemini 1.5 → Manual fallback
        const result = await generateSearchQuery(userPreferences);

        // Check if using fallback recommendations
        const isFallback = result.fallback === true || result.code === "FALLBACK_RECOMMENDATIONS";

        if (!result.success && !isFallback) {
            // Actual error, not fallback
            return res.status(500).json({
                success: false,
                message: result.userFriendlyMessage || "Unable to process your preferences",
                code: result.code || "AI_PROCESSING_ERROR",
                fallback: false,
            });
        }

        // Build redirect URL with search parameters
        let searchUrl = `/listings/search?query=${encodeURIComponent(result.query)}`;

        // Handle countries filtering
        if (result.countries && result.countries.length > 0) {
            searchUrl += `&countries=${encodeURIComponent(result.countries.join(","))}`;
        }

        // Add fallback queries for smart fallback
        if (result.fallbackQueries && result.fallbackQueries.length > 0) {
            searchUrl += `&fallbackQueries=${encodeURIComponent(result.fallbackQueries.join(","))}`;
        }

        // Add category if available
        if (result.category) {
            searchUrl += `&category=${encodeURIComponent(result.category)}`;
        }

        // Log success with details
        const modelUsed = result.model || "fallback";
        const timestamp = new Date().toISOString();
        console.log(
            `[${timestamp}] AI Recommendation Success | Model: ${modelUsed} | Fallback: ${isFallback} | Query: "${result.query}"`
        );

        res.json({
            success: true,
            redirect: searchUrl,
            searchTerms: result,
            message: result.userFriendlyMessage,
            isFallback,
        });
    } catch (error) {
        // Catch any unexpected errors
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] Unexpected error in getAIRecommendations:`, error);

        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again with a simpler description.",
            code: "UNEXPECTED_ERROR",
            fallback: true,
        });
    }
});
