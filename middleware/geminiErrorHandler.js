/**
 * Gemini API Error Handler Middleware
 * Handles 429 quota exceeded, network failures, and other API-specific errors
 * Returns user-friendly error messages without crashing the server
 */

/**
 * Error response mapper - converts error codes to user-friendly messages
 */
const ERROR_RESPONSES = {
    QUOTA_EXCEEDED: {
        statusCode: 503,
        message: "Our AI service is currently experiencing high demand. Please try again in a few moments.",
        code: "SERVICE_OVERLOADED",
        retryAfter: 60,
    },
    NETWORK_ERROR: {
        statusCode: 502,
        message: "Connection error to AI service. Your request will use our recommended options instead.",
        code: "CONNECTION_ERROR",
        retryAfter: 30,
    },
    TEMPORARY_ERROR: {
        statusCode: 503,
        message: "AI service temporarily unavailable. We're showing you curated recommendations instead.",
        code: "SERVICE_TEMPORARILY_UNAVAILABLE",
        retryAfter: 45,
    },
    INVALID_INPUT: {
        statusCode: 400,
        message: "Please provide a valid description of your travel preferences.",
        code: "INVALID_INPUT",
    },
    TIMEOUT: {
        statusCode: 504,
        message: "Request took too long. Please try again with a shorter description.",
        code: "REQUEST_TIMEOUT",
        retryAfter: 30,
    },
    UNKNOWN: {
        statusCode: 500,
        message: "An unexpected error occurred. We're providing alternative recommendations.",
        code: "UNKNOWN_ERROR",
        retryAfter: 60,
    },
};

/**
 * Parse error and determine appropriate response
 */
function parseAPIError(error) {
    const message = error.message || "";
    const status = error.status || error.statusCode;

    // Quota exceeded - most common free-tier issue
    if (status === 429 || message.includes("quota") || message.includes("RESOURCE_EXHAUSTED")) {
        return "QUOTA_EXCEEDED";
    }

    // Network/connectivity issues
    if (
        status >= 500 ||
        message.includes("NETWORK_ERROR") ||
        message.includes("ECONNREFUSED") ||
        message.includes("ETIMEDOUT") ||
        message.includes("ENOTFOUND")
    ) {
        return "NETWORK_ERROR";
    }

    // Service temporarily unavailable
    if (status === 503 || message.includes("SERVICE_UNAVAILABLE")) {
        return "TEMPORARY_ERROR";
    }

    // Timeout errors
    if (message.includes("timeout") || message.includes("DEADLINE_EXCEEDED")) {
        return "TIMEOUT";
    }

    // Invalid input
    if (status === 400 || message.includes("INVALID_ARGUMENT")) {
        return "INVALID_INPUT";
    }

    return "UNKNOWN";
}

/**
 * Log error with context for debugging
 */
function logGeminiError(error, errorCode, userInput = null) {
    const timestamp = new Date().toISOString();
    const sanitizedInput = userInput ? userInput.substring(0, 100) : "N/A";

    console.error(
        `[${timestamp}] Gemini API Error | Code: ${errorCode} | Input: "${sanitizedInput}" | Message: ${error.message}`
    );

    // Detailed logging for debugging (when DEBUG enabled)
    if (process.env.DEBUG_AI_SERVICE === "true") {
        console.error("Full Error Details:", {
            status: error.status || error.statusCode || "N/A",
            originalError: error.message,
            errorCode,
            stack: error.stack ? error.stack.substring(0, 300) : "N/A",
        });
    }
}

/**
 * Main error handler middleware factory
 * Use this to wrap your AI routes
 */
function createGeminiErrorHandler(userInputExtractor = null) {
    return (err, req, res, next) => {
        // Only handle our custom AI service errors
        if (!err.name && !err.code && !err.message) {
            return next(err);
        }

        // Extract error type
        const errorCode = err.code || parseAPIError(err);
        const errorResponse = ERROR_RESPONSES[errorCode] || ERROR_RESPONSES.UNKNOWN;

        // Extract user input for logging (optional helper function)
        let userInput = null;
        if (userInputExtractor && typeof userInputExtractor === "function") {
            userInput = userInputExtractor(req);
        } else {
            userInput = req.body?.userPreferences || req.query?.query || null;
        }

        // Log the error
        logGeminiError(err, errorCode, userInput);

        // Prepare response
        const response = {
            success: false,
            error: errorResponse.code,
            message: errorResponse.message,
            fallback: true, // Indicate that frontend should use fallback UI
        };

        // Add retry-after header for rate limit errors
        if (errorResponse.retryAfter) {
            res.set("Retry-After", errorResponse.retryAfter);
            response.retryAfter = errorResponse.retryAfter;
        }

        // Send response
        return res.status(errorResponse.statusCode).json(response);
    };
}

/**
 * Wrapped async handler that catches and properly handles Gemini errors
 * Use this to wrap your route handlers
 */
function wrapGeminiHandler(fn) {
    return async (req, res, next) => {
        try {
            return await fn(req, res, next);
        } catch (error) {
            // Log and send user-friendly error
            const errorCode = parseAPIError(error);
            const errorResponse = ERROR_RESPONSES[errorCode] || ERROR_RESPONSES.UNKNOWN;
            const userInput = req.body?.userPreferences || req.query?.query || null;

            logGeminiError(error, errorCode, userInput);

            const response = {
                success: false,
                error: errorResponse.code,
                message: errorResponse.message,
                fallback: true,
            };

            if (errorResponse.retryAfter) {
                res.set("Retry-After", errorResponse.retryAfter);
                response.retryAfter = errorResponse.retryAfter;
            }

            return res.status(errorResponse.statusCode).json(response);
        }
    };
}

module.exports = {
    createGeminiErrorHandler,
    wrapGeminiHandler,
    parseAPIError,
    logGeminiError,
    ERROR_RESPONSES,
};
