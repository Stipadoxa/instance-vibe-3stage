# Correct Fix for `horizontalSizing: "FILL"` in figma-renderer.ts

## The Real Problem
The `applyChildLayoutProperties` method is trying to set a property called `layoutSizing` which **doesn't exist in Figma's API**. The correct approach is to use the parent's auto-layout properties combined with the child's sizing modes.

## The Correct Fix

### Find and Replace the `applyChildLayoutProperties` method

Replace the existing `applyChildLayoutProperties` method (around line 3500+) with this corrected version:

```typescript
static applyChildLayoutProperties(node: SceneNode, properties: any): void {
  if (!properties || !node) return;
  
  console.log('🔧 APPLYING CHILD LAYOUT PROPERTIES:', {
    nodeType: node.type,
    properties: properties
  });
  
  // Check if node is a frame that supports auto-layout
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
    console.warn('⚠️ Node type does not support layout properties:', node.type);
    return;
  }
  
  const frame = node as FrameNode;
  
  // Handle horizontalSizing: "FILL"
  if (properties.horizontalSizing === 'FILL') {
    const parent = frame.parent;
    
    if (parent && 'layoutMode' in parent) {
      const parentFrame = parent as FrameNode;
      
      if (parentFrame.layoutMode === 'VERTICAL') {
        // In vertical layout, FILL means stretch horizontally
        try {
          // Set the frame to stretch to parent width
          frame.layoutAlign = properties.layoutAlign || 'STRETCH';
          
          // CRITICAL: Don't set width - let auto-layout handle it
          // Instead, ensure the sizing mode allows stretching
          if (frame.layoutMode !== 'NONE') {
            // This is an auto-layout frame
            frame.counterAxisSizingMode = 'FIXED';
            frame.primaryAxisSizingMode = 'AUTO';
          }
          
          console.log('✅ Applied FILL for VERTICAL parent - set layoutAlign to STRETCH');
        } catch (e) {
          console.error('❌ Failed to apply FILL sizing:', e);
        }
      } else if (parentFrame.layoutMode === 'HORIZONTAL') {
        // In horizontal layout, FILL means grow to fill available space
        try {
          frame.layoutGrow = 1;
          frame.layoutAlign = properties.layoutAlign || 'STRETCH';
          
          if (frame.layoutMode !== 'NONE') {
            frame.primaryAxisSizingMode = 'FIXED';
            frame.counterAxisSizingMode = 'AUTO';
          }
          
          console.log('✅ Applied FILL for HORIZONTAL parent - set layoutGrow to 1');
        } catch (e) {
          console.error('❌ Failed to apply FILL sizing:', e);
        }
      }
    }
  } else if (properties.horizontalSizing === 'HUG' || properties.horizontalSizing === 'AUTO') {
    // HUG/AUTO means size to content
    try {
      if (frame.layoutMode !== 'NONE') {
        frame.primaryAxisSizingMode = 'AUTO';
        frame.counterAxisSizingMode = 'AUTO';
      }
      console.log('✅ Applied HUG/AUTO sizing');
    } catch (e) {
      console.error('❌ Failed to apply HUG sizing:', e);
    }
  }
  
  // Apply layoutAlign if specified (and not already set above)
  if (properties.layoutAlign && !properties.horizontalSizing) {
    try {
      frame.layoutAlign = properties.layoutAlign;
      console.log('✅ Set layoutAlign:', properties.layoutAlign);
    } catch (e) {
      console.warn('⚠️ Failed to set layoutAlign:', e);
    }
  }
  
  // Apply layoutGrow if explicitly specified
  if (properties.layoutGrow !== undefined && properties.layoutGrow !== null) {
    try {
      frame.layoutGrow = properties.layoutGrow;
      console.log('✅ Set layoutGrow:', properties.layoutGrow);
    } catch (e) {
      console.warn('⚠️ Failed to set layoutGrow:', e);
    }
  }
  
  // Apply other layout properties
  if (properties.layoutPositioning) {
    try {
      frame.layoutPositioning = properties.layoutPositioning;
      console.log('✅ Set layoutPositioning:', properties.layoutPositioning);
    } catch (e) {
      console.warn('⚠️ Failed to set layoutPositioning:', e);
    }
  }
}
```

## Alternative Simpler Fix (If Above Doesn't Work)

If the above doesn't work, here's a simpler approach that directly sets the width after the parent knows about the child:

### Add this after EVERY `appendChild` call:

```typescript
// After: currentFrame.appendChild(nestedFrame);
// Add this:
if (processedItem.horizontalSizing === 'FILL' && currentFrame.layoutMode === 'VERTICAL') {
  // Wait for next tick to ensure parent-child relationship is established
  setTimeout(() => {
    try {
      // For FILL in vertical layout, make the child match parent width
      const parentWidth = currentFrame.width;
      const parentPaddingLeft = currentFrame.paddingLeft || 0;
      const parentPaddingRight = currentFrame.paddingRight || 0;
      const childWidth = parentWidth - parentPaddingLeft - parentPaddingRight;
      
      nestedFrame.resize(childWidth, nestedFrame.height);
      console.log(`✅ Resized child to fill parent: ${childWidth}px`);
    } catch (e) {
      console.error('Failed to resize for FILL:', e);
    }
  }, 0);
}
```

## The Core Issue Explained

The Figma API doesn't have a `layoutSizing` property. Instead, it uses:
- `layoutAlign` - How the child aligns within its parent (STRETCH makes it fill width in vertical layouts)
- `layoutGrow` - How much space the child takes in the primary axis (for horizontal layouts)
- `primaryAxisSizingMode` / `counterAxisSizingMode` - How the frame sizes itself

For `horizontalSizing: "FILL"` to work:
1. In a **VERTICAL** parent layout → Child needs `layoutAlign: "STRETCH"`
2. In a **HORIZONTAL** parent layout → Child needs `layoutGrow: 1`

## Test JSON

After implementing the fix, test with:

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
      "name": "Should be 375px wide",
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
            "content": "This text's container should be 375px wide!",
            "textStyle": "Body/Medium"
          }
        }
      ]
    }
  ]
}
```

## Expected Result
The child container should now be 375px wide (matching the parent), not 100px.