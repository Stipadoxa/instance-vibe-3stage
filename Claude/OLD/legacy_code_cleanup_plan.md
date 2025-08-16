# UXPal Legacy Code Cleanup Plan

## Objective
Remove legacy screenshot monitoring functionality that attempts localhost connections, causing non-lethal CSP errors in the Figma plugin console. These features were never functional due to Figma's security limitations and are cluttering the codebase.

## Background
The UXPal Figma plugin contains leftover code from an earlier architecture that attempted to communicate with a local Python server at `http://localhost:8002` for screenshot processing. This approach was abandoned due to Figma's Content Security Policy restrictions, but the code remains and generates console errors.

## Files to Modify
- `code.js` (main plugin file)

## Step-by-Step Cleanup Plan

### Step 1: Remove Screenshot Monitoring Function
**Location:** `code.js`
**Action:** Delete the entire `startScreenshotMonitoring()` function

```javascript
// DELETE THIS ENTIRE FUNCTION:
function startScreenshotMonitoring() {
  console.log("📸 Starting screenshot monitoring for visual feedback pipeline");
  setInterval(async () => {
    try {
      const response = await fetch("http://localhost:8002/api/screenshot-request");
      if (response.ok) {
        const data = await response.json();
        if (data.has_request) {
          console.log("📸 Found screenshot request:", data.request_data.run_id);
          await processScreenshotRequest(data.request_data);
        }
      }
    } catch (error) {
      if (console.debug) {
        console.debug("Screenshot monitoring: server not available");
      }
    }
  }, 5000);
}
```

### Step 2: Remove Screenshot Request Processing Function
**Location:** `code.js`
**Action:** Delete the entire `processScreenshotRequest()` function

```javascript
// DELETE THIS ENTIRE FUNCTION:
async function processScreenshotRequest(requestData) {
  try {
    console.log("📸 Processing screenshot request:", requestData.run_id);
    const layoutData = JSON.parse(requestData.json_content);
    const generatedFrame = await FigmaRenderer.generateUIFromDataDynamic(layoutData);
    if (generatedFrame) {
      const screenshot = await generatedFrame.exportAsync({
        format: "PNG",
        constraint: { type: "SCALE", value: 1 }
      });
      const response = await fetch("http://localhost:8002/api/screenshot-ready", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          run_id: requestData.run_id,
          screenshot: Array.from(screenshot)
        })
      });
      if (response.ok) {
        console.log("✅ Screenshot sent to server for run_id:", requestData.run_id);
        figma.ui.postMessage({
          type: "screenshot-ready",
          run_id: requestData.run_id,
          frameId: generatedFrame.id
        });
      } else {
        throw new Error("Failed to send screenshot to server");
      }
    } else {
      console.error("❌ Failed to render JSON for screenshot");
      figma.ui.postMessage({
        type: "screenshot-error",
        run_id: requestData.run_id,
        error: "Failed to render JSON"
      });
    }
  } catch (error) {
    console.error("❌ Screenshot processing error:", error);
    figma.ui.postMessage({
      type: "screenshot-error",
      run_id: requestData.run_id,
      error: error.message
    });
  }
}
```

### Step 3: Remove Function Call from Main Initialization
**Location:** `code.js` in the `main()` function
**Action:** Remove the call to `startScreenshotMonitoring()`

```javascript
// IN THE main() FUNCTION, REMOVE THIS LINE:
async function main() {
  console.log("🚀 AIDesigner plugin started");
  figma.showUI(__html__, { width: 400, height: 720 });
  await initializeSession();
  startScreenshotMonitoring(); // ❌ DELETE THIS LINE
  
  // Keep the rest of the main() function unchanged
}
```

### Step 4: Remove Message Handler Case
**Location:** `code.js` in the `figma.ui.onmessage` handler
**Action:** Delete the entire `"process-screenshot-request"` case

```javascript
// DELETE THIS ENTIRE CASE BLOCK:
case "process-screenshot-request":
  try {
    await processScreenshotRequest(msg.payload);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("Screenshot request error:", errorMessage);
    figma.ui.postMessage({
      type: "screenshot-error",
      run_id: (_a = msg.payload) == null ? void 0 : _a.run_id,
      error: errorMessage
    });
  }
  break;
```

### Step 5: Verify No Other References
**Action:** Search for any remaining references to:
- `startScreenshotMonitoring`
- `processScreenshotRequest`
- `http://localhost:8002`
- `screenshot-request`
- `screenshot-ready`

**Note:** Keep the `analyzeDesignFeedback()` function as it uses internal Figma screenshot export, not external server communication.

## Expected Outcomes

### ✅ Console Errors Eliminated
- No more CSP violation errors for `http://localhost:8002/api/screenshot-request`
- No more "Refused to connect" errors in console
- Cleaner debugging experience

### ✅ Code Cleanup Benefits
- Reduced bundle size
- Eliminated dead code paths
- Clearer codebase for future development
- No confusing legacy functionality

### ✅ Functional Preservation
- All current working features remain intact
- Design system scanning continues to work
- UI generation from prompts continues to work
- Internal screenshot functionality (for design feedback) remains functional

## Testing Checklist

After cleanup, verify:
- [ ] Plugin loads without console errors
- [ ] Design system scanning works
- [ ] UI generation from prompts works
- [ ] No CSP errors in browser console
- [ ] All existing functionality preserved

## Risk Assessment
**Risk Level: LOW**
- All removed code was non-functional due to Figma CSP restrictions
- No current features depend on the removed functionality
- Changes are purely subtractive (removing unused code)

## Implementation Notes for Claude Code
- Focus on exact string matching when deleting functions
- Preserve all surrounding code structure
- Maintain proper JavaScript syntax and formatting
- Test plugin functionality after each major deletion
- Use search functionality to ensure no orphaned references remain