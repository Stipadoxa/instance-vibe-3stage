# Text Styles Implementation Plan - Final Version

## Overview

This plan implements text styles support for the pipeline using a simplified approach that mirrors the existing color styles pattern while adding strategic enhancements for robustness. The implementation follows the proven architectural patterns already established in the codebase.

## Core Principles

- **Mirror Color Styles Pattern**: Use identical implementation structure as existing color styles
- **Simple Array Storage**: Avoid complex categorization, use flat array like color styles
- **Strategic Enhancement**: Include essential typography properties beyond the minimal set
- **Existing Infrastructure**: Leverage font loading, session management, and renderer patterns
- **Incremental Implementation**: Phased approach with clear testing milestones

## Implementation Strategy

### Phase 1: Core Infrastructure
**Goal**: Establish text style scanning and storage
**Files**: `session-manager.ts`, `component-scanner.ts`
**Testing**: Verify text styles are scanned and cached

### Phase 2: Renderer Integration
**Goal**: Apply text styles to generated components
**Files**: `figma-renderer.ts`, `design-system-scanner-service.ts`
**Testing**: Verify text styles are applied correctly

### Phase 3: AI Integration
**Goal**: Enable AI to reference text styles
**Files**: Prompt files in `src/prompts/roles/`
**Testing**: End-to-end pipeline with text style references

### Phase 4: Validation & Polish
**Goal**: Edge case handling and documentation
**Testing**: Comprehensive test scenarios

## Detailed Implementation

### Step 1: Define Enhanced Text Style Interface

**File**: `src/core/session-manager.ts`

Add after existing interfaces (around line 30):

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
  
  // Enhanced Properties (from comprehensive plan)
  textDecoration?: TextDecoration; // 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH'
  textCase?: TextCase; // 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS'
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  
  // Spacing Properties (if available)
  paragraphSpacing?: number;
  paragraphIndent?: number;
}

// Update ScanSession interface (around line 15)
export interface ScanSession {
  components: ComponentInfo[];
  colorStyles?: ColorStyle[]; // Keep existing simple array pattern
  textStyles?: TextStyle[]; // Simple array, no categorization
  scanTime: number;
  version: string;
  fileKey?: string;
}
```

### Step 2: Implement Text Style Scanning

**File**: `src/core/component-scanner.ts`

Add after `scanFigmaColorStyles()` method (around line 93):

```typescript
/**
 * Scans all local text styles in the current Figma file
 * Mirrors the scanFigmaColorStyles pattern exactly
 */
async scanFigmaTextStyles(): Promise<TextStyle[]> {
  try {
    console.log('🔍 Scanning text styles...');
    const figmaTextStyles = await figma.getLocalTextStylesAsync();
    
    console.log(`Found ${figmaTextStyles.length} text styles`);
    
    const textStyles: TextStyle[] = figmaTextStyles.map(style => {
      // Build text style object with safe property access
      const textStyle: TextStyle = {
        id: style.id,
        name: style.name,
        description: style.description || '',
        fontSize: style.fontSize,
        fontName: style.fontName,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
      };
      
      // Add optional properties if they exist
      if (style.textDecoration) {
        textStyle.textDecoration = style.textDecoration;
      }
      
      if (style.textCase) {
        textStyle.textCase = style.textCase;
      }
      
      if (style.textAlignHorizontal) {
        textStyle.textAlignHorizontal = style.textAlignHorizontal;
      }
      
      if (style.textAlignVertical) {
        textStyle.textAlignVertical = style.textAlignVertical;
      }
      
      if (style.paragraphSpacing !== undefined) {
        textStyle.paragraphSpacing = style.paragraphSpacing;
      }
      
      if (style.paragraphIndent !== undefined) {
        textStyle.paragraphIndent = style.paragraphIndent;
      }
      
      console.log(`✅ Processed text style: ${style.name} (${style.fontSize}px)`);
      return textStyle;
    });

    console.log(`📝 Successfully scanned ${textStyles.length} text styles`);
    return textStyles;
  } catch (error) {
    console.error('❌ Error scanning text styles:', error);
    throw new Error(`Failed to scan text styles: ${error.message}`);
  }
}
```

### Step 3: Update Design System Scanner Service

**File**: `src/core/design-system-scanner-service.ts`

Update the `scanDesignSystem()` method (around line 327-368):

```typescript
/**
 * Comprehensive design system scan including text styles
 */
