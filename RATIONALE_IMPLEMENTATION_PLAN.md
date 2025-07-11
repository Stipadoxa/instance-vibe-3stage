# Rationale Implementation Plan: Python Pipeline Edition

## Overview

This plan implements rationale output for the Python-based AI pipeline in two sequential stages, keeping Designer UX reasoning separate from JSON Engineer implementation details. The implementation works with the existing file-based pipeline where stages output to `python_outputs/` and JSON is manually copied to the Figma plugin.

## Current Pipeline Understanding

### Actual Pipeline Flow
1. **Python Execution**: `python3 instance.py alt3`
2. **Stage Processing**: Each stage reads previous output from files
3. **Text Prompts**: Stored as `.txt` files, loaded by Python role classes
4. **Output Files**: Results saved to `python_outputs/` with timestamps
5. **Manual Copy**: Final JSON copied to Figma plugin for rendering

### Actual File Structure
- **Stage 2 Prompt**: `src/prompts/roles/alt2-ux-ui-designer.txt`
- **Stage 3 Prompt**: `src/prompts/roles/5 json-engineer.txt`
- **Pipeline Runner**: `instance.py` (Python)
- **Role Classes**: Handle AI execution and file I/O
- **Design System**: Auto-scanned and passed as `{{DESIGN_SYSTEM_DATA}}`

---

## Implementation Strategy

### Stage 1: Designer Rationale (UX/UI Designer)
**Duration**: 2-3 hours  
**Focus**: UX decisions and layout reasoning

### Stage 2: JSON Engineer Rationale (JSON Engineer) 
**Duration**: 2-3 hours  
**Focus**: Technical implementation and design system mapping

---

## Stage 1: Designer Rationale Implementation

### Scope
Add rationale output to Stage 2 (UX/UI Designer) without affecting downstream stages.

### Output Structure
```json
{
  "designRationale": {
    "layoutDecisions": "Explanation of spatial organization and hierarchy",
    "userFlowReasoning": "UX flow and interaction logic",
    "componentChoices": "Why specific UI components were selected",
    "visualHierarchy": "How prominence and attention are managed"
  },
  "layoutData": {
    // Existing Stage 2 output unchanged
  }
}
```

### Tasks

#### 1. Update UX/UI Designer Prompt
**File**: `src/prompts/roles/alt2-ux-ui-designer.txt`

**Add to prompt:**
```
## RATIONALE OUTPUT REQUIREMENT

You must provide reasoning for your design decisions. Output your response as JSON with two sections:

1. **designRationale**: Your UX/UI reasoning
2. **layoutData**: Your layout specification (existing format)

### Required Rationale Categories:

- **layoutDecisions**: Why you organized elements this way (spacing, positioning, hierarchy)
- **userFlowReasoning**: UX logic behind interaction patterns and user journey
- **componentChoices**: Why you selected specific UI components (buttons, inputs, cards, etc.)
- **visualHierarchy**: How you established prominence and visual flow

### Example Output:
```json
{
  "designRationale": {
    "layoutDecisions": "Centered the login form to create focus and reduce cognitive load. Used generous whitespace to feel premium and uncluttered.",
    "userFlowReasoning": "Error state displays immediately below password field for instant feedback. Sign up link at bottom follows natural reading flow.",
    "componentChoices": "Card container provides visual boundaries. Primary button for main action, text button for secondary to establish clear hierarchy.",
    "visualHierarchy": "Welcome text largest for greeting, form fields medium, footnote smallest. Error text in warning color for immediate attention."
  },
  "layoutData": {
    // Your layout specification here
  }
}
```
```

#### 2. Update Stage 3 Input Processing
**File**: `src/prompts/roles/5 json-engineer.txt`

**Add input handling instructions:**
```
## INPUT PROCESSING

You will receive input from the UX/UI Designer that may include design rationale. Extract only the layoutData section for your work:

The input may be either:
1. Direct layout specification (legacy format)
2. Wrapped format: {"designRationale": {...}, "layoutData": {...}}

If the input contains "layoutData", extract that section. Otherwise, use the entire input as the layout specification.

Focus only on the layout specification. Do not include the designer's rationale in your output.
```

#### 3. Testing & Validation
1. **Test with existing user-request.txt**: `python3 instance.py alt3`
2. **Check Stage 2 output**: Verify `python_outputs/alt3_*_2_ux_ui_designer_output.txt` includes rationale
3. **Verify Stage 3 processing**: Confirm `python_outputs/alt3_*_3_json_engineer_output.txt` processes correctly
4. **Check final JSON**: Ensure no breaking changes to Figma plugin compatibility

### Success Criteria
- [ ] Stage 2 outputs include meaningful design rationale
- [ ] Stage 3 processes new format without issues
- [ ] Rationale explains UX decisions clearly
- [ ] No impact on final rendering quality

---

## Stage 2: JSON Engineer Rationale Implementation

### Scope
Add rationale output to Stage 3 (JSON Engineer) with technical implementation reasoning.

### Output Structure
```json
{
  "implementationRationale": {
    "componentSelection": "Why specific Figma component IDs were chosen",
    "styleApplication": "Text style and color style selection reasoning", 
    "designSystemMapping": "How design requirements mapped to available components",
    "variantDecisions": "Why specific component variants were selected"
  },
  "renderingData": {
    // Final JSON for Figma rendering
  }
}
```

### Tasks

#### 1. Update JSON Engineer Prompt
**File**: `src/prompts/roles/5 json-engineer.txt`

