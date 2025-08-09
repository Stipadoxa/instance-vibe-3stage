# Figma Renderer Resilience Improvement Plan

## Overview
This plan addresses critical renderer failures by adding validation, normalization, and fallback mechanisms to handle common LLM output errors gracefully.

## Implementation Instructions for Claude Code

### Step 1: Add Validation and Helper Functions

**File**: `src/core/figma-renderer.ts`

**Location**: Add these methods to the `FigmaRenderer` class (after the existing methods)

```typescript
/**
 * Validates native element types and provides fallbacks
 */
static validateNativeType(type: string): string | null {
  const ALLOWED_NATIVE_TYPES = ['native-text', 'native-rectangle', 'native-circle'];
  
  if (ALLOWED_NATIVE_TYPES.includes(type)) {
    return type;
  }
  
  // Attempt intelligent fallback
  const fallbackMap: Record<string, string> = {
    'native-grid': 'layoutContainer',
    'native-list-item': 'layoutContainer',
    'native-rating': 'native-rectangle',
    'native-image': 'native-rectangle',
    'native-vertical-scroll': 'layoutContainer',
    'native-horizontal-scroll': 'layoutContainer'
  };
  
  if (fallbackMap[type]) {
    console.warn(`⚠️ Unknown native type "${type}" - falling back to "${fallbackMap[type]}"`);
    return fallbackMap[type];
  }
  
  console.error(`❌ Unknown native type "${type}" - no fallback available`);
  return null;
}

/**
 * Sanitizes width properties to handle percentages and invalid values
 */
static sanitizeWidth(width: any): number | null {
  // Handle percentage strings
  if (typeof width === 'string') {
    // Remove percentage and convert
    if (width.endsWith('%')) {
      const percentage = parseFloat(width);
      if (width === '100%') {
        console.warn('⚠️ Converting width "100%" to horizontalSizing: "FILL"');
        return null; // Signal to use FILL instead
      } else {
        // Convert percentage to approximate fixed width
        const defaultContainerWidth = 375; // Mobile width
        const calculated = (defaultContainerWidth * percentage) / 100;
        console.warn(`⚠️ Converting width "${width}" to ${calculated}px`);
        return calculated;
      }
    }
    
    // Try parsing as number
    const parsed = parseFloat(width);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  
  if (typeof width === 'number') {
    return width;
  }
  
  console.warn(`⚠️ Invalid width value: ${width}`);
  return null;
}

/**
 * Normalizes property names to match component schemas
 */
static normalizePropertyNames(properties: any, textLayers?: string[]): any {
  if (!properties) return {};
  
  const normalized = {...properties};
  
  // Common property aliases
  const aliases: Record<string, string[]> = {
    'Action': ['text', 'label', 'action', 'Default', 'buttonText'],
    'label-text': ['label', 'labelText', 'text'],
    'placeholder-text': ['placeholder', 'placeholderText'],
    'isPassword': ['isSecure', 'secure', 'password'],
    'Headline': ['title', 'heading', 'headline'],
    'Supporting text': ['subtitle', 'description', 'supportingText'],
    'Default': ['text', 'content', 'label']
  };
  
  // If we have schema, use it for validation
  if (textLayers && textLayers.length > 0) {
    Object.keys(properties).forEach(propName => {
      if (!textLayers.includes(propName)) {
        // Find correct property name
        for (const [correct, wrongNames] of Object.entries(aliases)) {
          if (wrongNames.includes(propName) && textLayers.includes(correct)) {
            console.warn(`⚠️ Normalizing property "${propName}" to "${correct}"`);
            normalized[correct] = properties[propName];
            delete normalized[propName];
            break;
          }
        }
      }
    });
  }
  
  return normalized;
}

/**
 * Validates and fixes component variants
 */
static validateAndFixVariants(
  variants: any,
  variantDetails: any
): any {
  if (!variants || !variantDetails) {
    return variants || {};
  }
  
  const fixed = {...variants};
  
  // Validate existing variants
  Object.entries(variants).forEach(([propName, value]) => {
    const validValues = variantDetails[propName];
    
    if (!validValues) {
      console.warn(`⚠️ Unknown variant property "${propName}" - removing`);
      delete fixed[propName];
      return;
    }
    
    // Check if value is valid
    if (!validValues.includes(value)) {
      // Try case-insensitive match
      const match = validValues.find((v: string) => 
        v.toLowerCase() === String(value).toLowerCase()
      );
      
      if (match) {
        console.warn(`⚠️ Fixing variant case: "${value}" → "${match}"`);
        fixed[propName] = match;
      } else {
        console.warn(`⚠️ Invalid variant value "${value}" for "${propName}". Using default: "${validValues[0]}"`);
        fixed[propName] = validValues[0];
      }
    }
  });
  
  // Add missing required variants
  Object.entries(variantDetails).forEach(([propName, values]: [string, any]) => {
    if (!fixed[propName] && Array.isArray(values) && values.length > 0) {
      console.warn(`⚠️ Adding missing variant "${propName}" with default: "${values[0]}"`);
      fixed[propName] = values[0];
    }
  });
  
  return fixed;
}

/**
 * Pre-render validation of entire layout data
 */
static validateLayoutData(layoutData: any): {valid: boolean, errors: string[], warnings: string[]} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate root structure
  if (!layoutData.layoutContainer && !layoutData.items) {
    errors.push('Missing layoutContainer or items at root level');
  }
  
  // Recursive validation function
  const validateItems = (items: any[], path: string = '') => {
    if (!Array.isArray(items)) return;
    
    items.forEach((item, index) => {
      const itemPath = `${path}[${index}]`;
      
      // Check for unknown native types
      if (item.type?.startsWith('native-') && 
          !['native-text', 'native-rectangle', 'native-circle'].includes(item.type)) {
        warnings.push(`Invalid native type "${item.type}" at ${itemPath} - will attempt fallback`);
      }
      
      // Check for percentage widths
      if (typeof item.width === 'string' && item.width.includes('%')) {
        warnings.push(`Percentage width "${item.width}" at ${itemPath} - will convert`);
      }
      
      if (typeof item.properties?.width === 'string' && item.properties.width.includes('%')) {
        warnings.push(`Percentage width "${item.properties.width}" in properties at ${itemPath} - will convert`);
      }
      
      // Check for component ID
      if (item.type === 'component') {
        if (!item.componentNodeId && !item.componentId && !item.id) {
          errors.push(`Missing component ID at ${itemPath}`);
        } else if (!item.componentNodeId) {
          warnings.push(`Using legacy property name for component ID at ${itemPath} - will normalize`);
        }
      }
      
      // Recurse into nested items
      if (item.items) {
        validateItems(item.items, `${itemPath}.items`);
      }
      if (item.layoutContainer?.items) {
        validateItems(item.layoutContainer.items, `${itemPath}.layoutContainer.items`);
      }
    });
  };
  
  const items = layoutData.items || layoutData.layoutContainer?.items;
  if (items) {
    validateItems(items);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Creates a visual placeholder for missing components
 */
static async createMissingComponentPlaceholder(
  componentId: string,
  parentNode: FrameNode
): Promise<RectangleNode> {
  const placeholder = figma.createRectangle();
  placeholder.name = `Missing Component: ${componentId}`;
  placeholder.fills = [{type: 'SOLID', color: {r: 1, g: 0.9, b: 0.9}}];
  placeholder.resize(200, 100);
  placeholder.cornerRadius = 8;
  placeholder.strokes = [{type: 'SOLID', color: {r: 0.8, g: 0.2, b: 0.2}}];
  placeholder.strokeWeight = 2;
  placeholder.dashPattern = [5, 5];
  parentNode.appendChild(placeholder);
  
  try {
    const text = figma.createText();
    await figma.loadFontAsync({family: "Inter", style: "Regular"});
    text.characters = `Component\n${componentId}\nnot found`;
    text.fontSize = 12;
    text.fills = [{type: 'SOLID', color: {r: 0.5, g: 0.5, b: 0.5}}];
    text.textAlignHorizontal = 'CENTER';
    text.textAlignVertical = 'CENTER';
    text.resize(200, 100);
    placeholder.appendChild(text);
  } catch (e) {
    console.warn('Could not add text to placeholder:', e);
  }
  
  return placeholder;
}
```

