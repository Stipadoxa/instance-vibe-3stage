"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineLogger = void 0;
class PipelineLogger {
    constructor() {
        this.logs = [];
        const now = new Date();
        this.timestamp = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const dateStr = now.toISOString().split('T')[0];
        this.runId = `${dateStr}_${this.timestamp}`;
        console.log(`📝 Pipeline Logger initialized: ${this.runId}`);
        this.setupGlobalAccess();
    }
    setupGlobalAccess() {
        try {
            if (typeof globalThis !== 'undefined') {
                globalThis.pipelineLogger = this;
                console.log(`🗂️ Use this in DevTools: globalThis.pipelineLogger`);
            }
            else if (typeof window !== 'undefined') {
                window.pipelineLogger = this;
                console.log(`🗂️ Use this in DevTools: window.pipelineLogger`);
            }
            else if (typeof global !== 'undefined') {
                global.pipelineLogger = this;
                console.log(`🗂️ Logger available as: global.pipelineLogger`);
            }
        }
        catch (error) {
            console.log(`⚠️ Could not set global logger reference: ${error.message}`);
        }
    }
    logStageInput(stageNumber, stageName, input) {
        try {
            console.group(`📥 Stage ${stageNumber} (${stageName}) - INPUT`);
            console.log('Input:', input);
            console.log('Input length:', typeof input === 'string' ? input.length : String(input).length);
            console.groupEnd();
        }
        catch (error) {
            console.log(`📥 Stage ${stageNumber} (${stageName}) - INPUT`);
            console.log('Input:', input);
        }
        this.logs.push({
            type: 'input',
            stage: `stage${stageNumber}-${stageName}`,
            data: { input, inputLength: typeof input === 'string' ? input.length : String(input).length },
            timestamp: new Date()
        });
    }
    logStageOutput(stageNumber, stageName, output) {
        var _a;
        try {
            console.group(`📤 Stage ${stageNumber} (${stageName}) - OUTPUT`);
            console.log('Success:', !!output);
            console.log('Content length:', (output === null || output === void 0 ? void 0 : output.content) ? output.content.length : 0);
            console.log('Content preview:', (_a = output === null || output === void 0 ? void 0 : output.content) === null || _a === void 0 ? void 0 : _a.substring(0, 200));
            console.groupEnd();
        }
        catch (error) {
            console.log(`📤 Stage ${stageNumber} (${stageName}) - OUTPUT`);
            console.log('Output:', output);
        }
        this.logs.push({
            type: 'output',
            stage: `stage${stageNumber}-${stageName}`,
            data: output,
            timestamp: new Date()
        });
    }
    logError(stage, error) {
        const errorData = {
            message: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined
        };
        try {
            console.group(`❌ ERROR in ${stage}`);
            console.error('Error:', errorData);
            console.groupEnd();
        }
        catch (_a) {
            console.error(`❌ ERROR in ${stage}:`, errorData);
        }
        this.logs.push({
            type: 'error',
            stage,
            data: errorData,
            timestamp: new Date()
        });
    }
    getLogs() {
        return this.logs;
    }
    getLogsByType(type) {
        return this.logs.filter(log => log.type === type);
    }
    exportLogs() {
        try {
            console.log(JSON.stringify(this.logs, null, 2));
        }
        catch (error) {
            console.log('Export logs:', this.logs);
        }
        return this.logs;
    }
}
exports.PipelineLogger = PipelineLogger;
