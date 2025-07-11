# Error Field Variant Investigation Plan

## Issue Description
The AI pipeline is not selecting the "Error" state variant for the password input field, even though it exists in the design system. The user request specifically mentions "second one is empty and has error state with supportive text 'Please enter your password'" but the generated JSON shows `"State": "enabled"` instead of `"State": "error"`.

## Investigation Steps

### 1. Verify Design System Data
- [ ] Check if error variant exists in the design system scan data
- [ ] Verify the exact naming convention used for error states
- [ ] Look for input component variants and their available states

### 2. Analyze AI Pipeline Processing
- [ ] Review the UX UI Designer stage output to see if error state was mentioned
- [ ] Check JSON Engineer stage to see if it attempted to map error state
- [ ] Verify if design system data is being properly passed to AI stages

### 3. Check Component Mapping Logic
- [ ] Review how variants are mapped from design system to JSON
- [ ] Verify if error state mapping exists in the component property engine
- [ ] Check if there are any case sensitivity issues

### 4. Test User Request Processing
- [ ] Verify if the user request analysis stage correctly identifies error state requirement
- [ ] Check if error state requirement is passed through the pipeline stages
- [ ] Review prompt templates to ensure they handle error states properly

## Files to Examine

### Design System Data
- `design-system-raw-data-*.json` - Latest scan data
- `src/prompts/roles/design-system-scan-data.json` - Current DS data used by prompts

### Pipeline Output Files
- `python_outputs/alt3_20250709_150153_1_user_request_analyzer_output.txt`
- `python_outputs/alt3_20250709_150153_2_ux_ui_designer_output.txt`
- `python_outputs/alt3_20250709_150153_3_json_engineer_output.txt`

### Core System Files
- `src/core/component-property-engine.ts` - Component variant mapping
- `src/core/design-system-scanner-service.ts` - Design system scanning
- `src/prompts/roles/alt2-ux-ui-designer.txt` - UX UI Designer prompt
- `src/prompts/roles/5 json-engineer.txt` - JSON Engineer prompt

## Potential Root Causes

### 1. Design System Scanning Issue
- Error variant not properly detected during DS scan
- Incorrect variant naming in design system
- Component not scanned or missing from results

### 2. AI Processing Issue
- User request not properly analyzed for error state requirement
- UX UI Designer stage not translating error requirement correctly
- JSON Engineer stage not mapping error state to correct variant

### 3. Component Mapping Issue
- Error state not defined in component property mappings
- Incorrect variant key mapping (e.g., "State" vs "state" vs "Error")
- Missing error state in component definitions

### 4. Prompt Engineering Issue
- Prompts not emphasizing error state requirements
- Insufficient examples of error state handling
- Missing instructions for error state variant selection

## Testing Plan

### Phase 1: Data Verification
1. Check design system data for input component error variants
2. Verify user request analysis correctly identifies error requirement
3. Trace error state requirement through all pipeline stages

### Phase 2: Component Analysis
1. Review component property engine for error state mappings
2. Check if input component has error variant defined
3. Verify variant naming conventions match design system

### Phase 3: Prompt Optimization
1. Enhance prompts to better handle error states
2. Add specific examples of error state handling
3. Improve variant selection instructions

### Phase 4: End-to-End Testing
1. Test with simplified error state request
2. Verify error state is properly selected
3. Test with multiple error scenarios

## Expected Outcomes

### Success Criteria
- Error variant is correctly identified in design system data
- User request analysis properly identifies error state requirement
- JSON Engineer stage selects correct error variant
- Generated JSON includes `"State": "error"` for password field

### Deliverables
- Fixed component variant mapping for error states
- Updated prompts with better error state handling
- Comprehensive error state test cases
- Documentation of error state handling process

## Next Steps
1. Start with design system data verification
2. Trace the error requirement through pipeline stages
3. Identify the exact point where error state is lost
4. Implement targeted fixes based on findings
5. Test with original user request to verify fix

---

*Investigation started: 2025-07-09*  
*Status: Planning phase*