### Step 2: Update Main Rendering Loop

**File**: `src/core/figma-renderer.ts`

**Method**: Update the `generateUIFromDataSystematic` method

**Find this section** (around line 280-300 in the for loop):
```typescript
for (const item of items) {
  if (item.type === 'layoutContainer') {
```

**Replace the entire for loop with**:
```typescript
for (const item of items) {
  try {
    // Pre-process item to fix common issues
    const processedItem = {...item};
    
    // Validate and potentially transform native types
    if (processedItem.type?.startsWith('native-')) {
      const validatedType = this.validateNativeType(processedItem.type);
      
      if (!validatedType) {
        console.error(`❌ Skipping invalid native element type: ${processedItem.type}`);
        continue;
      }
      
      // If it transformed to layoutContainer, handle accordingly
      if (validatedType === 'layoutContainer') {
        processedItem.type = 'layoutContainer';
        processedItem.layoutMode = processedItem.layoutMode || 'VERTICAL';
        processedItem.itemSpacing = processedItem.itemSpacing || 8;
        // Move items if they were in properties
        if (processedItem.properties?.items) {
          processedItem.items = processedItem.properties.items;
          delete processedItem.properties.items;
        }
      } else {
        processedItem.type = validatedType;
      }
    }
    
    // Normalize component ID property
    if (processedItem.type === 'component') {
      processedItem.componentNodeId = processedItem.componentNodeId || 
                                     processedItem.componentId || 
                                     processedItem.id;
      delete processedItem.componentId;
      delete processedItem.id;
    }
    
    // Sanitize width properties
    if (processedItem.properties?.width) {
      const sanitizedWidth = this.sanitizeWidth(processedItem.properties.width);
      if (sanitizedWidth === null && processedItem.properties.width === '100%') {
        processedItem.properties.horizontalSizing = 'FILL';
        delete processedItem.properties.width;
      } else if (sanitizedWidth !== null) {
        processedItem.properties.width = sanitizedWidth;
      } else {
        delete processedItem.properties.width;
      }
    }
    
    // Handle container width
    if (processedItem.width && processedItem.layoutMode) {
      const sanitizedWidth = this.sanitizeWidth(processedItem.width);
      if (sanitizedWidth !== null) {
        processedItem.width = sanitizedWidth;
      } else {
        delete processedItem.width;
        processedItem.counterAxisSizingMode = 'AUTO';
      }
    }
    
    // Process based on type
    if (processedItem.type === 'layoutContainer') {
      const nestedFrame = figma.createFrame();
      currentFrame.appendChild(nestedFrame);
      
      // Apply child layout properties
      this.applyChildLayoutProperties(nestedFrame, processedItem);
      
      await this.generateUIFromDataSystematic({ 
        layoutContainer: processedItem, 
        items: processedItem.items 
      }, nestedFrame);
      
    } else if (processedItem.type === 'frame' && processedItem.layoutContainer) {
      const nestedFrame = figma.createFrame();
      currentFrame.appendChild(nestedFrame);
      await this.generateUIFromDataSystematic(processedItem, nestedFrame);
      
    } 
    // NATIVE ELEMENTS - Handle these BEFORE component resolution
    else if (processedItem.type === 'native-text' || processedItem.type === 'text') {
      await this.createTextNode(processedItem, currentFrame);
      continue;
    }
    else if (processedItem.type === 'native-rectangle') {
      await this.createRectangleNode(processedItem, currentFrame);
      continue;
    }
    else if (processedItem.type === 'native-circle') {
      await this.createEllipseNode(processedItem, currentFrame);
      continue;
    }
    // COMPONENT ELEMENTS
    else if (processedItem.type === 'component') {
      if (!processedItem.componentNodeId) {
        console.error('❌ No component ID found after normalization');
        continue;
      }
      
      const componentNode = await figma.getNodeByIdAsync(processedItem.componentNodeId);
      if (!componentNode) {
        console.warn(`⚠️ Component ${processedItem.componentNodeId} not found - creating placeholder`);
        await this.createMissingComponentPlaceholder(processedItem.componentNodeId, currentFrame);
        continue;
      }
      
      // Get component info from session if available
      const componentInfo = SessionManager.getComponentById(processedItem.componentNodeId);
      
      // Normalize properties
      if (processedItem.properties && componentInfo?.textLayers) {
        processedItem.properties = this.normalizePropertyNames(
          processedItem.properties, 
          componentInfo.textLayers
        );
      }
      
      // Validate and fix variants
      if (processedItem.variants && componentInfo?.variantDetails) {
        processedItem.variants = this.validateAndFixVariants(
          processedItem.variants,
          componentInfo.variantDetails
        );
      }
      
      // Continue with existing component creation logic...
      const masterComponent = (componentNode.type === 'COMPONENT_SET' 
        ? componentNode.defaultVariant as ComponentNode
        : componentNode.type === 'COMPONENT' 
        ? componentNode 
        : null) as ComponentNode | null;
        
      if (!masterComponent) {
        console.error(`❌ Node ${processedItem.componentNodeId} is not a valid component`);
        await this.createMissingComponentPlaceholder(processedItem.componentNodeId, currentFrame);
        continue;
      }
      
      const instance = masterComponent.createInstance();
      currentFrame.appendChild(instance);
      
      // Apply variants with validation
      if (processedItem.variants) {
        await this.applyVariantsSystematic(instance, processedItem.variants);
      }
      
      // Apply child layout properties
      this.applyChildLayoutProperties(instance, processedItem);
      
      // Apply text properties
      await this.applyTextProperties(instance, processedItem);
      
      // Apply media properties
      await this.applyMediaProperties(instance, processedItem);
    }
    
  } catch (itemError) {
    console.error(`❌ Error rendering item:`, itemError);
    console.log('Problematic item:', JSON.stringify(item, null, 2));
    
    // Create error placeholder
    try {
      const errorFrame = figma.createFrame();
      errorFrame.name = `Error: ${itemError.message}`;
      errorFrame.fills = [{type: 'SOLID', color: {r: 1, g: 0.8, b: 0.8}}];
      errorFrame.resize(200, 50);
      currentFrame.appendChild(errorFrame);
    } catch (e) {
      console.error('Could not create error placeholder:', e);
    }
    
    // Continue with next item instead of failing entire render
    continue;
  }
}
```

