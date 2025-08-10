// code.ts - COMPLETE MODULAR VERSION WITH VALIDATION ENGINE
import { SessionManager, SessionState, ComponentInfo } from './src/core/session-manager';
import { SessionService } from './src/core/session-service';
import { GeminiService } from './src/core/gemini-service';
import { ScanSession } from './src/core/component-scanner';
import { DesignSystemScannerService } from './src/core/design-system-scanner-service';
import { FigmaRenderer } from './src/core/figma-renderer';
import { GeminiAPI, GeminiRequest } from './src/ai/gemini-api';
import { GeminiClient } from './src/ai/gemini-client';
import { ValidationEngine, ValidationResult } from './src/core/validation-engine';
import { PipelineLogger } from './src/utils/pipeline-logger';
import { EnvironmentValidator } from './src/utils/environment-validator';
import { PromptLoader } from './src/pipeline/PromptLoader';
import { BaseRole } from './src/pipeline/roles/BaseRole';
import { ProductManagerRole } from './src/pipeline/roles/ProductManagerRole';
import { PipelineOrchestrator } from './src/pipeline/orchestrator/PipelineOrchestrator';
import { StaticPromptLoader } from './src/pipeline/StaticPromptLoader';
import { ComponentPropertyEngine } from './src/core/component-property-engine';
import { ComponentScanner } from './src/core/component-scanner';
import { JSONMigrator } from './src/core/json-migrator';
import { SimpleDesignReviewer } from './src/core/simple-design-reviewer';

// Global validation engine instance
let validationEngine: ValidationEngine;

// All automated tests disabled for cleaner console output
// Uncomment individual tests as needed for debugging

// Initialize GeminiClient for pipeline testing
async function initializeAIPipeline(): Promise<PipelineOrchestrator> {
    try {
        console.log('🔧 initializeAIPipeline: Starting initialization...');
        const apiKey = await figma.clientStorage.getAsync('geminiApiKey');
        console.log('🔧 initializeAIPipeline: API key check:', {
            hasApiKey: !!apiKey,
            keyLength: apiKey ? apiKey.length : 0,
            keyPreview: apiKey ? '****' + apiKey.slice(-4) : 'none'
        });
        
        if (apiKey) {
            console.log('🤖 Initializing AI-powered pipeline with GeminiClient');
            const geminiClient = new GeminiClient({ apiKey });
            console.log('🔧 initializeAIPipeline: GeminiClient created:', {
                clientExists: !!geminiClient,
                clientType: typeof geminiClient,
                clientConfig: geminiClient ? 'configured' : 'failed'
            });
            
            const orchestrator = new PipelineOrchestrator(geminiClient);
            console.log('🔧 initializeAIPipeline: PipelineOrchestrator created with client');
            return orchestrator;
        } else {
            console.log('📋 No API key found, initializing placeholder pipeline');
            return new PipelineOrchestrator();
        }
    } catch (error) {
        console.error('💥 Error in initializeAIPipeline:', error);
        console.warn('⚠️ Error initializing AI pipeline, using placeholder mode:', error);
        return new PipelineOrchestrator();
    }
}

// Automated pipeline tests disabled for cleaner console output during manual testing
// Uncomment below to re-enable automated testing:
/*
initializeAIPipeline().then(orchestrator => {
    return orchestrator.processRequest('Create a modern e-commerce checkout with payment validation');
}).then(result => {
    console.log('🎯 AUTOMATED PIPELINE TEST:', result.aiUsageStats);
}).catch(error => {
    console.error('❌ Automated test error:', error);
});
*/

// 🧪 CLEAN STATIC IMPORT TEST
async function runStaticImportTest() {
   console.log('🧪 === STATIC IMPORT TEST START ===');
   
   // Environment Analysis
   console.log('🔍 Environment Analysis:');
   console.log('- typeof require:', typeof require);
   console.log('- typeof fetch:', typeof fetch);
   console.log('- typeof globalThis:', typeof globalThis);
   
   // MAIN TEST: Updated PromptLoader with static imports
   console.log('🧪 TESTING UPDATED PROMPTLOADER:');
   
   const availablePrompts = PromptLoader.getAvailablePrompts();
   console.log('📋 Available prompts:', availablePrompts);
   
   // Test all 5 prompts
   for (const promptName of availablePrompts) {
       try {
           const prompt = await PromptLoader.loadPrompt(promptName);
           console.log(`✅ ${promptName}: ${prompt.length} characters`);
       } catch (error) {
           console.log(`❌ ${promptName}: FAILED -`, error.message);
       }
   }
   
   console.log('🧪 === STATIC IMPORT TEST END ===');
   
   // Summary
   console.log('📊 TEST SUMMARY:');
   console.log('- If ✅ STATIC IMPORT SUCCESS: External files work via webpack bundling');
   console.log('- If ❌ STATIC IMPORT FAILED: Need to embed prompts as constants');
}

