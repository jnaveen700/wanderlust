#!/bin/bash
# AI Recommendation Feature - Implementation Verification Script
# Run this to verify all components are properly installed

echo "🔍 Verifying AI Recommendation Implementation..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
PASSED=0
FAILED=0

# Check function
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 - NOT FOUND"
        ((FAILED++))
    fi
}

echo "📁 Checking Created Files..."
check_file "middleware/geminiErrorHandler.js"
check_file "utils/aiService.js"
check_file "utils/fallbackRecommendations.js"
check_file "utils/logger.js"
check_file "utils/healthCheck.js"
check_file "AI_IMPLEMENTATION_GUIDE.md"
check_file "SETUP_CHECKLIST.md"
check_file "IMPLEMENTATION_SUMMARY.md"

echo ""
echo "📝 Checking Modified Files..."
check_file "controllers/ai.js"
check_file "views/listing/aiRecommendation.ejs"

echo ""
echo "✅ Checking Syntax..."
if node -c middleware/geminiErrorHandler.js 2>/dev/null; then
    echo -e "${GREEN}✓${NC} middleware/geminiErrorHandler.js"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} middleware/geminiErrorHandler.js - Syntax Error"
    ((FAILED++))
fi

if node -c utils/aiService.js 2>/dev/null; then
    echo -e "${GREEN}✓${NC} utils/aiService.js"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} utils/aiService.js - Syntax Error"
    ((FAILED++))
fi

if node -c utils/fallbackRecommendations.js 2>/dev/null; then
    echo -e "${GREEN}✓${NC} utils/fallbackRecommendations.js"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} utils/fallbackRecommendations.js - Syntax Error"
    ((FAILED++))
fi

if node -c utils/logger.js 2>/dev/null; then
    echo -e "${GREEN}✓${NC} utils/logger.js"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} utils/logger.js - Syntax Error"
    ((FAILED++))
fi

if node -c utils/healthCheck.js 2>/dev/null; then
    echo -e "${GREEN}✓${NC} utils/healthCheck.js"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} utils/healthCheck.js - Syntax Error"
    ((FAILED++))
fi

if node -c controllers/ai.js 2>/dev/null; then
    echo -e "${GREEN}✓${NC} controllers/ai.js"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} controllers/ai.js - Syntax Error"
    ((FAILED++))
fi

echo ""
echo "📋 Summary"
echo "─────────────────────────────────"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "─────────────────────────────────"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "🎉 Implementation Complete!"
    echo ""
    echo "📚 Next Steps:"
    echo "1. Read SETUP_CHECKLIST.md for quick setup"
    echo "2. Create logs directory: mkdir -p logs"
    echo "3. Start the app: npm start"
    echo "4. Test at: http://localhost:3000/ai-recommendations"
    echo ""
    echo "📖 Documentation:"
    echo "   - AI_IMPLEMENTATION_GUIDE.md (Detailed guide)"
    echo "   - SETUP_CHECKLIST.md (Quick reference)"
    echo "   - IMPLEMENTATION_SUMMARY.md (What was done)"
    exit 0
else
    echo ""
    echo "❌ Implementation has issues"
    echo "Please review the errors above"
    exit 1
fi