### Step 3: Update Plugin Entry Point

**File**: `code.ts`

**Find**: The message handler section (around `figma.ui.onmessage = msg => {`)

**Add validation before rendering**:
```typescript
if (msg.type === 'render-ui' && msg.data) {
  console.log('🎨 Render UI request received');
  
  // Validate layout data
  const validation = FigmaRenderer.validateLayoutData(msg.data);
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Layout validation warnings:', validation.warnings);
  }
  
  if (!validation.valid) {
    console.error('❌ Layout validation failed:', validation.errors);
    figma.notify(`Layout validation failed: ${validation.errors[0]}`, {error: true});
    
    // Show detailed error in UI
    figma.ui.postMessage({
      type: 'validation-error',
      errors: validation.errors,
      warnings: validation.warnings
    });
    
    // If forceRender flag is set, try anyway
    if (msg.forceRender) {
      console.warn('⚠️ Force render flag set - attempting render despite errors...');
      figma.notify('Attempting render with error recovery...', {timeout: 2000});
    } else {
      return;
    }
  }
  
  // Proceed with rendering
  FigmaRenderer.generateUIFromDataSystematic(msg.data, figma.currentPage)
    .then(() => {
      figma.notify('✅ UI rendered successfully!', {timeout: 2000});
    })
    .catch(error => {
      console.error('❌ Render error:', error);
      figma.notify(`Render failed: ${error.message}`, {error: true});
    });
}
```

