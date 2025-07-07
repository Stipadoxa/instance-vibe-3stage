import { PipelineLogger } from '../../utils/pipeline-logger';
import { PipelineDebugLogger } from '../../utils/pipeline-debug-logger';
import { ProductManagerRole, ProductManagerOutput } from '../roles/ProductManagerRole';
import { ProductDesignerRole, ProductDesignerOutput } from '../roles/ProductDesignerRole';
import { UXDesignerRole, UXDesignerOutput } from '../roles/UXDesignerRole';
import { UIDesignerRole, UIDesignerOutput } from '../roles/UIDesignerRole';
import { JSONEngineerRole, JSONEngineerOutput } from '../roles/JSONEngineerRole';
import { PIPELINE_CONFIG } from '../../config/pipeline-config';
import { GeminiClient } from '../../ai/gemini-client';

export interface PipelineResult {
    success: boolean;
    stages: string[];
    finalResult: JSONEngineerOutput;
    runId: string;
    executionTime: number;
    promptsUsed: Record<string, boolean>;
    promptLengths: Record<string, number>;
    stageResults: Record<string, any>;
    designSystemUsed: boolean;
    componentsAvailable: number;
    aiUsageStats: {
        totalStagesWithAI: number;
        stageAIUsage: Record<string, boolean>;
        hasGeminiClient: boolean;
        totalTokensUsed?: number;
    };
}

export class PipelineOrchestrator {
    private logger: PipelineLogger;
    private debugLogger: PipelineDebugLogger;
    private startTime: number = 0;
    private geminiClient?: GeminiClient;
    
    constructor(geminiClient?: GeminiClient) {
        this.logger = new PipelineLogger();
        this.debugLogger = new PipelineDebugLogger();
        this.geminiClient = geminiClient;
        
        if (geminiClient) {
            console.log('🤖 PipelineOrchestrator initialized with AI client');
        } else {
            console.log('📋 PipelineOrchestrator initialized without AI client (placeholder mode)');
        }
    }
    
