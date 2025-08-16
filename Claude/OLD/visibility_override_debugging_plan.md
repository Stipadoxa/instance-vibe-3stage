# Visibility Override Debugging Plan

**Date**: August 2, 2025  
**Issue**: `visibilityOverrides` schema not working in Figma renderer  
**Status**: Backend implemented but not functional  

## 🔍 Problem Summary

The `visibilityOverrides` feature was implemented with proper backend infrastructure but manual testing shows **0% functionality**. Elements are not being hidden/shown despite correct JSON schema usage.

## 🎯 Debugging Objectives

1. **Verify method execution** - Confirm `applyVisibilityOverrides()` is actually called
2. **Validate integration points** - Check all component creation paths include the method
3. **Test node ID resolution** - Ensure node IDs from design system match runtime component structure
4. **Fix pipeline gaps** - Integrate method into all relevant rendering paths

## 🧪 Testing Setup

### Test Files Available
- `test_appbar_only.json` - Contains `visibilityOverrides` for appbar component
- `test_appbar_basic.json` - Standard appbar without overrides (control test)
- `test_appbar_full_schema.json` - Complete design system schema

### Known Good Node IDs (From Design System)
```
Appbar Component (ID: 10:5620):
- leading-icon: 10:5622
- avatar: 10:5625  
- trailing-icon 1: 10:5633 (phone icon)
- trailing-icon 2: 10:5634 (more/dots icon)
- trailing-icon 3: 10:5632
```

## 🔧 Debugging Steps

### Phase 1: Method Execution Verification (15 minutes)

1. **Add debug logging to `applyVisibilityOverrides()` method**
   - File: `src/core/figma-renderer.ts` (lines 1408-1441)
   - Add console.log at method start: `console.log('🐛 applyVisibilityOverrides CALLED', {itemData})`
   - Add more logging for each step

2. **Test with existing JSON files**
   - Load `test_appbar_only.json` in Figma plugin
   - Check plugin console for debug logs
   - Verify if method is called at all

3. **Check integration points**
   - Verify line 1338 in `createComponentInstanceSystematic()` calls the method
   - Check if there are other component creation paths that bypass this call

### Phase 2: Node ID Resolution Testing (20 minutes)

4. **Debug node finding logic**
   - Add logging to `instance.findChild()` calls
   - Log all child node IDs: `instance.children.map(child => ({name: child.name, id: child.id}))`
   - Compare with expected node IDs from design system

5. **Test with simplified override**
   - Create minimal test with single visibility override
   - Use known-working node ID if different from design system scan

6. **Verify component instance structure**
   - Check if appbar component creates nested instances with different ID patterns
   - Investigate if node IDs change during component instantiation

### Phase 3: Pipeline Integration Analysis (25 minutes)

7. **Trace all component creation paths**
   - Search for other methods that create component instances
   - Check if `visibilityOverrides` is handled in all paths
   - Look for: `createInstance`, `createComponent`, etc.

8. **Test rendering sequence**
   - Check if visibility is reset after override application
   - Verify timing: overrides → variants → properties → final render

9. **Integration testing**
   - Test with different component types (not just appbar)
   - Verify method signature matches call site expectations

### Phase 4: Fix Implementation (20 minutes)

10. **Implement missing integration**
    - Add `applyVisibilityOverrides()` calls to missing render paths
    - Ensure method is called after component instantiation but before final render

11. **Fix node ID resolution**
    - Update node ID lookup logic if component structure differs from scan
    - Add fallback mechanisms for missing nodes

12. **Add error handling**
    - Graceful degradation when overrides fail
    - Better logging for debugging future issues

## 🧰 Debugging Tools

### Console Logging Strategy
```typescript
// Add to applyVisibilityOverrides method
console.log('🐛 VISIBILITY OVERRIDE DEBUG', {
  hasOverrides: !!itemData.visibilityOverrides,
  overrideCount: Object.keys(itemData.visibilityOverrides || {}).length,
  instanceChildren: instance.children.map(c => ({name: c.name, id: c.id})),
  targetNodeIds: Object.keys(itemData.visibilityOverrides || {})
});
```

### Manual Testing Commands
```bash
# Test pipeline with debug JSON
cp test_appbar_only.json figma-ready/
# Load in Figma plugin and check console
```

### Validation Checks
- [ ] Method `applyVisibilityOverrides()` is called
- [ ] Node IDs from JSON match actual component children
- [ ] `child.visible = false` successfully hides elements
- [ ] Integration exists in all component creation paths
- [ ] No errors in console during override application

## 🚨 Expected Findings

**Likely Issues:**
1. **Missing integration** - Method exists but not called in main pipeline
2. **Wrong node IDs** - Design system scan IDs don't match runtime component IDs
3. **Timing problems** - Overrides applied before component fully instantiated
4. **Component structure mismatch** - Nested instances have different ID patterns

**Success Criteria:**
- Console shows method execution
- Target elements become hidden in Figma
- No errors during override application
- Feature works with test JSON files

## 📋 Next Steps After Debugging

1. **If method not called**: Add integration to missing render paths
2. **If node IDs wrong**: Fix ID resolution or update design system scan
3. **If timing issues**: Move override application to correct pipeline stage
4. **If structure mismatch**: Update override logic for nested components

## 🎯 Deliverables

1. **Root cause identification** - Exact reason overrides don't work
2. **Minimal fix** - Smallest change to make feature functional
3. **Test verification** - Proof feature works with test files
4. **Documentation update** - Correct usage examples and limitations

This plan provides systematic debugging to identify why the technically sound backend implementation isn't working in practice.