### Step 4: Add UI Feedback (Optional)

**File**: `ui.html`

**Add validation feedback UI** (inside the render tab section):
```html
<!-- Add this after the existing Generate UI button -->
<div id="validation-feedback" style="display: none; margin-top: 10px;">
  <div class="error-box" id="validation-errors" style="display: none;">
    <h4>Validation Errors:</h4>
    <ul id="error-list"></ul>
  </div>
  <div class="warning-box" id="validation-warnings" style="display: none;">
    <h4>Warnings (will auto-fix):</h4>
    <ul id="warning-list"></ul>
  </div>
  <label style="margin-top: 10px;">
    <input type="checkbox" id="force-render"> 
    Force render despite errors
  </label>
</div>

<style>
.error-box {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  padding: 10px;
  margin: 5px 0;
}

.warning-box {
  background: #ffc;
  border: 1px solid #fc9;
  border-radius: 4px;
  padding: 10px;
  margin: 5px 0;
}
</style>
```

**Add message handler in ui.html script**:
```javascript
// Add to existing onmessage handler
window.onmessage = async (event) => {
  const msg = event.data.pluginMessage;
  
  if (msg.type === 'validation-error') {
    const feedback = document.getElementById('validation-feedback');
    const errorBox = document.getElementById('validation-errors');
    const warningBox = document.getElementById('validation-warnings');
    const errorList = document.getElementById('error-list');
    const warningList = document.getElementById('warning-list');
    
    feedback.style.display = 'block';
    
    if (msg.errors.length > 0) {
      errorBox.style.display = 'block';
      errorList.innerHTML = msg.errors.map(e => `<li>${e}</li>`).join('');
    }
    
    if (msg.warnings.length > 0) {
      warningBox.style.display = 'block';
      warningList.innerHTML = msg.warnings.map(w => `<li>${w}</li>`).join('');
    }
  }
  
  // ... existing handlers
};

// Update render button to include force flag
document.getElementById('generateUIBtn').onclick = () => {
  const jsonInput = document.getElementById('jsonInput').value;
  const forceRender = document.getElementById('force-render')?.checked || false;
  
  try {
    const layoutData = JSON.parse(jsonInput);
    parent.postMessage({
      pluginMessage: {
        type: 'render-ui',
        data: layoutData,
        forceRender: forceRender
      }
    }, '*');
  } catch (error) {
    alert('Invalid JSON: ' + error.message);
  }
};
```

