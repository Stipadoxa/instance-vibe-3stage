# Component Visibility & Context Adaptation Implementation Plan

## 🌟 Branch Creation

**Branch Name**: `component-visibility-adaptation`

**Creation Command**:
```bash
git checkout main
git pull origin main
git checkout -b component-visibility-adaptation
```

**Branch Purpose**: Implement intelligent component visibility decisions and contextual icon swapping based on page context analysis.

---

## 📝 Core Implementation Strategy

### **Implementation Philosophy**
- **Simple & Focused**: Single enhancement to existing pipeline
- **LLM-Friendly**: Clear instructions with examples and validation
- **Non-Breaking**: Backward compatible with existing JSON structure
- **Testable**: Simple validation checks and test cases

---

## 🎯 Section 1: UX/UI Designer Prompt Enhancement

**File**: `src/prompts/roles/alt2-ux-ui-designer.txt`

### **Location**: Add after the existing "DESIGN SYSTEM COMPLIANCE" section, before "OUTPUT FORMAT"

### **New Section to Add**:

```
## COMPONENT VISIBILITY & CONTEXTUAL ADAPTATION

### VISIBILITY DECISION FRAMEWORK
When working with multi-element components (appbar, navigation, etc.), make intelligent visibility decisions:

**Analysis Questions:**
1. What is the primary page purpose and user goal?
2. Which interactive elements serve this specific context?
3. Should any default elements be hidden or swapped for relevance?

**Common Page Contexts & Patterns:**
- **Product/Item Detail**: Show bookmark/save actions, hide search
- **Search Results**: Keep search functionality, hide profile/settings
- **Profile/Settings**: Show profile-related actions, hide commercial actions
- **Onboarding/Tutorial**: Minimal distractions, focus on primary flow
- **Dashboard/Home**: Show navigation and key actions

### COMPONENT ADAPTATION RULES

**For appbar components:**
- Always question if trailing icons serve the page purpose
- Hide icons that don't match user intent on this screen
- Swap generic icons for contextually appropriate ones
- Examples:
  - Product page: `trailingIcon1: visible=false, trailingIcon2: visible=true, icon=bookmark`
  - Settings page: `trailingIcon1: visible=true, icon=settings, trailingIcon2: visible=false`

**For navigation components:**
- Show tabs/items relevant to current context
- Hide secondary navigation when focus is needed
- Highlight current section appropriately

### DECISION DOCUMENTATION
For each visibility decision, briefly document your reasoning:
- Which elements you're hiding and why
- Which elements you're keeping and why
- Any icon swaps and their rationale

**Example Decision:**
"Hiding search icon on product detail page because user is already viewing specific item. Keeping bookmark icon for save functionality which is contextually relevant."
```

---

## 🔧 Section 2: JSON Engineer Schema Extension

**File**: `src/prompts/roles/5 json-engineer.txt`

### **Location**: Add after the existing JSON example, before "VALIDATION CHECKLIST"

### **New Section to Add**:

```
## COMPONENT VISIBILITY OVERRIDES

### VISIBILITY CONTROL SCHEMA
For components with child elements that may need contextual hiding:

```json
{
  "type": "appbar",
  "componentNodeId": "10:5620",
  "properties": {
    "headline": "Product Details"
  },
  "visibilityOverrides": {
    "10:5622": false,  // leading-icon hidden
    "10:5625": true    // avatar visible
  },
  "iconSwaps": {
    "10:5622": "bookmark"  // swap icon if visible
  }
}
```

### OVERRIDE APPLICATION RULES
- `visibilityOverrides`: Object with `nodeId: boolean` pairs
- Only specify overrides for elements that change from default visibility
- Use actual component child node IDs from design system data
- `iconSwaps`: Object with `nodeId: iconName` pairs for icon replacements

### SUPPORTED OVERRIDE PATTERNS
**Appbar trailing icons**: Hide/show based on page context
**Navigation tabs**: Hide unused sections, show relevant ones
**Action buttons**: Remove non-contextual actions

### FINDING NODE IDS
Use the componentInstances array in design system data:
```
"componentInstances": [
  {
    "nodeName": "leading-icon",
    "nodeId": "10:5622",  // Use this ID for overrides
    "visible": true,
    "componentId": "10:5354"
  }
]
```
```

---

## ⚙️ Section 3: Figma Renderer Enhancement

**File**: `src/core/figma-renderer.ts`

### **Location**: In the `applyVariantsSystematic` method, add after variant application

### **New Method to Add**:

```typescript
private applyVisibilityOverrides(instance: ComponentNode, itemData: any): void {
  if (!itemData.visibilityOverrides && !itemData.iconSwaps) return;
  
  try {
    // Apply visibility overrides
    if (itemData.visibilityOverrides) {
      Object.entries(itemData.visibilityOverrides).forEach(([nodeId, visible]) => {
        const child = instance.findChild(node => node.id === nodeId);
        if (child) {
          child.visible = visible as boolean;
          console.log(`Applied visibility override: ${nodeId} = ${visible}`);
        }
      });
    }

    // Apply icon swaps (simplified - extend based on icon system)
    if (itemData.iconSwaps) {
      Object.entries(itemData.iconSwaps).forEach(([nodeId, iconName]) => {
        const child = instance.findChild(node => node.id === nodeId);
        if (child && 'componentProperties' in child) {
          // Attempt to swap icon - implementation depends on icon component structure
          console.log(`Icon swap requested: ${nodeId} → ${iconName}`);
        }
      });
    }
  } catch (error) {
    console.warn('Visibility override application failed:', error);
  }
}
```

