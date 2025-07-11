# Text Styles Implementation Plan

## Overview

This document outlines the step-by-step plan to add text styles scanning and processing capabilities to the pipeline, mirroring the existing color styles implementation.

## Key Insights

- **Text styles are semantic naming conventions** (e.g., "Heading 1", "Body Text", "Caption") rather than systematic variants like color styles
- Text styles contain rich typography information including font family, size, spacing, decoration, and alignment properties
- Implementation should follow the proven color styles pattern for consistency

## Implementation Steps

### Step 1: Define Text Style Interfaces ✅

**File:** `src/core/session-manager.ts`

Add comprehensive TypeScript interfaces for text styles:

```typescript
export interface TextStyle {
  id: string;
  name: string;
  description?: string;
  
  // Typography Properties
  fontSize: number;
  fontName: FontName; // { family: string, style: string }
  lineHeight: LineHeight;
  letterSpacing: LetterSpacing;
  
  // Alignment
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  
  // Decoration & Case
  textDecoration?: TextDecoration; // 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH'
  textCase?: TextCase; // 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS'
  
  // Spacing Properties
  paragraphSpacing?: number;
  paragraphIndent?: number;
  listSpacing?: number;
  
  // Advanced Properties
  leadingTrim?: LeadingTrim;
  hangingPunctuation?: boolean;
  hangingList?: boolean;
  
  // Semantic Classification (for AI understanding)
  category?: 'heading' | 'body' | 'caption' | 'overline' | 'button' | 'label' | 'other';
}

export interface TextStyleCollection {
  heading: TextStyle[];
  body: TextStyle[];
  caption: TextStyle[];
  overline: TextStyle[];
  button: TextStyle[];
  label: TextStyle[];
  other: TextStyle[];
}

// Update ScanSession interface
export interface ScanSession {
  components: ComponentInfo[];
  colorStyles?: ColorStyleCollection;
  textStyles?: TextStyleCollection;  // Add this line
  scanTime: number;
  version: string;
  fileKey?: string;
}
```

### Step 2: Implement Text Styles Scanning

**File:** `src/core/component-scanner.ts`

Add text style scanning methods following the color styles pattern:

```typescript
/**
 * Scans all local text styles in the current Figma file
 */
async scanFigmaTextStyles(): Promise<TextStyleCollection> {
  try {
    const textStyles = await figma.getLocalTextStylesAsync();
    
    const collection: TextStyleCollection = {
      heading: [],
      body: [],
      caption: [],
      overline: [],
      button: [],
      label: [],
      other: []
    };

    for (const style of textStyles) {
      const textStyle: TextStyle = {
        id: style.id,
        name: style.name,
        description: style.description,
        fontSize: style.fontSize,
        fontName: style.fontName,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textDecoration: style.textDecoration,
        textCase: style.textCase,
        paragraphSpacing: style.paragraphSpacing,
        paragraphIndent: style.paragraphIndent,
        listSpacing: style.listSpacing,
        leadingTrim: style.leadingTrim,
        hangingPunctuation: style.hangingPunctuation,
        hangingList: style.hangingList,
        category: this.categorizeTextStyle(style.name)
      };

      collection[textStyle.category!].push(textStyle);
    }

    return collection;
  } catch (error) {
    console.error('Error scanning text styles:', error);
    throw error;
  }
}

/**
 * Categorizes text styles based on naming patterns
 */
private categorizeTextStyle(styleName: string): 'heading' | 'body' | 'caption' | 'overline' | 'button' | 'label' | 'other' {
  const name = styleName.toLowerCase();
  
  // Heading patterns
  if (name.includes('heading') || name.includes('title') || name.includes('h1') || name.includes('h2') || name.includes('h3') || name.includes('h4') || name.includes('h5') || name.includes('h6')) {
    return 'heading';
  }
  
  // Body text patterns
  if (name.includes('body') || name.includes('paragraph') || name.includes('text')) {
    return 'body';
  }
  
  // Caption patterns
  if (name.includes('caption') || name.includes('small') || name.includes('footnote')) {
    return 'caption';
  }
  
  // Overline patterns
  if (name.includes('overline') || name.includes('eyebrow') || name.includes('kicker')) {
    return 'overline';
  }
  
  // Button patterns
  if (name.includes('button') || name.includes('cta') || name.includes('action')) {
    return 'button';
  }
  
  // Label patterns
  if (name.includes('label') || name.includes('helper') || name.includes('hint') || name.includes('input')) {
    return 'label';
  }
  
  return 'other';
}
```

### Step 3: Update Design System Scanner

**File:** `src/core/design-system-scanner-service.ts`

Add text styles to the design system scanning process:

```typescript
/**
 * Scans text styles independently
 */
async scanTextStyles(): Promise<TextStyleCollection> {
  const scanner = new ComponentScanner();
  return await scanner.scanFigmaTextStyles();
}

/**
 * Updated comprehensive design system scan
 */
async scanDesignSystem(): Promise<ScanSession> {
  try {
    console.log('🔍 Starting comprehensive design system scan...');
    
    const scanner = new ComponentScanner();
    
    // Scan components and styles in parallel
    const [components, colorStyles, textStyles] = await Promise.all([
      scanner.scanComponents(),
      scanner.scanFigmaColorStyles(),
      scanner.scanFigmaTextStyles()  // Add this line
    ]);

    const session: ScanSession = {
      components,
      colorStyles,
      textStyles,  // Add this line
      scanTime: Date.now(),
      version: '1.0.0',
      fileKey: figma.fileKey
    };

    // Cache the session
    await SessionManager.saveSession(session);
    
    console.log('✅ Design system scan completed');
    return session;
  } catch (error) {
    console.error('❌ Design system scan failed:', error);
    throw error;
  }
}
```

