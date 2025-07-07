import { BaseRole } from './BaseRole';
import { UXDesignerOutput } from './UXDesignerRole';
import { PromptLoader } from '../PromptLoader';
import { GeminiClient } from '../../ai/gemini-client';
import { PipelineDebugLogger } from '../../utils/pipeline-debug-logger';

export interface UIDesignerInput {
    previousStage: UXDesignerOutput;
    designSystemScan?: any; // Design system scan results
}

export interface UIDesignerOutput {
    content: string;
    metadata: {
        stage: string;
        timestamp: number;
        promptUsed: boolean;
        inputStage: string;
        promptLength: number;
        designSystemUsed: boolean;
        componentsAvailable: number;
        aiUsed?: boolean;
        contextLength?: number;
        designSystemContextLength?: number;
    };
}

export class UIDesignerRole extends BaseRole {
    private geminiClient?: GeminiClient;
    private debugLogger?: PipelineDebugLogger;

    constructor(geminiClient?: GeminiClient, debugLogger?: PipelineDebugLogger) {
        super();
        this.geminiClient = geminiClient;
        this.debugLogger = debugLogger;
    }

    async execute(input: any): Promise<UIDesignerOutput> {
        // Handle both old and new input formats for backward compatibility
        const previousStage = input.uxOutput || input.previousStage || input;
        const designSystemScan = input.designSystem || input.designSystemScan || null;
        
        // DETAILED INPUT LOGGING
        console.log('🎨 UIDesigner EXECUTE - DETAILED INPUT ANALYSIS:');
        console.log('   📥 Raw input structure:', {
            hasUxOutput: !!input.uxOutput,
            hasPreviousStage: !!input.previousStage,
            hasDesignSystem: !!input.designSystem,
            hasDesignSystemScan: !!input.designSystemScan,
            inputKeys: Object.keys(input),
            inputType: typeof input
        });
        
        console.log('   📋 Previous stage details:', {
            stage: previousStage?.metadata?.stage,
            contentLength: previousStage?.content?.length,
            aiUsed: previousStage?.metadata?.aiUsed,
            timestamp: previousStage?.metadata?.timestamp
        });
        
        const colorStylesCount = designSystemScan?.colorStyles ? Object.values(designSystemScan.colorStyles).reduce((sum: number, styles: any[]) => sum + styles.length, 0) : 0;
        
        console.log('   🎨 Design System details:', {
            designSystemExists: !!designSystemScan,
            designSystemType: typeof designSystemScan,
            totalCount: designSystemScan?.totalCount,
            componentsArray: designSystemScan?.components ? 'exists' : 'missing',
            componentsCount: designSystemScan?.components?.length || 0,
            colorStylesCount: colorStylesCount,
            scanTime: designSystemScan?.scanTime,
            firstComponent: designSystemScan?.components?.[0] ? {
                id: designSystemScan.components[0].id,
                name: designSystemScan.components[0].name,
                suggestedType: designSystemScan.components[0].suggestedType
            } : 'no-components'
        });
        
        this.safeLog('UIDesigner execute started', {
            inputStage: previousStage.metadata.stage,
            hasDesignSystem: !!designSystemScan
        });
        
        try {
            const prompt = await PromptLoader.loadPrompt('ui-designer');
            this.safeLog('Prompt loaded', {promptLength: prompt.length});
            
            
            const componentsAvailable = designSystemScan?.components?.length || 0;
            const designSystemInfo = this.analyzeDesignSystem(designSystemScan);
            
            // Prepare dual context: UX output + design system data
            const uxContext = `Previous Stage Output (${previousStage.metadata.stage}):\n${previousStage.content}`;
            const designSystemContext = this.formatDesignSystemContext(designSystemScan);
            const fullContext = `${uxContext}\n\n=== DESIGN SYSTEM CONTEXT ===\n${designSystemContext}`;
            
            // Prepare user message with IA and Design System data
            const userMessage = `Information Architecture Specification:\n${previousStage.content}\n\nDesign System Inventory:\n${designSystemContext}`;
            
            // Complete context for debugging and fallback
            const contextWithSpecifications = `${prompt}\n\n${userMessage}`;
            
            let content: string;
            let aiUsed = false;

            // Try AI generation if GeminiClient is available
            if (this.geminiClient) {
                try {
                    this.safeLog('Attempting AI generation with GeminiClient and dual context', {
                        promptLength: prompt.length,
                        userMessageLength: userMessage.length,
                        totalContextLength: contextWithSpecifications.length,
                        previousStage: previousStage.metadata.stage,
                        hasDesignSystem: !!designSystemScan,
                        componentsAvailable
                    });
                    
                    // Debug log: context sent to AI (complete prompt + user message)
                    this.debugLogger?.logContextSentToAI('UI Designer', contextWithSpecifications);
                    
                    console.log('🤖 AI CHAT REQUEST - DETAILED ANALYSIS:');
                    console.log('   📤 System prompt length:', prompt.length);
                    console.log('   📤 User message length:', userMessage.length);
                    console.log('   📤 Total context length:', contextWithSpecifications.length);
                    console.log('   📤 IA content length:', previousStage.content.length);
                    console.log('   📤 Design system context length:', designSystemContext.length);
                    console.log('   📤 Design system context preview:', designSystemContext.substring(0, 300) + '...');
                    console.log('   ⚙️ AI settings:', {
                        temperature: 0.6,
                        maxTokens: 3000,
                        model: 'gemini-client'
                    });
                    
                    // Use chat method with system prompt and user message separation
                    const aiResponse = await this.geminiClient.chat({
                        messages: [
                            { role: 'system', content: prompt },
                            { role: 'user', content: userMessage }
                        ],
                        temperature: 0.6, // Slightly lower for more consistent component selection
                        maxTokens: 3000 // Higher token limit for detailed UI specifications
                    });
                    
                    // DETAILED AI RESPONSE LOGGING
                    console.log('🤖 AI CHAT RESPONSE - DETAILED ANALYSIS:');
                    console.log('   📥 Response success:', aiResponse.success);
                    console.log('   📥 Response content length:', aiResponse.content?.length || 0);
                    console.log('   📥 Response content preview:', aiResponse.content?.substring(0, 200) + '...');
                    console.log('   📊 Token usage:', aiResponse.usage);
                    console.log('   🔄 Retry count:', aiResponse.retryCount || 0);
                    console.log('   ⚠️ Response error:', aiResponse.error || 'none');
                    console.log('   🏁 Finish reason:', aiResponse.finishReason || 'none');

                    if (aiResponse.success && aiResponse.content) {
                        content = `UI Designer Analysis (Stage 4/5):\n\n${aiResponse.content}`;
                        aiUsed = true;
                        
                        // Debug log: AI response
                        this.debugLogger?.logAIResponse('UI Designer', aiResponse.content, true, aiResponse.usage);
                        
                        this.safeLog('AI generation successful', {
                            contentLength: content.length,
                            usage: aiResponse.usage,
                            contextUsed: true,
                            designSystemUsed: !!designSystemScan
                        });
                    } else {
                        // Debug log: AI failure
                        this.debugLogger?.logAIResponse('UI Designer', aiResponse.error || 'Unknown error', false);
                        throw new Error(aiResponse.error || 'AI generation failed');
                    }
                } catch (aiError) {
                    this.safeLog('AI generation failed, falling back to placeholder', aiError);
                    content = this.generateFallbackContent(prompt, previousStage, designSystemInfo, contextWithSpecifications);
                    
                    // Debug log: fallback used
                    this.debugLogger?.logFallback('UI Designer', String(aiError), content);
                }
            } else {
                this.safeLog('No GeminiClient provided, using placeholder');
                content = this.generateFallbackContent(prompt, previousStage, designSystemInfo, contextWithSpecifications);
                
                // Debug log: fallback used (no client)
                this.debugLogger?.logFallback('UI Designer', 'No GeminiClient provided', content);
            }
            
            const result: UIDesignerOutput = {
                content,
                metadata: {
                    stage: 'uiDesigner',
                    timestamp: Date.now(),
                    promptUsed: prompt.length > 100,
                    inputStage: previousStage.metadata.stage,
                    promptLength: prompt.length,
                    designSystemUsed: !!designSystemScan,
                    componentsAvailable,
                    aiUsed,
                    contextLength: contextWithSpecifications.length,
                    designSystemContextLength: designSystemContext.length
                }
            };
            
            this.safeLog('UIDesigner completed', {
                contentLength: result.content.length,
                promptUsed: result.metadata.promptUsed,
                aiUsed: result.metadata.aiUsed,
                contextLength: result.metadata.contextLength,
                designSystemUsed: result.metadata.designSystemUsed,
                componentsAvailable: result.metadata.componentsAvailable
            });
            
            return result;
        } catch (error) {
            this.safeLog('UIDesigner failed', error);
            throw error;
        }
    }

