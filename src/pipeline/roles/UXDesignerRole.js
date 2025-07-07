import { BaseRole } from './BaseRole';
import { PromptLoader } from '../PromptLoader';
export class UXDesignerRole extends BaseRole {
    constructor(geminiClient, debugLogger) {
        super();
        this.geminiClient = geminiClient;
        this.debugLogger = debugLogger;
    }
    async execute(input) {
        var _a, _b, _c, _d, _e;
        this.safeLog('UXDesigner execute started', { inputStage: input.metadata.stage });
        try {
            const prompt = await PromptLoader.loadPrompt('ux-designer');
            this.safeLog('Prompt loaded', { promptLength: prompt.length });
            // Prepare context with UX Design Brief replacement
            const contextWithBrief = prompt.replace('[UX_DESIGN_BRIEF_PLACEHOLDER]', input.content);
            let content;
            let aiUsed = false;
            // Try AI generation if GeminiClient is available
            if (this.geminiClient) {
                try {
                    this.safeLog('Attempting AI generation with GeminiClient and context', {
                        contextLength: contextWithBrief.length,
                        previousStage: input.metadata.stage
                    });
                    // Debug log: context sent to AI
                    (_a = this.debugLogger) === null || _a === void 0 ? void 0 : _a.logContextSentToAI('UX Designer', contextWithBrief);
                    // Use chat method with complete context including prompt and brief
                    const aiResponse = await this.geminiClient.chat({
                        messages: [
                            { role: 'user', content: contextWithBrief }
                        ],
                        temperature: 0.7,
                        maxTokens: 2500
                    });
                    if (aiResponse.success && aiResponse.content) {
                        content = `UX Designer Analysis (Stage 3/5):\n\n${aiResponse.content}`;
                        aiUsed = true;
                        // Debug log: AI response
                        (_b = this.debugLogger) === null || _b === void 0 ? void 0 : _b.logAIResponse('UX Designer', aiResponse.content, true, aiResponse.usage);
                        this.safeLog('AI generation successful', {
                            contentLength: content.length,
                            usage: aiResponse.usage,
                            contextUsed: true
                        });
                    }
                    else {
                        // Debug log: AI failure
                        (_c = this.debugLogger) === null || _c === void 0 ? void 0 : _c.logAIResponse('UX Designer', aiResponse.error || 'Unknown error', false);
                        throw new Error(aiResponse.error || 'AI generation failed');
                    }
                }
                catch (aiError) {
                    this.safeLog('AI generation failed, falling back to placeholder', aiError);
                    content = this.generateFallbackContent(prompt, input, contextWithBrief);
                    // Debug log: fallback used
                    (_d = this.debugLogger) === null || _d === void 0 ? void 0 : _d.logFallback('UX Designer', String(aiError), content);
                }
            }
            else {
                this.safeLog('No GeminiClient provided, using placeholder');
                content = this.generateFallbackContent(prompt, input, contextWithBrief);
                // Debug log: fallback used (no client)
                (_e = this.debugLogger) === null || _e === void 0 ? void 0 : _e.logFallback('UX Designer', 'No GeminiClient provided', content);
            }
            const result = {
                content,
                metadata: {
                    stage: 'uxDesigner',
                    timestamp: Date.now(),
                    promptUsed: prompt.length > 100,
                    inputStage: input.metadata.stage,
                    promptLength: prompt.length,
                    aiUsed,
                    contextLength: contextWithBrief.length
                }
            };
            this.safeLog('UXDesigner completed', {
                contentLength: result.content.length,
                promptUsed: result.metadata.promptUsed,
                aiUsed: result.metadata.aiUsed,
                contextLength: result.metadata.contextLength
            });
            return result;
        }
        catch (error) {
            this.safeLog('UXDesigner failed', error);
            throw error;
        }
    }
    generateFallbackContent(prompt, input, context) {
        return `UX Designer Analysis (Stage 3/5):

Loaded prompt: ${prompt.substring(0, 200)}...

Previous stage input (${input.metadata.stage}): 
${input.content.substring(0, 300)}...

[AI integration would process the design context here with your UX prompt]

Status: Stage 3 ready with real prompt. ${this.geminiClient ? 'AI generation failed, using fallback.' : 'No AI client provided.'}

Context Length: ${context.length} characters
Prompt Length: ${prompt.length} characters
Previous Stage AI Used: ${input.metadata.aiUsed || false}`;
    }
}
