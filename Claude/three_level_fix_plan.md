# Three-Level Fix Implementation Plan - Native Text Wrapping

**Target**: Fix inconsistent native text wrapping behavior in UXPal pipeline  
**Scope**: Comprehensive solution across JSON generation and Figma rendering  
**Timeline**: 3-4 hours implementation + testing  

---

## 🌿 **Step 1: Create New Branch**

```bash
# Navigate to UXPal project root
cd /Users/stipa/UXPal

# Create and switch to new feature branch
git checkout -b fix/native-text-wrapping

# Verify branch creation
git branch --show-current
```

**Expected Output**: `fix/native-text-wrapping`

---

## 🔧 **Level 1: Fix Width Constraint Detection (Critical Priority)**

### **Step 1.1: Backup Original File**

```bash
# Create backup of current figma-renderer.ts
cp src/core/figma-renderer.ts src/core/figma-renderer.ts.backup

# Verify backup exists
ls -la src/core/figma-renderer.ts*
```

### **Step 1.2: Update detectWidthConstraint Method**

**File**: `src/core/figma-renderer.ts`  
**Location**: Find the existing `detectWidthConstraint` method (around line 850-900)  
**Action**: Replace the entire method with this improved version:

```typescript
/**
 * Detects if a container has width constraints that should constrain text
 * NEW LOGIC: Uses effective width calculation from parent chain
 */
private static detectWidthConstraint(container: FrameNode): boolean {
  console.log('🔍 NEW: Detecting width constraint for container:', {
    type: container.type,
    layoutMode: container.layoutMode,
    width: container.width,
    name: container.name
  });
  
  // Calculate effective width from parent chain
  const effectiveWidth = this.calculateEffectiveWidth(container);
  
  if (effectiveWidth && effectiveWidth <= 450) { // Mobile + tablet constraint
    console.log('✅ Width constraint detected: Effective width =', effectiveWidth);
    return true;
  }
  
  console.log('❌ No width constraint: Effective width =', effectiveWidth || 'null');
  return false;
}
```

### **Step 1.3: Add New calculateEffectiveWidth Method**

**File**: `src/core/figma-renderer.ts`  
**Location**: Add this method immediately after the `detectWidthConstraint` method  
**Action**: Insert this completely new method:

```typescript
/**
 * Calculate effective width constraint from parent chain
 * Walks up the layout hierarchy to find actual width limits
 */
private static calculateEffectiveWidth(container: FrameNode): number | null {
  console.log('🧮 Calculating effective width for:', container.name);
  
  let current: FrameNode | null = container;
  let level = 0;
  
  while (current && level < 10) { // Prevent infinite loops
    console.log(`  Level ${level}: ${current.name} (${current.layoutMode})`);
    
    // Case 1: Root container with explicit fixed width
    if (current.primaryAxisSizingMode === 'FIXED' && 
        current.counterAxisSizingMode === 'FIXED' && 
        current.width > 0) {
      const rootWidth = current.width;
      console.log(`  ✅ Found root width: ${rootWidth}px`);
      return rootWidth;
    }
    
    // Case 2: VERTICAL layout parent constrains child width
    if (current.layoutMode === 'VERTICAL' && current.width > 0) {
      const constrainedWidth = current.width - 
        (current.paddingLeft || 0) - 
        (current.paddingRight || 0);
      console.log(`  ✅ Found VERTICAL constraint: ${constrainedWidth}px`);
      return Math.max(constrainedWidth, 100); // Minimum 100px
    }
    
    // Move up the parent chain
    const parent = current.parent;
    if (parent && parent.type === 'FRAME') {
      current = parent as FrameNode;
      level++;
    } else {
      break;
    }
  }
  
  console.log('  ❌ No effective width found in parent chain');
  return null;
}
```

### **Step 1.4: Update createTextNode Method**

**File**: `src/core/figma-renderer.ts`  
**Location**: Find the `createTextNode` method (around line 920-970)  
**Action**: Replace the text sizing logic section with this enhanced version:

Find this existing block:
```typescript
// Smart text auto-resize behavior based on container context
const isInConstrainedContainer = this.detectWidthConstraint(container);

if (isInConstrainedContainer) {
  textNode.textAutoResize = 'HEIGHT';  // Width constrained, height flexible
  
  // CRITICAL: Set explicit width to constrain the text
  const availableWidth = container.width - (container.paddingLeft || 0) - (container.paddingRight || 0);
  textNode.resize(availableWidth, textNode.height);
  
  console.log('✅ Set textAutoResize to HEIGHT and width to', availableWidth, '(width constrained by parent)');
} else {
  textNode.textAutoResize = 'WIDTH_AND_HEIGHT';  // Free expansion
  console.log('✅ Set textAutoResize to WIDTH_AND_HEIGHT (no width constraint)');
}
```

