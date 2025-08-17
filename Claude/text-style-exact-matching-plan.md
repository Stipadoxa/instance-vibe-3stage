# Text Style Exact Matching Implementation Plan

**Date**: 2025-08-17  
**Author**: Claude  
**Status**: In Progress  
**Goal**: Fix external textStyle references through exact matching (fontSize + fontFamily + fontWeight)

## Problem Statement
Components reference external textStyle IDs that don't exist in local textStyles map, causing textStyleName to be undefined even when equivalent local styles exist.

## Solution Strategy
Implement exact matching fallback: when direct ID lookup fails, find local style with identical fontSize, fontFamily, and fontWeight.

## Implementation Steps

### ✅ Step 1: Build textStyleDetails map
- [ ] Extend `buildTextStyleMap()` to collect fontSize, fontFamily, fontWeight
- [ ] Create `Map<string, TextStyleDetails>` alongside existing textStyleMap
- [ ] Store detailed properties for exact matching

### ✅ Step 2: Extract fontFamily from text nodes  
- [ ] In `analyzeTextHierarchy()` get `node.fontName.family`
- [ ] Normalize fontWeight (string/number → consistent format)
- [ ] Extract all properties needed for matching

### ✅ Step 3: Create exact matching function
- [ ] Implement `findExactMatchingLocalStyle(fontSize, fontFamily, fontWeight)`
- [ ] Linear search through textStyleDetails map
- [ ] Return styleName on exact match, undefined otherwise

### ✅ Step 4: Integration
- [ ] Add exact matching fallback in existing lookup code
- [ ] Place after direct textStyleId lookup attempt
- [ ] Log when fallback is used

### ✅ Step 5: Testing & Validation
- [ ] Build project with changes
- [ ] Test in Figma with snackbar component
- [ ] Verify textStyleName = "Body/Medium" appears
- [ ] Check console logs for fallback usage

## Expected Result
```json
{
  "textHierarchy": [{
    "textStyleId": "S:ebfb895b...",        // External ID
    "textStyleName": "Body/Medium",        // ✅ Found via exact match
    "fontSize": 14,
    "fontWeight": 400,
    "usesDesignSystemStyle": true
  }]
}
```

## Files to Modify
- `src/core/component-scanner.ts` - main logic
- `src/core/session-manager.ts` - possible interface updates

## Success Criteria
- [ ] External textStyle references resolve to correct local style names
- [ ] No false matches (only exact fontSize+fontFamily+fontWeight)
- [ ] Fallback works seamlessly without breaking existing functionality
- [ ] Clear logging for debugging