# Design Tokens (Variables) Implementation Handoff

**Date**: 2025-08-17  
**Author**: Claude  
**Status**: Ready for Implementation  
**Priority**: HIGH (completes Design System integration)

## 🎯 Goal
Complete Design System integration by adding Variable (Design Token) name resolution to Component Scanner, enabling semantic token usage in JSON Engineer.

## 📊 Current State Analysis

### ✅ What Already Works
- **boundVariables extraction**: Component Scanner captures Variable IDs from Paint objects
- **Variables API scanning**: Variables are collected and saved to design-system JSON
- **Data structure**: boundVariables appear in component JSON with correct IDs

### ❌ Missing Functionality
- **Variable name lookup**: No mapping from VariableID → Token Name
- **Semantic resolution**: JSON Engineer gets raw IDs, not semantic names
- **Token categorization**: No classification by type (color, spacing, etc.)

### 📈 Current JSON Output
```json
// Component has boundVariables with raw IDs:
"boundVariables": {
  "color": {
    "type": "VARIABLE_ALIAS",
    "id": "VariableID:f4bb3c0ca3ce362f236db721d52bef5a1933b145/2475:19"
  }
}

// But design-system JSON has the Variable details:
"variables": [
  {
    "id": "VariableID:f4bb3c0ca3ce362f236db721d52bef5a1933b145/2475:19",
    "name": "Primary/Blue/500", 
    "resolvedType": "COLOR"
  }
]
```

## 🏗️ Implementation Architecture

### Pattern to Follow: textStyleMap Success
The **exact same pattern** used for textStyleName resolution should be applied to Variables:

```typescript
// Current textStyle pattern (WORKING):
private static textStyleMap: Map<string, string> = new Map();  // ID → Name
private static textStyleDetails: Map<string, TextStyleDetails> = new Map();  // ID → Details

// NEW: Variable pattern (TO IMPLEMENT):
private static variableMap: Map<string, string> = new Map();  // ID → Name  
private static variableDetails: Map<string, VariableDetails> = new Map();  // ID → Details
```

### 1. Data Structures Needed

```typescript
// Add to session-manager.ts
export interface VariableDetails {
  id: string;
  name: string;
  resolvedType: 'BOOLEAN' | 'COLOR' | 'FLOAT' | 'STRING';
  scopes: string[];
  collection?: string;
}

export interface ColorInfo {
  // ... existing fields
  
  // NEW: Design Token fields
  designToken?: string;           // Variable name (e.g., "Primary/Blue/500")
  usesDesignToken?: boolean;      // Flag indicating Design Token usage
}
```

### 2. Core Implementation Steps

#### Step 2.1: Build Variable Maps (in ComponentScanner)
```typescript
// Add to ComponentScanner class (similar to buildTextStyleMap)
private static buildVariableMap(variables: any[]): void {
  if (variables && variables.length > 0) {
    this.variableMap.clear();
    this.variableDetails.clear();
    
    variables.forEach(variable => {
      this.variableMap.set(variable.id, variable.name);
      
      this.variableDetails.set(variable.id, {
        id: variable.id,
        name: variable.name,
        resolvedType: variable.resolvedType,
        scopes: variable.scopes || [],
        collection: variable.collection?.name
      });
    });
    
    console.log(`✅ Built variable lookup map with ${this.variableMap.size} entries`);
  }
}
```

#### Step 2.2: Integrate into scanDesignSystemComponents
```typescript
// In scanDesignSystemComponents method, after textStyles:
// NEW: Build variable lookup map for fast ID->name resolution
if (variables && variables.length > 0) {
  this.buildVariableMap(variables);
} else {
  console.warn('⚠️ No variables available for lookup map');
  this.variableMap.clear();
  this.variableDetails.clear();
}
```

#### Step 2.3: Enhance convertPaintToColorInfo
```typescript
// Modify convertPaintToColorInfo to resolve variable names
static convertPaintToColorInfo(paint: Paint, styleId?: string): ColorInfo | null {
  if (paint.type === 'SOLID' && paint.color) {
    let designToken: string | undefined;
    let usesDesignToken = false;
    
    // NEW: Check for boundVariables and resolve to token name
    if (paint.boundVariables?.color?.id) {
      const variableId = paint.boundVariables.color.id;
      designToken = this.variableMap.get(variableId);
      usesDesignToken = !!designToken;
      
      if (designToken) {
        console.log(`🎨 Resolved variable: ${variableId} → "${designToken}"`);
      } else {
        console.warn(`⚠️ Variable ID not found in map: ${variableId}`);
      }
    }
    
    return {
      type: 'SOLID',
      color: this.rgbToHex(paint.color),
      opacity: paint.opacity || 1,
      paintStyleId: styleId,
      boundVariables: paint.boundVariables,
      usesDesignSystemColor: !!styleId || usesDesignToken,
      
      // NEW: Design Token fields
      designToken: designToken,
      usesDesignToken: usesDesignToken
    };
  }
  return null;
}
```

### 3. JSON Engineer Integration

#### Update JSON Engineer Prompt
Add section for Design Token usage:

```markdown
## Design Token Intelligence

When processing ColorInfo with designToken:

### Priority Order:
1. **designToken** (if present) - Use semantic token name
2. **paintStyleId** - Use Design System color style  
3. **color** - Use raw hex value as fallback

### Example Processing:
```json
// Input ColorInfo:
{
  "color": "#3B82F6",
  "designToken": "Primary/Blue/500", 
  "usesDesignToken": true
}