## Testing Instructions

### Test Case 1: Invalid Native Types
```json
{
  "layoutContainer": {"layoutMode": "VERTICAL"},
  "items": [
    {"type": "native-grid", "properties": {"columns": 2}},
    {"type": "native-rating", "properties": {"stars": 5}}
  ]
}
```
**Expected**: Should convert native-grid to layoutContainer and native-rating to rectangle

### Test Case 2: Percentage Widths
```json
{
  "layoutContainer": {"layoutMode": "VERTICAL"},
  "items": [
    {"type": "native-rectangle", "properties": {"width": "100%", "height": 200}},
    {"type": "native-rectangle", "properties": {"width": "50%", "height": 100}}
  ]
}
```
**Expected**: 100% converts to horizontalSizing: "FILL", 50% converts to 187.5px

### Test Case 3: Component ID Normalization
```json
{
  "layoutContainer": {"layoutMode": "VERTICAL"},
  "items": [
    {"type": "component", "id": "10:3907", "variants": {"Size": "Medium"}},
    {"type": "component", "componentId": "10:3907", "variants": {"Size": "Large"}}
  ]
}
```
**Expected**: Both should work with componentNodeId normalized

### Test Case 4: Property Name Fixes
```json
{
  "layoutContainer": {"layoutMode": "VERTICAL"},
  "items": [
    {
      "type": "component",
      "componentNodeId": "10:3907",
      "properties": {
        "text": "Click me",
        "label": "Button"
      }
    }
  ]
}
```
**Expected**: Properties should normalize to correct schema names

### Test Case 5: Missing Component
```json
{
  "layoutContainer": {"layoutMode": "VERTICAL"},
  "items": [
    {"type": "component", "componentNodeId": "99:9999", "variants": {}}
  ]
}
```
**Expected**: Should create visual placeholder showing "Component 99:9999 not found"

## Integration Steps

1. **Backup current files**: `figma-renderer.ts`, `code.ts`, `ui.html`
2. **Implement Step 1**: Add all helper methods to FigmaRenderer class
3. **Implement Step 2**: Update the main rendering loop
4. **Implement Step 3**: Add validation to plugin entry point
5. **Test**: Run all test cases above
6. **Optional**: Implement Step 4 for UI feedback
7. **Build**: Run `npm run build`
8. **Test in Figma**: Load plugin and test with problematic JSONs

## Success Criteria

- ✅ Renderer no longer crashes on invalid native types
- ✅ Percentage widths are converted automatically
- ✅ Component IDs work regardless of property name used
- ✅ Missing components show visual placeholders
- ✅ Individual item failures don't break entire render
- ✅ Clear console warnings guide debugging
- ✅ Validation provides actionable feedback before rendering