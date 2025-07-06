# Logging System Installation Instructions

## Overview
This guide walks through implementing a comprehensive pipeline logging system for Figma plugins, including all the gotchas and troubleshooting steps we encountered during development.

## Step 1: Create the Logger Class

### File Structure
Create `src/utils/pipeline-logger.ts` with the following core structure:

```typescript
export class PipelineLogger {
    private runId: string;
    private timestamp: string;
    private logs: Array<{type: string, stage: string, data: any, timestamp: Date}> = [];

    constructor() {
        // Generate unique run ID
        const now = new Date();
        this.timestamp = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const dateStr = now.toISOString().split('T')[0];
        this.runId = `${dateStr}_${this.timestamp}`;
        
        console.log(`📝 Pipeline Logger initialized: ${this.runId}`);
        
        // Make globally accessible for debugging
        this.setupGlobalAccess();
    }
}
```

## Step 2: Implement Core Logging Methods

### Essential Methods to Implement
1. `logStageInput(stageNumber: number, stageName: string, input: any)`
2. `logStageOutput(stageNumber: number, stageName: string, output: any)`
3. `logQAResult(stageNumber: number, stageName: string, qaResult: any, attempt: number)`
4. `logPipelineSummary(result: any)`
5. `logError(stage: string, error: Error | string)`

### Method Access Methods
1. `getLogs()` - Get all logs
2. `getLogsByType(type: string)` - Filter by log type
3. `getLogsByStage(stage: string)` - Filter by stage
4. `exportLogs()` - Export as JSON
5. `createLogFiles()` - Generate downloadable log files

## Step 3: Integration with Pipeline Orchestrator

### Instantiate Logger
```typescript
async processRequest(request: PipelineRequest): Promise<PipelineResult> {
    const logger = new PipelineLogger();
    
    // Pass logger to executeStage method
    const stageResult = await this.executeStage(
        stage,
        currentInput,
        qaConfig,
        request.config?.roleConfigs?.[stage],
        logger,
        stageNumber
    );
}
```

### Add Logging Calls
```typescript
private async executeStage(
    stage: PipelineStage,
    input: RoleInput,
    qaOverrides?: Record<string, boolean>,
    roleConfig?: Partial<RoleConfig>,
    logger?: PipelineLogger,
    stageNumber?: number
): Promise<StageExecutionResult> {
    
    // Log stage input
    if (logger && stageNumber) {
        try {
            logger.logStageInput(stageNumber, stage, input);
        } catch (error) {
            console.warn(`Failed to log stage input: ${error.message}`, error);
        }
    }
    
    // ... execute stage logic ...
    
    // Log stage output
    if (logger && stageNumber) {
        try {
            logger.logStageOutput(stageNumber, stage, currentOutput);
        } catch (error) {
            console.warn(`Failed to log stage output: ${error.message}`, error);
        }
    }
}
```

## CRITICAL GOTCHAS & TROUBLESHOOTING

### 🚨 Issue #1: "not a function" Errors with typeof Checks

**Problem**: Using `typeof logger.logStageInput === 'function'` causes "not a function" errors.

**Bad Code**:
```typescript
if (logger && typeof logger.logStageInput === 'function') {
    logger.logStageInput(stageNumber, stage, input);
}
```

**Solution**: Remove typeof checks entirely.
```typescript
if (logger && stageNumber) {
    logger.logStageInput(stageNumber, stage, input);
}
```

**Why**: TypeScript methods don't need runtime type checking in compiled JavaScript.

### 🚨 Issue #2: console.group() Not Available in Figma Plugins

**Problem**: `console.group()` and `console.groupEnd()` throw "not a function" errors in Figma plugin environment.

**Error Location**: Inside logger methods when calling `console.group()`.

**Solution**: Wrap ALL console.group calls in try-catch blocks:

```typescript
try {
    console.group(`📥 Stage ${stageNumber} (${stageName}) - INPUT`);
    console.log('Input:', input);
    console.log('Input length:', typeof input === 'string' ? input.length : (input ? String(input).length : 0));
    console.groupEnd();
} catch (error) {
    // Fallback to regular console.log
    console.log(`📥 Stage ${stageNumber} (${stageName}) - INPUT`);
    console.log('Input:', input);
    console.log('Input length:', typeof input === 'string' ? input.length : (input ? String(input).length : 0));
}
```

**Apply this pattern to ALL methods**: `logStageInput`, `logStageOutput`, `logQAResult`, `logPipelineSummary`, `logError`, `exportLogs`, `createLogFiles`.

### 🚨 Issue #3: JSON.stringify() May Not Be Available