// Output Properties:
{
  "color": "Primary/Blue/500"  // Use token name, not hex
}
```

### Token Name Validation:
- Check if token exists in DESIGN_SYSTEM_DATA variables
- Fallback to paintStyleId if token invalid
- Ultimate fallback to hex color
```

## 🧪 Testing Strategy

### Test Case 1: Color Variable Resolution
**Setup**: Component with boundVariables color reference
**Expected**: designToken field populated with variable name
**Validation**: Check console logs for variable resolution

### Test Case 2: JSON Engineer Token Usage  
**Setup**: ColorInfo with designToken present
**Expected**: JSON Engineer uses token name instead of hex
**Validation**: Output JSON contains semantic token name

### Test Case 3: Fallback Behavior
**Setup**: boundVariables with invalid/missing Variable ID
**Expected**: Graceful fallback to hex color, no crashes
**Validation**: Error handling logs, valid JSON output

## ⚠️ Critical Implementation Notes

### 1. Order of Operations
```typescript
// CRITICAL: Build variable map BEFORE scanning components
// In scanDesignSystemComponents:

// 1. First: Build lookup maps
this.buildTextStyleMap(textStyles);
this.buildVariableMap(variables);     // NEW - add this

// 2. Then: Scan components (they need the maps)
const components = await this.scanSpecificComponents(componentIds);
```

### 2. Error Handling Patterns
```typescript
// Follow existing textStyle error handling pattern:
if (variableId && !designToken) {
  // Log warning but don't crash
  console.warn(`⚠️ Variable ID not found: ${variableId}`);
  // Continue with hex color fallback
}
```

### 3. Performance Considerations
- **Cache maps**: Use static Map objects like textStyleMap
- **Single lookup**: O(1) Variable ID → Name resolution
- **Lazy loading**: Only resolve variables when boundVariables present

### 4. Debugging Support
```typescript
// Add debug logging similar to textStyle debugging:
console.log('🔍 DEBUG variableMap keys:', Array.from(this.variableMap.keys()).slice(0, 3));
console.log('🔍 DEBUG boundVariables:', paint.boundVariables);
console.log('🔍 DEBUG resolved designToken:', designToken);
```

## 📋 Implementation Checklist

### Phase 1: Core Variable Resolution
- [ ] Add VariableDetails interface to session-manager.ts
- [ ] Add designToken/usesDesignToken fields to ColorInfo
- [ ] Implement buildVariableMap() method
- [ ] Add variableMap building to scanDesignSystemComponents
- [ ] Enhance convertPaintToColorInfo with variable resolution

### Phase 2: JSON Engineer Integration  
- [ ] Update JSON Engineer prompt with Design Token intelligence
- [ ] Add token name validation logic
- [ ] Implement fallback priority system
- [ ] Test end-to-end token flow

### Phase 3: Testing & Validation
- [ ] Test variable resolution with real components
- [ ] Verify JSON Engineer token usage
- [ ] Check error handling and fallbacks
- [ ] Performance testing with large token sets

## 🎯 Success Criteria

### Technical Success:
1. **Variable Resolution**: 100% of boundVariables resolve to token names
2. **JSON Integration**: JSON Engineer uses token names when available
3. **Fallback Behavior**: Graceful degradation when tokens unavailable
4. **Performance**: <2ms additional processing per variable

### Business Success:
1. **Design Consistency**: Semantic token usage in generated UI
2. **Maintainability**: Token changes propagate automatically
3. **Professional Output**: Token-based JSON instead of raw hex values

## 🔄 Files to Modify

1. **`src/core/session-manager.ts`**: Add VariableDetails interface, enhance ColorInfo
2. **`src/core/component-scanner.ts`**: Add variable maps, enhance convertPaintToColorInfo
3. **`src/prompts/roles/5 json-engineer.txt`**: Add Design Token intelligence section

## 📚 Reference Materials

### Working Examples to Study:
- **textStyleMap implementation**: Lines 810-825 in component-scanner.ts
- **textStyleName resolution**: Lines 1140-1160 in analyzeTextHierarchy
- **External style fallback**: Lines 1155-1170 (exact matching logic)

### Pattern Consistency:
```typescript
// Follow this exact pattern for variables:
// 1. Build map during initialization
// 2. Lookup during processing  
// 3. Fallback on failure
// 4. Log debug information
// 5. Graceful error handling
```

## 🚀 Expected Timeline

- **Phase 1**: 4-6 hours (core implementation)
- **Phase 2**: 2-3 hours (JSON Engineer integration)  
- **Phase 3**: 2-3 hours (testing and validation)

**Total**: 1-2 days for complete Design Token integration

## 🎉 Impact After Implementation

### For Users:
- **Professional token-based JSON** instead of raw hex values
- **Design System consistency** across all generated UI
- **Automatic token propagation** when design system updates

### For Maintainability:
- **Complete Design System integration** (textStyles + colorStyles + designTokens)
- **Semantic color references** easier to understand and modify
- **Future-proof architecture** ready for advanced token features

---

**Ready for implementation! This completes the Design System integration trilogy: textStyles ✅ + colorStyles ✅ + designTokens 🚧**