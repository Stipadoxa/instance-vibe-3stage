# Component Scanner Optimization Implementation Plan

## 🎯 Goal
Reduce design-system-raw-data JSON from **3.2MB to ~230KB** by scanning only what the LLM needs for intelligent UI generation decisions.

## 📋 Current Problems to Fix

### 1. **Deep Recursive Component Structure** (Biggest Bloat Source)
- **Current**: Full `componentStructure` with nested children going 5+ levels deep
- **Fix**: Remove recursive scanning, only capture top-level structure hints

### 2. **Absolute Positioning Data** (Unnecessary)
- **Current**: `x`, `y`, `absoluteBoundingBox` coordinates
- **Fix**: Remove all absolute positioning, keep only sizing hints

### 3. **Variant Combinations** (Exponential Bloat)
- **Current**: Every variant combination stored separately
- **Fix**: Only store variant options (e.g., `Size: ["S", "M", "L"]`)

### 4. **Nested Component Full Data** (Redundant)
- **Current**: Full component data for every nested instance
- **Fix**: Just store references/IDs

## 🔧 Implementation Steps

### Step 1: Create New Optimized Interface
**File**: `component-scanner.ts`  
**Add this interface at the top of the file:**

```typescript
interface OptimizedComponentInfo {
  // IDENTITY (Keep these)
  id: string;
  name: string;
  suggestedType: string;
  confidence: number;
  
  // VARIANTS - Just options, not combinations
  variantOptions?: {
    [propName: string]: string[];  // e.g., "Size": ["Small", "Medium", "Large"]
  };
  
  // TEXT LAYERS - Simplified
  textSlots?: {
    [layerName: string]: {
      required: boolean;
      multiline?: boolean;
      maxChars?: number;
    };
  };
  
  // NESTED COMPONENTS - Just references
  componentSlots?: {
    [slotName: string]: {
      componentId?: string;  // Reference only
      swappable: boolean;
      category?: string;     // "icon", "button", etc.
    };
  };
  
  // LAYOUT BEHAVIOR - What LLM needs
  layoutBehavior?: {
    type: "fixed" | "hug" | "fill";
    canWrap?: boolean;
    minHeight?: number;
    maxHeight?: number;
    hasInternalPadding: boolean;
    itemSpacing?: number;
  };
  
  // SIMPLIFIED METADATA
  hasImageFills?: boolean;
  touchFriendly?: boolean;  // Meets 44px minimum
  semanticRole?: "navigation" | "action" | "display" | "input" | "container";
  
  // PAGE INFO (Keep for organization)
  pageInfo?: {
    pageName: string;
    pageId: string;
  };
}
```

### Step 2: Replace the `analyzeComponent` Method
**Location**: Around line 200-400 in `component-scanner.ts`  
**Replace entire method with:**

```typescript
static async analyzeComponent(comp: ComponentNode | ComponentSetNode): Promise<OptimizedComponentInfo> {
  const name = comp.name;
  const suggestedType = this.guessComponentType(name.toLowerCase());
  const confidence = this.calculateConfidence(name.toLowerCase(), suggestedType);
  
  // Extract variant OPTIONS only (not combinations)
  let variantOptions: { [key: string]: string[] } | undefined;
  if (comp.type === 'COMPONENT_SET') {
    variantOptions = {};
    const variantProps = comp.variantGroupProperties;
    
    for (const [propName, prop] of Object.entries(variantProps)) {
      if ('values' in prop) {
        variantOptions[propName] = prop.values.map(v => v.name);
      }
    }
  }
  
  // Simplified text layer analysis (no deep recursion)
  const textSlots = await this.analyzeTextSlots(comp);
  
  // Component slots (references only, no recursion)
  const componentSlots = await this.analyzeComponentSlots(comp);
  
  // Layout behavior hints for LLM
  const layoutBehavior = this.analyzeLayoutBehavior(comp);
  
  // Quick metadata checks
  const hasImageFills = await this.checkForImageFills(comp);
  const touchFriendly = this.checkTouchTarget(comp);
  const semanticRole = this.inferSemanticRole(name, suggestedType);
  
  return {
    id: comp.id,
    name,
    suggestedType,
    confidence,
    variantOptions,
    textSlots,
    componentSlots,
    layoutBehavior,
    hasImageFills,
    touchFriendly,
    semanticRole
  };
}
```

### Step 3: Add New Helper Methods
**Add these methods to the ComponentScanner class:**

