# AI Prompt System Improvement Plan

## Overview
This plan adds strict constraints and validation rules to AI prompts to prevent common generation errors: invented components, variant mismatches, and invalid sizing.

## Implementation Instructions for Claude Code

### File 1: Update UX/UI Designer Prompt

**File**: `src/prompts/roles/alt2-ux-ui-designer.txt`

#### Addition 1: After "## Core Requirements" section
**Location**: After the existing "### 1. Design System Compliance" section  
**Action**: ADD the following new section:

```markdown
### 1.5 Strict Native Element Constraints
The renderer supports ONLY these native elements:
- `native-text` - Text elements with styling
- `native-rectangle` - Rectangular shapes with fills (including image fills)
- `native-circle` - Circular/elliptical shapes with fills (including image fills)

**FORBIDDEN Native Types** (will cause render failure):
❌ `native-grid` → Use `layoutContainer` with `layoutWrap: "WRAP"`
❌ `native-list-item` → Use component list items or `layoutContainer`
❌ `native-rating` → Use star icon components or create with shapes
❌ `native-image` → Use `native-rectangle` with `fill: {type: "IMAGE"}`
❌ `native-vertical-scroll` → Use `layoutContainer`
❌ `native-button` → Use component buttons only
❌ Any other `native-*` not listed above

**Common Pattern Replacements:**
- Grid layout: `{"type": "layoutContainer", "layoutMode": "HORIZONTAL", "layoutWrap": "WRAP"}`
- Rating stars: Multiple star icon components or native-circles
- Image placeholder: `{"type": "native-rectangle", "properties": {"fill": {"type": "IMAGE"}}}`
```

#### Addition 2: Update "### 5. Element Sizing Requirements" section
**Location**: REPLACE the entire "### 5. Element Sizing Requirements" section  
**Action**: REPLACE with:

```markdown
### 5. Element Sizing Requirements (Figma API Constraints)
**CRITICAL**: Figma does NOT support percentage widths. Never use "50%", "100%", etc.

**Sizing Rules:**
1. **Full-width elements**: Use `"horizontalSizing": "FILL"`
2. **Fixed width**: Use numeric values only (e.g., `"width": 200`)
3. **Auto-width**: Omit width property entirely
4. **Container sizing**: Use `counterAxisSizingMode` for auto-layout frames

**Correct Patterns:**
✅ `{"horizontalSizing": "FILL"}` - Element fills container width
✅ `{"width": 375}` - Fixed width in pixels
✅ `{"counterAxisSizingMode": "AUTO"}` - Container fits content
✅ `{"counterAxisSizingMode": "FIXED", "width": 300}` - Fixed container width

**Forbidden Patterns:**
❌ `{"width": "100%"}` - No percentage values
❌ `{"width": "50%"}` - Use fixed pixel values instead
❌ `{"size": "full"}` - Not a valid property
❌ String values for numeric properties
```

#### Addition 3: In "## Pre-Design Validation" section
**Location**: After "### Mandatory Component Inventory" subsection  
**Action**: ADD new validation step:

```markdown
### Component Property Validation
Before using any component, you MUST:
1. Check the exact property names in `textLayers` array
2. Note all required variants from `variants` array
3. Verify variant values exist in `variantDetails`
4. Never add properties not listed in the component schema

**Property Checklist:**
- ✅ Text content → Use exact names from `textLayers` (e.g., "Action", not "text")
- ✅ All variants → Include every variant from schema with valid values
- ✅ No extras → Don't add properties like "isPassword" unless in schema
```

#### Addition 4: Update "## Validation Checklist" section
**Location**: In the existing validation checklist  
**Action**: ADD these items after item #3:

```markdown
3.5. Only native-text, native-rectangle, or native-circle used (no other native types)
3.6. No percentage width values anywhere in the design
3.7. All component properties match exact names from textLayers array
```

### File 2: Update JSON Engineer Prompt

**File**: `src/prompts/roles/5 json-engineer.txt`

#### Addition 1: After "## CORE MISSION" section
**Location**: Add new section after CORE MISSION  
**Action**: ADD:

```markdown
## RENDERER CONSTRAINTS - READ FIRST

### Supported Element Types (Complete List)
1. **Components**: `type: "component"` with valid `componentNodeId`
2. **Layout Containers**: `type: "layoutContainer"` for structure
3. **Native Elements** (ONLY these three):
   - `type: "native-text"` - Text rendering
   - `type: "native-rectangle"` - Rectangles/squares (supports image fills)
   - `type: "native-circle"` - Circles/ellipses (supports image fills)

### BANNED Elements (Cause Immediate Failure)
Never output these non-existent types:
- ❌ `"type": "native-grid"` → Convert to layoutContainer with wrap
- ❌ `"type": "native-list-item"` → Use component or layoutContainer
- ❌ `"type": "native-rating"` → Use star components or shapes
- ❌ `"type": "native-image"` → Use native-rectangle with image fill
- ❌ `"type": "native-scroll"` → Not supported
- ❌ Any other "native-" prefix not in the supported list

### Sizing Constraints
1. **NO PERCENTAGES**: Never output "50%", "100%" for width
2. **Full width**: Use `"horizontalSizing": "FILL"`
3. **Fixed width**: Use numbers only (200, not "200" or "200px")
4. **Containers**: Use `counterAxisSizingMode`, not width property
```

#### Addition 2: Update "### Step 1: Component Lookup & Validation"
**Location**: REPLACE the existing Step 1  
**Action**: REPLACE with:

```markdown
### Step 1: Component Lookup & Validation
For each component in the UI specification:
1. Find component in `DESIGN_SYSTEM_DATA` using the specified `componentNodeId`
2. Extract these EXACT properties:
   - `textLayers`: Array of text property names (use these EXACT names)
   - `variants`: Array of variant categories (ALL are required)
   - `variantDetails`: Object with allowed values for each variant
3. Validate component exists before proceeding
4. NEVER add properties not in the schema

**Validation Example:**
If component has:
- `textLayers: ["Action", "Default"]`
- `variants: ["Size", "Type", "State"]`
- `variantDetails: {Size: ["Small", "Medium", "Large"]}`

Then you MUST:
- Use "Action" or "Default" for text (not "text" or "label")
- Include ALL three variants
- Use ONLY the listed values (case-sensitive)
```

#### Addition 3: In "### Rule 2: Component Text Properties"
**Location**: REPLACE the existing Rule 2  
**Action**: REPLACE with:

```markdown
### Rule 2: Component Text Properties & IDs
```json
✅ CORRECT - Use exact schema names:
{
  "type": "component",
  "componentNodeId": "10:3907",  // ALWAYS use componentNodeId
  "properties": {
    "Action": "Sign In"  // From textLayers: ["Action"]
  }
}

❌ WRONG - Generic names or wrong ID property:
{
  "type": "component",
  "id": "10:3907",  // Wrong property name
  "properties": {
    "text": "Sign In"  // Not in schema
  }
}
```

**ID Property Rules:**
- ALWAYS use `componentNodeId` (never `id` or `componentId`)
- Components without componentNodeId will fail
```

#### Addition 4: Add new rule after Rule 4
**Location**: After "### Rule 4: Layout Alignment"  
**Action**: ADD:

```markdown
### Rule 5: Variant Completeness
If a component has variants, you MUST include ALL of them:

```json
✅ CORRECT - All variants included:
{
  "type": "component",
  "componentNodeId": "10:3907",
  "variants": {
    "Platform": "Android+Web",  // Required
    "Size": "Medium",          // Required
    "Type": "Filled",          // Required
    "State": "Default",        // Required
    "Color": "Green"           // Required
  }
}

❌ WRONG - Missing variants:
{
  "type": "component",
  "componentNodeId": "10:3907",
  "variants": {
    "Size": "Medium",  // Missing other required variants!
    "Type": "Filled"
  }
}
```

### Rule 6: Width Value Types
```json
✅ CORRECT width values:
"width": 200              // Numeric
"horizontalSizing": "FILL" // For full width

❌ WRONG width values:
"width": "200"            // String
"width": "100%"           // Percentage
"width": "full"           // Invalid string
```
```

#### Addition 5: Update the validation checklist
**Location**: At the end of the document, before "## Input Format"  
**Action**: ADD:

```markdown
## Pre-Output Safety Check
Before outputting JSON, scan for these fatal errors:
1. Any "native-" type not in: [native-text, native-rectangle, native-circle]
2. Any percentage values ("50%", "100%")
3. Components using "id" instead of "componentNodeId"
4. Missing required variants
5. Text properties not matching textLayers exactly
6. String values where numbers expected

If any found, fix before output.
```

### File 3: Update Component Scanner Prompt Generation

**File**: `src/core/component-scanner.ts`

**Method**: `generateLLMPrompt`

**Location**: Find the section that starts with `prompt += '## Available Components in Design System:\n\n';`

**Action**: ADD after that line:

