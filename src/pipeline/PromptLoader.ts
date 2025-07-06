// Import all prompts via static imports (webpack processes these at build time)
import { PRODUCT_MANAGER_PROMPT } from '../prompts/roles/product-manager.js';
import { PRODUCT_DESIGNER_PROMPT } from '../prompts/roles/product-designer.js';
import { UX_DESIGNER_PROMPT } from '../prompts/roles/ux-designer.js';
import { UI_DESIGNER_PROMPT } from '../prompts/roles/ui-designer.js';
import { JSON_ENGINEER_PROMPT } from '../prompts/roles/json-engineer.js';

export class PromptLoader {
   private static cache = new Map<string, string>();
   
   // Real prompts loaded via static imports (working method!)
   private static prompts: Record<string, string> = {
       'product-manager': PRODUCT_MANAGER_PROMPT,
       'product-designer': PRODUCT_DESIGNER_PROMPT,
       'ux-designer': UX_DESIGNER_PROMPT,
       'ui-designer': UI_DESIGNER_PROMPT,
       'json-engineer': JSON_ENGINEER_PROMPT,
   };
   
   static async loadPrompt(name: string): Promise<string> {
       if (this.cache.has(name)) {
           return this.cache.get(name)!;
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

   private static getHardcodedFallback(name: string): string {
       const fallbacks: Record<string, string> = {
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
   
   static getAvailablePrompts(): string[] {
       return Object.keys(this.prompts);
   }
}