```typescript
// Analyze text slots without deep recursion
private static async analyzeTextSlots(comp: ComponentNode | ComponentSetNode): Promise<any> {
  const slots: any = {};
  const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? 
    (comp.defaultVariant || comp.children[0]) : comp;
  
  // Only scan immediate children, no recursion
  for (const child of nodeToAnalyze.children) {
    if (child.type === 'TEXT') {
      slots[child.name] = {
        required: child.visible !== false,
        multiline: child.textAutoResize === 'HEIGHT',
        maxChars: this.estimateMaxChars(child)
      };
    }
  }
  return Object.keys(slots).length > 0 ? slots : undefined;
}

// Analyze component slots (references only)
private static async analyzeComponentSlots(comp: ComponentNode | ComponentSetNode): Promise<any> {
  const slots: any = {};
  const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? 
    (comp.defaultVariant || comp.children[0]) : comp;
  
  // Only check immediate children for instances
  for (const child of nodeToAnalyze.children) {
    if (child.type === 'INSTANCE') {
      const mainComp = await child.getMainComponentAsync();
      if (mainComp) {
        const category = this.guessComponentType(mainComp.name.toLowerCase());
        slots[child.name] = {
          componentId: mainComp.id,
          swappable: true,
          category
        };
      }
    }
  }
  return Object.keys(slots).length > 0 ? slots : undefined;
}

// Analyze layout behavior for LLM decisions
private static analyzeLayoutBehavior(comp: ComponentNode | ComponentSetNode): any {
  const node = comp.type === 'COMPONENT_SET' ? 
    (comp.defaultVariant || comp.children[0]) : comp;
  
  if (!node || node.layoutMode === 'NONE') {
    return undefined;
  }
  
  return {
    type: node.primaryAxisSizingMode === 'AUTO' ? 'hug' : 
          node.layoutAlign === 'STRETCH' ? 'fill' : 'fixed',
    canWrap: node.layoutWrap === 'WRAP',
    minHeight: node.minHeight || undefined,
    maxHeight: node.maxHeight || undefined,
    hasInternalPadding: (node.paddingTop || 0) > 0,
    itemSpacing: node.itemSpacing || undefined
  };
}

// Quick check for image fills
private static async checkForImageFills(comp: ComponentNode | ComponentSetNode): Promise<boolean> {
  const node = comp.type === 'COMPONENT_SET' ? 
    (comp.defaultVariant || comp.children[0]) : comp;
  
  // Only check immediate children, no deep recursion
  for (const child of node.children) {
    if ('fills' in child && Array.isArray(child.fills)) {
      if (child.fills.some(f => f.type === 'IMAGE')) {
        return true;
      }
    }
  }
  return false;
}

// Check if component meets touch target size
private static checkTouchTarget(comp: ComponentNode | ComponentSetNode): boolean {
  const node = comp.type === 'COMPONENT_SET' ? 
    (comp.defaultVariant || comp.children[0]) : comp;
  
  return node.height >= 44;
}

// Infer semantic role for better LLM understanding
private static inferSemanticRole(name: string, type: string): string | undefined {
  const lowName = name.toLowerCase();
  
  if (lowName.includes('nav') || lowName.includes('tab') || lowName.includes('menu')) {
    return 'navigation';
  }
  if (lowName.includes('button') || lowName.includes('cta') || type === 'button') {
    return 'action';
  }
  if (lowName.includes('card') || lowName.includes('list') || type === 'card') {
    return 'display';
  }
  if (lowName.includes('input') || lowName.includes('field') || type === 'input') {
    return 'input';
  }
  if (lowName.includes('container') || lowName.includes('section')) {
    return 'container';
  }
  return undefined;
}

// Estimate max characters for text field
private static estimateMaxChars(textNode: TextNode): number | undefined {
  if (!textNode.width) return undefined;
  
  // Rough estimate based on width and font size
  const avgCharWidth = (textNode.fontSize as number || 14) * 0.6;
  const lines = textNode.textAutoResize === 'HEIGHT' ? 3 : 1;
  return Math.floor((textNode.width / avgCharWidth) * lines);
}
```

### Step 4: Remove Heavy Methods
**DELETE or comment out these methods:**
- `analyzeComponentStructure()` - The recursive structure scanner
- `extractSingleComponentInstance()` - Not needed with references
- `findComponentInstances()` - Full recursion not needed
- `findVectorNodes()` - Too detailed
- `findImageNodes()` - Simplified in new approach

### Step 5: Update `scanDesignSystem` Method
**Location**: Main scanning method  
**Update the return type to use OptimizedComponentInfo:**

```typescript
static async scanDesignSystem(): Promise<{
  components: OptimizedComponentInfo[],
  colorStyles?: any,
  textStyles?: any,
  designTokens?: any,
  scanTime: number,
  version: string,
  fileKey?: string
}> {
  // ... existing code ...
  
  // When scanning components, use the new optimized analyzer
  const componentInfo = await this.analyzeComponent(node as ComponentNode | ComponentSetNode);
  
  // ... rest of existing code ...
}
```

## 📊 Expected Results

### Size Reduction
- **Before**: 3.2MB with deep nested structures
- **After**: ~230KB with decision-focused data

### Data Quality for LLM
- ✅ All variant options available
- ✅ Text slot names and constraints
- ✅ Component relationships (as references)
- ✅ Layout behavior hints
- ✅ Semantic roles for better selection
- ❌ No pixel-perfect positioning data
- ❌ No deep recursive structures
- ❌ No duplicate variant combinations

## 🧪 Testing Instructions

1. **Backup current file**: Save `component-scanner.ts` as `component-scanner.backup.ts`
2. **Implement changes**: Follow steps 1-5 above
3. **Test scan**: Run design system scan in Figma plugin
4. **Verify output**: Check new JSON file size (~230KB expected)
5. **Test LLM**: Ensure UX/UI Designer stage still works with optimized data

## ⚠️ Important Notes

- **Backward Compatibility**: Keep the old `ComponentInfo` interface temporarily if other code depends on it
- **Gradual Migration**: You can run both analyzers in parallel initially to compare outputs
- **Design Tokens**: Keep color/text styles scanning as-is (already optimized)
- **Error Handling**: Add try-catch blocks around new methods to prevent scan failures

## 🎯 Success Criteria

The optimization is successful when:
1. JSON file size reduces by 90%+ (from 3.2MB to ~230KB)
2. LLM can still select and use components correctly
3. No loss of critical decision-making data
4. Faster plugin performance due to smaller data transfer

This focused approach ensures the LLM gets exactly what it needs for intelligent UI generation without drowning in implementation details.