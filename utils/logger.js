/**
 * AI Service Logging & Monitoring
 * Provides structured logging for AI service operations, errors, and metrics
 */

const fs = require("fs");
const path = require("path");

// Determine log directory
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, "../logs");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Log levels
 */
const LOG_LEVELS = {
    ERROR: "ERROR",
    WARN: "WARN",
    INFO: "INFO",
    DEBUG: "DEBUG",
};

/**
 * Get current timestamp
 */
function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Format log message
 */
function formatLogMessage(level, category, message, data = null) {
    const timestamp = getTimestamp();
    const baseMsg = `[${timestamp}] [${level}] [${category}] ${message}`;

    if (data) {
        return `${baseMsg}\n${JSON.stringify(data, null, 2)}`;
    }
    return baseMsg;
}

/**
 * Log to file
 */
function logToFile(level, category, message, data = null) {
    try {
        const logFile = path.join(LOG_DIR, `${category}.log`);
        const logMessage = formatLogMessage(level, category, message, data) + "\n";

        fs.appendFileSync(logFile, logMessage);
    } catch (error) {
        console.error("Failed to write to log file:", error);
    }
}

/**
 * Main logger class
 */
class AIServiceLogger {
    constructor(category = "ai-service") {
        this.category = category;
    }

    error(message, data = null) {
        const fullMessage = formatLogMessage(LOG_LEVELS.ERROR, this.category, message, data);
        console.error(fullMessage);
        logToFile(LOG_LEVELS.ERROR, this.category, message, data);
    }

    warn(message, data = null) {
        const fullMessage = formatLogMessage(LOG_LEVELS.WARN, this.category, message, data);
        console.warn(fullMessage);
        logToFile(LOG_LEVELS.WARN, this.category, message, data);
    }

    info(message, data = null) {
        const fullMessage = formatLogMessage(LOG_LEVELS.INFO, this.category, message, data);
        console.log(fullMessage);
        logToFile(LOG_LEVELS.INFO, this.category, message, data);
    }

    debug(message, data = null) {
        if (process.env.DEBUG_AI_SERVICE === "true") {
            const fullMessage = formatLogMessage(LOG_LEVELS.DEBUG, this.category, message, data);
            console.log(fullMessage);
            logToFile(LOG_LEVELS.DEBUG, this.category, message, data);
        }
    }
}

/**
 * Request metrics tracker
 */
class MetricsTracker {
    constructor() {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            fallbackRequests: 0,
            quotaExceededErrors: 0,
            networkErrors: 0,
            totalResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0,
            model2_0Success: 0,
            model1_5Success: 0,
            cacheHits: 0,
        };
    }

    recordRequest(success, isFallback = false, responseTime = 0, model = null) {
        this.metrics.totalRequests++;

        if (success && !isFallback) {
            this.metrics.successfulRequests++;
        } else if (isFallback) {
            this.metrics.fallbackRequests++;
        } else {
            this.metrics.failedRequests++;
        }

        if (responseTime > 0) {
            this.metrics.totalResponseTime += responseTime;
            this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
            this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
        }

        if (model) {
            if (model.includes("2.0")) {
                this.metrics.model2_0Success++;
            } else if (model.includes("1.5")) {
                this.metrics.model1_5Success++;
            }
        }
    }

    recordError(errorCode) {
        if (errorCode === "QUOTA_EXCEEDED") {
            this.metrics.quotaExceededErrors++;
        } else if (errorCode === "NETWORK_ERROR") {
            this.metrics.networkErrors++;
        }
    }

    recordCacheHit() {
        this.metrics.cacheHits++;
    }

    getMetrics() {
        const avgResponseTime =
            this.metrics.totalRequests > 0
                ? (this.metrics.totalResponseTime / this.metrics.totalRequests).toFixed(2)
                : 0;

        return {
            ...this.metrics,
            avgResponseTime: parseFloat(avgResponseTime),
            successRate: this.metrics.totalRequests > 0
                ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2) + "%"
                : "0%",
        };
    }

    reset() {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            fallbackRequests: 0,
            quotaExceededErrors: 0,
            networkErrors: 0,
            totalResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0,
            model2_0Success: 0,
            model1_5Success: 0,
            cacheHits: 0,
        };
    }

    printMetrics() {
        const metrics = this.getMetrics();
        console.log("\n=== AI SERVICE METRICS ===");
        console.log(`Total Requests: ${metrics.totalRequests}`);
        console.log(`Successful: ${metrics.successfulRequests}`);
        console.log(`Fallback: ${metrics.fallbackRequests}`);
        console.log(`Failed: ${metrics.failedRequests}`);
        console.log(`Success Rate: ${metrics.successRate}`);
        console.log(`Avg Response Time: ${metrics.avgResponseTime}ms`);
        console.log(`Min/Max Response Time: ${metrics.minResponseTime}ms / ${metrics.maxResponseTime}ms`);
        console.log(`Quota Exceeded Errors: ${metrics.quotaExceededErrors}`);
        console.log(`Network Errors: ${metrics.networkErrors}`);
        console.log(`Gemini 2.0 Success: ${metrics.model2_0Success}`);
        console.log(`Gemini 1.5 Success: ${metrics.model1_5Success}`);
        console.log(`Cache Hits: ${metrics.cacheHits}`);
        console.log("========================\n");
    }
}

// Export singleton instances
const logger = new AIServiceLogger("ai-service");
const metricsTracker = new MetricsTracker();

module.exports = {
    AIServiceLogger,
    MetricsTracker,
    logger,
    metricsTracker,
    LOG_LEVELS,
    getTimestamp,
    formatLogMessage,
};
