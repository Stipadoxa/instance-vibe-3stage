"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleDesignReviewer = void 0;
const gemini_service_1 = require("./gemini-service");
class SimpleDesignReviewer {
    static async assessDesign(screenshot, userRequest) {
        const prompt = `Analyze this UI design as a senior designer would:

User Request: "${userRequest}"

Provide a comprehensive but concise assessment covering:
1. Visual hierarchy and layout
2. Content clarity and organization  
3. Visual design and aesthetics
4. User experience and usability
5. Mobile/accessibility considerations

Format your response as JSON:
{
  "score": 7,
  "keyIssues": [
    "Button lacks visual prominence",
    "Text contrast too low for accessibility",
    "Inconsistent spacing between elements"
  ],
  "suggestions": [
    "Make primary button larger with stronger color",
    "Increase text contrast to meet WCAG AA standards", 
    "Apply consistent 16px spacing throughout"
  ],
  "strengths": [
    "Clean, organized layout",
    "Good use of white space"
  ]
}

Focus on the 3-5 most impactful issues and improvements. Be specific and actionable.`;
        try {
            const result = await gemini_service_1.GeminiService.analyzeImage(screenshot, prompt);
            return JSON.parse(result);
        }
        catch (error) {
            console.error('Design analysis failed:', error);
            throw new Error('Could not analyze design');
        }
    }
}
exports.SimpleDesignReviewer = SimpleDesignReviewer;
