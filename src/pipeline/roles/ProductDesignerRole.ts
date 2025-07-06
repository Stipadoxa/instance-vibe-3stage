import { BaseRole } from './BaseRole';
import { ProductManagerOutput } from './ProductManagerRole';
import { PromptLoader } from '../PromptLoader';
import { GeminiClient } from '../../ai/gemini-client';
import { PipelineDebugLogger } from '../../utils/pipeline-debug-logger';

export interface ProductDesignerOutput {
    content: string;
    metadata: {
        stage: string;
        timestamp: number;
        promptUsed: boolean;
        inputStage: string;
        promptLength: number;
        aiUsed?: boolean;
        contextLength?: number;
        usage?: any;
    };
}

export class ProductDesignerRole extends BaseRole {
    private geminiClient?: GeminiClient;
    private debugLogger?: PipelineDebugLogger;

    constructor(geminiClient?: GeminiClient, debugLogger?: PipelineDebugLogger) {
        super();
        this.geminiClient = geminiClient;
        this.debugLogger = debugLogger;
    }

    async execute(input: ProductManagerOutput): Promise<ProductDesignerOutput> {
        this.safeLog('ProductDesigner execute started', {inputStage: input.metadata.stage});
        
        try {
            const prompt = await PromptLoader.loadPrompt('product-designer');
            this.safeLog('Prompt loaded', {promptLength: prompt.length});
            
            
            // Prepare context with PRD content replacement
            const contextWithPRD = prompt.replace('[PRD_CONTENT_PLACEHOLDER]', input.content);
            
            let content: string;
            let aiUsed = false;
            let usage: any = undefined;

            // Try AI generation if GeminiClient is available
            if (this.geminiClient) {
                try {
                    this.safeLog('Attempting AI generation with GeminiClient', {
                        contextLength: contextWithPRD.length,
                        previousStage: input.metadata.stage
                    });
                    
                    // Debug log: context sent to AI
                    this.debugLogger?.logContextSentToAI('Product Designer', contextWithPRD);
                    
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
                        this.debugLogger?.logAIResponse('Product Designer', aiResponse.content, true, aiResponse.usage);
                        
                        this.safeLog('AI generation completed', {
                            contentLength: content.length,
                            usage: aiResponse.usage
                        });
                    } else {
                        // Debug log: AI failure
                        this.debugLogger?.logAIResponse('Product Designer', aiResponse.error || 'Unknown error', false);
                        throw new Error(aiResponse.error || 'AI generation failed');
                    }
                } catch (aiError) {
                    this.safeLog('AI generation failed, falling back to placeholder', aiError);
                    content = this.generateFallbackContent(prompt, input, contextWithPRD);
                    
                    // Debug log: fallback used
                    this.debugLogger?.logFallback('Product Designer', String(aiError), content);
                }
            } else {
                this.safeLog('No GeminiClient provided, using placeholder');
                content = this.generateFallbackContent(prompt, input, contextWithPRD);
                
                // Debug log: fallback used (no client)
                this.debugLogger?.logFallback('Product Designer', 'No GeminiClient provided', content);
            }
            
            const result: ProductDesignerOutput = {
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
        } catch (error) {
            this.safeLog('ProductDesigner failed', error);
            throw error;
        }
    }

    private generateFallbackContent(prompt: string, input: ProductManagerOutput, context: string): string {
        return `Product Designer Analysis (Stage 2/5):

Loaded prompt: ${prompt.substring(0, 200)}...

Previous stage input (${input.metadata.stage}): 
${input.content.substring(0, 300)}...

[AI integration placeholder - prompt ready for processing]

Status: Stage 2 ready with real prompt from your file`;
    }
}