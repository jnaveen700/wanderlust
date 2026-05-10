/**
 * Fallback Recommendations Manager
 * Handles cached recommendations and manual fallback strategies when AI service fails.
 * Provides intelligent suggestions based on limited keywords without requiring API calls.
 */

/**
 * Curated recommendation categories
 */
const CURATED_RECOMMENDATIONS = {
    pools: {
        category: "pools",
        description: "Beach & Water",
        keywords: ["beach", "pool", "water", "ocean", "sea", "resort", "villa"],
        query: "beach resort pool",
        countries: ["maldives", "bali", "thailand", "mexico", "caribbean"],
        fallbackQueries: ["waterfront property", "coastal villa", "beach house"],
    },
    mountains: {
        category: "mountains",
        description: "Mountain & Alpine",
        keywords: ["mountain", "hill", "ski", "alpine", "hiking", "trek", "peak"],
        query: "mountain cabin lodge",
        countries: ["switzerland", "austria", "nepal", "colorado", "japan"],
        fallbackQueries: ["alpine lodge", "mountain view", "scenic cabin"],
    },
    castles: {
        category: "castles",
        description: "Historic & Heritage",
        keywords: ["castle", "historic", "old", "antique", "palace", "fortress", "medieval"],
        query: "historic castle palace",
        countries: ["france", "scotland", "germany", "spain", "italy"],
        fallbackQueries: ["historic property", "heritage site", "vintage manor"],
    },
    cities: {
        category: "iconic cities",
        description: "Urban & City Experience",
        keywords: ["city", "urban", "apartment", "downtown", "modern", "loft", "penthouse"],
        query: "city apartment urban",
        countries: ["usa", "france", "japan", "uk", "australia"],
        fallbackQueries: ["downtown loft", "urban apartment", "city center home"],
    },
    camping: {
        category: "camping",
        description: "Outdoor & Camping",
        keywords: ["camping", "tent", "outdoor", "nature", "wilderness", "camp", "glamping"],
        query: "camping glamping tent",
        countries: ["usa", "canada", "australia", "norway", "new zealand"],
        fallbackQueries: ["glamping resort", "nature retreat", "outdoor adventure"],
    },
    forests: {
        category: "forests",
        description: "Forest & Nature",
        keywords: ["forest", "woods", "nature", "cabin", "retreat", "quiet", "peaceful"],
        query: "forest cabin retreat",
        countries: ["canada", "scandinavia", "germany", "usa", "finland"],
        fallbackQueries: ["forest cottage", "nature cabin", "woodland retreat"],
    },
    default: {
        category: null,
        description: "Amazing Stays",
        keywords: [],
        query: "accommodation vacation",
        countries: ["usa", "france", "italy", "spain", "mexico"],
        fallbackQueries: ["vacation rental", "holiday home", "travel destination"],
    },
};

/**
 * Curated country data for intelligent fallback
 */
const COUNTRY_INFO = {
    asia: {
        expand: [
            "japan",
            "thailand",
            "bali",
            "indonesia",
            "vietnam",
            "india",
            "maldives",
            "singapore",
            "south korea",
            "philippines",
        ],
        description: "Asian destinations",
    },
    europe: {
        expand: [
            "italy",
            "france",
            "spain",
            "germany",
            "greece",
            "portugal",
            "switzerland",
            "austria",
            "netherlands",
            "belgium",
            "england",
            "uk",
            "ireland",
            "scotland",
            "wales",
            "poland",
        ],
        description: "European destinations",
    },
    africa: {
        expand: [
            "egypt",
            "south africa",
            "morocco",
            "kenya",
            "tanzania",
            "rwanda",
            "uganda",
            "botswana",
            "namibia",
            "ethiopia",
        ],
        description: "African destinations",
    },
    americas: {
        expand: [
            "usa",
            "canada",
            "mexico",
            "caribbean",
            "brazil",
            "argentina",
            "peru",
            "colombia",
            "costa rica",
        ],
        description: "Americas destinations",
    },
    oceania: {
        expand: ["australia", "new zealand", "fiji", "samoa", "tonga"],
        description: "Oceania destinations",
    },
};

/**
 * Analyze user input and suggest best matching category
 */
