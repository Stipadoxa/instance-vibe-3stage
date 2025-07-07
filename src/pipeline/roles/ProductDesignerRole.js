import { BaseRole } from './BaseRole';
import { PromptLoader } from '../PromptLoader';
export class ProductDesignerRole extends BaseRole {
    constructor(geminiClient, debugLogger) {
        super();
        this.geminiClient = geminiClient;
        this.debugLogger = debugLogger;
    }
    async execute(input) {
        var _a, _b, _c, _d, _e;
        this.safeLog('ProductDesigner execute started', { inputStage: input.metadata.stage });
        try {
            const prompt = await PromptLoader.loadPrompt('product-designer');
            this.safeLog('Prompt loaded', { promptLength: prompt.length });
            // Prepare context with PRD content replacement
            const contextWithPRD = prompt.replace('[PRD_CONTENT_PLACEHOLDER]', input.content);
            let content;
            let aiUsed = false;
            let usage = undefined;
            // Try AI generation if GeminiClient is available
            if (this.geminiClient) {
                try {
                    this.safeLog('Attempting AI generation with GeminiClient', {
                        contextLength: contextWithPRD.length,
                        previousStage: input.metadata.stage
                    });
                    // Debug log: context sent to AI
                    (_a = this.debugLogger) === null || _a === void 0 ? void 0 : _a.logContextSentToAI('Product Designer', contextWithPRD);
                    const aiResponse = await this.geminiClient.chat({
                        messages: [
                            { role: 'user', content: contextWithPRD }
                        ]
                    });
                    if (aiResponse.success && aiResponse.content) {
                        content = aiResponse.content;
                        aiUsed = true;
                        usage = aiResponse.usage;
                        // Debug log: AI response
                        (_b = this.debugLogger) === null || _b === void 0 ? void 0 : _b.logAIResponse('Product Designer', aiResponse.content, true, aiResponse.usage);
                        this.safeLog('AI generation completed', {
                            contentLength: content.length,
                            usage: aiResponse.usage
                        });
                    }
                    else {
                        // Debug log: AI failure
                        (_c = this.debugLogger) === null || _c === void 0 ? void 0 : _c.logAIResponse('Product Designer', aiResponse.error || 'Unknown error', false);
                        throw new Error(aiResponse.error || 'AI generation failed');
                    }
                }
                catch (aiError) {
                    this.safeLog('AI generation failed, falling back to placeholder', aiError);
                    content = this.generateFallbackContent(prompt, input, contextWithPRD);
                    // Debug log: fallback used
                    (_d = this.debugLogger) === null || _d === void 0 ? void 0 : _d.logFallback('Product Designer', String(aiError), content);
                }
            }
            else {
                this.safeLog('No GeminiClient provided, using placeholder');
                content = this.generateFallbackContent(prompt, input, contextWithPRD);
                // Debug log: fallback used (no client)
                (_e = this.debugLogger) === null || _e === void 0 ? void 0 : _e.logFallback('Product Designer', 'No GeminiClient provided', content);
            }
            const result = {
                content,
                metadata: {
                    stage: 'productDesigner',
                    timestamp: Date.now(),
                    promptUsed: prompt.length > 100,
                    inputStage: input.metadata.stage,
                    promptLength: prompt.length,
                    aiUsed,
                    contextLength: contextWithPRD.length,
                    usage
                }
            };
            this.safeLog('ProductDesigner completed', {
                contentLength: result.content.length,
                promptUsed: result.metadata.promptUsed,
                aiUsed: result.metadata.aiUsed,
                contextLength: result.metadata.contextLength
            });
            return result;
        }
        catch (error) {
            this.safeLog('ProductDesigner failed', error);
            throw error;
        }
    }
    generateFallbackContent(prompt, input, context) {
        return `Product Designer Analysis (Stage 2/5):

Loaded prompt: ${prompt.substring(0, 200)}...

Previous stage input (${input.metadata.stage}): 
${input.content.substring(0, 300)}...

[AI integration placeholder - prompt ready for processing]

Status: Stage 2 ready with real prompt from your file`;
    }
}