    async processRequest(input: string): Promise<PipelineResult> {
        this.startTime = Date.now();
        this.logger.logStageInput(0, 'pipeline-start', input);
        
        // Initialize debug logging
        this.debugLogger.logUserInput(input);
        
        const stageResults: Record<string, any> = {};
        const promptsUsed: Record<string, boolean> = {};
        const promptLengths: Record<string, number> = {};
        
        try {
            console.log('🚀 Starting FULL 5-stage pipeline with real prompts...');
            
            // Отримати дані скану дизайн системи
            const designSystemData = await this.getDesignSystemData();
            console.log('🎨 Design system data:', {
                hasData: !!designSystemData,
                componentCount: designSystemData?.totalCount || 0
            });
            
            // Log design system data to debug file
            if (designSystemData?.components) {
                const componentTypes = [...new Set(designSystemData.components.map((c: any) => c.suggestedType))];
                const firstComponents = designSystemData.components.slice(0, 5).map((c: any) => `${c.name}(${c.suggestedType})`);
                this.debugLogger.logDesignSystemData(designSystemData.totalCount, componentTypes, firstComponents);
            }
            
            // Stage 1: Product Manager
            console.log('📋 Stage 1/5: Product Manager');
            this.debugLogger.logStageStart(1, 'Product Manager');
            console.log('📤 STAGE 1 INPUT:', {
                type: 'string',
                length: input.length,
                preview: input.substring(0, 200) + (input.length > 200 ? '...' : '')
            });
            
            const stage1 = new ProductManagerRole(this.geminiClient, this.debugLogger);
            const result1 = await stage1.execute(input);
            
            console.log('📥 STAGE 1 OUTPUT:', {
                contentLength: result1.content.length,
                aiUsed: result1.metadata.aiUsed,
                contentPreview: result1.content.substring(0, 300) + (result1.content.length > 300 ? '...' : '')
            });
            
            this.debugLogger.logStageComplete(1, 'Product Manager', result1.metadata.aiUsed || false, result1.content.length);
            
            this.logger.logStageOutput(1, 'productManager', result1);
            stageResults.productManager = result1;
            promptsUsed.productManager = result1.metadata.promptUsed;
            promptLengths.productManager = result1.metadata.promptLength || 0;
            
            // Stage 2: Product Designer  
            console.log('🎨 Stage 2/5: Product Designer');
            this.debugLogger.logStageStart(2, 'Product Designer');
            console.log('📤 STAGE 2 INPUT:', {
                fromStage: result1.metadata.stage,
                contentLength: result1.content.length,
                aiUsed: result1.metadata.aiUsed,
                contentPreview: result1.content.substring(0, 300) + (result1.content.length > 300 ? '...' : '')
            });
            
            const stage2 = new ProductDesignerRole(this.geminiClient, this.debugLogger);
            const result2 = await stage2.execute(result1);
            
            console.log('📥 STAGE 2 OUTPUT:', {
                contentLength: result2.content.length,
                aiUsed: result2.metadata.aiUsed,
                contentPreview: result2.content.substring(0, 300) + (result2.content.length > 300 ? '...' : '')
            });
            
            this.debugLogger.logStageComplete(2, 'Product Designer', result2.metadata.aiUsed || false, result2.content.length);
            
            this.logger.logStageOutput(2, 'productDesigner', result2);
            stageResults.productDesigner = result2;
            promptsUsed.productDesigner = result2.metadata.promptUsed;
            promptLengths.productDesigner = result2.metadata.promptLength || 0;
            
            // Stage 3: UX Designer
            console.log('🧭 Stage 3/5: UX Designer');
            this.debugLogger.logStageStart(3, 'UX Designer');
            console.log('📤 STAGE 3 INPUT:', {
                fromStage: result2.metadata.stage,
                contentLength: result2.content.length,
                aiUsed: result2.metadata.aiUsed,
                contentPreview: result2.content.substring(0, 300) + (result2.content.length > 300 ? '...' : '')
            });
            
            const stage3 = new UXDesignerRole(this.geminiClient, this.debugLogger);
            const result3 = await stage3.execute(result2);
            
            console.log('📥 STAGE 3 OUTPUT:', {
                contentLength: result3.content.length,
                aiUsed: result3.metadata.aiUsed,
                contentPreview: result3.content.substring(0, 300) + (result3.content.length > 300 ? '...' : '')
            });
            
            this.debugLogger.logStageComplete(3, 'UX Designer', result3.metadata.aiUsed || false, result3.content.length);
            
            this.logger.logStageOutput(3, 'uxDesigner', result3);
            stageResults.uxDesigner = result3;
            promptsUsed.uxDesigner = result3.metadata.promptUsed;
            promptLengths.uxDesigner = result3.metadata.promptLength || 0;
            
            // Stage 4: UI Designer (with design system!)
            console.log('💫 Stage 4/5: UI Designer (with design system)');
            this.debugLogger.logStageStart(4, 'UI Designer');
            console.log('📤 STAGE 4 INPUT STRUCTURE:', {
                uxOutput: {
                    fromStage: result3.metadata.stage,
                    contentLength: result3.content.length,
                    aiUsed: result3.metadata.aiUsed,
                    contentPreview: result3.content.substring(0, 200) + (result3.content.length > 200 ? '...' : '')
                },
                designSystem: {
                    hasData: !!designSystemData,
                    totalComponents: designSystemData?.totalCount || 0,
                    componentTypes: designSystemData?.components ? 
                        [...new Set(designSystemData.components.map((c: any) => c.suggestedType))].slice(0, 5) : [],
                    firstComponents: designSystemData?.components ?
                        designSystemData.components.slice(0, 3).map((c: any) => `${c.name}(${c.suggestedType})`) : []
                }
            });
            
            const stage4 = new UIDesignerRole(this.geminiClient, this.debugLogger);
            const uiDesignerInput = {
                uxOutput: result3,
                designSystem: designSystemData
            };
            const result4 = await stage4.execute(uiDesignerInput);
            
            console.log('📥 STAGE 4 OUTPUT:', {
                contentLength: result4.content.length,
                aiUsed: result4.metadata.aiUsed,
                designSystemUsed: result4.metadata.designSystemUsed,
                contentPreview: result4.content.substring(0, 300) + (result4.content.length > 300 ? '...' : '')
            });
            
            this.debugLogger.logStageComplete(4, 'UI Designer', result4.metadata.aiUsed || false, result4.content.length);
            
            this.logger.logStageOutput(4, 'uiDesigner', result4);
            stageResults.uiDesigner = result4;
            promptsUsed.uiDesigner = result4.metadata.promptUsed;
            promptLengths.uiDesigner = result4.metadata.promptLength || 0;
            
            // Stage 5: JSON Engineer
            console.log('⚙️ Stage 5/5: JSON Engineer');
            this.debugLogger.logStageStart(5, 'JSON Engineer');
            console.log('📤 STAGE 5 INPUT:', {
                fromStage: result4.metadata.stage,
                contentLength: result4.content.length,
                aiUsed: result4.metadata.aiUsed,
                designSystemUsed: result4.metadata.designSystemUsed,
                contentPreview: result4.content.substring(0, 300) + (result4.content.length > 300 ? '...' : '')
            });
            
            const stage5 = new JSONEngineerRole(this.geminiClient, this.debugLogger);
            const result5 = await stage5.execute(result4);
            
            console.log('📥 STAGE 5 OUTPUT:', {
                contentLength: result5.content.length,
                aiUsed: result5.metadata.aiUsed,
                jsonGenerated: result5.metadata.jsonGenerated,
                jsonValid: result5.metadata.jsonValid,
                contentPreview: result5.content.substring(0, 300) + (result5.content.length > 300 ? '...' : '')
            });
            
            this.debugLogger.logStageComplete(5, 'JSON Engineer', result5.metadata.aiUsed || false, result5.content.length);
            
            this.logger.logStageOutput(5, 'jsonEngineer', result5);
            stageResults.jsonEngineer = result5;
            promptsUsed.jsonEngineer = result5.metadata.promptUsed;
            promptLengths.jsonEngineer = result5.metadata.promptLength || 0;
            
            console.log('✅ FULL PIPELINE COMPLETED!');
            
            // Calculate AI usage statistics
            const aiUsageStats = this.calculateAIUsageStats(stageResults);
            
            // Complete debug logging
            const totalTime = Date.now() - this.startTime;
            this.debugLogger.logPipelineComplete(totalTime, aiUsageStats.totalStagesWithAI, 5);
            
            const finalResult: PipelineResult = {
                success: true,
                stages: ['productManager', 'productDesigner', 'uxDesigner', 'uiDesigner', 'jsonEngineer'],
                finalResult: result5,
                runId: this.logger['runId'] || 'unknown',
                executionTime: Date.now() - this.startTime,
                promptsUsed,
                promptLengths,
                stageResults,
                designSystemUsed: result4.metadata.designSystemUsed,
                componentsAvailable: result4.metadata.componentsAvailable,
                aiUsageStats
            };
            
            this.logger.logStageOutput(0, 'pipeline-complete', finalResult);
            
            return finalResult;
            
        } catch (error) {
            console.error('❌ Pipeline failed:', error);
            this.logger.logError('pipeline', error instanceof Error ? error : new Error(String(error)));
            
            return {
                success: false,
                stages: Object.keys(stageResults),
                finalResult: null as any,
                runId: this.logger['runId'] || 'unknown',
                executionTime: Date.now() - this.startTime,
                promptsUsed,
                promptLengths,
                stageResults,
                designSystemUsed: false,
                componentsAvailable: 0,
                aiUsageStats: {
                    totalStagesWithAI: 0,
                    stageAIUsage: {},
                    hasGeminiClient: !!this.geminiClient
                }
            };
        }
    }

