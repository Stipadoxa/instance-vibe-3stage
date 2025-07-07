"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticPromptLoader = void 0;
// Static imports that webpack can process at build time
const product_manager_js_1 = require("../prompts/roles/product-manager.js");
const product_designer_js_1 = require("../prompts/roles/product-designer.js");
const ux_designer_js_1 = require("../prompts/roles/ux-designer.js");
const ui_designer_js_1 = require("../prompts/roles/ui-designer.js");
const json_engineer_js_1 = require("../prompts/roles/json-engineer.js");
class StaticPromptLoader {
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
exports.StaticPromptLoader = StaticPromptLoader;
StaticPromptLoader.prompts = {
    'product-manager': product_manager_js_1.PRODUCT_MANAGER_PROMPT,
    'product-designer': product_designer_js_1.PRODUCT_DESIGNER_PROMPT,
    'ux-designer': ux_designer_js_1.UX_DESIGNER_PROMPT,
    'ui-designer': ui_designer_js_1.UI_DESIGNER_PROMPT,
    'json-engineer': json_engineer_js_1.JSON_ENGINEER_PROMPT,
};
