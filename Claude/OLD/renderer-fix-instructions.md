# Fix Instructions for `horizontalSizing: "FILL"` in figma-renderer.ts

## Problem Summary
`horizontalSizing: "FILL"` is not working for direct children of the root container because `applyChildLayoutProperties()` is only called for nested containers, not for top-level children.

## File to Edit
`src/core/figma-renderer.ts`

## Fix Location
Around lines 2950-3100 in the `generateUIFromDataSystematic` method

## Current Code Structure (BROKEN)
```typescript
// Around line 3000-3100
for (const item of items) {
  try {
    // ... item preprocessing ...
    
    if (processedItem.type === 'layoutContainer') {
      const nestedFrame = figma.createFrame();
      currentFrame.appendChild(nestedFrame);
      
      // ✅ ONLY nested containers get this call
      this.applyChildLayoutProperties(nestedFrame, childLayoutProps);
      
      await this.generateUIFromDataSystematic({
        layoutContainer: processedItem,
        items: processedItem.items
      }, nestedFrame);
    }
    // ... other item types ...
  }
}
```

## The Fix

### Step 1: Find the section where items are processed
Look for the loop that processes items (around line 3000):
```typescript
for (const item of items) {
```

### Step 2: Add property application for ALL container children
After ANY frame is created and added to parent, apply the child layout properties. Here's the pattern to implement:

```typescript
for (const item of items) {
  try {
    // ... existing preprocessing code ...
    
    if (processedItem.type === 'layoutContainer') {
      console.log('🔧 Creating layoutContainer:', processedItem.name);
      const nestedFrame = figma.createFrame();
      currentFrame.appendChild(nestedFrame);
      
      // Extract child layout properties from the item
      const childLayoutProps = {
        layoutAlign: processedItem.layoutAlign,
        horizontalSizing: processedItem.horizontalSizing,
        layoutGrow: processedItem.layoutGrow,
        layoutPositioning: processedItem.layoutPositioning,
        minWidth: processedItem.minWidth,
        maxWidth: processedItem.maxWidth,
        minHeight: processedItem.minHeight,
        maxHeight: processedItem.maxHeight
      };
      
      // Remove undefined properties
      Object.keys(childLayoutProps).forEach(key => {
        if (childLayoutProps[key] === undefined) {
          delete childLayoutProps[key];
        }
      });
      
      // CRITICAL FIX: Apply child layout properties for ALL containers
      if (Object.keys(childLayoutProps).length > 0) {
        console.log('✅ Applying child layout properties:', childLayoutProps);
        this.applyChildLayoutProperties(nestedFrame, childLayoutProps);
      }
      
      // Then recursively process the container
      await this.generateUIFromDataSystematic({
        layoutContainer: processedItem,
        items: processedItem.items
      }, nestedFrame);
    }
    else if (processedItem.type === 'component') {
      // ... existing component code ...
      
      // ADD THIS: After component is created and added
      if (componentInstance && processedItem.properties) {
        const layoutProps = {
          layoutAlign: processedItem.properties.layoutAlign,
          horizontalSizing: processedItem.properties.horizontalSizing,
          layoutGrow: processedItem.properties.layoutGrow
        };
        
        // Remove undefined
        Object.keys(layoutProps).forEach(key => {
          if (layoutProps[key] === undefined) delete layoutProps[key];
        });
        
        if (Object.keys(layoutProps).length > 0) {
          this.applyChildLayoutProperties(componentInstance, layoutProps);
        }
      }
    }
    else if (processedItem.type?.startsWith('native-')) {
      // ... existing native element code ...
      // Native elements don't need child layout properties
    }
  } catch (error) {
    console.error('Error processing item:', error);
  }
}
```

### Step 3: Verify the `applyChildLayoutProperties` method exists
Make sure this method is present in the class (it should be around line 3500+):
```typescript
private applyChildLayoutProperties(node: SceneNode, properties: any) {
  if (!properties || !node) return;
  
  // horizontalSizing
  if (properties.horizontalSizing) {
    // This sets how the node should size itself
    const hasHorizontalSizingSetter = Object.getOwnPropertyDescriptor(node, 'layoutSizing')?.set !== undefined;
    if (hasHorizontalSizingSetter) {
      if (properties.horizontalSizing === 'FILL') {
        (node as any).layoutSizing = 'FILL';
      } else if (properties.horizontalSizing === 'HUG') {
        (node as any).layoutSizing = 'HUG';
      }
    }
  }
  
  // layoutAlign
  if (properties.layoutAlign) {
    const hasLayoutAlignSetter = Object.getOwnPropertyDescriptor(node, 'layoutAlign')?.set !== undefined;
    if (hasLayoutAlignSetter) {
      (node as any).layoutAlign = properties.layoutAlign;
    }
  }
  
  // ... rest of the method
}
```

## Alternative Quick Fix (If above doesn't work)

Add this check right after creating any frame and adding it to parent:

```typescript
// Quick fix - Add after any appendChild call
if (nestedFrame.parent && 'layoutMode' in nestedFrame.parent) {
  // Check if this child should fill parent width
  if (processedItem.horizontalSizing === 'FILL' || 
      processedItem.properties?.horizontalSizing === 'FILL') {
    try {
      (nestedFrame as any).layoutSizing = 'FILL';
      (nestedFrame as any).layoutAlign = processedItem.layoutAlign || 
                                          processedItem.properties?.layoutAlign || 
                                          'STRETCH';
      console.log('✅ Applied FILL sizing to frame');
    } catch (e) {
      console.warn('Could not apply FILL sizing:', e);
    }
  }
}
```

## Testing the Fix

After implementing, test with this JSON:
```json
{
  "layoutContainer": {
    "layoutMode": "VERTICAL",
    "itemSpacing": 0,
    "paddingTop": 0,
    "paddingBottom": 0,
    "paddingLeft": 0,
    "paddingRight": 0,
    "primaryAxisSizingMode": "FIXED",
    "counterAxisSizingMode": "FIXED",
    "width": 375,
    "minHeight": 812
  },
  "items": [
    {
      "type": "layoutContainer",
      "layoutMode": "VERTICAL",
      "itemSpacing": 8,
      "paddingTop": 16,
      "paddingBottom": 16,
      "paddingLeft": 16,
      "paddingRight": 16,
      "primaryAxisSizingMode": "AUTO",
      "counterAxisSizingMode": "AUTO",
      "horizontalSizing": "FILL",
      "layoutAlign": "STRETCH",
      "items": [
        {
          "type": "native-text",
          "properties": {
            "content": "Should be 375px wide!",
            "textStyle": "Body/Medium"
          }
        }
      ]
    }
  ]
}
```

## Expected Console Output After Fix
```
🔧 Creating layoutContainer: undefined
✅ Applying child layout properties: {layoutAlign: "STRETCH", horizontalSizing: "FILL"}
✅ Set layoutSizing: FILL
✅ Set layoutAlign: STRETCH
```

## Success Criteria
- Direct children of root container stretch to full width (375px) when using `horizontalSizing: "FILL"`
- No more 100px default width for child containers
- Nested containers continue to work as before