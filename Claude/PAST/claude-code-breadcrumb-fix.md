# Claude Code Task: Add Breadcrumb Debugging to Find Property Setter Error

## Context
- File: `figma-renderer.ts` (4062 lines)
- Error: "no setter for property" occurring somewhere in `generateUIFromDataSystematic` method
- Problem: Error line numbers don't match source file (they're from compiled output)
- Solution: Add breadcrumb logging to find exact failure point

## Your Task

### Step 1: Add Breadcrumb System
At the very beginning of the `generateUIFromDataSystematic` method, add this breadcrumb tracking system:

```typescript
static async generateUIFromDataSystematic(layoutData: any, parentNode: FrameNode | PageNode, designSystemData?: any): Promise<FrameNode> {
  // Add this breadcrumb system at the very start
  let lastBreadcrumb = 'START';
  const breadcrumb = (location: string) => {
    lastBreadcrumb = location;
    console.log(`🍞 ${location}`);
  };
  
  try {
    breadcrumb('INIT: Method start');
    // ... existing code continues
```

### Step 2: Add Breadcrumbs Throughout
Add `breadcrumb('DESCRIPTION');` calls before EVERY property assignment in the method. Examples:

```typescript
// Before any property assignment, add a breadcrumb:
breadcrumb('FRAME: Setting layoutMode');
currentFrame.layoutMode = containerData.layoutMode;

breadcrumb('FRAME: Setting width');
currentFrame.width = containerData.width;

breadcrumb('CONTAINER: Setting name');
currentFrame.name = containerData.name || "Generated Frame";

// In loops, include the item type:
for (const item of items) {
  breadcrumb(`ITEM: Processing ${item.type}`);
  
  if (item.type === 'layoutContainer') {
    breadcrumb('NESTED: Creating frame');
    const nestedFrame = figma.createFrame();
    
    breadcrumb('NESTED: Setting name');
    nestedFrame.name = item.name || "Nested Container";
    // etc...
  }
}
```

### Step 3: Update the Catch Block
Find the catch block in `generateUIFromDataSystematic` and update it to show the last breadcrumb:

```typescript
} catch (error) {
  console.error('❌ BREADCRUMB LOCATION:', lastBreadcrumb);
  console.error('❌ generateUIFromDataSystematic error:', error);
  console.error('❌ Error details:', {
    lastBreadcrumb: lastBreadcrumb,  // Add this
    message: error.message,
    stack: error.stack,
    name: error.name,
    layoutData: layoutData,
    parentNodeType: parentNode.type
  });
  
  // ... rest of existing error handling
```

### Step 4: Focus Areas
Pay special attention to adding breadcrumbs before these property assignments:
- Any `nestedFrame.` property assignments
- Any `currentFrame.` property assignments  
- Any `.layoutMode =` assignments
- Any `.width =` or `.height =` assignments
- Any `.padding` assignments
- Any property assignments inside loops

### Step 5: Protect Suspicious Setters
While adding breadcrumbs, if you see any of these patterns, wrap them in try-catch:

```typescript
// If you see direct property assignment on a newly created frame:
const nestedFrame = figma.createFrame();
// Protect this:
try {
  nestedFrame.layoutMode = item.layoutMode;
} catch (e) {
  console.warn('Failed to set layoutMode on nested frame:', e.message);
}
```

## What to Look For
Focus on property assignments that happen:
1. On newly created frames (`figma.createFrame()`)
2. Inside the items processing loop
3. On nested frames that get passed to recursive calls
4. Any property that's set conditionally (inside if statements)

## Expected Result
After adding breadcrumbs and running the code, the console will show:
```
🍞 INIT: Method start
🍞 FRAME: Creating root frame
🍞 FRAME: Setting layoutMode
🍞 NESTED: Setting name
❌ BREADCRUMB LOCATION: NESTED: Setting name
❌ generateUIFromDataSystematic error: TypeError: no setter for property
```

The last breadcrumb before the error tells us exactly which property assignment is failing.

## Quick Alternative Fix
If you find the failing property assignment, immediately wrap it in try-catch:

```typescript
try {
  problematicNode.problematicProperty = value;
} catch (e) {
  console.warn(`Could not set ${propertyName}:`, e.message);
  // Continue execution without this property
}
```

## Success Criteria
- Breadcrumbs added before all property assignments in `generateUIFromDataSystematic`
- The catch block reports the last breadcrumb
- Running the code reveals the exact property assignment that's failing
- That property assignment is then protected with try-catch