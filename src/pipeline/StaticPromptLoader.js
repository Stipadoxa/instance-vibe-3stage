// Static imports that webpack can process at build time
import { PRODUCT_MANAGER_PROMPT } from '../prompts/roles/product-manager.js';
import { PRODUCT_DESIGNER_PROMPT } from '../prompts/roles/product-designer.js';
import { UX_DESIGNER_PROMPT } from '../prompts/roles/ux-designer.js';
import { UI_DESIGNER_PROMPT } from '../prompts/roles/ui-designer.js';
import { JSON_ENGINEER_PROMPT } from '../prompts/roles/json-engineer.js';
export class StaticPromptLoader {
    static async loadPrompt(name) {
        console.log(`🧪 TESTING StaticPromptLoader for: ${name}`);
        const prompt = this.prompts[name];
        if (prompt) {
            console.log(`✅ Static import SUCCESS for ${name}:`, {
                length: prompt.length,
                preview: prompt.substring(0, 100) + '...'
            });
            return prompt;
        }
        else {
            console.log(`❌ Static import FAILED for ${name}: not found in registry`);
            throw new Error(`Prompt not found: ${name}`);
        }
    }
    static getAvailablePrompts() {
        return Object.keys(this.prompts);
    }
}
StaticPromptLoader.prompts = {
    'product-manager': PRODUCT_MANAGER_PROMPT,
    'product-designer': PRODUCT_DESIGNER_PROMPT,
    'ux-designer': UX_DESIGNER_PROMPT,
    'ui-designer': UI_DESIGNER_PROMPT,
    'json-engineer': JSON_ENGINEER_PROMPT,
};