Replace with:
```typescript
// NEW: Enhanced text auto-resize with accurate width calculation
const isInConstrainedContainer = this.detectWidthConstraint(container);

if (isInConstrainedContainer) {
  textNode.textAutoResize = 'HEIGHT';  // Width constrained, height flexible
  
  // NEW: Use effective width calculation instead of direct container width
  const effectiveWidth = this.calculateEffectiveWidth(container);
  const availableWidth = effectiveWidth ? 
    Math.max(effectiveWidth - ((container.paddingLeft || 0) + (container.paddingRight || 0)), 100) :
    container.width - ((container.paddingLeft || 0) + (container.paddingRight || 0));
  
  textNode.resize(availableWidth, textNode.height);
  
  console.log('✅ NEW: Set textAutoResize to HEIGHT and width to', availableWidth, 
             '(effective width:', effectiveWidth, ')');
} else {
  textNode.textAutoResize = 'WIDTH_AND_HEIGHT';  // Free expansion
  console.log('✅ Set textAutoResize to WIDTH_AND_HEIGHT (no effective width constraint)');
}
```

### **Step 1.5: Test Level 1 Changes**

```bash
# Compile TypeScript to check for syntax errors
cd /Users/stipa/UXPal
npx tsc --noEmit src/core/figma-renderer.ts

# If no errors, proceed to test
echo "Level 1 implementation complete - ready for testing"
```

---

## 🔧 **Level 2: Fix JSON Engineer Width Propagation**

### **Step 2.1: Backup JSON Engineer Prompt**

```bash
# Create backup of current JSON Engineer prompt
cp "src/prompts/roles/5 json-engineer.txt" "src/prompts/roles/5 json-engineer.txt.backup"

# Verify backup exists
ls -la "src/prompts/roles/5 json-engineer.txt"*
```

### **Step 2.2: Update Algorithm 1 in JSON Engineer Prompt**

**File**: `src/prompts/roles/5 json-engineer.txt`  
**Location**: Find "Algorithm 1: Container Sizing Auto-Complete" section (around line 80-120)  
**Action**: Replace the existing algorithm with this enhanced version:

Find this existing block:
```python
def fix_container_sizing_recursive(container, depth=0):
    if depth == 0:  # Root container only
        # Root uses FIXED sizing system
        container["primaryAxisSizingMode"] = "FIXED"
        container["counterAxisSizingMode"] = "FIXED"
        container["width"] = 375
        container["minHeight"] = 812
        # Remove FILL properties from root
        remove_properties(container, ["horizontalSizing", "layoutAlign"])
    else:  # ALL nested containers at ANY depth (1, 2, 3, etc.)
        # Every nested container uses FILL system
        container["horizontalSizing"] = "FILL"
        container["layoutAlign"] = "STRETCH"
        # CRITICAL: Remove sizing mode properties to prevent width bugs!
```

Replace with:
```python
def fix_container_sizing_recursive(container, parentWidth=375, depth=0):
    if depth == 0:  # Root container only
        # Root uses FIXED sizing system
        container["primaryAxisSizingMode"] = "FIXED"
        container["counterAxisSizingMode"] = "FIXED"
        container["width"] = 375
        container["minHeight"] = 812
        # Remove FILL properties from root
        remove_properties(container, ["horizontalSizing", "layoutAlign"])
        # NEW: Initialize width tracking
        currentWidth = 375
    else:  # ALL nested containers at ANY depth (1, 2, 3, etc.)
        # Every nested container uses FILL system
        container["horizontalSizing"] = "FILL"
        container["layoutAlign"] = "STRETCH"
        # CRITICAL: Remove sizing mode properties to prevent width bugs!
        remove_properties(container, ["primaryAxisSizingMode", "counterAxisSizingMode", "width"])
        
        # NEW: Add computed width metadata for text constraint calculation
        if container["layoutMode"] == "VERTICAL":
            container["_effectiveWidth"] = parentWidth  # Metadata for renderer
        
        # Calculate available width for children (account for padding)
        paddingLeft = container.get("paddingLeft", 0)
        paddingRight = container.get("paddingRight", 0) 
        currentWidth = max(parentWidth - paddingLeft - paddingRight, 100)  # Minimum 100px
        
        # NEW: Log width propagation for debugging
        print(f"Level {depth}: {container.get('name', 'unnamed')} - parentWidth: {parentWidth}, effectiveWidth: {currentWidth}")
    
    # NEW: Recursively process children with width information
    for item in container.get("items", []):
        if item.get("type") == "layoutContainer":
            fix_container_sizing_recursive(item, currentWidth, depth + 1)
        elif item.get("type") == "native-text":
            # NEW: Add width metadata to text elements
            if currentWidth <= 450:  # Mobile/tablet constraint
                item.setdefault("_constraintWidth", currentWidth)
```

