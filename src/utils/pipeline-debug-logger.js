"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineDebugLogger = void 0;
// Pipeline Debug Logger - logs full prompts and contexts to console and memory
class PipelineDebugLogger {
    constructor() {
        this.logBuffer = [];
        this.startTime = new Date();
        this.runId = this.startTime.toISOString().replace(/[:.]/g, '-');
        this.logBuffer = [];
        this.addLog(`=== PIPELINE DEBUG LOG ===`);
        this.addLog(`Run ID: ${this.runId}`);
        this.addLog(`Started: ${this.startTime.toLocaleString()}`);
        this.addLog(`=`.repeat(50));
        this.addLog('');
    }
    logUserInput(input) {
        this.addLog(`🚀 USER INPUT:`);
        this.addLog(`"${input}"`);
        this.addLog(`Length: ${input.length} characters`);
        this.addLog('');
    }
    logStageStart(stageNumber, stageName) {
        this.addLog(`${'='.repeat(20)} STAGE ${stageNumber}: ${stageName.toUpperCase()} ${'='.repeat(20)}`);
        this.addLog('');
    }
    logContextSentToAI(stageName, context) {
        this.addLog(`📤 CONTEXT SENT TO AI (${context.length} chars):`);
        this.addLog('-'.repeat(40));
        this.addLog(context);
        this.addLog('-'.repeat(40));
        this.addLog('');
    }
    logAIResponse(stageName, aiResponse, success, usage) {
        this.addLog(`📥 AI RESPONSE - ${success ? 'SUCCESS' : 'FAILED'} (${aiResponse.length} chars):`);
        if (usage) {
            this.addLog(`Usage: ${JSON.stringify(usage, null, 2)}`);
        }
        this.addLog('-'.repeat(40));
        this.addLog(aiResponse);
        this.addLog('-'.repeat(40));
        this.addLog('');
    }
    logFallback(stageName, reason, fallbackContent) {
        this.addLog(`⚠️ FALLBACK USED - ${reason}:`);
        this.addLog('-'.repeat(40));
        this.addLog(fallbackContent);
        this.addLog('-'.repeat(40));
        this.addLog('');
    }
    logStageComplete(stageNumber, stageName, aiUsed, outputLength) {
        this.addLog(`✅ STAGE ${stageNumber} COMPLETE:`);
        this.addLog(`- AI Used: ${aiUsed ? 'YES' : 'NO'}`);
        this.addLog(`- Output Length: ${outputLength} characters`);
        this.addLog('');
    }
    logDesignSystemData(totalComponents, componentTypes, firstComponents) {
        this.addLog(`🎨 DESIGN SYSTEM DATA:`);
        this.addLog(`- Total Components: ${totalComponents}`);
        this.addLog(`- Component Types: ${componentTypes.join(', ')}`);
        this.addLog(`- First Components: ${firstComponents.join(', ')}`);
        this.addLog('');
    }
    logPipelineComplete(totalTime, aiStagesUsed, totalStages) {
        this.addLog(`${'='.repeat(50)}`);
        this.addLog(`🎯 PIPELINE COMPLETE`);
        this.addLog(`- Total Time: ${totalTime}ms`);
        this.addLog(`- AI Stages Used: ${aiStagesUsed}/${totalStages}`);
        this.addLog(`- Completed: ${new Date().toLocaleString()}`);
        this.addLog(`${'='.repeat(50)}`);
        // Save to console and storage
        this.saveToConsole();
        this.saveToStorage();
    }
    addLog(text) {
        this.logBuffer.push(text);
        // Also log to console for immediate feedback
        console.log(`[DEBUG] ${text}`);
    }
    saveToConsole() {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📄 COMPLETE DEBUG LOG (${this.logBuffer.length} lines, ${this.getLogContent().length} chars)`);
        console.log(`${'='.repeat(80)}`);
        console.log(this.getLogContent());
        console.log(`${'='.repeat(80)}\n`);
    }
    async saveToStorage() {
        try {
            const storageKey = `pipeline-debug-log-${this.runId}`;
            const content = this.getLogContent();
            if (typeof figma !== 'undefined' && figma.clientStorage) {
                await figma.clientStorage.setAsync(storageKey, {
                    content,
                    runId: this.runId,
                    timestamp: this.startTime.toISOString(),
                    lines: this.logBuffer.length,
                    chars: content.length
                });
                // Also save as "latest" for easy access
                await figma.clientStorage.setAsync('pipeline-debug-log-latest', {
                    content,
                    runId: this.runId,
                    timestamp: this.startTime.toISOString(),
                    lines: this.logBuffer.length,
                    chars: content.length
                });
                console.log(`💾 Debug log saved to storage: ${storageKey}`);
                console.log(`📄 Access latest log: figma.clientStorage.getAsync('pipeline-debug-log-latest')`);
            }
        }
        catch (error) {
            console.error('❌ Failed to save debug log to storage:', error);
        }
    }
    // Method to get current log content
    getLogContent() {
        return this.logBuffer.join('\n');
    }
    // Static method to retrieve latest debug log
    static async getLatestDebugLog() {
        try {
            if (typeof figma !== 'undefined' && figma.clientStorage) {
                const data = await figma.clientStorage.getAsync('pipeline-debug-log-latest');
                return (data === null || data === void 0 ? void 0 : data.content) || null;
            }
            return null;
        }
        catch (error) {
            console.error('❌ Failed to retrieve debug log:', error);
            return null;
        }
    }
    // Static method to list all debug logs
    static async listDebugLogs() {
        try {
            if (typeof figma !== 'undefined' && figma.clientStorage) {
                const keys = await figma.clientStorage.keysAsync();
                const debugKeys = keys.filter(key => key.startsWith('pipeline-debug-log-') && key !== 'pipeline-debug-log-latest');
                const logs = [];
                for (const key of debugKeys) {
                    const data = await figma.clientStorage.getAsync(key);
                    if (data) {
                        logs.push({
                            key,
                            runId: data.runId,
                            timestamp: data.timestamp,
                            lines: data.lines,
                            chars: data.chars
                        });
                    }
                }
                return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            }
            return [];
        }
        catch (error) {
            console.error('❌ Failed to list debug logs:', error);
            return [];
        }
    }
}
exports.PipelineDebugLogger = PipelineDebugLogger;