async scanDesignSystem(): Promise<ScanSession> {
  try {
    console.log('🔍 Starting comprehensive design system scan...');
    
    const scanner = new ComponentScanner();
    
    // Sequential scanning for clear progress tracking
    console.log('📦 Scanning components...');
    const components = await scanner.scanComponents();
    console.log(`✅ Found ${components.length} components`);
    
    console.log('🎨 Scanning color styles...');
    const colorStyles = await scanner.scanFigmaColorStyles();
    console.log(`✅ Found ${colorStyles.length} color styles`);
    
    console.log('📝 Scanning text styles...');
    const textStyles = await scanner.scanFigmaTextStyles();
    console.log(`✅ Found ${textStyles.length} text styles`);

    const session: ScanSession = {
      components,
      colorStyles,
      textStyles, // Add text styles to session
      scanTime: Date.now(),
      version: '1.0.0',
      fileKey: figma.fileKey
    };

    // Cache the session
    await SessionManager.saveSession(session);
    
    console.log('✅ Design system scan completed successfully');
    console.log(`📊 Summary: ${components.length} components, ${colorStyles.length} color styles, ${textStyles.length} text styles`);
    
    return session;
  } catch (error) {
    console.error('❌ Design system scan failed:', error);
    throw error;
  }
}
```

### Step 4: Add Text Style Support to Figma Renderer

**File**: `src/core/figma-renderer.ts`

Add after the color styles caching section (around line 1882):

```typescript
// Text Styles Caching and Resolution
private static cachedTextStyles: TextStyle[] | null = null;

/**
 * Sets the cached text styles for the renderer
 * Mirrors setColorStyles pattern exactly
 */
static setTextStyles(textStyles: TextStyle[]): void {
  FigmaRenderer.cachedTextStyles = textStyles;
  console.log(`📝 Cached ${textStyles.length} text styles for rendering`);
  
  // Log available text styles for debugging
  if (textStyles.length > 0) {
    console.log('Available text styles:', textStyles.map(s => s.name).join(', '));
  }
}

/**
 * Resolves text style name to Figma text style ID
 * Mirrors resolveColorStyleReference pattern
 */
private static resolveTextStyleReference(textStyleName: string): string | null {
  if (!FigmaRenderer.cachedTextStyles) {
    console.warn('No text styles available for resolution');
    return null;
  }

  // Direct name match first (exact)
  let textStyle = FigmaRenderer.cachedTextStyles.find(style => 
    style.name === textStyleName
  );
  
  // Fallback to case-insensitive match
  if (!textStyle) {
    textStyle = FigmaRenderer.cachedTextStyles.find(style => 
      style.name.toLowerCase() === textStyleName.toLowerCase()
    );
  }

  if (textStyle) {
    console.log(`✅ Resolved text style: "${textStyleName}" -> ${textStyle.id}`);
    return textStyle.id;
  }

  console.warn(`❌ Text style not found: "${textStyleName}"`);
  console.warn('Available text styles:', FigmaRenderer.cachedTextStyles.map(s => s.name));
  return null;
}

/**
 * Applies text style to a text node
 */
