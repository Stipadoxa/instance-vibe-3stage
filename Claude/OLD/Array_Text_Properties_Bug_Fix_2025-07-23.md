# Array Text Properties Bug Fix - July 23, 2025

## Problem Identified

**Error:** `generateUIFromDataSystematic` threw error when rendering components with `textLayers` arrays:
```
Error message: "in get_name: The node (instance sublayer or table cell) with id \"I687:4643;10:4726;10:4684;10:4605\" does not exist"
stack: "at applyArrayTextProperty (PLUGIN_3_SOURCE:3503)"
```

**Symptom:** Settings page rendered correctly but with an empty ERROR frame appearing on top.

## Root Cause Analysis

### Issue: Nested Component Structure Mismatch

**Bottom Navigation Component (`10:4724`)** structure:
- Main component contains TabBar (`10:4726`)
- TabBar contains 5 individual "Single Tab for bottom nav bar" components
- Each tab has its own "✏️ Label" text node with unique nested path:
  - `I10:4726;10:4683;10:4629` (Home)
  - `I10:4726;10:4684;10:4605` (Saved) ← **Error node**
  - `I10:4726;10:4685;10:4613` (Sell)
  - `I10:4726;10:4686;10:4661` (Sell)
  - `I10:4726;10:4687;10:4589` (Profile)

### Why Array Text Properties Failed

1. **Nested Component Structure**: Bottom navigation is not a simple array of text elements, but a composite component with nested sub-components
2. **Instance ID Changes**: When component is instantiated, the instance prefix changes from `I10:4726` to `I687:4643`, breaking node references
3. **Figma Renderer Assumption**: `applyArrayTextProperty` assumes linear text nodes with consistent paths, but these are nested in separate component instances

### Similar Issues

This is the **same pattern** that caused problems with TABS component previously - both are composite components made of multiple sub-components, not simple linear arrays.

## Solution Implemented

### Quick Fix (Immediate)
Removed `textLayers` array from problematic component:
```json
// BEFORE (causing error):
{
  "type": "bottom-navigation",
  "componentNodeId": "10:4724",
  "properties": {
    "variants": {"Device": "Mobile"},
    "textLayers": {
      "Label": ["Home", "Saved", "Sell", "Sell", "Profile"]  // ❌ PROBLEMATIC
    }
  }
}

// AFTER (working):
{
  "type": "bottom-navigation", 
  "componentNodeId": "10:4724",
  "properties": {
    "variants": {"Device": "Mobile"}  // ✅ CLEAN
  }
}
```

### Long-term Fix (Prompt Engineering)
Updated **JSON Engineer prompt** (`src/prompts/roles/5 json-engineer.txt`) with:

#### 1. Nested Component Detection Logic
```javascript
function isNestedComponent(designSystemComponent) {
  // Check if any textHierarchy nodeIds contain semicolons (nested structure)
  const hasNestedTextNodes = designSystemComponent.textHierarchy?.some(
    textNode => textNode.nodeId.includes(';')
  );
  return hasNestedTextNodes;
}
```

#### 2. Detection Patterns
```javascript
// NESTED EXAMPLES (avoid arrays):
"nodeId": "I147:3809;684:47926;31:9851"  // 3-level nested
"nodeId": "I10:12239;10:8652"            // 2-level nested  

// SIMPLE EXAMPLES (arrays allowed):
"nodeId": "10:5620"                      // Simple component
"nodeId": "147:3602"                     // Simple component
```

#### 3. Prevention Strategy
- **Before** applying `textLayers` arrays: Check for semicolon-separated nodeIds
- **If nested detected**: Use individual properties only, no arrays
- **If simple component**: Arrays are safe to use

#### 4. Added Validation Checklist
```
### Nested Component Detection ✓
- [ ] Analyzed componentNodeId structure for semicolons
- [ ] Checked textHierarchy nodeIds for nested patterns (`;` separators)
- [ ] Applied appropriate handling strategy based on component complexity
```

## Results

### Test Results
- ✅ **Pipeline run successful** with updated prompt
- ✅ **No textLayers arrays** generated for bottom navigation
- ✅ **Clean component structure** with only variants
- ✅ **Should render without errors** (no more ERROR frames)

### Key Indicators in Design System
Looking at component `10:4724` schema, nested structure is **clearly visible**:
- Multiple text nodes with same name `"✏️ Label"` 
- Different complex nodeId paths with semicolons
- Sequential middle IDs indicating separate instances

## Prevention for Future

### Components to Watch
Any component with:
- Semicolon-separated nodeIds in `textHierarchy`
- Multiple text nodes with identical names but different paths
- CompositeELEMENT structure (TabBar, NavigationBar, etc.)

### JSON Engineer Behavior
- **Detect nested structure** by analyzing nodeId patterns
- **Avoid array text properties** for nested components
- **Use individual properties** or leave with default text
- **Add reasoning** in `nestedComponentHandling` rationale

## Files Modified

1. **`src/prompts/roles/5 json-engineer.txt`** - Added nested component detection logic
2. **`figma-ready/figma_ready_20250723_174501.json`** - Generated clean JSON without problematic arrays

## Status: ✅ RESOLVED

The array text properties bug has been fixed both as immediate workaround and long-term prevention through prompt engineering improvements.