    private formatDesignSystemContext(designSystem?: any): string {
        console.log('🔧 formatDesignSystemContext - INPUT ANALYSIS:');
        console.log('   📊 Design system input:', {
            exists: !!designSystem,
            type: typeof designSystem,
            totalCount: designSystem?.totalCount,
            hasComponents: !!designSystem?.components,
            componentsIsArray: Array.isArray(designSystem?.components),
            componentsLength: designSystem?.components?.length,
            keys: designSystem ? Object.keys(designSystem) : 'null'
        });
        
        if (!designSystem || designSystem.totalCount === 0) {
            const result = 'No design system components available. Recommend using standard UI patterns.';
            console.log('🚫 formatDesignSystemContext - RESULT: No design system');
            return result;
        }

        if (!designSystem.components || !Array.isArray(designSystem.components)) {
            const result = `Design system scan incomplete. Total components: ${designSystem.totalCount}, but component details unavailable.`;
            console.log('⚠️ formatDesignSystemContext - RESULT: Incomplete data');
            return result;
        }

        const componentTypes = this.categorizeComponents(designSystem.components);
        const componentList = designSystem.components.map((comp: any, index: number) => {
            let description = `${index + 1}. ${comp.name || 'Unnamed'} (${comp.suggestedType || 'unknown'}) [ID: "${comp.id}"]`;
            
            // Add confidence score
            if (comp.confidence) {
                description += ` [confidence: ${Math.round(comp.confidence * 100)}%]`;
            }
            
            // Add variant information if available  
            if (comp.variantDetails && Object.keys(comp.variantDetails).length > 0) {
                const variants = Object.entries(comp.variantDetails)
                    .map(([prop, values]) => `${prop}: ${Array.isArray(values) ? values.join('|') : values}`)
                    .join(', ');
                description += ` - Variants: ${variants}`;
            }
            
            // Add enhanced component intelligence
            const intelligence = [];
            if (comp.textHierarchy?.length > 0) {
                const textLevels = [...new Set(comp.textHierarchy.map((t: any) => t.classification))];
                intelligence.push(`Text: ${textLevels.join('/')}`);
            }
            if (comp.componentInstances?.length > 0) {
                intelligence.push(`Has ${comp.componentInstances.length} nested components`);
            }
            if (comp.vectorNodes?.length > 0) {
                intelligence.push(`Contains ${comp.vectorNodes.length} icons/vectors`);
            }
            if (comp.imageNodes?.length > 0) {
                intelligence.push(`Has ${comp.imageNodes.length} image placeholders`);
            }
            if (comp.isFromLibrary) {
                intelligence.push(`Library component`);
            }
            
            if (intelligence.length > 0) {
                description += ` [${intelligence.join(', ')}]`;
            }
            
            return description;
        }).slice(0, 20); // Limit to first 20 components to avoid token limits

        // Create enhanced context with component intelligence summary
        const libraryComponents = designSystem.components.filter((c: any) => c.isFromLibrary).length;
        const componentsWithVariants = designSystem.components.filter((c: any) => c.variantDetails && Object.keys(c.variantDetails).length > 0).length;
        const componentsWithIcons = designSystem.components.filter((c: any) => c.vectorNodes?.length > 0).length;
        const componentsWithImages = designSystem.components.filter((c: any) => c.imageNodes?.length > 0).length;
        
        // Add color styles section if available
        let colorStylesSection = '';
        if (designSystem.colorStyles) {
            const totalColorStyles = Object.values(designSystem.colorStyles).reduce((sum: number, styles: any[]) => sum + styles.length, 0);
            if (totalColorStyles > 0) {
                colorStylesSection = `

Available Color Styles:
- Total: ${totalColorStyles} color styles available`;
                
                Object.entries(designSystem.colorStyles).forEach(([category, styles]: [string, any[]]) => {
                    if (styles.length > 0) {
                        colorStylesSection += `\n- ${category.toUpperCase()}: ${styles.length} styles`;
                        // Add first few color examples
                        const examples = styles.slice(0, 3).map(style => `${style.name} (${style.colorInfo.color})`).join(', ');
                        if (examples) {
                            colorStylesSection += ` - Examples: ${examples}`;
                        }
                    }
                });
                
                colorStylesSection += `

Color Usage Guidelines:
- Use PRIMARY colors for main actions, headers, and brand elements
- Use SECONDARY colors for supporting actions and accents  
- Use NEUTRAL colors for text, backgrounds, and borders
- Use SEMANTIC colors for success/error/warning states
- Use SURFACE colors for backgrounds and containers`;
            }
        }

        const result = `Available Design System Components:
- Total: ${designSystem.totalCount}
- Types: ${Object.keys(componentTypes).join(', ')}
- Component breakdown: ${JSON.stringify(componentTypes)}
- Library components: ${libraryComponents}/${designSystem.totalCount}
- Components with variants: ${componentsWithVariants}/${designSystem.totalCount}
- Components with icons: ${componentsWithIcons}/${designSystem.totalCount}
- Components with image support: ${componentsWithImages}/${designSystem.totalCount}${colorStylesSection}

Specific Components (first 20 with enhanced intelligence):
${componentList.join('\n')}

Enhanced Component Intelligence Available:
- Confidence scores for type detection (70+ pattern matching)
- Variant property analysis with complete value mapping
- Text hierarchy classification (primary/secondary/tertiary)
- Nested component detection (icons, sub-components)
- Visual element analysis (vectors, images, text layers)
- Library vs local component identification

CRITICAL: ALWAYS use EXACT componentId values from the [ID: "..."] field above.
Example: Use "componentId": "10:3907" NOT "componentId": "button"

Please recommend specific components from this list for the UI design, using EXACT component IDs, variants, confidence scores, and enhanced capabilities.`;

        console.log('✅ formatDesignSystemContext - FINAL RESULT:');
        console.log('   📋 Component types found:', Object.keys(componentTypes));
        console.log('   📊 Components breakdown:', componentTypes);
        console.log('   📝 Context length:', result.length);
        console.log('   🎯 First 3 components formatted:');
        componentList.slice(0, 3).forEach((comp, idx) => {
            console.log(`      ${idx + 1}. ${comp}`);
        });
        
        return result;
    }