### **Step 2.3: Add Width Metadata Processing**

**File**: `src/prompts/roles/5 json-engineer.txt`  
**Location**: Find the "Native Element Technical Requirements" section (around line 200-220)  
**Action**: Add this new requirement block after the existing native-text properties:

```json
// For native-text (ENHANCED):
"content": "string",
"textStyle": "string", 
"fontSize": number,
"fontWeight": "string",
"color": "string",
"alignment": "string",

// NEW: Width constraint metadata (automatically added)
"_constraintWidth": number,     // Calculated effective width from parent chain
"_parentLayout": "VERTICAL|HORIZONTAL"  // Parent layout mode for context
```

### **Step 2.4: Update Validation Checklist**

**File**: `src/prompts/roles/5 json-engineer.txt`  
**Location**: Find "Pre-Output Validation Checklist" section (around line 400-420)  
**Action**: Add this new validation step at the end of the existing checklist:

```python
6. **Width Metadata Validation**
   ```python
   def validate_width_metadata(container, parentWidth=375):
       for item in container.get("items", []):
           if item["type"] == "native-text":
               if parentWidth <= 450:  # Should have constraint
                   assert "_constraintWidth" in item, f"Missing _constraintWidth for text: {item['properties']['content'][:20]}"
           elif item["type"] == "layoutContainer":
               validate_width_metadata(item, item.get("_effectiveWidth", parentWidth))
   
   validate_width_metadata(root_container)
   ```
```

---

## 🔧 **Level 3: Enhanced Text Sizing Logic**

### **Step 3.1: Update Figma Renderer Text Creation**

**File**: `src/core/figma-renderer.ts`  
**Location**: In the `createTextNode` method, after setting text style but before the sizing logic  
**Action**: Add width metadata processing:

Find this line:
```typescript
// Extract text properties from the properties object
const props = textData.properties || textData;
```

Add immediately after:
```typescript
// NEW: Extract width constraint metadata from JSON Engineer
const constraintWidth = (textData as any)._constraintWidth || null;
const parentLayout = (textData as any)._parentLayout || null;

console.log('📐 Text metadata:', {
  constraintWidth,
  parentLayout,
  content: props.content?.substring(0, 30) + '...'
});
```

### **Step 3.2: Enhance Text Sizing Decision Logic**

**File**: `src/core/figma-renderer.ts`  
**Location**: Replace the enhanced sizing logic from Level 1 with this final version  
**Action**: Replace the text sizing block with:

```typescript
// FINAL: Enhanced text auto-resize with metadata + effective width calculation
const isInConstrainedContainer = this.detectWidthConstraint(container);

if (isInConstrainedContainer) {
  textNode.textAutoResize = 'HEIGHT';  // Width constrained, height flexible
  
  // Priority 1: Use metadata from JSON Engineer
  // Priority 2: Calculate effective width 
  // Priority 3: Fallback to container width
  let targetWidth = constraintWidth;
  
  if (!targetWidth) {
    const effectiveWidth = this.calculateEffectiveWidth(container);
    targetWidth = effectiveWidth;
  }
  
  if (!targetWidth) {
    targetWidth = container.width;
  }
  
  // Account for container padding
  const availableWidth = Math.max(
    targetWidth - ((container.paddingLeft || 0) + (container.paddingRight || 0)), 
    100  // Minimum 100px
  );
  
  textNode.resize(availableWidth, textNode.height);
  
  console.log('✅ FINAL: Applied width constraint', {
    source: constraintWidth ? 'metadata' : 'calculated',
    targetWidth,
    availableWidth,
    containerPadding: (container.paddingLeft || 0) + (container.paddingRight || 0)
  });
} else {
  textNode.textAutoResize = 'WIDTH_AND_HEIGHT';  // Free expansion
  console.log('✅ FINAL: Applied free expansion (no width constraint detected)');
}
```

---

## 🧪 **Testing & Validation**

### **Step 4.1: Create Test Case**

```bash
# Create test directory
mkdir -p test/native-text-wrapping

# Create test script
cat > test/native-text-wrapping/test-wrapping.md << 'EOF'
# Native Text Wrapping Test Cases

## Test Case 1: Long Text in Horizontal Container
**Input**: "Excellent (minor scratches on the bottom casing)"
**Container**: layoutMode: "HORIZONTAL" 
**Expected**: Text wraps within 375px viewport
**Actual**: [TO BE FILLED]

## Test Case 2: Short Text in Vertical Container  
**Input**: "2.7 GHz Intel Core i5"
**Container**: layoutMode: "VERTICAL"
**Expected**: Text hugs content, no premature breaking
**Actual**: [TO BE FILLED]

## Test Case 3: Deep Nesting (3+ levels)
**Input**: Specifications list in nested containers
**Expected**: Consistent wrapping behavior regardless of depth
**Actual**: [TO BE FILLED]
EOF
```

