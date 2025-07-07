"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptLoader = void 0;
// Import all prompts via static imports (webpack processes these at build time)
const product_manager_js_1 = require("../prompts/roles/product-manager.js");
const product_designer_js_1 = require("../prompts/roles/product-designer.js");
const ux_designer_js_1 = require("../prompts/roles/ux-designer.js");
const ui_designer_js_1 = require("../prompts/roles/ui-designer.js");
const json_engineer_js_1 = require("../prompts/roles/json-engineer.js");
class PromptLoader {
    static async loadPrompt(name) {
        if (this.cache.has(name)) {
            return this.cache.get(name);
        }
        // Use static imports (proven to work!)
        const prompt = this.prompts[name];
        if (prompt) {
            console.log(`✅ PROMPT LOADED: ${name} (${prompt.length} chars)`);
            console.log(`📝 PREVIEW: ${prompt.substring(0, 150)}...`);
            this.cache.set(name, prompt);
            return prompt;
        }
        // Fallback for unknown prompts
        console.warn(`❌ Unknown prompt: ${name}, using fallback`);
        return this.getHardcodedFallback(name);
    }
    static getHardcodedFallback(name) {
        const fallbacks = {
            'product-manager': `You are a Senior Product Manager with 8+ years of cross-industry experience. You excel at domain analysis and translating user requests into detailed, actionable product specifications.

DOMAIN ANALYSIS FRAMEWORK:

Step 1: Domain Identification
Look for keywords and context that indicate business domains. Use these as examples and patterns:
Transportation/Logistics: driver, delivery, rideshare, vehicle, fleet, logistics, shipping, route, dispatch 
Healthcare: patient, medical, doctor, appointment, clinic, hospital, prescription, insurance 
Finance: payment, banking, transaction, account, money, credit, loan, investment, tax 
E-commerce: shopping, product, cart, order, purchase, inventory, customer, checkout 
Education: student, teacher, course, grade, school, classroom, assignment, enrollment
Business/SaaS: settings, dashboard, profile, team, workspace, analytics, management

YOUR TASK:
Analyze this user request and create a Product Requirements Document.

User Request: [USER_INPUT]

OUTPUT FORMAT:
Product Requirements Document: [Feature Name]

Domain Analysis
Primary Domain: [Transportation/Healthcare/Finance/E-commerce/Education/Business] 
Confidence Level: [High 90%+ | Medium 70-89% | Low <70%] 
Key Evidence: [Specific words/phrases that indicate this domain] 

User Profile
Primary Users: [Specific user types with demographics/context] 
Usage Context: [When, where, how they use this - be specific] 
Primary Goals: [What they're trying to accomplish]

Core Use Cases
[Use Case Name]: [Specific scenario - who does what, when, why]

Functional Requirements
[Function Area Name] [Priority: Critical/High/Medium/Low]
Purpose: [Why this function exists from business perspective] 
Core Capabilities: [Specific things users can do] 

CRITICAL GUIDELINES:
Focus on BUSINESS LOGIC and USER NEEDS, not design solutions
Be specific about user types - avoid generic "users"
Include domain-specific workflows and compliance requirements
Create a PRD that eliminates guesswork for the UX Designer.`,
            'product-designer': `You are a product designer creating user-centered solutions.`,
            'ux-designer': `You are a UX designer focused on user experience.`,
            'ui-designer': `You are a UI designer creating visual interfaces.`,
            'json-engineer': `You are a JSON engineer converting designs to Figma format.`
        };
        return fallbacks[name] || `Fallback prompt for ${name}`;
    }
    static clearCache() {
        this.cache.clear();
    }
    static getAvailablePrompts() {
        return Object.keys(this.prompts);
    }
}
exports.PromptLoader = PromptLoader;
PromptLoader.cache = new Map();
// Real prompts loaded via static imports (working method!)
PromptLoader.prompts = {
    'product-manager': product_manager_js_1.PRODUCT_MANAGER_PROMPT,
    'product-designer': product_designer_js_1.PRODUCT_DESIGNER_PROMPT,
    'ux-designer': ux_designer_js_1.UX_DESIGNER_PROMPT,
    'ui-designer': ui_designer_js_1.UI_DESIGNER_PROMPT,
    'json-engineer': json_engineer_js_1.JSON_ENGINEER_PROMPT,
};
