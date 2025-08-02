# Simplified Direct Gemini Screenshot Implementation Plan
**Date:** July 27, 2025  
**Status:** 📋 Production-Ready Implementation  
**Goal:** Implement automated screenshot → direct Gemini API calls (Stage 4 + Stage 5)

## Overview

Replace manual screenshot step with automated capture and direct Gemini API calls, maintaining the exact same two-stage process as current working tests, but integrated into the existing UI architecture.

**Current vs Target:**
```
Current: Manual screenshot → manual_stage4_test.py → manual_stage5_test.py
Target:  Auto screenshot → UI Gemini calls → Apply improvements
```

## Implementation Plan

### Phase 1: Extract Prompts (10 min)

#### 1.1 Create Prompt Files
```bash
# Copy existing prompts to UI-specific versions
cp src/prompts/roles/visual-improvement-analyzer.txt src/prompts/roles/visual-improvement-analyzer-ui.txt
cp "src/prompts/roles/5 json-engineer.txt" src/prompts/roles/json-engineer-ui.txt
```

#### 1.2 Add Prompt Loading (Using Existing Pattern)
**File**: `ui.html` (add to existing functions)

```javascript
async function loadPromptFile(filename) {
    return new Promise((resolve, reject) => {
        const requestId = Date.now();
        
        const handler = (event) => {
            const msg = event.data.pluginMessage;
            if (msg.type === 'prompt-loaded' && msg.requestId === requestId) {
                window.removeEventListener('message', handler);
                resolve(msg.success ? msg.content : reject(new Error(msg.error)));
            }
        };
        
        window.addEventListener('message', handler);
        parent.postMessage({
            pluginMessage: { type: 'load-prompt', filename, requestId }
        }, '*');
    });
}
```

### Phase 2: Main Thread Screenshot (15 min)

#### 2.1 Add Screenshot Function
**File**: `code.ts` (add after line 426)

```typescript
async function captureForAnalysis(renderedNode: FrameNode) {
    try {
        figma.notify('📸 Analyzing design...');
        
        const imageBytes = await renderedNode.exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: 2 }
        });
        
        figma.ui.postMessage({
            type: 'analyze-screenshot',
            imageData: Array.from(imageBytes),
            nodeName: renderedNode.name
        });
        
    } catch (error) {
        figma.notify('❌ Screenshot failed: ' + error.message, { error: true });
    }
}
```

#### 2.2 Add Prompt File Reading 
**File**: `code.ts` (add to existing message handler around line 540)

```typescript
// Add to existing figma.ui.onmessage switch statement
case 'load-prompt':
    try {
        const fs = require('fs');
        const path = require('path');
        const promptPath = path.join(__dirname, 'src/prompts/roles', msg.filename);
        const content = fs.readFileSync(promptPath, 'utf8');
        
        figma.ui.postMessage({
            type: 'prompt-loaded',
            requestId: msg.requestId,
            success: true,
            content: content
        });
    } catch (error) {
        figma.ui.postMessage({
            type: 'prompt-loaded',
            requestId: msg.requestId,
            success: false,
            error: error.message
        });
    }
    break;

case 'apply-improvements':
    try {
        const newFrame = await FigmaRenderer.generateUIFromDataDynamic(msg.improvedJSON);
        if (newFrame) {
            figma.notify('✨ Improvements applied!');
        }
    } catch (error) {
        figma.notify('❌ Failed to apply improvements', { error: true });
    }
    break;
```

#### 2.3 Auto-Trigger After Render
**File**: `code.ts` (modify existing render success handler around line 555)

```typescript
// In existing 'generate-ui-from-prompt' case, after successful render:
if (newFrame) {
    figma.ui.postMessage({ 
        type: 'ui-generated-success', 
        frameId: newFrame.id, 
        generatedJSON: generationResult.layoutData,
        validationResult: generationResult.validationResult,
        retryCount: generationResult.retryCount
    });
    
    // Auto-analyze after 1.5s delay
    setTimeout(() => captureForAnalysis(newFrame), 1500);
}
```

### Phase 3: Stage 4 Analysis (20 min)

#### 3.1 Add Stage 4 Function
**File**: `ui.html` (add to existing JavaScript)

```javascript
async function runStage4Analysis(imageData) {
    try {
        showStatus('generationStatus', '🔍 Analyzing design...', 'info');
        
        const stage4Prompt = await loadPromptFile('visual-improvement-analyzer-ui.txt');
        const base64Image = btoa(String.fromCharCode(...imageData));
        const apiKey = await getApiKey();
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [
                        { text: stage4Prompt },
                        { inlineData: { mimeType: 'image/png', data: base64Image } }
                    ]
                }]
            })
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const result = await response.json();
        return result.candidates[0].content.parts[0].text;
        
    } catch (error) {
        showStatus('generationStatus', `❌ Analysis failed: ${error.message}`, 'error');
        throw error;
    }
}
```

