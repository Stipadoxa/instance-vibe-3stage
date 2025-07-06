import { BaseRole } from './BaseRole';
import { UIDesignerOutput } from './UIDesignerRole';
import { PromptLoader } from '../PromptLoader';
import { GeminiClient } from '../../ai/gemini-client';
import { PipelineDebugLogger } from '../../utils/pipeline-debug-logger';

export interface JSONEngineerOutput {
    content: string;
    generatedJSON?: any; // Parsed JSON object if successful
    metadata: {
        stage: string;
        timestamp: number;
        promptUsed: boolean;
        inputStage: string;
        promptLength: number;
        aiUsed?: boolean;
        contextLength?: number;
        jsonGenerated?: boolean;
        jsonValid?: boolean;
        jsonParseError?: string;
    };
}

export class JSONEngineerRole extends BaseRole {
    private geminiClient?: GeminiClient;
    private debugLogger?: PipelineDebugLogger;

    constructor(geminiClient?: GeminiClient, debugLogger?: PipelineDebugLogger) {
        super();
        this.geminiClient = geminiClient;
        this.debugLogger = debugLogger;
    }

    async execute(input: UIDesignerOutput): Promise<JSONEngineerOutput> {
        this.safeLog('JSONEngineer execute started', {inputStage: input.metadata.stage});
        
        try {
            const prompt = await PromptLoader.loadPrompt('json-engineer');
            this.safeLog('Prompt loaded', {promptLength: prompt.length});
            
            
            // Prepare context from UI Designer output
            const context = `Previous Stage Output (${input.metadata.stage}):\n${input.content}`;
            
            let content: string;
            let generatedJSON: any = null;
            let aiUsed = false;
            let jsonGenerated = false;
            let jsonValid = false;
            let jsonParseError: string | undefined;

            // Prepare context with UI specifications  
            const contextWithSpecs = `${prompt}\n\nUI Designer Specifications:\n${input.content}`;

            // Try AI generation if GeminiClient is available
            if (this.geminiClient) {
                try {
                    this.safeLog('Attempting AI JSON generation with GeminiClient', {
                        contextLength: contextWithSpecs.length,
                        previousStage: input.metadata.stage
                    });
                    
                    // Debug log: context sent to AI
                    this.debugLogger?.logContextSentToAI('JSON Engineer', contextWithSpecs);
                    
                    // Use generateJSON method with complete context
                    const aiResponse = await this.geminiClient.generateJSON(
                        contextWithSpecs
                    );

                    if (aiResponse.success && aiResponse.content) {
                        // Try to parse the generated JSON
                        const parseResult = this.parseAndValidateJSON(aiResponse.content);
                        
                        if (parseResult.success) {
                            generatedJSON = parseResult.json;
                            jsonGenerated = true;
                            jsonValid = true;
                            content = `JSON Engineer Analysis (Stage 5/5):\n\nSuccessfully generated JSON configuration:\n\n\`\`\`json\n${JSON.stringify(generatedJSON, null, 2)}\n\`\`\``;
                        } else {
                            jsonParseError = parseResult.error;
                            content = `JSON Engineer Analysis (Stage 5/5):\n\nAI generated response but JSON parsing failed:\n\nError: ${parseResult.error}\n\nRaw AI Response:\n${aiResponse.content}`;
                        }
                        
                        aiUsed = true;
                        
                        // Debug log: AI response
                        this.debugLogger?.logAIResponse('JSON Engineer', aiResponse.content, true, aiResponse.usage);
                        
                        this.safeLog('AI JSON generation completed', {
                            contentLength: content.length,
                            usage: aiResponse.usage,
                            jsonGenerated,
                            jsonValid,
                            jsonParseError
                        });
                    } else {
                        // Debug log: AI failure
                        this.debugLogger?.logAIResponse('JSON Engineer', aiResponse.error || 'Unknown error', false);
                        throw new Error(aiResponse.error || 'AI JSON generation failed');
                    }
                } catch (aiError) {
                    this.safeLog('AI JSON generation failed, falling back to placeholder', aiError);
                    content = this.generateFallbackContent(prompt, input, contextWithSpecs);
                    
                    // Debug log: fallback used
                    this.debugLogger?.logFallback('JSON Engineer', String(aiError), content);
                }
            } else {
                this.safeLog('No GeminiClient provided, using placeholder');
                content = this.generateFallbackContent(prompt, input, contextWithSpecs);
                
                // Debug log: fallback used (no client)
                this.debugLogger?.logFallback('JSON Engineer', 'No GeminiClient provided', content);
            }
            
            const result: JSONEngineerOutput = {
                content,
                generatedJSON,
                metadata: {
                    stage: 'jsonEngineer',
                    timestamp: Date.now(),
                    promptUsed: prompt.length > 100,
                    inputStage: input.metadata.stage,
                    promptLength: prompt.length,
                    aiUsed,
                    contextLength: contextWithSpecs.length,
                    jsonGenerated,
                    jsonValid,
                    jsonParseError
                }
            };
            
            this.safeLog('JSONEngineer completed', {
                contentLength: result.content.length,
                promptUsed: result.metadata.promptUsed,
                aiUsed: result.metadata.aiUsed,
                contextLength: result.metadata.contextLength,
                jsonGenerated: result.metadata.jsonGenerated,
                jsonValid: result.metadata.jsonValid,
                hasGeneratedJSON: !!result.generatedJSON
            });
            
            return result;
        } catch (error) {
            this.safeLog('JSONEngineer failed', error);
            throw error;
        }
    }

    private parseAndValidateJSON(jsonString: string): { success: boolean; json?: any; error?: string } {
        try {
            // Clean up the JSON string - remove markdown formatting if present
            let cleanedJSON = jsonString.trim();
            
            // Remove markdown code blocks if present
            if (cleanedJSON.startsWith('```json')) {
                cleanedJSON = cleanedJSON.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanedJSON.startsWith('```')) {
                cleanedJSON = cleanedJSON.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }
            
            // Try to extract JSON if it's embedded in text
            const jsonMatch = cleanedJSON.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanedJSON = jsonMatch[0];
            }
            
            const parsedJSON = JSON.parse(cleanedJSON);
            
            // Basic validation - ensure it's an object
            if (typeof parsedJSON !== 'object' || parsedJSON === null) {
                return {
                    success: false,
                    error: 'Generated JSON is not a valid object'
                };
            }
            
            return {
                success: true,
                json: parsedJSON
            };
        } catch (parseError) {
            return {
                success: false,
                error: parseError instanceof Error ? parseError.message : 'Unknown JSON parsing error'
            };
        }
    }

    private generateFallbackContent(prompt: string, input: UIDesignerOutput, context: string): string {
        return `JSON Engineer Analysis (Stage 5/5):\n\nLoaded prompt: ${prompt.substring(0, 200)}...\n\nPrevious stage input (${input.metadata.stage}): \n${input.content.substring(0, 300)}...\n\n[AI integration would generate JSON configuration here based on UI specifications]\n\nStatus: Stage 5 ready with real prompt - FINAL STAGE! ${this.geminiClient ? 'AI generation failed, using fallback.' : 'No AI client provided.'}\n\nContext Length: ${context.length} characters\nPrompt Length: ${prompt.length} characters\nPrevious Stage AI Used: ${input.metadata.aiUsed || false}\nPrevious Stage Design System Used: ${input.metadata.designSystemUsed || false}`;
    }

    /**
     * Get the generated JSON object if available
     */
    getGeneratedJSON(): any | null {
        return null; // This would be set by the execute method
    }
}