### **Integration Point**: Call in `createComponentInstanceSystematic` method after variant application:

```typescript
// After: await this.applyVariantsSystematic(instance, itemData);
this.applyVisibilityOverrides(instance, itemData);
```

---

## 🧪 Section 4: Simple Validation Enhancement

**File**: `src/core/validation-engine.ts`

### **Location**: Add new validation method

### **New Method to Add**:

```typescript
private validateVisibilityOverrides(itemData: any, componentSchema: any): boolean {
  if (!itemData.visibilityOverrides) return true;
  
  const childNodeIds = componentSchema.componentInstances?.map(ci => ci.nodeId) || [];
  
  for (const nodeId of Object.keys(itemData.visibilityOverrides)) {
    if (!childNodeIds.includes(nodeId)) {
      console.warn(`Visibility override references non-existent node: ${nodeId}`);
      return false;
    }
  }
  
  return true;
}
```

### **Integration**: Call from existing validation methods where component validation occurs

---

## 🧪 Section 5: Testing Framework

### **Test File 1**: `test-requests/visibility-test-cases.txt`

**Create new file with test cases**:

```
# Test Case 1: Product Detail Page
Create a product detail page for a smartphone. Include an appbar and basic product info.

# Test Case 2: Settings Screen  
Design a user settings page with an appbar and list of setting options.

# Test Case 3: Search Results
Create a search results page showing filtered products with an appbar.

# Expected Behavior:
- Product page: Hide search icon, show bookmark
- Settings page: Hide bookmark, show profile/settings
- Search page: Keep search icon, hide non-search actions
```

### **Test File 2**: `test-validation.py`

**Create new file for testing**:

```python
import json
import os

def test_visibility_overrides():
    """Test that visibility overrides are properly structured"""
    test_files = ["figma-ready/figma_ready_*.json"]
    
    for file_path in test_files:
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                data = json.load(f)
                
            # Check for visibility overrides structure
            for item in data.get('items', []):
                if 'visibilityOverrides' in item:
                    print(f"✅ Found visibility overrides in {item.get('type', 'unknown')}")
                    for node_id, visible in item['visibilityOverrides'].items():
                        print(f"   - {node_id}: {visible}")
                        
                if 'iconSwaps' in item:
                    print(f"✅ Found icon swaps in {item.get('type', 'unknown')}")

if __name__ == "__main__":
    test_visibility_overrides()
```

---

## 🚀 Implementation Sequence

### **Phase 1: Prompt Enhancement** (30 minutes)
1. Update `alt2-ux-ui-designer.txt` with visibility decision framework
2. Update `5 json-engineer.txt` with override schema
3. Test with simple product page request

### **Phase 2: Backend Implementation** (45 minutes)
1. Add `applyVisibilityOverrides` method to figma-renderer.ts
2. Integrate method into component creation pipeline
3. Add basic validation to validation-engine.ts

### **Phase 3: Testing & Validation** (30 minutes)
1. Create test cases for different page contexts
2. Run pipeline with test cases
3. Verify visibility decisions in generated JSON
4. Test rendering in Figma plugin

### **Phase 4: Documentation & Commit** (15 minutes)
1. Update project documentation
2. Commit changes with clear messages
3. Create PR for review

---

## 📋 Validation Checklist

**Prompt Validation**:
- [ ] UX/UI Designer includes visibility decision framework
- [ ] JSON Engineer includes override schema with examples
- [ ] Both prompts include clear node ID usage instructions

**Code Validation**:
- [ ] `applyVisibilityOverrides` method added to renderer
- [ ] Method integrated into component creation pipeline
- [ ] Validation checks added for override structure
- [ ] Error handling for missing node IDs

**Testing Validation**:
- [ ] Test cases cover common page contexts
- [ ] Generated JSON includes visibility overrides
- [ ] Figma rendering respects visibility settings
- [ ] Validation catches malformed overrides

**Integration Validation**:
- [ ] Backward compatibility maintained
- [ ] No breaking changes to existing JSON structure
- [ ] Pipeline still works without overrides
- [ ] Clear logging for debugging

---

## 🎯 Success Criteria

**Primary Goal**: LLM Designer makes contextual visibility decisions automatically
- Product pages hide search, show bookmark
- Settings pages hide commerce, show profile actions
- Search pages keep search functionality

**Secondary Goal**: System maintains design system compliance while adding contextual intelligence

**Tertiary Goal**: Simple testing and validation framework ensures quality

This implementation provides intelligent component adaptation while maintaining simplicity and avoiding over-engineering. The LLM client can execute this plan systematically with clear validation at each step.