### Phase 4: Stage 5 JSON Generation (20 min)

#### 4.1 Add Stage 5 Function
**File**: `ui.html` (add to existing JavaScript)

```javascript
async function runStage5JSONGeneration(stage4Output) {
    try {
        showStatus('generationStatus', '🔧 Generating improvements...', 'info');
        
        let stage5Prompt = await loadPromptFile('json-engineer-ui.txt');
        stage5Prompt = stage5Prompt.replace('{{UX_UI_DESIGNER_OUTPUT}}', stage4Output);
        
        const apiKey = await getApiKey();
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: stage5Prompt }] }]
            })
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const result = await response.json();
        const stage5Output = result.candidates[0].content.parts[0].text;
        
        const jsonMatch = stage5Output.match(/```json\s*(.*?)\s*```/s);
        if (!jsonMatch) throw new Error('No JSON found in response');
        
        return JSON.parse(jsonMatch[1]);
        
    } catch (error) {
        showStatus('generationStatus', `❌ Generation failed: ${error.message}`, 'error');
        throw error;
    }
}
```

### Phase 5: Main Flow Integration (15 min)

#### 5.1 Add Complete Analysis Handler
**File**: `ui.html` (update existing window.onmessage)

```javascript
// Add to existing window.onmessage handler
if (message.type === 'analyze-screenshot') {
    await handleCompleteAnalysis(message);
}

async function handleCompleteAnalysis(message) {
    try {
        const { imageData, nodeName } = message;
        
        // Run Stage 4: Analysis
        const stage4Output = await runStage4Analysis(imageData);
        
        // Run Stage 5: JSON Generation  
        const improvedJSON = await runStage5JSONGeneration(stage4Output);
        
        // Show simple improvement prompt
        showImprovementPrompt(improvedJSON, nodeName);
        
    } catch (error) {
        showStatus('generationStatus', `❌ Analysis failed: ${error.message}`, 'error');
    }
}

function showImprovementPrompt(improvedJSON, nodeName) {
    showStatus('generationStatus', '✨ Improvements ready!', 'success');
    
    // Simple confirmation using existing UI patterns
    if (confirm(`Apply visual improvements to "${nodeName}"?`)) {
        parent.postMessage({
            pluginMessage: { type: 'apply-improvements', improvedJSON }
        }, '*');
    }
}
```

#### 5.2 Helper Function for API Key
**File**: `ui.html` (add to existing functions)

```javascript
async function getApiKey() {
    return new Promise((resolve, reject) => {
        const handler = (event) => {
            const msg = event.data.pluginMessage;
            if (msg.type === 'api-key-found') {
                window.removeEventListener('message', handler);
                resolve(msg.payload);
            } else if (msg.type === 'api-key-not-found') {
                window.removeEventListener('message', handler);
                reject(new Error('No API key found'));
            }
        };
        
        window.addEventListener('message', handler);
        parent.postMessage({ pluginMessage: { type: 'get-api-key' } }, '*');
    });
}
```

## Key Simplifications Made

### Removed Debug/Logging:
- ❌ Timestamp tracking and logging
- ❌ Multiple console.log statements  
- ❌ Debug frame creation
- ❌ Optional output saving
- ❌ Complex modal overlay system

### Kept Essential Architecture:
- ✅ Promise-based file loading (required by Figma)
- ✅ Two-stage processing (matches existing pipeline)
- ✅ Error handling with showStatus (existing pattern)
- ✅ figma.notify notifications (existing pattern)
- ✅ postMessage communication (existing pattern)

## File Changes Required

### New Files (2):
- `src/prompts/roles/visual-improvement-analyzer-ui.txt` 
- `src/prompts/roles/json-engineer-ui.txt`

### Modified Files (2):
- `code.ts` - Add 3 functions, 2 message handlers
- `ui.html` - Add 6 functions, 1 message handler

## Implementation Timeline

**Total: 1.25 hours**
- Phase 1: 10 minutes
- Phase 2: 15 minutes  
- Phase 3: 20 minutes
- Phase 4: 20 minutes
- Phase 5: 15 minutes

## Benefits

- **Leverages existing infrastructure** - Uses PromptLoader pattern, showStatus, figma.notify
- **Minimal new code** - ~100 lines total vs 400+ in original plan
- **Consistent UX** - Matches existing notification and confirmation patterns
- **Production ready** - No debug code, clean error handling
- **Simple testing** - Uses browser confirm() instead of custom modal

This implementation maintains all the functionality while being much simpler and more aligned with the existing codebase patterns.