### Step 4: Enhance Figma Renderer

**File:** `src/core/figma-renderer.ts`

Add text style resolution and application:

```typescript
private textStyles: TextStyleCollection | null = null;

/**
 * Sets the cached text styles for the renderer
 */
setTextStyles(textStyles: TextStyleCollection): void {
  this.textStyles = textStyles;
  console.log('📝 Text styles cached for rendering');
}

/**
 * Resolves text style reference to actual Figma text style
 */
async resolveTextStyleReference(textStyleName: string): Promise<string | null> {
  if (!this.textStyles) {
    console.warn('No text styles available for resolution');
    return null;
  }

  // Search through all categories
  const allCategories = Object.values(this.textStyles).flat();
  const textStyle = allCategories.find(style => 
    style.name === textStyleName || 
    style.name.toLowerCase() === textStyleName.toLowerCase()
  );

  if (textStyle) {
    console.log(`✅ Resolved text style: ${textStyleName} -> ${textStyle.id}`);
    return textStyle.id;
  }

  console.warn(`❌ Text style not found: ${textStyleName}`);
  return null;
}

/**
 * Applies text style to a text node
 */
async applyTextStyle(textNode: TextNode, textStyleName: string): Promise<void> {
  const styleId = await this.resolveTextStyleReference(textStyleName);
  if (styleId) {
    try {
      textNode.textStyleId = styleId;
      console.log(`✅ Applied text style: ${textStyleName}`);
    } catch (error) {
      console.error(`❌ Failed to apply text style ${textStyleName}:`, error);
    }
  }
}

// Update text rendering methods to use text styles
private async renderTextWithStyle(props: any): Promise<TextNode> {
  // ... existing text rendering code ...
  
  // Apply text style if specified
  if (props.textStyle || props.textStyleName) {
    await this.applyTextStyle(textNode, props.textStyle || props.textStyleName);
  }
  
  return textNode;
}
```

### Step 5: Update Main Plugin Code

**File:** `code.ts`

Integrate text styles into the plugin initialization and design system scanning:

```typescript
// Update design system scanning to include text styles
async function performDesignSystemScan(): Promise<void> {
  try {
    const scannerService = new DesignSystemScannerService();
    const session = await scannerService.scanDesignSystem();
    
    // Set both color and text styles in renderer
    if (session.colorStyles) {
      FigmaRenderer.setColorStyles(session.colorStyles);
    }
    
    if (session.textStyles) {
      FigmaRenderer.setTextStyles(session.textStyles);  // Add this line
    }
    
    // Send scan results to UI
    figma.ui.postMessage({
      type: 'scan-complete',
      data: {
        componentCount: session.components.length,
        colorStyleCount: session.colorStyles ? Object.values(session.colorStyles).flat().length : 0,
        textStyleCount: session.textStyles ? Object.values(session.textStyles).flat().length : 0  // Add this line
      }
    });
  } catch (error) {
    console.error('Design system scan failed:', error);
    figma.ui.postMessage({ type: 'scan-error', error: error.message });
  }
}
```

### Step 6: Update AI Prompts

**Files:** 
- `src/prompts/roles/alt2-ux-ui-designer.txt`
- `src/prompts/roles/5 json-engineer.txt`

Update prompts to understand and reference text styles:

#### UX/UI Designer Prompt Updates:
```
AVAILABLE TEXT STYLES:
You have access to the following text style categories:
- Heading styles (H1, H2, H3, etc.)
- Body text styles (Body Large, Body Medium, Body Small)
- Caption styles (Caption, Small Text)
- Button text styles
- Label styles (Input Labels, Helper Text)

When specifying text elements, reference text styles by their exact names from the design system.

Example:
{
  "type": "text",
  "properties": {
    "text": "Welcome Back",
    "textStyle": "Heading 1"
  }
}
```

#### JSON Engineer Prompt Updates:
```
TEXT STYLE REFERENCES:
When the UX/UI Designer specifies textStyle properties, include them in the final JSON:

{
  "type": "text",
  "properties": {
    "text": "Sign In",
    "textStyle": "Button Text"
  }
}

If no textStyle is specified, omit the textStyle property to use default text formatting.
```

### Step 7: Testing and Validation

**Test Cases:**

1. **Text Style Scanning Test:**
   - Create various text styles in Figma (Heading 1, Body Text, etc.)
   - Run design system scan
   - Verify text styles are properly categorized and stored

2. **Text Style Application Test:**
   - Generate components that reference text styles
   - Verify text styles are applied correctly in rendered components
   - Test fallback behavior when text styles are missing

3. **End-to-End Pipeline Test:**
   - Create user request mentioning specific text formatting
   - Run pipeline with text styles available
   - Verify AI references and applies appropriate text styles

## Benefits

1. **Consistent Typography:** Ensures generated components use design system text styles
2. **Design System Compliance:** Maintains visual consistency with existing designs
3. **Reduced Manual Work:** Eliminates need to manually apply text styles after generation
4. **Better AI Understanding:** Enables AI to make informed typography decisions
5. **Scalable Pattern:** Uses proven color styles implementation pattern

## Technical Notes

- Text styles are applied via `textNode.textStyleId` property
- Font loading may be required when text styles reference custom fonts
- Text style categorization helps AI understand semantic hierarchy
- Fallback handling ensures graceful degradation when styles are missing

## Completion Criteria

- [ ] Text style interfaces defined
- [ ] Text style scanning implemented
- [ ] Design system scanner updated
- [ ] Figma renderer enhanced
- [ ] Main plugin code updated  
- [ ] AI prompts updated
- [ ] End-to-end testing completed

---

*This implementation follows the established color styles pattern to ensure consistency and maintainability.*