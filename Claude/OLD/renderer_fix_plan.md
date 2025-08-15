# UXPal Renderer Fix Plan - Text Width Constraint Issue

## Problem Summary
Native text elements are piercing autolayout container boundaries because the renderer's text auto-resize logic is incorrectly configured. Text should wrap within container width but instead expands infinitely.

## Root Cause Analysis

### Current Broken Logic in `figma-renderer.ts`
```typescript
// Line ~XXX in createTextNode method
if (props.horizontalSizing === 'FILL') {
  textNode.textAutoResize = 'HEIGHT';
} else {
  textNode.textAutoResize = 'WIDTH_AND_HEIGHT';  // ❌ PROBLEM: Text expands infinitely
}
```

### Issues:
1. **API Violation**: Native text elements should NEVER have `horizontalSizing` property (causes crashes)
2. **Default Behavior**: Without `horizontalSizing`, defaults to `WIDTH_AND_HEIGHT` (infinite expansion)
3. **Missing Context**: Renderer doesn't consider parent container constraints

## Fix Implementation Plan

### Step 1: Locate the Problem Code
**File**: `src/core/figma-renderer.ts`
**Method**: `createTextNode(textData: any, container: FrameNode)`
**Target Lines**: The text auto-resize behavior section (around line 400-420)

```typescript
// CURRENT BROKEN CODE TO REPLACE:
if (props.horizontalSizing === 'FILL') {
  textNode.textAutoResize = 'HEIGHT';
} else {
  textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
}
```

### Step 2: Implement Smart Width Detection
Replace the broken logic with context-aware auto-resize:

```typescript
// REPLACEMENT CODE:
// Smart text auto-resize behavior based on container context
const isInConstrainedContainer = this.detectWidthConstraint(container);

if (isInConstrainedContainer) {
  textNode.textAutoResize = 'HEIGHT';  // Width constrained, height flexible
  console.log('✅ Set textAutoResize to HEIGHT (width constrained by parent)');
} else {
  textNode.textAutoResize = 'WIDTH_AND_HEIGHT';  // Free expansion
  console.log('✅ Set textAutoResize to WIDTH_AND_HEIGHT (no width constraint)');
}
```

### Step 3: Add Helper Method for Width Detection
Add this new static method to the `FigmaRenderer` class:

```typescript
/**
 * Detects if a container has width constraints that should constrain text
 */
private static detectWidthConstraint(container: FrameNode): boolean {
  // Case 1: Container is in vertical layout (width is constrained)
  if (container.layoutMode === 'VERTICAL') {
    return true;
  }
  
  // Case 2: Container has reasonable fixed width (not infinite)
  if (container.width && container.width < 1000) {
    return true;
  }
  
  // Case 3: Container has explicit width sizing mode
  if (container.counterAxisSizingMode === 'FIXED') {
    return true;
  }
  
  // Case 4: Check parent container constraints
  const parent = container.parent;
  if (parent && parent.type === 'FRAME') {
    const parentFrame = parent as FrameNode;
    if (parentFrame.layoutMode === 'VERTICAL' && parentFrame.width < 1000) {
      return true;
    }
  }
  
  return false; // No width constraint detected
}
```

### Step 4: Remove horizontalSizing Dependencies
Ensure the `createTextNode` method does NOT expect or use `horizontalSizing`:

```typescript
// REMOVE these lines if they exist:
// this.applyChildLayoutProperties(textNode, props);  // ❌ Don't apply layout props to text

// KEEP only these properties for native text:
// - content
// - textStyle/textStyleName  
// - color/colorStyleName
// - alignment
```

### Step 5: Test Cases to Verify Fix

#### Test Case 1: Vertical Container with Fixed Width
```json
{
  "type": "layoutContainer",
  "layoutMode": "VERTICAL",
  "width": 375,
  "items": [
    {
      "type": "native-text", 
      "properties": {
        "content": "This long text should wrap within the 375px container width"
      }
    }
  ]
}
```
**Expected**: Text wraps at container boundary

#### Test Case 2: Horizontal Container (No Width Constraint)
```json
{
  "type": "layoutContainer",
  "layoutMode": "HORIZONTAL", 
  "items": [
    {
      "type": "native-text",
      "properties": {
        "content": "Short text"
      }
    }
  ]
}
```
**Expected**: Text expands to natural width

## Implementation Steps for Claude Code

### 1. Open Target File
```bash
code src/core/figma-renderer.ts
```

### 2. Find createTextNode Method
- Search for: `createTextNode(textData: any, container: FrameNode)`
- Locate the text auto-resize section (around line 400-420)

### 3. Replace Broken Logic
- Delete the existing `if (props.horizontalSizing === 'FILL')` block
- Replace with the smart detection logic from Step 2

### 4. Add Helper Method
- Add the `detectWidthConstraint` method before the `createTextNode` method
- Make it a private static method

### 5. Clean Up Dependencies
- Remove any calls to `applyChildLayoutProperties` for text nodes
- Ensure only valid text properties are applied

### 6. Test the Fix
- Use the test cases above to verify text wrapping behavior
- Check that text stays within container boundaries

## Validation Checklist

- [ ] Text wraps within vertical containers with fixed width
- [ ] Text expands naturally in unconstrained horizontal containers  
- [ ] No `horizontalSizing` properties applied to native text elements
- [ ] Console logs show correct auto-resize mode selection
- [ ] Original JSON structure works without modifications
- [ ] No API crashes or property errors

## Expected Outcome

After this fix:
1. **Native text elements** will automatically wrap within container boundaries
2. **No JSON changes needed** - existing structures will work
3. **Smart detection** handles different container types appropriately
4. **API compliance** - no forbidden properties on native elements

## Files Modified
- `src/core/figma-renderer.ts` (primary fix)

## Risk Assessment
- **Low Risk**: Only modifies text auto-resize logic
- **Backward Compatible**: Existing JSONs will work better, not break
- **Isolated Change**: Doesn't affect component or layout container logic