# Enhanced Width Setter Error Debugging Plan

**Date:** August 9, 2025
**Objective:** Add comprehensive logging to identify the exact source of "no setter for property" width setting error
**File:** figma-renderer.ts
**Estimated Time:** 15-20 minutes

## Overview
The error occurs in `generateUIFromDataSystematic` around line 4546 when attempting to set width properties. This plan adds targeted logging to identify the exact failing property and frame state.

## Implementation Steps

### Step 1: Enhanced Width Setting Debug Logs
*   **Location:** Find the width setting section in `generateUIFromDataSystematic()` around line 4546
*   **Task:** Replace the existing width setting block with enhanced logging version
*   **Find this pattern:**
    ```typescript
    if (containerData.width) {
      try {
        if (currentFrame.layoutMode !== 'NONE') {
          currentFrame.width = containerData.width;
          // ... existing code
        } else {
          currentFrame.resize(containerData.width, currentFrame.height);
        }
      } catch (e) {
        console.warn('Failed to set width:', e.message);
      }
    }
    ```
*   **Replace with:**
    ```typescript
    if (containerData.width) {
      try {
        // ENHANCED DEBUG: Comprehensive frame state logging
        const frameState = {
          width: containerData.width,
          currentWidth: currentFrame.width,
          layoutMode: currentFrame.layoutMode,
          primaryAxisSizing: currentFrame.primaryAxisSizingMode,
          counterAxisSizing: currentFrame.counterAxisSizingMode,
          frameType: currentFrame.type,
          parent: currentFrame.parent?.type,
          hasLayoutMode: 'layoutMode' in currentFrame,
          isAutoLayout: currentFrame.layoutMode !== 'NONE'
        };

        console.log('COMPREHENSIVE WIDTH SET ATTEMPT:', frameState);
        console.log('FRAME PROPERTIES AVAILABLE:', Object.getOwnPropertyNames(currentFrame));
        console.log('ATTEMPTING WIDTH SET ON:', {
          nodeId: currentFrame.id,
          nodeName: currentFrame.name,
          canSetWidth: 'width' in currentFrame
        });

        if (currentFrame.layoutMode !== 'NONE') {
          // CRITICAL CHECK: Log exact property availability
          console.log('AUTO-LAYOUT WIDTH SET:', {
            hasWidthSetter: Object.getOwnPropertyDescriptor(currentFrame, 'width')?.set !== undefined,
            widthDescriptor: Object.getOwnPropertyDescriptor(currentFrame, 'width')
          });

          // For auto-layout frames, set width directly
          currentFrame.width = containerData.width;
          console.log('Auto-layout width set successfully to:', containerData.width);

          if (!containerData.counterAxisSizingMode) {
            currentFrame.counterAxisSizingMode = "FIXED";
          }
        } else {
          // For regular frames, use resize
          console.log('REGULAR FRAME RESIZE:', {
            currentHeight: currentFrame.height,
            targetWidth: containerData.width
          });
          currentFrame.resize(containerDatan.width, currentFrame.height);
          console.log('Regular frame resized successfully');
        }
      } catch (e) {
        console.error('DETAILED WIDTH SET ERROR:', {
          message: e.message,
          stack: e.stack,
          containerWidth: containerData.width,
          frameState: {
            type: currentFrame.type,
            layoutMode: currentFrame.layoutMode,
            primaryAxis: currentFrame.primaryAxisSizingMode,
            counterAxis: currentFrame.counterAxisSizingMode
          }
        });
      }
    }
    ```

### Step 2: Child Properties Debug Logs
*   **Location:** Find the `applyChildLayoutProperties` method
*   **Task:** Add enhanced logging at the beginning of the method
*   **Find this method signature:**
    ```typescript
    private static applyChildLayoutProperties(node: FrameNode, properties: any): void {
    ```
*   **Add this enhanced logging at the very beginning:**
    ```typescript
    private static applyChildLayoutProperties(node: FrameNode, properties: any): void {
      try {
        console.log('APPLYING CHILD PROPERTIES:', {
          nodeType: node.type,
          layoutMode: node.layoutMode,
          properties: properties,
          hasWidth: 'width' in properties,
          hasHorizontalSizing: 'horizontalSizing' in properties
        });

        // Enhanced property application with individual error catching
        Object.keys(properties).forEach(key => {
          if (key === 'width' || key === 'height') {
            console.log(`ATTEMPTING ${key.toUpperCase()} SET:`, {
              value: properties[key],
              hasProperty: key in node,
              canSet: Object.getOwnPropertyDescriptor(node, key)?.set !== undefined
            });
          }
        });

        // ... rest of existing method content stays the same
      } catch (e) {
        console.error('CHILD PROPERTIES ERROR:', {
          message: e.message,
          properties: properties,
          nodeType: node.type
        });
        throw e;
      }
    }
    ```

### Step 3: Temporary Width Bypass (Optional Testing)
*   **Location:** Same width setting block from Step 1
*   **Task:** Add temporary bypass to isolate the issue
*   **Option A: Complete bypass for testing**
    ```typescript
    if (containerData.width) {
      // TEMPORARY: Skip width setting to isolate error
      console.warn('TEMPORARILY SKIPPING WIDTH SET FOR DEBUGGING');
      console.log('WOULD HAVE SET WIDTH:', containerData.width);

      /* COMMENTED OUT FOR DEBUGGING
      try {
        // ... existing width setting code
      } catch (e) {
        console.warn('Failed to set width:', e.message);
      }
      */
    }
    ```

### Step 4: Global Width Setting Search
*   **Task:** Search for all width setting locations and add logging
*   **Search patterns to find:**
    *   `currentFrame.width =`
    *   `node.width =`
    *   `.width =`
    *   `resize(`
*   **For each found location, add logging before the assignment:**
    ```typescript
    console.log('WIDTH SET LOCATION [location-name]:', {
      target: targetObject.type,
      currentWidth: targetObject.width,
      newWidth: newWidthValue,
      hasWidthProperty: 'width' in targetObject
    });
    ```

## Testing Instructions
### After Implementation:
1.  Run the UI generation that was previously failing
2.  Check console logs for the enhanced debug output
3.  Look for the specific error location - the logs will show exactly which property setting fails
4.  Note the frame state when the error occurs

### Expected Debug Output:
The logs will show something like:
```
COMPREHENSIVE WIDTH SET ATTEMPT: {layoutMode: "VERTICAL", ...}
AUTO-LAYOUT WIDTH SET: {hasWidthSetter: false, ...}
DETAILED WIDTH SET ERROR: {message: "no setter for property", ...}
```
This will pinpoint exactly which property lacks a setter.

## Success Criteria
*   **Clear error identification** - Logs show exactly which property and object type fails
*   **Frame state visibility** - Complete picture of frame configuration when error occurs
*   **Property availability check** - Confirmation of which properties exist vs. don't exist
*   **Isolated error location** - Exact line and context where failure happens

## Next Steps (After Debugging)
1.  Analyze the debug output to identify root cause
2.  Fix the specific property setting issue
3.  Remove debug logging (or reduce to minimal level)
4.  Verify UI generation works without errors
5.  Proceed to console cleanup phase

## Notes
*   Keep existing functionality intact - only add logging, don't change behavior
*   Run in small batches - implement one step at a time to isolate any issues
*   Save debug output - copy console logs for analysis
*   Test immediately after each step to ensure no new issues introduced

This plan will definitively identify the width setter issue and provide the exact information needed for a targeted fix.
