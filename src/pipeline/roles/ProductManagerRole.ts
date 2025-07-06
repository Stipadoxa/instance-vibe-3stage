import { BaseRole } from './BaseRole';
import { PromptLoader } from '../PromptLoader';
import { GeminiClient } from '../../ai/gemini-client';
import { PipelineDebugLogger } from '../../utils/pipeline-debug-logger';

export interface ProductManagerOutput {
    content: string;
    metadata: {
        stage: string;
        timestamp: number;
        promptUsed: boolean;
        inputLength: number;
        aiUsed?: boolean;
    };
}

export class ProductManagerRole extends BaseRole {
    private geminiClient?: GeminiClient;
    private debugLogger?: PipelineDebugLogger;

    constructor(geminiClient?: GeminiClient, debugLogger?: PipelineDebugLogger) {
        super();
        this.geminiClient = geminiClient;
        this.debugLogger = debugLogger;
    }

    async execute(input: string): Promise<ProductManagerOutput> {
        console.log('📋 ProductManager EXECUTE - INPUT:', {
            inputType: typeof input,
            inputLength: input.length,
            inputPreview: input.substring(0, 100) + '...',
            hasGeminiClient: !!this.geminiClient
        });
        
        this.safeLog('ProductManager execute started', {inputLength: input.length});
        
        try {
            // Load the real prompt from file
            const prompt = await PromptLoader.loadPrompt('product-manager');
            this.safeLog('Prompt loaded', {promptLength: prompt.length});
            
            
            let content: string;
            let aiUsed = false;

            // Try AI generation if GeminiClient is available
            if (this.geminiClient) {
                try {
                    this.safeLog('Attempting AI generation with GeminiClient');
                    
                    const userMessage = `User Request: ${input}`;
                    const fullContext = `${prompt}\n\n${userMessage}`;
                    
                    // Debug log: context sent to AI (complete prompt + user message)
                    this.debugLogger?.logContextSentToAI('Product Manager', fullContext);
                    
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
                        this.debugLogger?.logAIResponse('Product Manager', aiResponse.content, true, aiResponse.usage);
                        
                        this.safeLog('AI generation successful', {
                            contentLength: content.length,
                            usage: aiResponse.usage
                        });
                    } else {
                        // Debug log: AI failure
                        this.debugLogger?.logAIResponse('Product Manager', aiResponse.error || 'Unknown error', false);
                        throw new Error(aiResponse.error || 'AI generation failed');
                    }
                } catch (aiError) {
                    this.safeLog('AI generation failed, falling back to placeholder', aiError);
                    content = this.generateFallbackContent(prompt, input);
                    
                    // Debug log: fallback used
                    this.debugLogger?.logFallback('Product Manager', String(aiError), content);
                }
            } else {
                this.safeLog('No GeminiClient provided, using placeholder');
                content = this.generateFallbackContent(prompt, input);
                
                // Debug log: fallback used (no client)
                this.debugLogger?.logFallback('Product Manager', 'No GeminiClient provided', content);
            }
            
            const result: ProductManagerOutput = {
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
        } catch (error) {
            this.safeLog('ProductManager execute failed', error);
            throw error;
        }
    }

    private generateFallbackContent(prompt: string, input: string): string {
        return `Product Manager Analysis:

Loaded prompt: ${prompt.substring(0, 200)}...

User Input: ${input}

[AI processing would happen here with your prompt]

Status: Prompt successfully loaded. ${this.geminiClient ? 'AI generation failed, using fallback.' : 'No AI client provided.'}`;
    }
}