```typescript
// Add renderer constraints section
prompt += `## CRITICAL RENDERER CONSTRAINTS\n\n`;
prompt += `### The ONLY native elements supported:\n`;
prompt += `- **native-text**: Text elements with styling\n`;
prompt += `- **native-rectangle**: Rectangles (supports image fills)\n`;
prompt += `- **native-circle**: Circles/ellipses (supports image fills)\n\n`;
prompt += `### NEVER use these (they don't exist):\n`;
prompt += `- ❌ native-grid (use layoutContainer with wrap)\n`;
prompt += `- ❌ native-list-item (use list components)\n`;
prompt += `- ❌ native-rating (use star components)\n`;
prompt += `- ❌ native-image (use native-rectangle with image fill)\n`;
prompt += `- ❌ Any other native-* type\n\n`;
prompt += `### Sizing Rules:\n`;
prompt += `- ✅ Use "horizontalSizing": "FILL" for full width\n`;
prompt += `- ✅ Use numeric values for fixed width (e.g., 200)\n`;
prompt += `- ❌ NEVER use percentages like "50%" or "100%"\n\n`;
```

### File 4: Create Quick Reference Card

**File**: Create new file `src/prompts/QUICK_REFERENCE.md`

**Action**: CREATE with this content:

```markdown
# AI Designer Quick Reference

## Native Elements (ONLY these 3)
- `native-text` - Text with styling
- `native-rectangle` - Rectangles (can have image fills)
- `native-circle` - Circles (can have image fills)

## BANNED Types (Don't Exist)
- ❌ native-grid
- ❌ native-list-item
- ❌ native-rating
- ❌ native-image
- ❌ native-scroll
- ❌ native-[anything-else]

## Component Rules
1. Always use `componentNodeId` (not `id`)
2. Include ALL variants from schema
3. Use exact property names from textLayers
4. Variant values are case-sensitive

## Sizing Rules
- Full width: `"horizontalSizing": "FILL"`
- Fixed width: `"width": 200` (numeric only)
- NEVER: "100%", "50%", "full"

## Common Replacements
- Grid → layoutContainer + layoutWrap: "WRAP"
- Rating → star icon components
- Image → native-rectangle + fill type IMAGE
- List items → actual list-item components
```

### File 5: Update User Request Analyzer (Optional)

**File**: `src/prompts/roles/alt1-user-request-analyzer.txt`

**Location**: At the end of the file, before the output format section

**Action**: ADD:

```markdown
## Technical Constraints Awareness
When analyzing user requests, note if they mention:
- Grid layouts → Flag need for wrapped layoutContainers
- Star ratings → Flag need for star icon components
- Image galleries → Flag need for image-filled rectangles
- Lists → Flag need for proper list-item components

Add a section to your analysis:
**Technical Considerations:**
- Identify any requested UI patterns that need special handling
- Note if percentages mentioned (will need conversion)
- Flag any complex layouts needing careful structure
```

## Testing the Updated Prompts

### Test Prompt 1: Grid Layout
**Input**: "Create a product grid with 3 columns"
**Expected**: Should use layoutContainer with wrap, NOT native-grid

### Test Prompt 2: Rating System
**Input**: "Add a 5-star rating display"
**Expected**: Should use star icon components or shapes, NOT native-rating

### Test Prompt 3: Full Width
**Input**: "Make the header full width"
**Expected**: Should use horizontalSizing: "FILL", NOT width: "100%"

### Test Prompt 4: Component Variants
**Input**: "Add a medium green filled button"
**Expected**: Should include ALL required variants, not just mentioned ones

## Implementation Steps

1. **Backup prompt files** before making changes
2. **Update prompts in order**:
   - alt2-ux-ui-designer.txt (most critical)
   - 5 json-engineer.txt (most critical)
   - component-scanner.ts
   - Create QUICK_REFERENCE.md
   - alt1-user-request-analyzer.txt (optional)
3. **Test each update** with the test prompts above
4. **Run full test suite** with original problem cases
5. **Document any remaining issues**

## Success Metrics

- ✅ Zero instances of invalid native types in output
- ✅ No percentage width values generated
- ✅ All components include complete variant sets
- ✅ Property names match schema exactly
- ✅ Component IDs use correct property name
- ✅ Error rate reduced by >80% on test cases

## Notes for Claude Code

- Make changes exactly as specified
- Preserve all existing content not mentioned in changes
- Use exact markdown formatting shown
- Test after each file update
- Report any conflicts or unclear instructions