    private calculateAIUsageStats(stageResults: Record<string, any>): any {
        const stageAIUsage: Record<string, boolean> = {};
        let totalStagesWithAI = 0;
        let totalTokensUsed = 0;

        // Check each stage for AI usage
        for (const [stageName, result] of Object.entries(stageResults)) {
            const aiUsed = result?.metadata?.aiUsed || false;
            stageAIUsage[stageName] = aiUsed;
            
            if (aiUsed) {
                totalStagesWithAI++;
                // Add token usage if available
                const usage = result?.metadata?.usage;
                if (usage?.totalTokens) {
                    totalTokensUsed += usage.totalTokens;
                }
            }
        }

        console.log(`🤖 AI Usage Summary: ${totalStagesWithAI}/5 stages used AI`);
        
        return {
            totalStagesWithAI,
            stageAIUsage,
            hasGeminiClient: !!this.geminiClient,
            totalTokensUsed: totalTokensUsed > 0 ? totalTokensUsed : undefined
        };
    }

    private async getDesignSystemData(): Promise<any> {
        try {
            console.log('🔍 CHECKING STORAGE for design system data...');
            console.log('📍 Current file info:', {
                figmaFileKey: figma.fileKey,
                figmaRootId: figma.root.id,
                figmaRootName: figma.root.name
            });
            
            if (typeof figma !== 'undefined' && figma.clientStorage) {
                const allKeys = ['design-system-scan', 'last-scan-results'];
                for (const key of allKeys) {
                    const data = await figma.clientStorage.getAsync(key);
                    console.log(`📦 Storage key "${key}":`, {
                        exists: !!data,
                        type: typeof data,
                        hasComponents: data?.components?.length || 0,
                        fileKey: data?.fileKey || 'no-fileKey',
                        scanTime: data?.scanTime || 'no-scanTime',
                        dataStructure: data ? Object.keys(data) : 'null'
                    });
                    
                    // Log first few components if they exist
                    if (data?.components?.length > 0) {
                        console.log(`📋 First 3 components in "${key}":`, 
                            data.components.slice(0, 3).map((c: any) => ({
                                id: c.id,
                                name: c.name,
                                suggestedType: c.suggestedType,
                                hasVariants: !!c.variantDetails
                            }))
                        );
                    }
                }
                
                const scanSession = await figma.clientStorage.getAsync('design-system-scan');
                if (scanSession && scanSession.components) {
                    const colorStylesCount = scanSession.colorStyles ? Object.values(scanSession.colorStyles).reduce((sum: number, styles: any[]) => sum + styles.length, 0) : 0;
                    
                    console.log('✅ Found ScanSession data - DETAILED CHECK:');
                    console.log('   📊 Session details:', {
                        componentsCount: scanSession.components.length,
                        colorStylesCount: colorStylesCount,
                        scanTime: new Date(scanSession.scanTime).toLocaleString(),
                        fileKey: scanSession.fileKey,
                        currentFileMatches: scanSession.fileKey === figma.root.id,
                        version: scanSession.version
                    });
                    
                    const result = {
                        components: scanSession.components,
                        colorStyles: scanSession.colorStyles || null,
                        scanTime: scanSession.scanTime,
                        totalCount: scanSession.components.length,
                        colorStylesCount: colorStylesCount
                    };
                    
                    console.log('🚀 RETURNING ScanSession data to pipeline:', {
                        totalCount: result.totalCount,
                        colorStylesCount: result.colorStylesCount,
                        componentsPreview: result.components.slice(0, 2).map((c: any) => `${c.name}(${c.suggestedType})`)
                    });
                    
                    return result;
                }
                
                const savedComponents = await figma.clientStorage.getAsync('last-scan-results');
                if (savedComponents && Array.isArray(savedComponents)) {
                    console.log('✅ Found last-scan-results data - DETAILED CHECK:');
                    console.log('   📊 Components details:', {
                        componentsCount: savedComponents.length,
                        firstComponent: savedComponents[0] ? {
                            id: savedComponents[0].id,
                            name: savedComponents[0].name,
                            suggestedType: savedComponents[0].suggestedType
                        } : 'no-components'
                    });
                    
                    const result = {
                        components: savedComponents,
                        scanTime: Date.now(),
                        totalCount: savedComponents.length
                    };
                    
                    console.log('🚀 RETURNING last-scan-results data to pipeline:', {
                        totalCount: result.totalCount,
                        componentsPreview: result.components.slice(0, 2).map((c: any) => `${c.name}(${c.suggestedType})`)
                    });
                    
                    return result;
                }
            }
            
            console.log('❌ NO design system data found anywhere');
            console.log('🔍 Debug: figma available?', typeof figma !== 'undefined');
            console.log('🔍 Debug: clientStorage available?', typeof figma?.clientStorage !== 'undefined');
            return null;
        } catch (error) {
            console.error('💥 Storage error in getDesignSystemData:', error);
            return null;
        }
    }
}