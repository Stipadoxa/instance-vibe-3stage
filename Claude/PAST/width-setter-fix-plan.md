# Width Setter Error Fix Implementation Guide

## Critical Issue Identified
The "no setter for property" error at line 4673 is NOT in the width setting code. The error is in the item processing loop where `applyChildLayoutProperties` is being called with incorrect data structure.

## Immediate Actions Required

### Action 1: Fix the Typo (If Present)
**File:** `figma-renderer.ts`
**Search for:** `containerDatan.width`
**Replace with:** `containerData.width`
**Location:** Around line 4546 in the width setting block

### Action 2: Locate the Actual Error Line
**File:** `figma-renderer.ts`
**Navigate to:** Line 4673 (or search for the items processing loop)
**Look for this pattern:**
```typescript
for (const item of items) {
  if (item.type === 'layoutContainer') {
    const nestedFrame = figma.createFrame();
    currentFrame.appendChild(nestedFrame);
    this.applyChildLayoutProperties(nestedFrame, item); // <-- THIS IS THE PROBLEM LINE
```

### Action 3: Add Debug Logging BEFORE Line 4673
**Insert this code immediately before the `applyChildLayoutProperties` call:**
```typescript
console.log('🚨 DEBUG LINE 4673: About to call applyChildLayoutProperties', {
  nestedFrameType: nestedFrame.type,
  itemType: item.type,
  itemKeys: Object.keys(item),
  itemHasProperties: 'properties' in item,
  itemDirectProperties: {
    layoutAlign: item.layoutAlign,
    horizontalSizing: item.horizontalSizing,
    layoutGrow: item.layoutGrow,
    width: item.width,
    layoutMode: item.layoutMode
  }
});
```

### Action 4: Fix the Root Cause
**The Problem:** You're passing the entire `item` object (which contains `type`, `items`, `layoutMode`, etc.) to `applyChildLayoutProperties`, but that method expects only child layout properties.

**Find this code block around line 4673:**
```typescript
if (item.type === 'layoutContainer') {
  const nestedFrame = figma.createFrame();
  currentFrame.appendChild(nestedFrame);
  
  // WRONG - passing entire item:
  this.applyChildLayoutProperties(nestedFrame, item);
  
  await this.generateUIFromDataSystematic({
    layoutContainer: item,
    items: item.items
  }, nestedFrame);
}
```

**Replace with this corrected version:**
```typescript
if (item.type === 'layoutContainer') {
  const nestedFrame = figma.createFrame();
  currentFrame.appendChild(nestedFrame);
  
  // CORRECT - only pass relevant child layout properties
  const childLayoutProps = {
    layoutAlign: item.layoutAlign,
    horizontalSizing: item.horizontalSizing,
    layoutGrow: item.layoutGrow,
    layoutPositioning: item.layoutPositioning,
    minWidth: item.minWidth,
    maxWidth: item.maxWidth,
    minHeight: item.minHeight,
    maxHeight: item.maxHeight
  };
  
  // Remove undefined properties to avoid unnecessary processing
  Object.keys(childLayoutProps).forEach(key => {
    if (childLayoutProps[key] === undefined) {
      delete childLayoutProps[key];
    }
  });
  
  this.applyChildLayoutProperties(nestedFrame, childLayoutProps);
  
  await this.generateUIFromDataSystematic({
    layoutContainer: item,
    items: item.items
  }, nestedFrame);
}
```

### Action 5: Protect Remaining Unprotected Properties
**Location:** In the container properties section (around lines 4400-4500)
**Find these unprotected assignments and wrap them in try-catch:**

```typescript
// Find this:
if (containerData.layoutWrap !== undefined) {
  currentFrame.layoutWrap = containerData.layoutWrap;
}

// Replace with:
try {
  if (containerData.layoutWrap !== undefined) {
    currentFrame.layoutWrap = containerData.layoutWrap;
  }
} catch (e) {
  console.warn('⚠️ Failed to set layoutWrap:', e.message);
}

// Find this:
if (containerData.primaryAxisAlignItems) {
  currentFrame.primaryAxisAlignItems = containerData.primaryAxisAlignItems;
}

// Replace with:
try {
  if (containerData.primaryAxisAlignItems) {
    currentFrame.primaryAxisAlignItems = containerData.primaryAxisAlignItems;
  }
} catch (e) {
  console.warn('⚠️ Failed to set primaryAxisAlignItems:', e.message);
}

// Find this:
if (containerData.counterAxisAlignItems) {
  currentFrame.counterAxisAlignItems = containerData.counterAxisAlignItems;
}

// Replace with:
try {
  if (containerData.counterAxisAlignItems) {
    currentFrame.counterAxisAlignItems = containerData.counterAxisAlignItems;
  }
} catch (e) {
  console.warn('⚠️ Failed to set counterAxisAlignItems:', e.message);
}
```

### Action 6: Verify the Fix
After implementing the above changes:
1. Run the test case from `test_width_setter_debug.json`
2. Check console output - the error should be resolved
3. Verify that the debug log shows what properties were being incorrectly passed
4. Confirm the UI renders correctly

## Why This Will Fix the Issue

1. **Correct Data Structure**: `applyChildLayoutProperties` expects properties like `layoutAlign` and `horizontalSizing`, not container properties like `type` and `items`
2. **Protected Assignments**: All property setters that might fail are now wrapped in try-catch blocks
3. **Clean Property Passing**: Only relevant properties are passed to each method

## Expected Outcome
- The "no setter for property" error at line 4673 will be resolved
- The console will show clean debug output without errors
- The UI will render correctly with proper width settings

## Verification Checklist
- [ ] Typo fixed (if it exists)
- [ ] Debug logging added at line 4673
- [ ] `applyChildLayoutProperties` receives only child layout properties
- [ ] All unprotected property assignments are wrapped in try-catch
- [ ] Test JSON file renders without errors
- [ ] Console output is clean (only warnings, no errors)

## If Error Persists
If the error still occurs after these changes:
1. Check the exact line number in the error message
2. Look at the debug output to see what properties are being passed
3. Add more granular logging inside `applyChildLayoutProperties` to identify the exact failing property
4. Consider that the error might be in a different item type processing block (check all calls to `applyChildLayoutProperties`)

## Success Indicators
- No "TypeError: no setter for property" errors
- Console shows "✅ UI generated with systematic validation!" message
- All layout containers render with correct widths
- Debug logs show proper property filtering is working