**Problem**: `JSON.stringify()` can cause "not a function" errors in some plugin environments.

**Solution**: Wrap JSON.stringify calls in try-catch:

```typescript
try {
    console.log(JSON.stringify(exportData, null, 2));
} catch (error) {
    console.log('Export data:', exportData);
}
```

**Alternative**: Use `String(input).length` instead of `JSON.stringify(input).length` for length calculations.

### 🚨 Issue #4: Global Access in Figma Plugins

**Problem**: `window` object might not be available in Figma plugin backend.

**Solution**: Try multiple global object approaches:

```typescript
setupGlobalAccess() {
    try {
        if (typeof globalThis !== 'undefined') {
            (globalThis as any).pipelineLogger = this;
            console.log(`🗂️ Use this in DevTools: globalThis.pipelineLogger`);
        } else if (typeof window !== 'undefined') {
            (window as any).pipelineLogger = this;
            console.log(`🗂️ Use this in DevTools: window.pipelineLogger`);
        } else if (typeof global !== 'undefined') {
            (global as any).pipelineLogger = this;
            console.log(`🗂️ Logger available as: global.pipelineLogger`);
        } else {
            console.log(`🗂️ Logger available but no global access method found`);
        }
    } catch (error) {
        console.log(`⚠️ Could not set global logger reference: ${error.message}`);
    }
}
```

## Step 4: Build Process Requirements

### Must Rebuild After Changes
**Critical**: TypeScript changes require a full rebuild, not just plugin restart.

```bash
npm run build
```

**Then**: Close Figma completely and reopen (not just restart plugin via Actions button).

### Debug Build Issues
If getting old errors after fixes:
1. Check if `code.js` actually contains your changes
2. Look at the compiled line numbers in error messages
3. Verify the build process completed successfully

## Step 5: Usage and Access

### Via DevTools Console
```javascript
// Access logger (try these in order)
globalThis.pipelineLogger
window.pipelineLogger
global.pipelineLogger

// Get all logs
globalThis.pipelineLogger.getLogs()

// Get logs by type (no preview limits)
globalThis.pipelineLogger.getLogsByType('output')

// Get logs by stage
globalThis.pipelineLogger.getLogsByStage('uiDesigner')

// Export everything
globalThis.pipelineLogger.exportLogs()
```

### Log Structure
Each log entry contains:
- `type`: 'input', 'output', 'qa', 'summary', 'error'
- `stage`: 'stage1-productManager', 'stage4-uiDesigner', etc.
- `data`: The actual content
- `timestamp`: When the log was created

## Step 6: Error Handling Best Practices

### Always Wrap Logger Calls
```typescript
if (logger && stageNumber) {
    try {
        logger.logStageInput(stageNumber, stage, input);
    } catch (error) {
        console.warn(`Failed to log stage input: ${error.message}`, error);
    }
}
```

### Never Silence Errors Completely
Include the actual error object in console.warn for debugging:
```typescript
console.warn(`Failed to log stage input: ${error.message}`, error);
```

## Common Debugging Steps

### 1. Check Logger Instantiation
Look for: `📝 Pipeline Logger initialized: [timestamp]`

### 2. Check Global Access
Look for: `🗂️ Use this in DevTools: globalThis.pipelineLogger`

### 3. Check Method Calls
If getting "not a function" errors:
- Remove any `typeof` checks
- Wrap console.group calls in try-catch
- Check if JSON.stringify is being used

### 4. Verify Build
- Run `npm run build`
- Check that `code.js` file timestamp updated
- Close and reopen Figma completely

## File Locations
- Logger implementation: `src/utils/pipeline-logger.ts`
- Integration: `src/pipeline/orchestrator/PipelineOrchestrator.ts`
- Documentation: `docs/pipeline-logging.md`
- This guide: `docs/Logging System Install Instructions.md`

## Troubleshooting Checklist

When logger isn't working:
- [ ] Did you run `npm run build`?
- [ ] Did you close and reopen Figma completely?
- [ ] Are there "not a function" errors in console?
- [ ] Are console.group calls wrapped in try-catch?
- [ ] Are typeof checks removed from logger method calls?
- [ ] Is logger being passed to all stage execution methods?
- [ ] Is global access showing in console logs?

## Benefits of This System
- **Debug Storage Issues**: See exactly what data flows between stages
- **Identify Component ID Problems**: Track where placeholder IDs are introduced  
- **QA Debugging**: See what triggers QA failures and retries
- **Performance Analysis**: Track execution times and stage completion
- **Error Tracking**: Detailed error logs with context
- **DevTools Access**: Full logs available via browser console