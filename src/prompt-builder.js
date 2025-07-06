const fs = require('fs');
const path = require('path');

class PromptBuilder {
  constructor(promptsDir = './src/prompts') {
    this.promptsDir = promptsDir;
  }

  /**
   * Build a fix prompt by combining role prompt with fix template
   * @param {string} roleName - Name of the role (e.g., 'product-manager')
   * @param {string} qaRejectionReason - Specific reason why QA rejected
   * @param {string} outputType - Type of output (e.g., 'PRD', 'component layout')
   * @param {string} previousOutput - The output that was rejected
   * @returns {string} Complete fix prompt
   */
  buildFixPrompt(roleName, qaRejectionReason, outputType, previousOutput) {
    try {
      // Load the original role prompt
      const rolePromptPath = path.join(this.promptsDir, 'roles', `${roleName}.txt`);
      const rolePrompt = fs.readFileSync(rolePromptPath, 'utf8');

      // Load the universal fix template
      const fixTemplatePath = path.join(this.promptsDir, 'universal-fix-template.txt');
      const fixTemplate = fs.readFileSync(fixTemplatePath, 'utf8');

      // Substitute all variables
      return fixTemplate
        .replace('{ORIGINAL_ROLE_PROMPT}', rolePrompt)
        .replace(/{OUTPUT_TYPE}/g, outputType)
        .replace('{QA_REJECTION_REASON}', qaRejectionReason)
        .replace('{PREVIOUS_OUTPUT_CONTENT}', previousOutput);

    } catch (error) {
      throw new Error(`Failed to build fix prompt: ${error.message}`);
    }
  }

  /**
   * Load a role prompt
   * @param {string} roleName - Name of the role
   * @returns {string} Role prompt content
   */
  loadRolePrompt(roleName) {
    try {
      const rolePromptPath = path.join(this.promptsDir, 'roles', `${roleName}.txt`);
      return fs.readFileSync(rolePromptPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to load role prompt for ${roleName}: ${error.message}`);
    }
  }

  /**
   * Load a QA prompt
   * @param {string} roleName - Name of the role
   * @returns {string} QA prompt content
   */
  loadQAPrompt(roleName) {
    try {
      const qaPromptPath = path.join(this.promptsDir, 'qa', `${roleName}-qa.txt`);
      return fs.readFileSync(qaPromptPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to load QA prompt for ${roleName}: ${error.message}`);
    }
  }

  /**
   * Get list of available roles
   * @returns {string[]} Array of role names
   */
  getAvailableRoles() {
    try {
      const rolesDir = path.join(this.promptsDir, 'roles');
      return fs.readdirSync(rolesDir)
        .filter(file => file.endsWith('.txt'))
        .map(file => file.replace('.txt', ''));
    } catch (error) {
      return [];
    }
  }
}

module.exports = PromptBuilder;