# UXPal Development TODO List

## Tasks Sorted by Difficulty (Easiest First)

### ✅ Completed
- [x] **Fix color token naming in JSON to match design system format**
  - Fixed `primary-50` → `Primary/primary50` format mismatch
  - Updated figma_ready_20250802_111629.json with correct token names
  - Status: ✅ Complete

- [x] **Add exact color token naming instruction to designer prompt**
  - Update alt2-ux-ui-designer.txt to use exact color names from DESIGN_SYSTEM_DATA
  - Similar to how component IDs require exact matching
  - Should prevent `primary-50` vs `Primary/primary50` mismatches
  - Status: ✅ Complete

- [x] **Add color token priority instruction (tokens over styles) to designer prompt**
  - Instruct designer to prefer color tokens over color styles when both available
  - Establish clear hierarchy for color selection from design system
  - Ensure consistent color application across native elements
  - Status: ✅ Complete

### 🔄 Pending (Easy → Hard)

- [x] **Add text style usage instruction to designer prompt**
  - Instruct designer to use design system text styles instead of manual font properties
  - Should check DESIGN_SYSTEM_DATA for available text styles first
  - Use textStyle property instead of fontSize/fontWeight when styles exist
  - Ensure typography consistency with design system
  - **Difficulty**: Requires understanding text style format in design system
  - Status: ✅ Complete

#### 🟡 Medium (15-30 minutes)

- [ ] **Fix layout strategy for full-width elements (images, backgrounds)**
  - **Problem**: Current approach puts 16px padding on root container, preventing true full-width
  - **Current wrong structure**:
    ```
    Root Container (padding: 16px) ← constrains everything
    ├── Background Rectangle
    ├── Image (can't be full-width due to root padding)
    ├── Product Title
    └── Other content
    ```
  - **Correct structure for full-width requests**:
    ```
    Root Container (padding: 0px) ← allows full-width
    ├── Hero Section (auto-layout, full-width, optional background fill)
    │   └── Image (fills container width, edge-to-edge)
    └── Content Section (auto-layout, padding: 16px)
        ├── Product Title
        ├── Price
        ├── Seller Info
        └── Contact Button
    ```
  - **Implementation**: When user requests "full-width" elements, use nested container strategy
  - **Benefits**: True edge-to-edge images, proper content padding, cleaner hierarchy
  - **Difficulty**: Requires logic changes and examples in prompt
  - Status: 🔄 Pending

#### 🔴 Hard (1-2 hours)
- [ ] **Implement gradient support for native elements (Phase 5)**
  - **Problem**: Designer AI generates gradients in 100% of recent outputs, all render as solid gray
  - **Current gradient patterns from AI**:
    ```json
    "fill": {
      "type": "GRADIENT_LINEAR", 
      "stops": [
        {"position": 0, "color": "Primary/primary10"},
        {"position": 1, "color": "Primary/primary5"}
      ]
    }
    ```
  - **Implementation needed**: Extend native-rectangle renderer to support LINEAR_GRADIENT
  - **Color support required**: Must work with both native HEX colors AND design system tokens/styles
  - **Color resolution**: May require converting design system styles to HEX for gradient rendering
  - **Priority**: High - gradients are consistently used for visual enhancement/backgrounds
  - **Reference**: Native Element fix doc mentions "Phase 5 (Gradient Support)" as next step
  - **Impact**: Will eliminate gray fallbacks and achieve intended visual designs
  - **Difficulty**: TypeScript/JavaScript coding in figma-renderer.ts
  - Status: 🔄 Pending

#### 🟡 Medium (15-30 minutes)
- [ ] **Tighten JSON Engineer prompt for text property validation**
  - **Problem**: Inconsistent text property names (`"Action"` vs `"Default"`) for same component across runs
  - **Evidence**: Button 10:3907 worked with `"Action": "Start Free Trial"` but failed with `"Default": "Contact Seller"`
  - **Root cause**: JSON Engineer not validating against actual textLayers from design system component schema
  - **Solution needed**: Add strict validation step to check DESIGN_SYSTEM_DATA for exact textLayer property names
  - **Implementation**: Enhance JSON Engineer prompt to cross-reference component textLayers before assigning text properties
  - **Impact**: Consistent text rendering across all component instances
  - **Difficulty**: JSON Engineer prompt logic enhancement
  - Status: 🔄 Pending

## Notes
- All tasks relate to improving native element color rendering accuracy
- Color token fixes should reduce fallback to gray colors
- Designer prompt improvements will prevent future token naming issues

---
*Last updated: 2025-08-02*