# AI Recommendation Feature - Developer Reference

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (EJS)                           │
│           views/listing/aiRecommendation.ejs                │
│  - User input validation                                    │
│  - Loading/error/success states                             │
│  - HTML escaping for XSS protection                         │
└────────────────────────┬────────────────────────────────────┘
                         │ POST /ai-recommendations
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Controller                               │
│              controllers/ai.js                              │
│  - Input validation                                         │
│  - Error wrapping                                           │
│  - Logging                                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│               AI Service Layer                              │
│              utils/aiService.js                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Try Gemini 2.0 Flash (with retries)               │   │
│  │  ├─ Prompt: Combined correction + search          │   │
│  │  ├─ Timeout: 30 seconds                           │   │
│  │  └─ Retries: 2 times with backoff                 │   │
│  └─────────────────────────────────────────────────────┘   │
│              ↓ (if fails with 429)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Try Gemini 1.5 Flash (with retries)               │   │
│  │  ├─ Same prompt                                    │   │
│  │  ├─ Timeout: 30 seconds                           │   │
│  │  └─ Retries: 2 times with backoff                 │   │
│  └─────────────────────────────────────────────────────┘   │
│              ↓ (if both fail)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Fallback Recommendations                          │   │
│  │  ├─ Analyze keywords                              │   │
│  │  ├─ Match category                                │   │
│  │  ├─ Extract countries                             │   │
│  │  └─ Return curated results                        │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
         ┌───────────────────────────────────────┐
         │  Error Handling & Logging             │
         │  middleware/geminiErrorHandler.js     │
         │  utils/logger.js                      │
         │  ├─ Error categorization              │
         │  ├─ User-friendly messages            │
         │  ├─ File-based logging                │
         │  └─ Metrics tracking                  │
         └───────────────┬───────────────────────┘
                         │
                         ↓
                    JSON Response
         (success: boolean, message, redirect, fallback flag)
                         │
                         ↓
                    Frontend renders
              Results or friendly error message
```

## 🔑 Key Functions

### Core AI Service

#### `generateSearchQuery(userDescription)`
Main entry point for AI recommendations.

**Input**: User's travel preferences (string)

**Output**: 
```javascript
{
    success: boolean,
    query: string,              // Search terms
    category: string | null,    // Listing category
    countries: string[],        // Relevant countries
    fallbackQueries: string[],  // Alternative searches
    correctedInput: string,     // Corrected user input
    model: string,              // Which model was used
}
```

**Flow**:
1. Sanitize input (300 chars max)
2. Try Gemini 2.0 with retries
3. If quota exceeded, try Gemini 1.5
4. If all fail, use fallback recommendations

#### `getManualRecommendations(userInput)`
Generate fallback recommendations when API fails.

**Input**: User's travel preferences (string)

**Output**: Fallback recommendations object

**Features**:
- Keyword analysis
- Category matching
- Country extraction
- Never fails

### Error Handling

#### `wrapGeminiHandler(fn)`
Middleware wrapper to catch and handle Gemini errors.

**Usage**:
```javascript
module.exports.getAIRecommendations = wrapGeminiHandler(async (req, res) => {
    // Your route handler code
});
```

**Behavior**:
- Catches all errors
- Categorizes error type
- Returns user-friendly JSON
- Sets Retry-After headers
- Never throws to Express

#### `parseAPIError(error)`
Categorize API errors into known types.

**Returns**: Error code string
- `QUOTA_EXCEEDED` (429)
- `NETWORK_ERROR` (5xx)
- `TEMPORARY_ERROR` (503)
- `TIMEOUT`
- `INVALID_INPUT` (400)
- `UNKNOWN`

### Fallback System

#### `generateFallbackRecommendations(userInput)`
Smart fallback generator.

**Features**:
- Analyzes user keywords
- Matches predefined categories
- Expands continent names to countries
- Returns valid search parameters
- **Never fails** - always returns something

**Categories Supported**:
- pools, mountains, castles, cities, camping, forests, default

### Logging & Metrics

#### `AIServiceLogger`
Structured logging class.

**Methods**:
```javascript
logger.info(message, data);       // Info level
logger.error(message, data);      // Error level
logger.warn(message, data);       // Warning level
logger.debug(message, data);      // Debug (if DEBUG_AI_SERVICE=true)
```

**Output**: Console + `logs/ai-service.log`

#### `MetricsTracker`
Tracks system metrics.

**Methods**:
```javascript
metricsTracker.recordRequest(success, isFallback, responseTime, model);
metricsTracker.recordError(errorCode);
metricsTracker.getMetrics();
metricsTracker.printMetrics();
```

### Health Monitoring

#### `getHealthStatus()`
Get current system health.

**Returns**:
```javascript
{
    status: "healthy" | "error",
    timestamp: string,
    api: { configured: boolean },
    performance: { totalRequests, successRate, avgResponseTime, ... },
    fallback: { activeFallbacks, totalFallbacks },
    models: { gemini2_0, gemini1_5 },
    caching: { cacheHits }
}
```

## 📊 Data Flow Example

### Success Path (AI Returns Results)

```
User: "Beach resort in Thailand"
  ↓
Input sanitized: "Beach resort in Thailand" (28 chars)
  ↓
Try Gemini 2.0 Flash
  ├─ Prompt: Combined correction + search
  ├─ Response: {"corrected": "...", "query": "resort", "countries": ["thailand", ...], ...}
  └─ Success! ✓
  ↓
