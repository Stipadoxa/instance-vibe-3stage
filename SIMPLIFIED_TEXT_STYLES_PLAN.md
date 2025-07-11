# Simplified Text Styles Implementation Plan

## Overview

Add text styles support to the pipeline using the minimal viable approach. Focus on core functionality that mirrors the existing color styles pattern without overengineering.

## Core Principles

- **Start simple**: Core properties only
- **Direct mapping**: Name-based text style resolution
- **Follow existing patterns**: Mirror color styles implementation
- **Incremental enhancement**: Add complexity only when needed

## Implementation Steps

### Step 1: Define Minimal Text Style Interface

**File:** `src/core/session-manager.ts`

```typescript
export interface TextStyle {
  id: string;
  name: string;
  description?: string;
  
  // Core Typography Properties
  fontSize: number;
  fontName: FontName;
  lineHeight: LineHeight;
  letterSpacing: LetterSpacing;
}

// Update ScanSession interface
export interface ScanSession {
  components: ComponentInfo[];
  colorStyles?: ColorStyleCollection;
  textStyles?: TextStyle[];  // Simple array, no categorization
  scanTime: number;
  version: string;
  fileKey?: string;
}
```

### Step 2: Implement Basic Text Styles Scanning

**File:** `src/core/component-scanner.ts`

```typescript
/**
 * Scans all local text styles in the current Figma file
 */
async scanFigmaTextStyles(): Promise<TextStyle[]> {
  try {
    const textStyles = await figma.getLocalTextStylesAsync();
    
    return textStyles.map(style => ({
      id: style.id,
      name: style.name,
      description: style.description,
      fontSize: style.fontSize,
      fontName: style.fontName,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing
    }));
  } catch (error) {
    console.error('Error scanning text styles:', error);
    throw error;
  }
}
```

### Step 3: Update Design System Scanner

**File:** `src/core/design-system-scanner-service.ts`

```typescript
/**
 * Updated comprehensive design system scan
 */
async scanDesignSystem(): Promise<ScanSession> {
  try {
    console.log('🔍 Starting comprehensive design system scan...');
    
    const scanner = new ComponentScanner();
    
    // Sequential scanning for clear progress and error handling
    console.log('Scanning components...');
    const components = await scanner.scanComponents();
    
    console.log('Scanning color styles...');
    const colorStyles = await scanner.scanFigmaColorStyles();
    
    console.log('Scanning text styles...');
    const textStyles = await scanner.scanFigmaTextStyles();

    const session: ScanSession = {
      components,
      colorStyles,
      textStyles,
      scanTime: Date.now(),
      version: '1.0.0',
      fileKey: figma.fileKey
    };

    await SessionManager.saveSession(session);
    
    console.log('✅ Design system scan completed');
    return session;
  } catch (error) {
    console.error('❌ Design system scan failed:', error);
    throw error;
  }
}
```

### Step 4: Add Simple Text Style Resolution to Renderer

**File:** `src/core/figma-renderer.ts`

```typescript
private textStyles: TextStyle[] | null = null;

/**
 * Sets the cached text styles for the renderer
 */
setTextStyles(textStyles: TextStyle[]): void {
  this.textStyles = textStyles;
  console.log(`📝 ${textStyles.length} text styles cached for rendering`);
}

/**
 * Resolves text style name to Figma style ID
 */
private resolveTextStyleId(styleName: string): string | null {
  if (!this.textStyles) {
    return null;
  }

  // Direct name match first
  let style = this.textStyles.find(s => s.name === styleName);
  
  // Fallback to case-insensitive match
  if (!style) {
    style = this.textStyles.find(s => s.name.toLowerCase() === styleName.toLowerCase());
  }

  return style?.id || null;
}

/**
 * Applies text style to a text node
 */
private applyTextStyle(textNode: TextNode, styleName: string): void {
  const styleId = this.resolveTextStyleId(styleName);
  if (styleId) {
    textNode.textStyleId = styleId;
    console.log(`✅ Applied text style: ${styleName}`);
  } else {
    console.warn(`❌ Text style not found: ${styleName}`);
  }
}

// Update text rendering to handle textStyle property
private renderText(props: any): TextNode {
  // ... existing text rendering code ...
  
  // Apply text style if specified
  if (props.textStyle) {
    this.applyTextStyle(textNode, props.textStyle);
  }
  
  return textNode;
}
```

### Step 5: Update Plugin Initialization

**File:** `code.ts`

```typescript
// Update design system scanning to include text styles
async function performDesignSystemScan(): Promise<void> {
  try {
    const scannerService = new DesignSystemScannerService();
    const session = await scannerService.scanDesignSystem();
    
    // Set styles in renderer
    if (session.colorStyles) {
      FigmaRenderer.setColorStyles(session.colorStyles);
    }
    
    if (session.textStyles) {
      FigmaRenderer.setTextStyles(session.textStyles);
    }
    
    // Send scan results to UI
    figma.ui.postMessage({
      type: 'scan-complete',
      data: {
        componentCount: session.components.length,
        colorStyleCount: session.colorStyles ? Object.values(session.colorStyles).flat().length : 0,
        textStyleCount: session.textStyles?.length || 0
      }
    });
  } catch (error) {
    console.error('Design system scan failed:', error);
    figma.ui.postMessage({ type: 'scan-error', error: error.message });
  }
}
```

### Step 6: Minimal AI Prompt Updates

**File:** `src/prompts/roles/alt2-ux-ui-designer.txt`

Add one simple section:

```
TEXT STYLES:
You have access to text styles from the design system. When specifying text elements, you can reference text styles by their exact names using the "textStyle" property.

Example:
{
  "type": "text",
  "properties": {
    "text": "Welcome Back",
    "textStyle": "Heading 1"
  }
}

If no textStyle is specified, default text formatting will be used.
```

**File:** `src/prompts/roles/json-engineer.js`

Add to the property handling section:

```javascript
// Handle textStyle property
if (element.textStyle) {
  properties.textStyle = element.textStyle;
}
```

## Testing Plan

### Phase 1: Basic Functionality
1. Create 2-3 text styles in Figma (e.g., "Heading 1", "Body Text")
2. Run design system scan
3. Verify text styles are captured and cached
4. Generate simple component with textStyle reference
5. Verify style is applied correctly

### Phase 2: Edge Cases
1. Test with missing text style references
2. Test with case-insensitive style names
3. Test with no text styles in file

### Phase 3: Integration
1. Run full pipeline with text style references
2. Verify AI uses available text styles appropriately

## Benefits of Simplified Approach

1. **Faster Implementation**: Minimal code changes
2. **Easier Debugging**: Simple, linear flow
3. **Maintainable**: Follows existing color styles pattern exactly
4. **Extensible**: Easy to add features later if needed
5. **Robust**: Fewer edge cases and failure points

## Future Enhancements (If Needed)

- Add text style categorization
- Include advanced typography properties
- Add semantic classification for AI guidance
- Implement more sophisticated fallback logic

## Completion Checklist

- [ ] Minimal text style interface added
- [ ] Text style scanning implemented
- [ ] Design system scanner updated
- [ ] Renderer text style support added
- [ ] Plugin initialization updated
- [ ] AI prompts minimally updated
- [ ] Basic testing completed

---

*This plan prioritizes simplicity and follows the proven color styles pattern for maximum reliability.*