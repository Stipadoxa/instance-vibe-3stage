const PromptBuilder = require('./prompt-builder');

class QualityAssurancePipeline {
  constructor() {
    this.promptBuilder = new PromptBuilder();
    this.maxFixAttempts = 2;
  }

  async processStage(roleName, input, outputType) {
    let attempts = 0;
    let currentOutput = null;
    let qualityStatus = 'pending';

    // Initial processing
    const rolePrompt = this.promptBuilder.loadRolePrompt(roleName);
    currentOutput = await this.callLLM(rolePrompt + '\n\n' + input);

    // QA Loop
    while (attempts <= this.maxFixAttempts) {
      // Run QA evaluation
      const qaPrompt = this.promptBuilder.loadQAPrompt(roleName);
      const qaResult = await this.callLLM(qaPrompt + '\n\nOutput to evaluate:\n' + currentOutput);
      
      if (qaResult.includes('Status: APPROVE')) {
        qualityStatus = 'approved';
        break;
      } else if (attempts < this.maxFixAttempts) {
        // Extract rejection reason
        const rejectionReason = this.extractRejectionReason(qaResult);
        
        // Build fix prompt
        const fixPrompt = this.promptBuilder.buildFixPrompt(
          roleName,
          rejectionReason,
          outputType,
          currentOutput
        );
        
        // Get fixed output
        currentOutput = await this.callLLM(fixPrompt);
        attempts++;
      } else {
        qualityStatus = 'loop_limit_reached';
        break;
      }
    }

    return {
      output: currentOutput,
      qualityStatus,
      fixAttempts: attempts
    };
  }

  async callLLM(prompt) {
    // Your LLM call implementation
    return "Mock LLM response";
  }

  extractRejectionReason(qaResult) {
    // Extract the rejection reason from QA output
    const match = qaResult.match(/Reason: (.+)/);
    return match ? match[1] : 'Quality issues identified';
  }
}

module.exports = QualityAssurancePipeline;