Log: "[2024-05-10T14:23:45.123Z] AI Recommendation Success | Model: gemini-2.0-flash"
  ↓
Response to frontend:
{
    success: true,
    redirect: "/listings/search?query=resort&countries=thailand,...",
    isFallback: false
}
  ↓
Frontend: Redirects immediately, user sees results
```

### Fallback Path (API Fails)

```
User: "Mountain cabin with views"
  ↓
Input sanitized: "Mountain cabin with views" (26 chars)
  ↓
Try Gemini 2.0 Flash
  ├─ Error: 429 Resource Exhausted (quota exceeded)
  └─ Log error, skip retries
  ↓
Try Gemini 1.5 Flash
  ├─ Error: Connect timeout
  ├─ Retry 1: timeout again
  ├─ Retry 2: timeout again
  └─ Skip to fallback
  ↓
Use Fallback Recommendations
  ├─ Keywords: ["mountain", "cabin", "views"]
  ├─ Detect category: "mountains"
  ├─ Countries: ["switzerland", "austria", "nepal", ...]
  ├─ Query: "mountain cabin lodge"
  └─ Fallback queries: ["alpine lodge", "mountain view", ...]
  ↓
Log: "[2024-05-10T14:23:46.456Z] Using fallback recommendations | Category: mountains"
  ↓
Response to frontend (fallback flag set):
{
    success: false,
    message: "High demand - showing curated mountain recommendations",
    fallback: true,
    redirect: "/listings/search?query=mountain%20cabin&countries=switzerland,austria,..."
}
  ↓
Frontend: Shows friendly message, then redirects after 1.5s
User sees: "⚙️ Our AI is busy. Showing curated recommendations..."
  ↓
Redirects to search results
```

## 🧪 Testing Scenarios

### Test 1: Normal Request
```javascript
const result = await generateSearchQuery("Beach villa in Bali");
// Expected: success: true, query: "beach villa", countries: ["bali"]
```

### Test 2: Input Validation
```javascript
const result = await generateSearchQuery("");
// Expected: success: false, code: "INVALID_INPUT"
```

### Test 3: Long Input
```javascript
const input = "a".repeat(500);
const result = await generateSearchQuery(input);
// Expected: Sanitized to 300 chars, success: true
```

### Test 4: Typos
```javascript
const result = await generateSearchQuery("Beach in thaiand");
// Expected: correctedInput: "Beach in Thailand"
```

## 🔧 Extension Points

### Add New Fallback Category

**File**: `utils/fallbackRecommendations.js`

```javascript
const CURATED_RECOMMENDATIONS = {
    // ... existing categories
    luxury: {
        category: "luxury",
        description: "Premium & Luxury",
        keywords: ["luxury", "premium", "upscale", "mansion"],
        query: "luxury villa estate",
        countries: ["france", "switzerland", "italy"],
        fallbackQueries: ["luxury resort", "premium estate"],
    },
};
```

### Add New Country to Matching

**File**: `utils/fallbackRecommendations.js`

```javascript
const countryKeywords = {
    // ... existing
    egypt: ["egypt", "cairo", "nile", "pyramids"],
};
```

### Adjust Retry Strategy

**File**: `utils/aiService.js`

```javascript
const CONFIG = {
    maxRetries: 3,              // More retries
    retryDelay: 2000,           // Longer initial delay
    retryBackoffMultiplier: 1.5, // Different backoff
    timeout: 45000,             // Longer timeout
};
```

### Add New Error Type

**File**: `middleware/geminiErrorHandler.js`

```javascript
const ERROR_RESPONSES = {
    MY_NEW_ERROR: {
        statusCode: 400,
        message: "User-friendly message here",
        code: "ERROR_CODE",
    },
};
```

## 📈 Performance Optimization Tips

1. **Reduce Input Size**: Encourage shorter, focused inputs
2. **Add Caching**: Cache popular searches (Implemented in `fallbackRecommendations.js`)
3. **Batch Requests**: Group similar requests together
4. **Monitor Metrics**: Use `metricsTracker.getMetrics()` daily
5. **Adjust Timeouts**: Increase if network is slow

## 🐛 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "All models failed" | Both Gemini 2.0 and 1.5 returned errors | Check API key, logs, internet connection |
| "Memory leak" | RecommendationCache growing unbounded | Check maxSize, implement cleanup |
| "Timeout errors" | Network too slow | Increase CONFIG.timeout |
| "Logs not written" | No write permission | Check `logs/` directory permissions |
| "Fallback never used" | API never fails | Simulate error or exhaust quota |

## 📚 Related Code

### Import Statements
```javascript
const { generateSearchQuery, getManualRecommendations } = require("../utils/aiService.js");
const { wrapGeminiHandler } = require("../middleware/geminiErrorHandler.js");
const { logger, metricsTracker } = require("../utils/logger.js");
const { getHealthStatus } = require("../utils/healthCheck.js");
```

### Environment Variables
```bash
GEMINI_API_KEY=your-key              # Required
DEBUG_AI_SERVICE=true               # Optional, enables verbose logging
LOG_DIR=/var/log/wanderlust         # Optional, custom log directory
```

---

**Developer Note**: This implementation prioritizes reliability over speed. Fallback recommendations ensure 99%+ success rate even when APIs fail.

**Last Updated**: May 10, 2024
**Version**: 2.0
