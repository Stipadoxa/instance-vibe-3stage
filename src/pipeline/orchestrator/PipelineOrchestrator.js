"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineOrchestrator = void 0;
const pipeline_logger_1 = require("../../utils/pipeline-logger");
const pipeline_debug_logger_1 = require("../../utils/pipeline-debug-logger");
const ProductManagerRole_1 = require("../roles/ProductManagerRole");
const ProductDesignerRole_1 = require("../roles/ProductDesignerRole");
const UXDesignerRole_1 = require("../roles/UXDesignerRole");
const UIDesignerRole_1 = require("../roles/UIDesignerRole");
const JSONEngineerRole_1 = require("../roles/JSONEngineerRole");
class PipelineOrchestrator {
    constructor(geminiClient) {
        this.startTime = 0;
        this.logger = new pipeline_logger_1.PipelineLogger();
        this.debugLogger = new pipeline_debug_logger_1.PipelineDebugLogger();
        this.geminiClient = geminiClient;
        if (geminiClient) {
            console.log('🤖 PipelineOrchestrator initialized with AI client');
        }
        else {
            console.log('📋 PipelineOrchestrator initialized without AI client (placeholder mode)');
        }
    }
    async processRequest(input) {
        this.startTime = Date.now();
        this.logger.logStageInput(0, 'pipeline-start', input);
        // Initialize debug logging
        this.debugLogger.logUserInput(input);
        const stageResults = {};
        const promptsUsed = {};
        const promptLengths = {};
        try {
            console.log('🚀 Starting FULL 5-stage pipeline with real prompts...');
            // Отримати дані скану дизайн системи
            const designSystemData = await this.getDesignSystemData();
            console.log('🎨 Design system data:', {
                hasData: !!designSystemData,
                componentCount: (designSystemData === null || designSystemData === void 0 ? void 0 : designSystemData.totalCount) || 0
            });
            // Log design system data to debug file
            if (designSystemData === null || designSystemData === void 0 ? void 0 : designSystemData.components) {
                const componentTypes = [...new Set(designSystemData.components.map((c) => c.suggestedType))];
                const firstComponents = designSystemData.components.slice(0, 5).map((c) => `${c.name}(${c.suggestedType})`);
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
            const stage1 = new ProductManagerRole_1.ProductManagerRole(this.geminiClient, this.debugLogger);
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
            const stage2 = new ProductDesignerRole_1.ProductDesignerRole(this.geminiClient, this.debugLogger);
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
            const stage3 = new UXDesignerRole_1.UXDesignerRole(this.geminiClient, this.debugLogger);
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
                    totalComponents: (designSystemData === null || designSystemData === void 0 ? void 0 : designSystemData.totalCount) || 0,
                    componentTypes: (designSystemData === null || designSystemData === void 0 ? void 0 : designSystemData.components) ?
                        [...new Set(designSystemData.components.map((c) => c.suggestedType))].slice(0, 5) : [],
                    firstComponents: (designSystemData === null || designSystemData === void 0 ? void 0 : designSystemData.components) ?
                        designSystemData.components.slice(0, 3).map((c) => `${c.name}(${c.suggestedType})`) : []
                }
            });
            const stage4 = new UIDesignerRole_1.UIDesignerRole(this.geminiClient, this.debugLogger);
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
            const stage5 = new JSONEngineerRole_1.JSONEngineerRole(this.geminiClient, this.debugLogger);
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
            const finalResult = {
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
        }
        catch (error) {
            console.error('❌ Pipeline failed:', error);
            this.logger.logError('pipeline', error instanceof Error ? error : new Error(String(error)));
            return {
                success: false,
                stages: Object.keys(stageResults),
                finalResult: null,
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
    calculateAIUsageStats(stageResults) {
        var _a, _b;
        const stageAIUsage = {};
        let totalStagesWithAI = 0;
        let totalTokensUsed = 0;
        // Check each stage for AI usage
        for (const [stageName, result] of Object.entries(stageResults)) {
            const aiUsed = ((_a = result === null || result === void 0 ? void 0 : result.metadata) === null || _a === void 0 ? void 0 : _a.aiUsed) || false;
            stageAIUsage[stageName] = aiUsed;
            if (aiUsed) {
                totalStagesWithAI++;
                // Add token usage if available
                const usage = (_b = result === null || result === void 0 ? void 0 : result.metadata) === null || _b === void 0 ? void 0 : _b.usage;
                if (usage === null || usage === void 0 ? void 0 : usage.totalTokens) {
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
    async getDesignSystemData() {
        var _a, _b;
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
                        hasComponents: ((_a = data === null || data === void 0 ? void 0 : data.components) === null || _a === void 0 ? void 0 : _a.length) || 0,
                        fileKey: (data === null || data === void 0 ? void 0 : data.fileKey) || 'no-fileKey',
                        scanTime: (data === null || data === void 0 ? void 0 : data.scanTime) || 'no-scanTime',
                        dataStructure: data ? Object.keys(data) : 'null'
                    });
                    // Log first few components if they exist
                    if (((_b = data === null || data === void 0 ? void 0 : data.components) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                        console.log(`📋 First 3 components in "${key}":`, data.components.slice(0, 3).map((c) => ({
                            id: c.id,
                            name: c.name,
                            suggestedType: c.suggestedType,
                            hasVariants: !!c.variantDetails
                        })));
                    }
                }
                const scanSession = await figma.clientStorage.getAsync('design-system-scan');
                if (scanSession && scanSession.components) {
                    console.log('✅ Found ScanSession data - DETAILED CHECK:');
                    console.log('   📊 Session details:', {
                        componentsCount: scanSession.components.length,
                        scanTime: new Date(scanSession.scanTime).toLocaleString(),
                        fileKey: scanSession.fileKey,
                        currentFileMatches: scanSession.fileKey === figma.root.id,
                        version: scanSession.version
                    });
                    const result = {
                        components: scanSession.components,
                        scanTime: scanSession.scanTime,
                        totalCount: scanSession.components.length
                    };
                    console.log('🚀 RETURNING ScanSession data to pipeline:', {
                        totalCount: result.totalCount,
                        componentsPreview: result.components.slice(0, 2).map((c) => `${c.name}(${c.suggestedType})`)
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
                        componentsPreview: result.components.slice(0, 2).map((c) => `${c.name}(${c.suggestedType})`)
                    });
                    return result;
                }
            }
            console.log('❌ NO design system data found anywhere');
            console.log('🔍 Debug: figma available?', typeof figma !== 'undefined');
            console.log('🔍 Debug: clientStorage available?', typeof (figma === null || figma === void 0 ? void 0 : figma.clientStorage) !== 'undefined');
            return null;
        }
        catch (error) {
            console.error('💥 Storage error in getDesignSystemData:', error);
            return null;
        }
    }
}
exports.PipelineOrchestrator = PipelineOrchestrator;
