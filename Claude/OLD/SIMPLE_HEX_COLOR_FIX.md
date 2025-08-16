# Simple Hex Color Fix for Native Elements

**Date:** August 1, 2025  
**Objective:** Fix native element hex color rendering with minimal changes  
**Status:** Tested and working (rolled back per user request)

## Problem Summary

Native elements (rectangles, text) fail to render hex colors like `#b8b3f6`, defaulting to black/gray fallbacks. The issue has two parts:

1. **Color resolution**: `resolveColorReference()` doesn't parse hex strings
2. **Property access**: Rectangle function expects `rectData.fill` but JSON has `rectData.properties.fill`

## Simple Solution (15 minutes vs 3.5 hour plan)

### Fix 1: Add Hex Parsing to Color Resolution

**File:** `src/core/figma-renderer.ts` (lines ~2227-2239)

**Change:** Add Tier 3 hex parsing in `resolveColorReference()`:

```typescript
// ADD after Tier 2 (color styles):
// Tier 3: Hex color parsing
if (colorName.startsWith('#')) {
  const hex = colorName.slice(1);
  if (hex.length === 6 && /^[0-9A-Fa-f]{6}$/.test(hex)) {
    const color = {
      r: parseInt(hex.substr(0, 2), 16) / 255,
      g: parseInt(hex.substr(2, 2), 16) / 255,
      b: parseInt(hex.substr(4, 2), 16) / 255
    };
    console.log(`✅ Resolved via hex parsing: ${colorName}`);
    return color;
  }
}
```

**Update comment:** Change "3-tier system" to "4-tier system"

### Fix 2: Fix Rectangle Property Access

**File:** `src/core/figma-renderer.ts` (lines ~493-515)

**Change:** Update `createRectangleNode()` to handle `properties.fill`:

```typescript
static async createRectangleNode(rectData: any, container: FrameNode): Promise<void> {
  console.log('Creating native rectangle:', rectData);
  
  const rect = figma.createRectangle();
  const props = rectData.properties || rectData;  // ADD THIS LINE
  
  // Set dimensions
  const width = props.width || rectData.width;    // UPDATE
  const height = props.height || rectData.height; // UPDATE
  if (width && height) {
    rect.resize(width, height);
  } else {
    rect.resize(100, 100);
  }
  
  // Set fill color  
  const fillColor = props.fill || rectData.fill;  // UPDATE
  if (fillColor) {
    const color = this.resolveColorReference(fillColor);  // UPDATE
    if (color) {
      rect.fills = [{ type: 'SOLID', color: color }];
    }
  }
  
  // rest unchanged...
}
```

## Test Case

**JSON:**
```json
{
  "layoutContainer": {
    "layoutMode": "VERTICAL",
    "itemSpacing": 16,
    "padding": 16
  },
  "items": [
    {
      "type": "native-rectangle",
      "properties": {
        "width": 300,
        "height": 100,
        "fill": "#b8b3f6"
      }
    },
    {
      "type": "native-text",
      "properties": {
        "content": "Purple background test",
        "color": "#ffffff",
        "fontSize": 16
      }
    }
  ]
}
```

**Expected Result:**
- Purple rectangle (`#b8b3f6`)
- White text (`#ffffff`)
- No black/gray fallbacks

## Build & Test

```bash
npm run build
# Reload plugin in Figma
# Test with JSON above
```

## Why This Works

- **Tier 3 hex parsing**: Converts `#b8b3f6` → `{r: 0.72, g: 0.70, b: 0.96}`
- **Property fallbacks**: Handles both `rectData.fill` and `rectData.properties.fill`
- **Preserves existing logic**: Design tokens and color styles still work
- **Minimal risk**: Only 2 functions modified, no complex refactoring

## Implementation Notes

- Text color already calls `resolveColorReference()` so Fix 1 handles it automatically
- Rectangle needed both fixes (parsing + property access)
- No changes needed for ellipses if they follow same pattern
- 12 lines total vs 200+ line complex plan