// Static import test disabled for cleaner console
// runStaticImportTest().catch(error => {
//    console.error('🚨 Static test failed:', error);
// });

async function navigateToComponent(componentId: string, pageName?: string): Promise<void> {
    try {
        const node = await figma.getNodeByIdAsync(componentId);
        if (!node) {
            figma.notify("Component not found", { error: true });
            return;
        }
        if (pageName) {
            const targetPage = figma.root.children.find(p => p.name === pageName) as PageNode | undefined;
            if (targetPage && targetPage.id !== figma.currentPage.id) {
                figma.currentPage = targetPage;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        figma.currentPage.selection = [node as SceneNode];
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
        figma.notify(`Navigated to: ${node.name}`, { timeout: 2000 });
    } catch (e) {
        figma.notify("Navigation error", { error: true });
        console.error("❌ Navigation error:", e);
    }
}

// ENHANCED: API-driven UI generation with validation
async function generateUIFromAPI(prompt: string, systemPrompt: string, enableValidation: boolean = true): Promise<{
  layoutData: any;
  validationResult?: ValidationResult;
  finalJSON: string;
  retryCount: number;
}> {
    try {
        const geminiAPI = await GeminiAPI.createFromStorage();
        if (!geminiAPI) {
            throw new Error("No API key found. Please configure your Gemini API key first.");
        }

        const request: GeminiRequest = {
            prompt,
            systemPrompt,
            temperature: 0.7
        };

        console.log("🤖 Calling Gemini API for UI generation...");
        const response = await geminiAPI.generateJSON(request);

        if (!response.success) {
            throw new Error(response.error || "API call failed");
        }

        if (!response.content) {
            throw new Error("No content received from API");
        }

        let finalJSON = response.content;
        let validationResult: ValidationResult | undefined;
        let retryCount = 0;

        // Validate and potentially retry
        if (enableValidation && validationEngine) {
            console.log("🔍 Validating generated JSON...");
            const validationData = await validationEngine.validateWithRetry(
                response.content, 
                prompt, 
                geminiAPI
            );
            
            validationResult = validationData.result;
            finalJSON = validationData.finalJSON;
            retryCount = validationData.retryCount;
            
            console.log(`📊 Validation complete: ${validationEngine.getValidationSummary(validationResult)}`);
            
            // Notify user about validation
            if (validationResult.isValid) {
                if (retryCount > 0) {
                    figma.notify(`✅ Generated with ${retryCount} auto-fixes applied`, { timeout: 3000 });
                }
            } else {
                const summary = validationEngine.getValidationSummary(validationResult);
                figma.notify(`⚠️ ${summary}`, { timeout: 4000 });
            }
        }

        // Parse final JSON
        const layoutData = JSON.parse(finalJSON);
        
        return { layoutData, validationResult, finalJSON, retryCount };

    } catch (error) {
        console.error("❌ API-driven generation failed:", error);
        throw error;
    }
}

// UPDATED: initializeSession with new SessionService
// Function to create GeminiClient from stored API key
async function createGeminiClientFromStorage(): Promise<GeminiClient | null> {
    try {
        const apiKey = await figma.clientStorage.getAsync('geminiApiKey');
        if (apiKey) {
            console.log('✅ Creating GeminiClient from stored API key');
            return new GeminiClient({ apiKey });
        } else {
            console.log('ℹ️ No API key found in storage');
            return null;
        }
    } catch (error) {
        console.warn('⚠️ Error loading API key from storage:', error);
        return null;
    }
}

async function initializeSession() {
  console.log("🔄 Initializing session...");
  
  try {
    // Initialize validation engine
    validationEngine = new ValidationEngine({
      enableAIValidation: true,
      enableStructuralValidation: true,
      enableComponentValidation: true,
      qualityThreshold: 0.7,
      maxRetries: 2,
      autoFixEnabled: true
    });
    console.log("✅ Validation engine initialized");
    
    // Check for existing session using new SessionService
    const hasSession = await SessionService.hasCurrentSession();
    
    if (hasSession) {
      const currentSession = await SessionService.getCurrentSession();
      if (currentSession) {
        console.log("✅ Found active session for restoration");
        
        // Send session data to UI for modal display
        const sessionForUI = SessionService.formatSessionForUI(currentSession);
        figma.ui.postMessage({ 
          type: 'session-found', 
          session: sessionForUI,
          currentFileId: figma.fileKey || figma.root.id
        });
      }
    }
    
    // Load API key
    const savedApiKey = await figma.clientStorage.getAsync('geminiApiKey');
    if (savedApiKey) {
      console.log("✅ API key found in storage");
      figma.ui.postMessage({ 
        type: 'api-key-loaded', 
        payload: savedApiKey 
      });
    }
    
    // Load saved scan results using DesignSystemScannerService
    const savedScan = await DesignSystemScannerService.getScanSession();
    const currentFileKey = figma.fileKey || figma.root.id;
    
    if (savedScan && savedScan.components && savedScan.components.length > 0) {
      if (savedScan.fileKey === currentFileKey) {
        const colorStylesCount = savedScan.colorStyles ? Object.values(savedScan.colorStyles).reduce((sum, styles) => sum + styles.length, 0) : 0;
        const textStylesCount = savedScan.textStyles ? savedScan.textStyles.length : 0;
        console.log(`✅ Design system loaded: ${savedScan.components.length} components, ${colorStylesCount} color styles, ${textStylesCount} text styles`);
        figma.ui.postMessage({ 
          type: 'saved-scan-loaded', 
          components: savedScan.components,
          colorStyles: savedScan.colorStyles,
          textStyles: savedScan.textStyles,
          scanTime: savedScan.scanTime,
          colorStylesCount: colorStylesCount,
          textStylesCount: textStylesCount
        });
      } else {
        console.log("ℹ️ Scan from different file, clearing cache");
        await DesignSystemScannerService.clearScanData();
        
        // 🔥 AUTO-SCAN FOR TESTING: Automatically scan after clearing cache
        console.log("🔄 Auto-scanning design system for testing...");
        await handleScanCommand();
      }
    } else {
      console.log("ℹ️ No saved design system found");
      
      // 🔥 AUTO-SCAN FOR TESTING: Automatically scan design system on plugin startup
      console.log("🔄 Auto-scanning design system for testing...");
      await handleScanCommand();
    }
  } catch (error) {
    console.error("❌ Error loading session:", error);
  }
}

async function handleScanCommand() {
  try {
    figma.notify("🔍 Scanning design system with color styles and text styles...", { timeout: 30000 });
    
    // Use comprehensive scanner that includes components, color styles, and text styles
    const scanSession = await ComponentScanner.scanDesignSystem();
    
    // Save complete scan session using the new method
    await DesignSystemScannerService.saveScanSession(scanSession);
    
    // NEW: Initialize systematic engine
    await ComponentPropertyEngine.initialize();
    
    const colorStylesCount = scanSession.colorStyles ? Object.values(scanSession.colorStyles).reduce((sum, styles) => sum + styles.length, 0) : 0;
    const textStylesCount = scanSession.textStyles ? scanSession.textStyles.length : 0;
    
    // Send scan results to UI (same as manual scan)
    figma.ui.postMessage({ 
      type: 'scan-results', 
      components: scanSession.components,
      colorStyles: scanSession.colorStyles,
      textStyles: scanSession.textStyles,
      scanTime: scanSession.scanTime,
      colorStylesCount: colorStylesCount,
      textStylesCount: textStylesCount
    });
    
    figma.notify(`✅ Scanned ${scanSession.components.length} components, ${colorStylesCount} color styles, ${textStylesCount} text styles and initialized systematic engine!`);
    
    // Optional: Show debug info for a sample component
    if (scanSession.components.length > 0) {
      const sampleComponent = scanSession.components.find(c => c.suggestedType === 'tab') || scanSession.components[0];
      ComponentPropertyEngine.debugSchema(sampleComponent.id);
    }
  } catch (error) {
    console.error("Scan failed:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Send scan error to UI (same as manual scan)
    figma.ui.postMessage({ 
      type: 'scan-error', 
      error: errorMessage 
    });
    
    figma.notify("Scan failed. Check console for details.", { error: true });
  }
}

async function handleDebugCommand(componentId?: string) {
  if (!componentId) {
    // Show all schemas
    const schemas = ComponentPropertyEngine.getAllSchemas();
    console.log(` Total schemas loaded: ${schemas.length}`);
    schemas.forEach(schema => {
      console.log(`- ${schema.name} (${schema.componentType}): ${schema.id}`);
    });
  } else {
    // Show specific schema
    ComponentPropertyEngine.debugSchema(componentId);
    
    // Optionally create visual debug frame
    await ComponentPropertyEngine.createSchemaDebugFrame(componentId);
  }
}

async function handleMigrationTest() {
  const testJSON = {
    layoutContainer: { name: "Test", layoutMode: "VERTICAL" },
    items: [{
      type: "list-item",
      componentNodeId: "10:10214",
      properties: {
        text: "Item 1",
        Condition: "2-line",  // Should be moved to variants
        Leading: "Icon",      // Should be moved to variants
        horizontalSizing: "FILL"  // Should stay in properties
      }
    }]
  };
  
  const preview = JSONMigrator.generateMigrationPreview(testJSON);
  console.log(preview);
}

async function initializePlugin() {
  try {
    await ComponentPropertyEngine.initialize();
    console.log("✅ Plugin initialized with systematic property validation");
  } catch (error) {
    console.warn("⚠️ Could not initialize property engine:", error);
    // Continue without property engine - this won't break the main functionality
  }
}

/**
 * Analyze design feedback for a frame
 */
async function analyzeDesignFeedback(frameId: string, userRequest: string) {
  try {
    // Find the frame
    const frame = figma.getNodeById(frameId) as FrameNode;
    if (!frame) {
      throw new Error('Frame not found');
    }

    // Take screenshot of the frame
    const screenshot = await frame.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 }
    });

    // Analyze with SimpleDesignReviewer
    const feedback = await SimpleDesignReviewer.assessDesign(screenshot, userRequest);
    
    return feedback;
  } catch (error) {
    console.error('Error analyzing design feedback:', error);
    throw error;
  }
}



