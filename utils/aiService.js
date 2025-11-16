const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateSearchQuery(userDescription) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // First, correct any spelling or grammar mistakes in the user input
        const correctionPrompt = `You are a grammar and spelling corrector. Correct any spelling mistakes and grammar errors in the following text. Keep the meaning exactly the same, just fix typos and grammar.

Text: "${userDescription}"

Respond with ONLY the corrected text, nothing else. If there are no mistakes, respond with the same text.`;

        const correctionResult = await model.generateContent(correctionPrompt);
        const correctionResponse = await correctionResult.response;
        const correctedDescription = correctionResponse.text().trim();

        console.log(`Original: "${userDescription}"`);
        console.log(`Corrected: "${correctedDescription}"`);

        // Now generate search parameters from the corrected description
        const searchPrompt = `You are an expert travel search assistant. Based on the user's travel preferences, generate intelligent search parameters that will find the most relevant listings.

User's Travel Preferences:
"${correctedDescription}"

Available categories: trending, rooms, iconic cities, mountains, castles, pools, camping, arctic, forests, miscellaneous

Your task is to INTELLIGENTLY interpret the user's request and extract:
1. "query" (string): A search query (1-4 words) that captures what they're looking for. Include amenities, features, activities, locations, and types of stays mentioned.
2. "category" (string or null): ONLY if the user is specifically looking for a TYPE of stay/experience (pool, mountain, castle, etc). Otherwise null.
3. "countries" (array of strings): ALL countries or regions the user might be interested in based on their description. For example:
   - If they say "Asia" include: japan, thailand, bali, indonesia, vietnam, india, maldives, singapore, south korea, philippines
   - If they say "Europe" include: italy, france, spain, germany, greece, portugal, switzerland, austria, netherlands, belgium, england, uk, ireland, scotland, wales, poland
   - If they mention a continent, expand to all countries in that continent
   - If they mention specific countries, include those
   - Always include the specific country if mentioned
4. "fallbackQueries" (array of strings): If no results found with the exact search, provide 2-3 alternative similar searches the user might be interested in. For example if they search "fortress in africa" and find nothing, suggest similar queries like ["ancient ruins africa", "historic sites africa", "desert palace africa"]. Think of semantically similar alternatives.

Examples:
- "Resort in Asia" → {"query": "resort", "category": "pools", "countries": ["japan", "thailand", "bali", "indonesia", "vietnam", "india", "maldives", "singapore", "south korea", "philippines"], "fallbackQueries": ["beach resort", "tropical resort", "luxury villa asia"]}
- "Beach house in Europe" → {"query": "beach house", "category": "pools", "countries": ["italy", "france", "spain", "greece", "portugal", "uk", "ireland"], "fallbackQueries": ["coastal villa", "seaside cottage", "beachfront villa"]}
- "Fortress in Africa" → {"query": "fortress", "category": null, "countries": ["egypt", "south africa", "morocco", "kenya", "tanzania"], "fallbackQueries": ["ancient palace africa", "historic ruins africa", "castle africa"]}

IMPORTANT: Respond ONLY with a JSON object, nothing else. No markdown, no code blocks, just plain JSON.`;

        const result = await model.generateContent(searchPrompt);
        const response = await result.response;
        let text = response.text().trim();

        // Remove markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Parse the JSON response
        const parsed = JSON.parse(text);

        return {
            success: true,
            query: parsed.query || "",
            category: parsed.category || null,
            countries: Array.isArray(parsed.countries) ? parsed.countries : [],
            fallbackQueries: Array.isArray(parsed.fallbackQueries) ? parsed.fallbackQueries : [],
            correctedInput: correctedDescription,
        };
    } catch (error) {
        console.error("Error generating search query:", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

module.exports = { generateSearchQuery };
