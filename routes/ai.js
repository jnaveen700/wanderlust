const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.js");

router.get("/ai-recommendations", aiController.showRecommendationForm);
router.post("/ai-recommendations", aiController.getAIRecommendations);

module.exports = router;