function categorizeUserInput(userInput) {
    if (!userInput) {
        return CURATED_RECOMMENDATIONS.default;
    }

    const inputLower = userInput.toLowerCase();
    let bestMatch = CURATED_RECOMMENDATIONS.default;
    let matchCount = 0;

    // Check each category for keyword matches
    for (const [key, category] of Object.entries(CURATED_RECOMMENDATIONS)) {
        if (key === "default") continue;

        const matches = category.keywords.filter((keyword) =>
            inputLower.includes(keyword)
        ).length;

        if (matches > matchCount) {
            matchCount = matches;
            bestMatch = category;
        }
    }

    return bestMatch;
}

/**
 * Extract countries from user input
 */
function extractCountries(userInput) {
    if (!userInput) {
        return CURATED_RECOMMENDATIONS.default.countries;
    }

    const inputLower = userInput.toLowerCase();
    let countries = [];

    // Check for continent keywords
    for (const [continent, info] of Object.entries(COUNTRY_INFO)) {
        if (inputLower.includes(continent)) {
            return info.expand;
        }
    }

    // Check for specific country keywords
    const countryKeywords = {
        japan: ["japan", "tokyo", "kyoto", "osaka"],
        thailand: ["thailand", "bangkok", "phuket"],
        bali: ["bali", "indonesia"],
        india: ["india", "delhi", "goa"],
        maldives: ["maldives"],
        singapore: ["singapore"],
        france: ["france", "paris", "lyon", "provence"],
        italy: ["italy", "rome", "venice", "florence", "tuscany"],
        spain: ["spain", "madrid", "barcelona"],
        germany: ["germany", "berlin", "bavaria"],
        greece: ["greece", "athens", "santorini"],
        portugal: ["portugal", "lisbon"],
        switzerland: ["switzerland", "alps"],
        uk: ["uk", "england", "scotland", "london"],
        ireland: ["ireland", "dublin"],
        usa: ["usa", "america", "california", "new york", "florida"],
        mexico: ["mexico", "cancun"],
        canada: ["canada", "vancouver", "toronto"],
        australia: ["australia", "sydney"],
    };

    for (const [country, aliases] of Object.entries(countryKeywords)) {
        if (aliases.some((alias) => inputLower.includes(alias))) {
            countries.push(country);
        }
    }

    return countries.length > 0 ? countries : CURATED_RECOMMENDATIONS.default.countries;
}

/**
 * Generate fallback recommendations based on user input
 * This is used when Gemini API fails or quota is exceeded
 */
function generateFallbackRecommendations(userInput) {
    const category = categorizeUserInput(userInput);
    const countries = extractCountries(userInput);

    const timestamp = new Date().toISOString();
    console.log(
        `[${timestamp}] Using fallback recommendations | Category: ${category.category || "default"} | Countries: ${countries.join(", ")}`
    );

    return {
        success: false,
        fallback: true,
        code: "FALLBACK_RECOMMENDATIONS",
        userFriendlyMessage:
            "We're experiencing high demand on our AI service. Here are our curated recommendations based on your interests:",
        query: category.query,
        category: category.category,
        countries,
        fallbackQueries: category.fallbackQueries,
        correctedInput: userInput,
        categoryDescription: category.description,
    };
}

/**
 * Get trending recommendations (universal fallback)
 */
function getTrendingRecommendations() {
    return {
        success: false,
        fallback: true,
        code: "TRENDING_RECOMMENDATIONS",
        userFriendlyMessage: "Here are our trending destinations right now:",
        query: "trending accommodation",
        category: "trending",
        countries: ["usa", "france", "italy", "spain", "mexico", "japan", "thailand"],
        fallbackQueries: ["popular destinations", "recommended stays", "top rated homes"],
    };
}

/**
 * Cache manager for storing frequently used recommendations
 */
class RecommendationCache {
    constructor(maxSize = 100, ttl = 3600000) {
        // 1 hour default TTL
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            // Remove oldest entry (FIFO)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        });
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    clear() {
        this.cache.clear();
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttl: this.ttl,
        };
    }
}

// Export singleton cache instance
const cache = new RecommendationCache();

module.exports = {
    generateFallbackRecommendations,
    getTrendingRecommendations,
    categorizeUserInput,
    extractCountries,
    RecommendationCache,
    cache,
    CURATED_RECOMMENDATIONS,
    COUNTRY_INFO,
};