### **Step 4.2: Test with Sample JSON**

```bash
# Run existing pipeline with test data
python3 instance.py alt3

# Note the timestamp for testing
echo "Test with latest generated JSON in figma-ready/ folder"
echo "Check text wrapping behavior in Figma plugin"
```

### **Step 4.3: Validate Console Logs**

**Expected Console Output Patterns:**
```
🔍 NEW: Detecting width constraint for container: {type: "FRAME", layoutMode: "HORIZONTAL"}
🧮 Calculating effective width for: [container-name]
  Level 0: Root Container (VERTICAL)
  ✅ Found root width: 375px
✅ Width constraint detected: Effective width = 375
📐 Text metadata: {constraintWidth: 375, parentLayout: "VERTICAL"}
✅ FINAL: Applied width constraint {source: "metadata", targetWidth: 375, availableWidth: 343}
```

---

## 📋 **Validation Checklist**

### **Code Changes Verification**

- [x] `figma-renderer.ts` has new `calculateEffectiveWidth` method ✅ **LEVEL 1 COMPLETE**
- [x] `detectWidthConstraint` method updated with new logic ✅ **LEVEL 1 COMPLETE**
- [x] `createTextNode` method uses enhanced sizing logic ✅ **LEVEL 1 COMPLETE**
- [ ] `5 json-engineer.txt` has updated Algorithm 1 with width propagation
- [ ] Width metadata validation added to JSON Engineer prompt
- [x] All TypeScript compiles without errors ✅ **LEVEL 1 COMPLETE**

### **Functional Testing**

- [x] Long text in horizontal containers stays within 375px viewport ✅ **LEVEL 1 TESTED**
- [ ] Short text in vertical containers doesn't break unnecessarily  
- [ ] Deep nesting (3+ levels) shows consistent behavior
- [x] Console logs show effective width calculation working ✅ **LEVEL 1 TESTED**
- [ ] JSON Engineer adds `_constraintWidth` metadata to text elements

### **Regression Testing**

- [ ] Existing good layouts still render correctly
- [ ] Component text (non-native) behavior unchanged
- [ ] Root container sizing remains 375px x 812px
- [ ] Auto-layout spacing and padding preserved

---

## 🚀 **Deployment**

### **Step 5.1: Commit Changes**

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "fix: Implement three-level native text wrapping solution

- Level 1: Enhanced width constraint detection with effective width calculation
- Level 2: JSON Engineer width metadata propagation  
- Level 3: Priority-based text sizing (metadata > calculated > fallback)

Fixes inconsistent text overflow and premature word breaking in nested containers.
Resolves text extending beyond 375px mobile viewport.
Maintains existing layout structure and auto-layout behavior."

# Push to remote
git push origin fix/native-text-wrapping
```

### **Step 5.2: Create Pull Request**

```bash
# Open GitHub PR (if using GitHub CLI)
gh pr create --title "Fix Native Text Wrapping in Nested Containers" \
  --body "Comprehensive three-level fix for inconsistent text wrapping behavior. 
  
  **Problem**: Text either overflows viewport or breaks prematurely in nested containers
  **Solution**: Enhanced width detection + metadata propagation + priority-based sizing
  **Testing**: Verified with existing JSON samples and new test cases"
```

### **Step 5.3: Documentation Update**

```bash
# Update architecture documentation
echo "## Native Text Wrapping Fix (2025-08-15)

Enhanced text sizing with effective width calculation:
- Level 1: Improved detectWidthConstraint() with parent chain analysis
- Level 2: JSON Engineer width metadata propagation via _constraintWidth
- Level 3: Priority-based text sizing (metadata > calculated > fallback)

Fixes text overflow beyond 375px viewport and premature word breaking." >> UXPal\ Pipeline\ Architecture\ Documentation.md
```

---

## ⏰ **Estimated Timeline**

- **Level 1 Implementation**: 45 minutes
- **Level 2 Implementation**: 30 minutes  
- **Level 3 Implementation**: 25 minutes
- **Testing & Validation**: 60 minutes
- **Documentation & Deployment**: 20 minutes

**Total**: ~3 hours for complete implementation and testing

---

## 🎯 **Success Criteria**

✅ **Text Overflow Eliminated**: No text extends beyond 375px mobile viewport  
✅ **Consistent Wrapping**: Same behavior across all nesting levels  
✅ **Smart Constraints**: Text uses available space efficiently without premature breaking  
✅ **Preserved Layouts**: Existing auto-layout structure maintained  
✅ **Debug Visibility**: Console logs show width calculation process

This comprehensive fix addresses the root cause while maintaining backward compatibility and provides foundation for future viewport size variations.