const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuration
const CONFIG = {
    models: [
        { name: "gemini-2.0-flash", priority: 1, tokenLimit: 4000 },
        { name: "gemini-1.5-flash", priority: 2, tokenLimit: 4000 },
    ],
    maxRetries: 2,
    retryDelay: 1000, // ms
    retryBackoffMultiplier: 2,
    timeout: 30000, // 30 seconds
};

// Cache for fallback recommendations
const recommendationCache = new Map();

// Error categorization
class AIServiceError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = "AIServiceError";
        this.code = code; // 'QUOTA_EXCEEDED', 'NETWORK_ERROR', 'INVALID_INPUT', 'UNKNOWN'
        this.details = details;
        this.retryable = ["NETWORK_ERROR", "TEMPORARY_ERROR"].includes(code);
    }
}

/**
 * Sanitize user input to reduce token usage
 */
function sanitizeInput(text) {
    return text
        .trim()
        .replace(/\s+/g, " ") // Remove extra whitespace
        .substring(0, 300); // Limit to 300 chars
}

/**
 * Extract error code from API response
 */
function extractErrorCode(error) {
    const message = error.message || "";
    const status = error.status || error.statusCode;

    // Quota exceeded errors
    if (status === 429 || message.includes("quota") || message.includes("RESOURCE_EXHAUSTED")) {
        return "QUOTA_EXCEEDED";
    }

    // Network errors
    if (status >= 500 || message.includes("NETWORK") || message.includes("DEADLINE")) {
        return "NETWORK_ERROR";
    }

    // Invalid input
    if (status === 400 || message.includes("INVALID_ARGUMENT")) {
        return "INVALID_INPUT";
    }

    // Temporary errors
    if (status === 503 || message.includes("SERVICE_UNAVAILABLE")) {
        return "TEMPORARY_ERROR";
    }

    return "UNKNOWN";
}

/**
 * Log API errors with context
 */
function logAPIError(error, modelName, attempt, totalAttempts) {
    const errorCode = extractErrorCode(error);
    const timestamp = new Date().toISOString();

    console.error(
        `[${timestamp}] AI Service Error | Model: ${modelName} | Attempt: ${attempt}/${totalAttempts} | Code: ${errorCode} | Message: ${error.message}`
    );

    // Log detailed information for debugging
    if (process.env.DEBUG_AI_SERVICE === "true") {
        console.error("Error Details:", {
            status: error.status || error.statusCode,
            fullMessage: error.message,
            stack: error.stack?.substring(0, 200),
        });
    }
}

/**
 * Attempt to generate content with a specific model
 */
async function attemptGenerateContent(modelName, prompt, timeout = CONFIG.timeout) {
    const model = genAI.getGenerativeModel({ model: modelName });

    return Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) =>
            setTimeout(
                () => reject(new Error(`Request timeout after ${timeout}ms`)),
                timeout
            )
        ),
    ]);
}

/**
 * Generate search query with retry logic and model fallback
 */