**Add to prompt:**
```
## RATIONALE OUTPUT REQUIREMENT

You must provide reasoning for your technical implementation decisions. Output as JSON with two sections:

1. **implementationRationale**: Your technical reasoning
2. **renderingData**: Your rendering JSON (existing format)

### Required Rationale Categories:

- **componentSelection**: Why you chose specific Figma component IDs from the design system
- **styleApplication**: Reasoning for text style and color style selections
- **designSystemMapping**: How you mapped design requirements to available components/styles
- **variantDecisions**: Why you selected specific component variants or configurations

### Example Output:
```json
{
  "implementationRationale": {
    "componentSelection": "Used component 10:8492 for primary button as it matches the required style. Component 10:3907 for input fields provides proper error state support.",
    "styleApplication": "Applied Headline/Medium for welcome text to establish hierarchy. Body/Medium for form labels maintains readability. Caption/Small for footnote follows design system hierarchy.",
    "designSystemMapping": "Login form requirements mapped perfectly to existing card and input components. Error state natively supported by input component variants.",
    "variantDecisions": "Selected error variant for password field to show validation state. Primary button variant for main CTA, text variant for secondary action."
  },
  "renderingData": {
    // Your complete rendering JSON here
  }
}
```
```

#### 2. Manual Copy Workflow Adjustment
**Process**: No code changes needed for Figma renderer

**New Workflow:**
1. Run `python3 instance.py alt3`
2. Check `python_outputs/alt3_*_3_json_engineer_output.txt` for rationale structure
3. Copy only the `renderingData` section to Figma plugin (not the rationale)
4. Rationale remains in file for debugging purposes

**Optional Enhancement**: If you want rationale visible in Figma plugin, modify the plugin's JSON input handler to display rationale in console or UI.

#### 3. Testing & Validation
1. **Test complete pipeline**: `python3 instance.py alt3`
2. **Check both output files**: Stage 2 has designRationale, Stage 3 has implementationRationale
3. **Verify Figma compatibility**: Copy `renderingData` section to plugin works normally
4. **Validate rationale quality**: Both rationales provide debugging value

### Success Criteria
- [ ] Stage 3 outputs include technical implementation rationale
- [ ] Figma renderer processes new format correctly  
- [ ] Rationale explains technical decisions clearly
- [ ] No breaking changes to existing functionality

---

## Benefits of Sequential Approach

### Immediate Benefits
- **Isolated Testing**: Validate each stage independently
- **Clear Debugging**: Separate UX reasoning from technical implementation
- **Manageable Changes**: Smaller, focused modifications per stage

### Implementation Benefits
- **Risk Reduction**: Test Stage 1 before adding Stage 2 complexity
- **Cleaner Prompts**: Each stage has focused rationale requirements
- **Better Validation**: Easier to assess rationale quality per stage

### Debugging Benefits
- **UX Issues**: Designer rationale reveals layout and flow problems
- **Technical Issues**: Engineer rationale reveals component/style mapping problems
- **Clear Ownership**: Know which stage caused specific problems

## Timeline

### Week 1: Stage 1 Implementation
- Day 1-2: Update Designer prompt and test
- Day 3: Verify Stage 3 compatibility
- Day 4: Validate rationale quality

### Week 2: Stage 2 Implementation  
- Day 1-2: Update Engineer prompt and renderer
- Day 3: Test complete pipeline
- Day 4: Final validation and documentation

## Testing Strategy

### Stage 1 Testing
```bash
# Test Designer rationale
python3 instance.py alt3

# Check Stage 2 output file
cat python_outputs/alt3_*_2_ux_ui_designer_output.txt
# Should include designRationale wrapper

# Check Stage 3 still processes correctly
cat python_outputs/alt3_*_3_json_engineer_output.txt
```

### Stage 2 Testing
```bash
# Test complete pipeline with both rationales
python3 instance.py alt3

# Check both output files contain rationales
cat python_outputs/alt3_*_2_ux_ui_designer_output.txt | grep designRationale
cat python_outputs/alt3_*_3_json_engineer_output.txt | grep implementationRationale

# Test Figma plugin compatibility
# Copy renderingData section from Stage 3 output to plugin
```

### Validation Checklist
- [ ] Designer rationale explains UX decisions clearly
- [ ] Engineer rationale explains technical choices
- [ ] No rendering quality degradation
- [ ] Backward compatibility maintained
- [ ] Error handling works for both formats

---

## Key Differences from Original Plan

### ✅ **Correct Understanding**
- **File-based pipeline**: Stages output to files, not real-time processing
- **Text prompts**: Stored in `.txt` files, not JavaScript
- **Python execution**: `instance.py` orchestrates everything
- **Manual copy workflow**: Final JSON copied to Figma plugin

### 🔧 **Implementation Reality**
- **Prompt modifications**: Edit text files, not code
- **JSON parsing**: Python handles format detection between stages  
- **No Figma renderer changes**: Plugin works with existing JSON structure
- **Debug via files**: Rationale stays in output files for debugging

### 📁 **Output File Structure**
```
python_outputs/
├── alt3_20250711_130807_2_ux_ui_designer_output.txt      # Contains designRationale
├── alt3_20250711_130807_3_json_engineer_output.txt       # Contains implementationRationale
```

This sequential approach works perfectly with the file-based Python pipeline, providing debugging capabilities through persistent output files while maintaining full compatibility with the existing Figma plugin workflow.