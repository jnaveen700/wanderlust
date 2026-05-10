/**
 * AI Service Health Check
 * Provides health status and metrics about the AI recommendation system
 */

const { metricsTracker } = require("./logger.js");

/**
 * Parse Gemini API status from response
 */
function checkAPIConfig() {
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    return {
        configured: hasApiKey,
        keyLength: hasApiKey ? process.env.GEMINI_API_KEY.length : 0,
    };
}

/**
 * Get current health status
 */
function getHealthStatus() {
    const metrics = metricsTracker.getMetrics();
    const apiConfig = checkAPIConfig();

    return {
        status: apiConfig.configured ? "healthy" : "error",
        timestamp: new Date().toISOString(),
        api: {
            configured: apiConfig.configured,
            keyConfigured: !!process.env.GEMINI_API_KEY,
        },
        performance: {
            totalRequests: metrics.totalRequests,
            successRate: metrics.successRate,
            avgResponseTime: metrics.avgResponseTime + "ms",
            quotaExceededErrors: metrics.quotaExceededErrors,
            networkErrors: metrics.networkErrors,
        },
        fallback: {
            activeFallbacks: metrics.fallbackRequests,
            totalFallbacks: metrics.fallbackRequests + metrics.failedRequests,
        },
        models: {
            gemini2_0: metrics.model2_0Success,
            gemini1_5: metrics.model1_5Success,
        },
        caching: {
            cacheHits: metrics.cacheHits,
        },
    };
}

/**
 * Express middleware to expose health endpoint
 */
function healthCheckEndpoint(req, res) {
    const health = getHealthStatus();

    if (health.status === "healthy") {
        res.status(200).json(health);
    } else {
        res.status(503).json(health);
    }
}

/**
 * Check if API is operational
 */
function isAPIOperational() {
    const metrics = metricsTracker.getMetrics();

    // Operational if configured and not experiencing excessive errors
    const apiConfigured = !!process.env.GEMINI_API_KEY;
    const hasRequestsMade = metrics.totalRequests > 0;
    const errorRate = hasRequestsMade
        ? (metrics.failedRequests / metrics.totalRequests) * 100
        : 0;

    return apiConfigured && errorRate < 50; // Less than 50% error rate
}

/**
 * Get recommended action based on health
 */
function getRecommendedAction() {
    const health = getHealthStatus();
    const metrics = metricsTracker.getMetrics();

    if (!health.api.configured) {
        return "Configure GEMINI_API_KEY environment variable";
    }

    if (metrics.quotaExceededErrors > 5) {
        return "Quota exceeded frequently. Consider upgrading API tier or implementing request batching.";
    }

    if (metrics.networkErrors > 3) {
        return "Network errors detected. Check internet connection and API endpoint availability.";
    }

    if (parseFloat(health.performance.successRate) < 80) {
        return "Success rate below 80%. Consider reviewing logs for patterns.";
    }

    return "System operating normally.";
}

module.exports = {
    getHealthStatus,
    healthCheckEndpoint,
    isAPIOperational,
    getRecommendedAction,
    checkAPIConfig,
};