async function generateSearchQuery(userDescription) {
    // Validate input
    if (!userDescription || userDescription.trim().length === 0) {
        const error = new AIServiceError(
            "User preferences are empty",
            "INVALID_INPUT"
        );
        return {
            success: false,
            error: error.message,
            code: error.code,
            userFriendlyMessage:
                "Please describe what kind of accommodation you're looking for.",
        };
    }

    const sanitized = sanitizeInput(userDescription);
    console.log(`[AI Service] Processing user input: "${sanitized}"`);

    // Combine prompts into one to reduce API calls
    const combinedPrompt = `You are an expert travel search assistant. Your task is to analyze the user's travel preferences and generate both corrected text AND intelligent search parameters.

STEP 1 - CORRECT THE TEXT:
Correct any spelling or grammar mistakes in the user input. Keep the meaning exactly the same.

STEP 2 - GENERATE SEARCH PARAMETERS:
Based on the corrected user input, extract:
1. "query" (string, 1-4 words): Main search terms capturing amenities, features, activities, locations, types of stays
2. "category" (string or null): ONLY if looking for specific TYPE (pool, mountain, castle, etc). Otherwise null.
3. "countries" (array): ALL relevant countries/regions:
   - If user says "Asia": [japan, thailand, bali, indonesia, vietnam, india, maldives, singapore, south korea, philippines]
   - If user says "Europe": [italy, france, spain, germany, greece, portugal, switzerland, austria, netherlands, belgium, england, uk, ireland, scotland, wales, poland]
   - Expand continents to all countries; include specific mentions
4. "fallbackQueries" (array): 2-3 semantically similar alternative searches if main one fails

Examples:
- "Resort in Asia" → {"corrected": "Resort in Asia", "query": "resort", "category": "pools", "countries": ["japan", "thailand", "bali", "indonesia", "vietnam"], "fallbackQueries": ["beach resort", "tropical resort"]}
- "Beach house in Europe" → {"corrected": "Beach house in Europe", "query": "beach house", "category": "pools", "countries": ["italy", "france", "spain", "greece"], "fallbackQueries": ["coastal villa", "beachfront cottage"]}

User's travel preferences: "${sanitized}"

IMPORTANT: Respond ONLY with valid JSON, no markdown or code blocks:
{"corrected": "...", "query": "...", "category": null, "countries": [...], "fallbackQueries": [...]}`;

    // Try each model with retry logic
    for (const model of CONFIG.models) {
        let lastError = null;

        for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
            try {
                console.log(
                    `[AI Service] Attempt ${attempt}/${CONFIG.maxRetries} with model: ${model.name}`
                );

                const result = await attemptGenerateContent(model.name, combinedPrompt);
                const response = await result.response;
                let text = response.text().trim();

                // Clean markdown code blocks
                text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

                // Parse JSON response
                const parsed = JSON.parse(text);

                console.log(
                    `[AI Service] ✓ Successfully generated recommendations with ${model.name}`
                );

                return {
                    success: true,
                    query: parsed.query || "",
                    category: parsed.category || null,
                    countries: Array.isArray(parsed.countries) ? parsed.countries : [],
                    fallbackQueries: Array.isArray(parsed.fallbackQueries)
                        ? parsed.fallbackQueries
                        : [],
                    correctedInput: parsed.corrected || sanitized,
                    model: model.name,
                };
            } catch (error) {
                lastError = error;
                const errorCode = extractErrorCode(error);

                logAPIError(error, model.name, attempt, CONFIG.maxRetries);

                // If quota exceeded, skip to next model immediately
                if (errorCode === "QUOTA_EXCEEDED") {
                    console.log(
                        `[AI Service] Quota exceeded on ${model.name}, switching to next model...`
                    );
                    break; // Exit retry loop, try next model
                }

                // For retryable errors, wait before retrying
                if (error.retryable !== false && attempt < CONFIG.maxRetries) {
                    const delay = CONFIG.retryDelay * Math.pow(CONFIG.retryBackoffMultiplier, attempt - 1);
                    console.log(`[AI Service] Retrying after ${delay}ms...`);
                    await sleep(delay);
                }
            }
        }

        // If we exhausted retries on this model, try next one
        if (lastError) {
            const errorCode = extractErrorCode(lastError);
            if (errorCode === "QUOTA_EXCEEDED") {
                console.log(`[AI Service] Moving to fallback model after quota exceeded`);
            }
        }
    }

    // All models failed - return cached or manual recommendations
    console.log(
        `[AI Service] ✗ All models exhausted. Using fallback recommendations.`
    );

    return getManualRecommendations(sanitized);
}

/**
 * Generate manual/cached recommendations when API fails
 */
function getManualRecommendations(userInput) {
    const { generateFallbackRecommendations } = require("./fallbackRecommendations.js");
    return generateFallbackRecommendations(userInput);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    generateSearchQuery,
    getManualRecommendations,
    AIServiceError,
    CONFIG,
};
