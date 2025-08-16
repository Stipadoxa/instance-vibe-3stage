"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductManagerRole = void 0;
const BaseRole_1 = require("./BaseRole");
const PromptLoader_1 = require("../PromptLoader");
class ProductManagerRole extends BaseRole_1.BaseRole {
    constructor(geminiClient, debugLogger) {
        super();
        this.geminiClient = geminiClient;
        this.debugLogger = debugLogger;
    }
    async execute(input) {
        var _a, _b, _c, _d, _e;
        console.log('📋 ProductManager EXECUTE - INPUT:', {
            inputType: typeof input,
            inputLength: input.length,
            inputPreview: input.substring(0, 100) + '...',
            hasGeminiClient: !!this.geminiClient
        });
        this.safeLog('ProductManager execute started', { inputLength: input.length });
        try {
            // Load the real prompt from file
            const prompt = await PromptLoader_1.PromptLoader.loadPrompt('product-manager');
            this.safeLog('Prompt loaded', { promptLength: prompt.length });
            let content;
            let aiUsed = false;
            // Try AI generation if GeminiClient is available
            if (this.geminiClient) {
                try {
                    this.safeLog('Attempting AI generation with GeminiClient');
                    const userMessage = `User Request: ${input}`;
                    const fullContext = `${prompt}\n\n${userMessage}`;
                    // Debug log: context sent to AI (complete prompt + user message)
                    (_a = this.debugLogger) === null || _a === void 0 ? void 0 : _a.logContextSentToAI('Product Manager', fullContext);
                    const aiResponse = await this.geminiClient.chat({
                        messages: [
                            { role: 'system', content: prompt },
                            { role: 'user', content: userMessage }
                        ],
                        temperature: 0.7,
                        maxTokens: 2000
                    });
                    if (aiResponse.success && aiResponse.content) {
                        content = aiResponse.content;
                        aiUsed = true;
                        // Debug log: AI response
                        (_b = this.debugLogger) === null || _b === void 0 ? void 0 : _b.logAIResponse('Product Manager', aiResponse.content, true, aiResponse.usage);
                        this.safeLog('AI generation successful', {
                            contentLength: content.length,
                            usage: aiResponse.usage
                        });
                    }
                    else {
                        // Debug log: AI failure
                        (_c = this.debugLogger) === null || _c === void 0 ? void 0 : _c.logAIResponse('Product Manager', aiResponse.error || 'Unknown error', false);
                        throw new Error(aiResponse.error || 'AI generation failed');
                    }
                }
                catch (aiError) {
                    this.safeLog('AI generation failed, falling back to placeholder', aiError);
                    content = this.generateFallbackContent(prompt, input);
                    // Debug log: fallback used
                    (_d = this.debugLogger) === null || _d === void 0 ? void 0 : _d.logFallback('Product Manager', String(aiError), content);
                }
            }
            else {
                this.safeLog('No GeminiClient provided, using placeholder');
                content = this.generateFallbackContent(prompt, input);
                // Debug log: fallback used (no client)
                (_e = this.debugLogger) === null || _e === void 0 ? void 0 : _e.logFallback('Product Manager', 'No GeminiClient provided', content);
            }
            const result = {
                content,
                metadata: {
                    stage: 'productManager',
                    timestamp: Date.now(),
                    promptUsed: prompt.length > 100,
                    inputLength: input.length,
                    aiUsed
                }
            };
            this.safeLog('ProductManager execute completed', {
                contentLength: result.content.length,
                promptUsed: result.metadata.promptUsed
            });
            return result;
        }
        catch (error) {
            this.safeLog('ProductManager execute failed', error);
            throw error;
        }
    }
    generateFallbackContent(prompt, input) {
        return `Product Manager Analysis:

Loaded prompt: ${prompt.substring(0, 200)}...

User Input: ${input}

[AI processing would happen here with your prompt]

Status: Prompt successfully loaded. ${this.geminiClient ? 'AI generation failed, using fallback.' : 'No AI client provided.'}`;
    }
}
exports.ProductManagerRole = ProductManagerRole;