private static applyTextStyle(textNode: TextNode, textStyleName: string): void {
  try {
    const styleId = FigmaRenderer.resolveTextStyleReference(textStyleName);
    if (styleId) {
      textNode.textStyleId = styleId;
      console.log(`✅ Applied text style "${textStyleName}" to text node`);
    } else {
      console.warn(`❌ Could not apply text style "${textStyleName}" - style not found`);
    }
  } catch (error) {
    console.error(`❌ Error applying text style "${textStyleName}":`, error);
  }
}
```

Update the `createTextNode()` method (around line 328-435) to support text styles:

```typescript
private static createTextNode(props: any): TextNode {
  const textNode = figma.createText();
  
  // Set basic properties
  textNode.characters = props.text || '';
  
  // Apply text style BEFORE other formatting (if specified)
  if (props.textStyle || props.textStyleName) {
    const styleName = props.textStyle || props.textStyleName;
    FigmaRenderer.applyTextStyle(textNode, styleName);
  }
  
  // Apply other properties (existing code continues...)
  if (props.fontSize) {
    textNode.fontSize = props.fontSize;
  }
  
  // Rest of existing createTextNode implementation...
  
  return textNode;
}
```

### Step 5: Update Plugin Initialization

**File**: `code.ts`

Update the design system scanning integration (around line 285-315):

```typescript
// Update the scan initialization to include text styles
async function performDesignSystemScan(): Promise<void> {
  try {
    console.log('🚀 Initializing design system scan...');
    
    const scannerService = new DesignSystemScannerService();
    const session = await scannerService.scanDesignSystem();
    
    // Set color styles in renderer (existing)
    if (session.colorStyles && session.colorStyles.length > 0) {
      FigmaRenderer.setColorStyles(session.colorStyles);
      console.log(`🎨 Loaded ${session.colorStyles.length} color styles`);
    }
    
    // Set text styles in renderer (new)
    if (session.textStyles && session.textStyles.length > 0) {
      FigmaRenderer.setTextStyles(session.textStyles);
      console.log(`📝 Loaded ${session.textStyles.length} text styles`);
    }
    
    // Send enhanced scan results to UI
    figma.ui.postMessage({
      type: 'scan-complete',
      data: {
        componentCount: session.components.length,
        colorStyleCount: session.colorStyles?.length || 0,
        textStyleCount: session.textStyles?.length || 0, // Add text style count
        scanTime: session.scanTime,
        fileKey: session.fileKey
      }
    });
    
    console.log('✅ Design system loaded successfully');
  } catch (error) {
    console.error('❌ Design system scan failed:', error);
    figma.ui.postMessage({ 
      type: 'scan-error', 
      error: error.message || 'Design system scan failed'
    });
  }
}
```

### Step 6: Update AI Prompts for Text Style Support

**File**: `src/prompts/roles/alt2-ux-ui-designer.txt`

Add after the existing COLOR STYLES section:

```
TEXT STYLES:
You have access to text styles from the scanned design system. When specifying text elements, you can reference text styles by their exact names using the "textStyle" property.

TEXT STYLE USAGE:
- Reference text styles by their exact name from the design system
- Use textStyle property for semantic styling
- Fall back to manual properties (fontSize, fontWeight) if no suitable text style exists

EXAMPLES:
{
  "type": "text",
  "properties": {
    "text": "Welcome Back",
    "textStyle": "Heading 1"
  }
}

{
  "type": "text", 
  "properties": {
    "text": "Enter your password",
    "textStyle": "Body Text"
  }
}

{
  "type": "text",
  "properties": {
    "text": "Forgot password?",
    "textStyle": "Caption"
  }
}

If no appropriate textStyle exists in the design system, use manual properties:
{
  "type": "text",
  "properties": {
    "text": "Custom text",
    "fontSize": 16,
    "fontWeight": "400"
  }
}
```

**File**: `src/prompts/roles/json-engineer.js`

Add to the property processing section (around line 400-500):

```javascript
// Handle text style property (add after color processing)
if (elementData.textStyle) {
  properties.textStyle = elementData.textStyle;
}