    private generateFallbackContent(prompt: string, previousStage: UXDesignerOutput, designSystemInfo: string, fullContext: string): string {
        return `UI Designer Analysis (Stage 4/5):

Loaded prompt: ${prompt.substring(0, 200)}...

Previous stage input (${previousStage.metadata.stage}): 
${previousStage.content.substring(0, 300)}...

${designSystemInfo}

[AI integration would process the UX context and design system data here with your UI prompt]

Status: Stage 4 ready with real prompt + design system context. ${this.geminiClient ? 'AI generation failed, using fallback.' : 'No AI client provided.'}

Context Length: ${fullContext.length} characters
Prompt Length: ${prompt.length} characters
Previous Stage AI Used: ${previousStage.metadata.aiUsed || false}
Design System Available: ${!!previousStage}`;
    }

    private analyzeDesignSystem(designSystem?: any): string {
        this.safeLog('Analyzing design system', {
            hasDesignSystem: !!designSystem,
            totalCount: designSystem?.totalCount,
            hasComponents: !!designSystem?.components,
            componentsLength: designSystem?.components?.length,
            componentsType: typeof designSystem?.components
        });
        
        if (!designSystem || designSystem.totalCount === 0) {
            return `❌ No design system data available
- Components scanned: 0
- Recommendation: Scan design system first for better component selection`;
        }

        if (!designSystem.components || !Array.isArray(designSystem.components)) {
            return `⚠️ Design system data incomplete
- Total count: ${designSystem.totalCount}
- Components array: missing or invalid
- Components type: ${typeof designSystem.components}`;
        }

        const componentTypes = this.categorizeComponents(designSystem.components);
        
        return `✅ Design system loaded successfully
- Total components: ${designSystem.totalCount}
- Component types available: ${Object.keys(componentTypes).join(', ') || 'None categorized'}
- Components breakdown: ${JSON.stringify(componentTypes)}
- Scan time: ${designSystem.scanTime ? new Date(designSystem.scanTime).toLocaleString() : 'Unknown'}
- Ready for intelligent component selection`;
    }

    private categorizeComponents(components: any[]): Record<string, number> {
        const categories: Record<string, number> = {};
        
        components.forEach(component => {
            const type = component.suggestedType || 'unknown';
            categories[type] = (categories[type] || 0) + 1;
        });
        
        return categories;
    }
}