async function main() {
  console.log("🚀 AIDesigner plugin started");
  figma.showUI(__html__, { width: 400, height: 720 });
  
  await initializeSession();
  
  figma.on('run', async (event) => {
  const { command, parameters } = event;
  
  switch (command) {
    case 'scan':
      await handleScanCommand();
      break;
    case 'debug':
      await handleDebugCommand(parameters?.componentId);
      break;
    case 'test-migration':
      await handleMigrationTest();
      break;
    // ... other commands
  }
});

figma.ui.onmessage = async (msg: any) => {
    console.log("📨 Message from UI:", msg.type); 

    switch (msg.type) {
        case 'test-migration':
            handleMigrationTest();
            break;
// ... (rest of the file)

        // ENHANCED: API-driven UI generation with validation
        case 'generate-ui-from-prompt':
            try {
                const { prompt, systemPrompt, enableValidation = true } = msg.payload;
                const generationResult = await generateUIFromAPI(prompt, systemPrompt, enableValidation);
                const newFrame = await FigmaRenderer.generateUIFromDataDynamic(generationResult.layoutData);
                
                if (newFrame) {
                    figma.ui.postMessage({ 
                        type: 'ui-generated-success', 
                        frameId: newFrame.id, 
                        generatedJSON: generationResult.layoutData,
                        validationResult: generationResult.validationResult,
                        retryCount: generationResult.retryCount
                    });
                }
            } catch (e: any) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                figma.notify("API generation error: " + errorMessage, { error: true });
                figma.ui.postMessage({ type: 'ui-generation-error', error: errorMessage });
            }
            break;

        case 'modify-existing-ui':
            try {
                const { modifiedJSON, frameId } = msg.payload;
                const modifiedFrame = await FigmaRenderer.modifyExistingUI(modifiedJSON, frameId);
                if (modifiedFrame) {
                    figma.ui.postMessage({ 
                        type: 'ui-modified-success', 
                        frameId: modifiedFrame.id, 
                        modifiedJSON: modifiedJSON 
                    });
                }
            } catch (e: any) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                figma.notify("Modification error: " + errorMessage, { error: true });
                figma.ui.postMessage({ type: 'ui-generation-error', error: errorMessage });
            }
            break;

        case 'analyze-design-feedback':
            try {
                const { frameId, userRequest } = msg.payload;
                const feedback = await analyzeDesignFeedback(frameId, userRequest);
                figma.ui.postMessage({ 
                    type: 'design-feedback-result', 
                    feedback: feedback 
                });
            } catch (e: any) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                console.error('Design feedback error:', errorMessage);
                figma.ui.postMessage({ 
                    type: 'design-feedback-error', 
                    error: errorMessage 
                });
            }
            break;



        // NEW: Standalone JSON validation
        case 'validate-json':
            try {
                const { jsonString, originalPrompt } = msg.payload;
                
                if (!validationEngine) {
                    throw new Error("Validation engine not initialized");
                }
                
                const validationResult = await validationEngine.validateJSON(jsonString, originalPrompt);
                const summary = validationEngine.getValidationSummary(validationResult);
                
                figma.ui.postMessage({ 
                    type: 'validation-result', 
                    result: validationResult,
                    summary: summary
                });
                
                figma.notify(summary, { 
                    timeout: 3000,
                    error: !validationResult.isValid 
                });
                
            } catch (e: any) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                figma.notify("Validation error: " + errorMessage, { error: true });
                figma.ui.postMessage({ type: 'validation-error', error: errorMessage });
            }
            break;

        // NEW: Update validation settings
        case 'update-validation-config':
            try {
                const newConfig = msg.payload;
                if (validationEngine) {
                    validationEngine.updateConfig(newConfig);
                    figma.ui.postMessage({ type: 'validation-config-updated' });
                    figma.notify("Validation settings updated", { timeout: 2000 });
                }
            } catch (e: any) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                figma.notify("Config update error: " + errorMessage, { error: true });
            }
            break;

        // Test API connection - Updated to use GeminiService
        case 'test-gemini-connection':
        case 'test-api-connection':
            try {
                console.log("🧪 Testing Gemini API connection...");
                const result = await GeminiService.testConnection();
                
                figma.ui.postMessage({ 
                    type: 'connection-test-result', 
                    success: result.success,
                    error: result.error || null,
                    data: result.data || null
                });
                
                if (result.success) {
                    figma.notify("✅ API connection successful!", { timeout: 2000 });
                } else {
                    const errorMsg = GeminiService.formatErrorMessage(result.error || 'Connection failed');
                    figma.notify(`❌ ${errorMsg}`, { error: true });
                }
            } catch (e: any) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                figma.ui.postMessage({ 
                    type: 'connection-test-result', 
                    success: false, 
                    error: errorMessage 
                });
                figma.notify("❌ Connection test failed", { error: true });
            }
            break;

        // Session management handlers - Updated to use SessionService
        case 'restore-session':
            try {
                const sessionData = msg.payload;
                
                // Restore session using SessionService
                await SessionService.saveSession({
                    designState: sessionData.designState,
                    scanResults: sessionData.scanResults || [],
                    currentTab: sessionData.currentTab || 'design-system',
                    currentPlatform: sessionData.currentPlatform || 'mobile'
                });
                
                figma.ui.postMessage({ 
                    type: 'session-restored', 
                    designState: sessionData.designState,
                    scanData: sessionData.scanResults || []
                });
                figma.notify("Session restored!", { timeout: 2000 });
                
            } catch (e: any) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                figma.notify("Session restore error: " + errorMessage, { error: true });
            }
            break;

        case 'clear-current-session':
            try {
                await SessionService.clearCurrentSession();
                figma.ui.postMessage({ type: 'session-cleared' });
                figma.notify("Session cleared", { timeout: 1500 });
            } catch (error) {
                console.error("❌ Error clearing session:", error);
                figma.notify("Failed to clear session", { error: true });
            }
            break;

        case 'get-all-sessions':
            try {
                const allSessions = await SessionService.getAllSessions();
                const formattedSessions = allSessions.map(session => 
                    SessionService.formatSessionForUI(session)
                );
                
                figma.ui.postMessage({ 
                    type: 'all-sessions-loaded', 
                    sessions: formattedSessions,
                    currentFileId: figma.fileKey || figma.root.id
                });
            } catch (error) {
                console.error("❌ Error getting all sessions:", error);
                figma.ui.postMessage({ type: 'all-sessions-loaded', sessions: [] });
            }
            break;

        case 'delete-session':
            try {
                const fileId = msg.payload;
                await SessionService.deleteSession(fileId);
                figma.ui.postMessage({ type: 'session-deleted', fileId: fileId });
                figma.notify("Session deleted", { timeout: 1500 });
            } catch (error) {
                console.error("❌ Error deleting session:", error);
                figma.notify("Failed to delete session", { error: true });
            }
            break;

        case 'save-current-session':
            try {
                const { designState, scanData, currentTab, currentPlatform } = msg.payload;
                
                await SessionService.saveSession({
                    designState: designState,
                    scanResults: scanData || [],
                    currentTab: currentTab || 'design-system',
                    currentPlatform: currentPlatform || 'mobile'
                });
                
                console.log("✅ Session saved successfully");
            } catch (error) {
                console.error("❌ Error saving session:", error);
            }
            break;

        case 'scan-design-system':
            try {
                figma.notify("🔍 Scanning design system with color styles and text styles...", { timeout: 30000 });
                
                // Use comprehensive scanner from DesignSystemScannerService
                const scanSession = await DesignSystemScannerService.scanDesignSystem();
                
                // Save the complete session
                await DesignSystemScannerService.saveScanSession(scanSession);
                
                const colorStylesCount = scanSession.colorStyles ? Object.values(scanSession.colorStyles).reduce((sum, styles) => sum + styles.length, 0) : 0;
                const textStylesCount = scanSession.textStyles ? scanSession.textStyles.length : 0;
                
                // Send scan results to UI (what the UI expects)
                figma.ui.postMessage({ 
                    type: 'scan-results', 
                    components: scanSession.components,
                    colorStyles: scanSession.colorStyles,
                    textStyles: scanSession.textStyles,
                    scanTime: scanSession.scanTime,
                    colorStylesCount: colorStylesCount,
                    textStylesCount: textStylesCount
                });
                
                figma.notify(`✅ Scanned ${scanSession.components.length} components, ${colorStylesCount} color styles, and ${textStylesCount} text styles!`, { timeout: 3000 });
            } catch (error) {
                console.error("Scan failed:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                // Send scan error to UI (what the UI expects for error handling)
                figma.ui.postMessage({ 
                    type: 'scan-error', 
                    error: errorMessage 
                });
                
                figma.notify("Scan failed. Check console for details.", { error: true });
            }
            break;



        case 'update-component-type':
            const { componentId, newType } = msg.payload;
            try {
                const result = await DesignSystemScannerService.updateComponentType(componentId, newType);
                if (result.success) {
                    figma.ui.postMessage({ 
                        type: 'component-type-updated', 
                        componentId, 
                        newType, 
                        componentName: result.componentName 
                    });
                    figma.notify(`Updated "${result.componentName}" to ${newType}`, { timeout: 2000 });
                } else {
                    figma.notify("Component not found for update", { error: true });
                }
            } catch (e: any) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                console.error("❌ Error updating component type:", errorMessage);
                figma.notify("Error updating type", { error: true });
            }
            break;

        case 'navigate-to-component':
            await navigateToComponent(msg.componentId, msg.pageName);
            break;
        
        case 'save-api-key':
            try {
                const apiKey = msg.payload.apiKey || msg.payload;
                const success = await GeminiService.saveApiKey(apiKey);
                
                if (success) {
                    figma.ui.postMessage({ type: 'api-key-saved' });
                    figma.notify("✅ API key saved successfully!", { timeout: 2000 });
                } else {
                    throw new Error("Failed to save API key");
                }
            } catch (e) {
                console.error("❌ Error saving API key:", e);
                const errorMessage = e instanceof Error ? e.message : String(e);
                figma.ui.postMessage({ 
                    type: 'api-key-save-error', 
                    error: errorMessage 
                });
                figma.notify("❌ Error saving API key", { error: true });
            }
            break;

        case 'get-api-key':
            try {
                const key = await figma.clientStorage.getAsync('geminiApiKey');
                if (key) {
                    figma.ui.postMessage({ type: 'api-key-found', payload: key });
                } else {
                    figma.ui.postMessage({ type: 'api-key-not-found' });
                }
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                figma.ui.postMessage({ type: 'api-key-error', payload: errorMessage });
            }
            break;

        // Generate UI with Gemini - New handler using GeminiService
        case 'generate-with-gemini':
            try {
                const { prompt, scanResults, platform, image } = msg.payload;
                
                console.log('🤖 Generating UI with Gemini...');
                
                const result = await GeminiService.generateUI({
                    prompt: prompt,
                    image: image || undefined
                });
                
                if (result.success) {
                    // Auto-save session with generation
                    await SessionService.saveSession({
                        scanResults: scanResults || [],
                        currentPlatform: platform || 'mobile',
                        designState: {
                            history: ['AI generation completed'],
                            current: result.data
                        }
                    });
                    
                    figma.ui.postMessage({ 
                        type: 'gemini-response', 
                        success: true,
                        data: result.data 
                    });
                    figma.notify("✅ UI generated successfully!", { timeout: 2000 });
                } else {
                    const errorMsg = GeminiService.formatErrorMessage(result.error || 'Generation failed');
                    figma.ui.postMessage({ 
                        type: 'gemini-response', 
                        success: false,
                        error: errorMsg 
                    });
                    figma.notify(`❌ ${errorMsg}`, { error: true });
                }
            } catch (e: any) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                console.error("❌ Generation error:", errorMessage);
                figma.ui.postMessage({ 
                    type: 'gemini-response', 
                    success: false,
                    error: errorMessage 
                });
                figma.notify("❌ Generation failed", { error: true });
            }
            break;

        case 'run-ai-pipeline':
            try {
                const { prompt } = msg.payload;
                console.log('🚀 Starting 5-stage AI pipeline with prompt:', prompt);
                
                // Initialize AI pipeline
                const orchestrator = await initializeAIPipeline();
                
                // Run the full pipeline
                const result = await orchestrator.processRequest(prompt);
                
                if (result.success) {
                    console.log('🎉 Pipeline completed successfully!');
                    console.log('📊 Pipeline results:', {
                        stages: result.stages,
                        executionTime: result.executionTime + 'ms',
                        aiUsageStats: result.aiUsageStats,
                        designSystemUsed: result.designSystemUsed,
                        componentsAvailable: result.componentsAvailable
                    });
                    
                    // Check if we have generated JSON to render
                    if (result.finalResult?.generatedJSON) {
                        console.log('🎨 Rendering UI from pipeline JSON...');
                        const newFrame = await FigmaRenderer.generateUIFromDataDynamic(result.finalResult.generatedJSON);
                        
                        figma.ui.postMessage({
                            type: 'pipeline-success',
                            result: {
                                pipelineStats: result.aiUsageStats,
                                frameId: newFrame?.id,
                                generatedJSON: result.finalResult.generatedJSON,
                                executionTime: result.executionTime,
                                stagesCompleted: result.stages.length
                            }
                        });
                        
                        figma.notify(`✅ 5-stage pipeline completed in ${result.executionTime}ms!`, { timeout: 3000 });
                    } else {
                        // Pipeline completed but no valid JSON generated
                        figma.ui.postMessage({
                            type: 'pipeline-success-no-render',
                            result: {
                                pipelineStats: result.aiUsageStats,
                                content: result.finalResult?.content,
                                executionTime: result.executionTime,
                                stagesCompleted: result.stages.length
                            }
                        });
                        
                        figma.notify(`✅ Pipeline completed but no UI generated. Check JSON output.`, { timeout: 4000 });
                    }
                } else {
                    throw new Error('Pipeline execution failed');
                }
                
            } catch (error) {
                console.error('❌ Pipeline error:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                figma.ui.postMessage({
                    type: 'pipeline-error',
                    error: errorMessage
                });
                
                figma.notify(`❌ Pipeline failed: ${errorMessage}`, { error: true });
            }
            break;

        case 'run-3stage-pipeline':
            try {
                const { prompt } = msg.payload;
                console.log('⚡ Starting 3-stage AI pipeline with prompt:', prompt);
                
                figma.notify('🚀 Running 3-stage pipeline...', { timeout: 30000 });
                
                // Get current design system data from plugin (components + color styles)
                let designSystemData = null;
                try {
                    const savedScan = await DesignSystemScannerService.getScanSession();
                    if (savedScan && savedScan.components && savedScan.components.length > 0) {
                        designSystemData = {
                            components: savedScan.components,
                            colorStyles: savedScan.colorStyles || null
                        };
                        console.log(`📊 Sending ${savedScan.components.length} components and ${savedScan.colorStyles ? Object.values(savedScan.colorStyles).reduce((sum, styles) => sum + styles.length, 0) : 0} color styles to pipeline`);
                    } else {
                        console.warn('⚠️ No design system data available. Consider scanning first.');
                    }
                } catch (error) {
                    console.warn('⚠️ Could not load design system data:', error);
                }
                
                // Call HTTP server with live design system data
                const requestBody: any = { prompt: prompt };
                if (designSystemData) {
                    requestBody.design_system_data = designSystemData;
                }
                
                const response = await fetch('http://localhost:8000/api/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ 3-stage pipeline completed successfully!');
                    
                    // Extract final JSON from stage 3
                    const stage3Content = result.stages.stage_3.content;
                    let finalJSON;
                    
                    try {
                        finalJSON = JSON.parse(stage3Content);
                    } catch (e) {
                        throw new Error('Failed to parse JSON from pipeline result');
                    }
                    
                    // Render the UI
                    const newFrame = await FigmaRenderer.generateUIFromDataDynamic(finalJSON);
                    
                    if (newFrame) {
                        figma.ui.postMessage({
                            type: '3stage-pipeline-success',
                            result: {
                                frameId: newFrame.id,
                                generatedJSON: finalJSON,
                                runId: result.run_id,
                                stagesCompleted: 3,
                                originalPrompt: prompt
                            }
                        });
                        
                        figma.notify('✅ 3-stage pipeline completed and UI rendered!', { timeout: 3000 });
                    } else {
                        throw new Error('Failed to render UI from generated JSON');
                    }
                } else {
                    throw new Error(result.error || 'Pipeline execution failed');
                }
                
            } catch (error) {
                console.error('❌ 3-stage pipeline error:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                // Check if it's a network error (server not running)
                if (errorMessage.includes('fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
                    figma.ui.postMessage({
                        type: '3stage-pipeline-error',
                        error: 'Server not running. Please start the server with: python3 instance.py server'
                    });
                    figma.notify('❌ Please start the Python server first', { error: true });
                } else {
                    figma.ui.postMessage({
                        type: '3stage-pipeline-error',
                        error: errorMessage
                    });
                    figma.notify(`❌ Pipeline failed: ${errorMessage}`, { error: true });
                }
            }
            break;


        case 'render-json-direct':
            try {
                const { json, source, forceRender } = msg.payload;
                console.log('🎨 Rendering JSON directly from:', source);
                
                // Transform JSON structure if needed (3-stage pipeline uses layoutContainer wrapper)
                let renderData = json;
                if (json.layoutContainer && json.layoutContainer.items) {
                    // Flatten structure for renderer compatibility
                    renderData = {
                        ...json.layoutContainer,
                        items: json.layoutContainer.items
                    };
                }
                
                console.log('🔧 Transformed JSON for rendering:', renderData);
                
                // Validate layout data before rendering
                const validation = FigmaRenderer.validateLayoutData(renderData);
                
                if (validation.warnings.length > 0) {
                    console.warn('⚠️ Layout validation warnings:', validation.warnings);
                }
                
                if (!validation.valid) {
                    console.error('❌ Layout validation failed:', validation.errors);
                    
                    // Send detailed error to UI
                    figma.ui.postMessage({
                        type: 'validation-error',
                        errors: validation.errors,
                        warnings: validation.warnings,
                        source: source
                    });
                    
                    // If forceRender flag is set, try anyway
                    if (forceRender) {
                        console.warn('⚠️ Force render flag set - attempting render despite errors...');
                        figma.notify('Attempting render with error recovery...', { timeout: 2000 });
                    } else {
                        figma.notify(`Layout validation failed: ${validation.errors[0]}`, { error: true });
                        return;
                    }
                }
                
                console.log('🔧 JSON has items?', !!renderData.items, 'Count:', renderData.items?.length);
                console.log('🔧 JSON layoutMode:', renderData.layoutMode);
                console.log('🔧 JSON properties:', {
                    itemSpacing: renderData.itemSpacing,
                    paddingTop: renderData.paddingTop,
                    primaryAxisSizingMode: renderData.primaryAxisSizingMode
                });
                
                // Try to render the JSON with systematic validation
                const newFrame = await FigmaRenderer.generateUIFromDataSystematic(renderData, figma.currentPage);
                
                console.log('🔧 Generated frame:', newFrame, 'ID:', newFrame?.id);
                
                if (newFrame) {
                    figma.ui.postMessage({
                        type: 'json-render-success',
                        result: {
                            frameId: newFrame.id,
                            generatedJSON: json,
                            source: source,
                            validationWarnings: validation.warnings
                        }
                    });
                    
                    const warningText = validation.warnings.length > 0 ? ` (${validation.warnings.length} warnings)` : '';
                    figma.notify(`✅ ${source} JSON rendered successfully${warningText}!`, { timeout: 3000 });
                } else {
                    throw new Error('Failed to create frame');
                }
                
            } catch (error) {
                console.error('❌ JSON render error:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                figma.ui.postMessage({
                    type: 'json-render-error',
                    error: errorMessage,
                    source: source || 'unknown'
                });
                
                figma.notify(`❌ JSON render failed: ${errorMessage}`, { error: true });
            }
            break;

        
        case 'get-saved-scan':
            try {
                const savedScan = await DesignSystemScannerService.getScanSession();
                if (savedScan && savedScan.components && savedScan.fileKey === figma.root.id) {
                    const colorStylesCount = savedScan.colorStyles ? Object.values(savedScan.colorStyles).reduce((sum, styles) => sum + styles.length, 0) : 0;
                    const textStylesCount = savedScan.textStyles ? savedScan.textStyles.length : 0;
                    figma.ui.postMessage({ 
                        type: 'saved-scan-loaded', 
                        components: savedScan.components,
                        colorStyles: savedScan.colorStyles,
                        textStyles: savedScan.textStyles,
                        scanTime: savedScan.scanTime,
                        colorStylesCount: colorStylesCount,
                        textStylesCount: textStylesCount
                    });
                } else {
                    figma.ui.postMessage({ type: 'no-saved-scan' });
                }
            } catch (error) {
                console.error("❌ Error loading saved scan:", error);
                figma.ui.postMessage({ type: 'no-saved-scan' });
            }
            break;

        case 'clear-storage':
        case 'clear-all-data':
            try {
                // Clear scan data using DesignSystemScannerService
                await DesignSystemScannerService.clearScanData();
                
                // Clear API key using GeminiService
                await GeminiService.clearApiKey();
                
                // Clear all sessions using SessionService
                await SessionService.clearAllSessions();
                
                figma.notify("All data cleared successfully", { timeout: 2000 });
                figma.ui.postMessage({ type: 'all-data-cleared' });
            } catch (error) {
                console.error("Error clearing storage:", error);
                figma.notify("Failed to clear some data", { error: true });
            }
            break;

        case 'cancel':
            figma.closePlugin();
            break;
            
        default:
            // Ignore unknown messages
    }
  };
  console.log("✅ Plugin fully initialized with complete modular architecture");
}

figma.on('run', async (event) => {
  const { command, parameters } = event;
  
  switch (command) {
    case 'scan':
      await handleScanCommand();
      break;
    case 'debug':
      await handleDebugCommand(parameters?.componentId);
      break;
    case 'test-migration':
      await handleMigrationTest();
      break;
    // ... other commands
  }
});

// Initialize plugin on startup (non-blocking)
initializePlugin().catch(error => {
    console.warn("⚠️ Plugin initialization warning:", error);
});


main().catch(err => {
    console.error("❌ Unhandled error:", err);
    figma.closePlugin("A critical error occurred.");
});