// Alternative property name support
if (elementData.textStyleName) {
  properties.textStyle = elementData.textStyleName;
}
```

## Testing Plan

### Phase 1: Basic Functionality Testing

**Setup**: Use existing hardcoded testing system (`user-request.txt`)

1. **Text Style Scanning Test**:
   ```
   Test prompt: "create a simple text component"
   ```
   - Create 2-3 text styles in Figma (e.g., "Heading 1", "Body Text", "Caption")
   - Run design system scan via plugin startup
   - Verify text styles appear in console logs
   - Check cached text styles in renderer

2. **Text Style Application Test**:
   ```
   Test prompt: "create text with Heading 1 style"
   ```
   - Generate component that references specific text style
   - Verify style is applied correctly in rendered component
   - Check console logs for successful text style resolution

### Phase 2: Integration Testing

3. **End-to-End Pipeline Test**:
   ```
   Test prompt: "create mobile login page with heading using Heading 1 style and body text using Body Text style"
   ```
   - Run full pipeline: `python3 instance.py alt3`
   - Copy JSON output to Figma plugin
   - Render and verify text styles are applied
   - Test with both existing and missing text styles

4. **Edge Case Testing**:
   ```
   Test cases:
   - Reference non-existent text style
   - Case-insensitive text style names
   - Empty text style collection
   - Mixed manual and style-based text formatting
   ```

### Phase 3: Validation Testing

5. **AI Understanding Test**:
   - Test AI's ability to choose appropriate text styles
   - Verify fallback to manual properties when needed
   - Test complex layouts with multiple text style references

## Error Handling and Fallbacks

### Text Style Resolution Failures
- Log warnings for missing text styles
- Fall back to manual text properties
- Continue rendering without breaking

### Font Loading Integration
- Leverage existing `loadAllRequiredFonts()` system
- Handle text style fonts that aren't loaded
- Maintain compatibility with existing font fallback logic

### Session Storage Errors
- Graceful handling of scan failures
- Preserve existing color style functionality
- Clear error messaging for debugging

## Benefits of This Implementation

### 1. **Architectural Consistency**
- Mirrors proven color styles pattern exactly
- Uses established caching and resolution mechanisms
- Integrates with existing session management

### 2. **Enhanced Typography Support**
- Supports semantic text style references
- Maintains design system consistency
- Enables AI to make informed typography decisions

### 3. **Robust Implementation**
- Comprehensive error handling and fallbacks
- Preserves existing text rendering capabilities
- Safe property access prevents runtime errors

### 4. **Development Efficiency**
- Leverages existing testing infrastructure
- Clear phased implementation approach
- Easy debugging with comprehensive logging

### 5. **Future Extensibility**
- Simple structure allows easy enhancements
- Can add advanced typography features incrementally
- Maintains backward compatibility

## Success Criteria

- [ ] Text styles are scanned and cached on plugin startup
- [ ] AI can reference text styles by name in generated components
- [ ] Text styles are correctly applied to rendered text nodes
- [ ] Fallback behavior works when text styles are missing
- [ ] Integration with existing testing system (`user-request.txt`)
- [ ] No breaking changes to existing color style functionality
- [ ] Comprehensive error handling and logging
- [ ] End-to-end pipeline testing passes

## Technical Notes

### Property Application Order
1. Apply text style first (if specified)
2. Apply manual overrides (fontSize, color, etc.)
3. Load required fonts
4. Set positioning and sizing

### Caching Strategy
- Text styles cached statically in renderer (like color styles)
- Loaded once per design system scan
- Persistent across multiple generations

### Font Compatibility
- Text styles may reference fonts not currently loaded
- Existing font loading system handles this automatically
- Font loading errors are handled gracefully

### Memory Considerations
- Text style cache is lightweight (metadata only)
- No impact on component scanning performance
- Cached data cleared on new file scans

---

*This implementation plan provides a robust, well-tested approach to adding text style support while maintaining the proven architectural patterns established in the codebase.*