# Component Scanner Optimization - Final Implementation Plan

**Завдання**: Зменшити розмір design-system-raw-data JSON з 3.2MB до ~230KB шляхом оптимізації сканування компонентів для LLM контексту.

**Критично важливо**: Пайплайн зараз не працює бо 3.2MB файл не влазить у контекстне вікно Gemini API. Це блокуюча проблема.

---

## 🎯 Головна проблема

**Поточний стан**: `ComponentStructure` створює рекурсивні дерева глибиною до 10 рівнів з повною інформацією про кожний вузол (координати, розміри, style properties). Це генерує 90% зайвої інформації.

**Цільовий стан**: LLM потребує тільки semantic інформацію для вибору правильних компонентів - назви слотів, варіанти, layout behavior, без технічних деталей.

---

## 📋 Детальний План Реалізації

### **Крок 1: Підготовка та Backup** ⏱️ 15 хвилин

**1.1 Створити backup поточного файлу:**
```bash
cd /Users/stipa/UXPal/src/core
cp component-scanner.ts component-scanner-backup-$(date +%Y%m%d).ts
```

**1.2 Додати новий інтерфейс в session-manager.ts:**
```typescript
// Додати після інтерфейсу ComponentInfo (line ~205)
export interface LLMOptimizedComponentInfo {
  // CORE IDENTITY
  id: string;
  name: string;
  suggestedType: string;
  confidence: number;
  
  // VARIANTS - списки опцій (без default)
  variantOptions?: {
    [propName: string]: string[]; // "Size": ["Small", "Medium", "Large"]
  };
  
  // TEXT SLOTS - точні назви для visibility override
  textSlots?: {
    [exactLayerName: string]: {
      required: boolean;
      type: 'single-line' | 'multi-line' | 'number';
      maxLength?: number;
    };
  };
  
  // COMPONENT SLOTS - точні назви слотів + мінімальні метадані  
  componentSlots?: {
    [exactSlotName: string]: {
      componentId?: string;
      category: 'icon' | 'button' | 'input' | 'image' | 'container';
      swappable: boolean;
      required: boolean;
    };
  };
  
  // LAYOUT HINTS - достатньо для UI рішень
  layoutBehavior?: {
    type: 'fixed' | 'hug-content' | 'fill-container';
    direction?: 'horizontal' | 'vertical';
    hasInternalPadding: boolean;
    canWrap?: boolean;
    minHeight?: number;
    isIcon: boolean; // ≤ 48px
    isTouchTarget: boolean; // ≥ 44px
  };
  
  // STYLE CONTEXT - для кольорових рішень
  styleContext?: {
    primaryColor?: string; // назва з design system
    hasImageSlot: boolean;
    semanticRole: 'navigation' | 'action' | 'display' | 'input' | 'container';
  };
  
  // PAGE INFO (зберегти як є)
  pageInfo?: {
    pageName: string;
    pageId: string;
    isCurrentPage: boolean;
  };
}
```

### **Крок 2: Реалізація нового аналізатора** ⏱️ 2 години

**2.1 Додати новий головний метод в component-scanner.ts (line ~1450):**
```typescript
/**
 * NEW: Optimized component analysis for LLM context (replaces heavy analyzeComponent)
 */
static async analyzeComponentOptimized(comp: ComponentNode | ComponentSetNode): Promise<LLMOptimizedComponentInfo> {
  const name = comp.name;
  const suggestedType = this.guessComponentType(name.toLowerCase());
  const confidence = this.calculateConfidence(name.toLowerCase(), suggestedType);
  
  // Extract variant OPTIONS only (not combinations)
  const variantOptions = this.extractVariantOptionsOptimized(comp);
  
  // Shallow text slot analysis (no deep recursion)
  const textSlots = this.extractTextSlotsOptimized(comp);
  
  // Component slots with exact names (for visibility override)
  const componentSlots = this.extractComponentSlotsOptimized(comp);
  
  // Layout behavior hints (no absolute coordinates)
  const layoutBehavior = this.extractLayoutBehaviorOptimized(comp);
  
  // Style context (no detailed fills/strokes)
  const styleContext = this.extractStyleContextOptimized(comp);
  
  return {
    id: comp.id,
    name,
    suggestedType,
    confidence,
    variantOptions,
    textSlots,
    componentSlots,
    layoutBehavior,
    styleContext
  };
}
```

**2.2 Додати helper методи (після analyzeComponentOptimized):**

```typescript
/**
 * Extract variant options only (no combinations)
 */
private static extractVariantOptionsOptimized(comp: ComponentNode | ComponentSetNode): { [key: string]: string[] } | undefined {
  if (comp.type !== 'COMPONENT_SET') return undefined;
  
  const variantOptions: { [key: string]: string[] } = {};
  const variantProps = comp.variantGroupProperties;
  
  if (!variantProps) return undefined;
  
  for (const [propName, prop] of Object.entries(variantProps)) {
    if ('values' in prop && prop.values.length > 0) {
      variantOptions[propName] = prop.values.map(v => v.name);
    }
  }
  
  return Object.keys(variantOptions).length > 0 ? variantOptions : undefined;
}

/**
 * Extract text slots with exact names (SHALLOW - no recursion)
 */
private static extractTextSlotsOptimized(comp: ComponentNode | ComponentSetNode): { [key: string]: any } | undefined {
  const slots: any = {};
  const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? 
    (comp.defaultVariant || comp.children[0]) : comp;
  
  if (!nodeToAnalyze || !('children' in nodeToAnalyze)) return undefined;
  
  // ONLY scan immediate children (depth 1)
  for (const child of nodeToAnalyze.children) {
    if (child.type === 'TEXT') {
      const textNode = child as TextNode;
      slots[child.name] = {
        required: child.visible !== false,
        type: textNode.textAutoResize === 'HEIGHT' ? 'multi-line' : 'single-line',
        maxLength: this.estimateMaxLength(textNode)
      };
    }
  }
  
  return Object.keys(slots).length > 0 ? slots : undefined;
}

/**
 * Extract component slots with exact names (SHALLOW - references only)
 */
private static extractComponentSlotsOptimized(comp: ComponentNode | ComponentSetNode): { [key: string]: any } | undefined {
  const slots: any = {};
  const nodeToAnalyze = comp.type === 'COMPONENT_SET' ? 
    (comp.defaultVariant || comp.children[0]) : comp;
  
  if (!nodeToAnalyze || !('children' in nodeToAnalyze)) return undefined;
  
  // ONLY scan immediate children (depth 1)
  for (const child of nodeToAnalyze.children) {
    if (child.type === 'INSTANCE') {
      const instance = child as InstanceNode;
      try {
        const mainComp = await instance.getMainComponentAsync();
        const category = this.guessComponentCategory(mainComp?.name || child.name);
        
        slots[child.name] = {
          componentId: mainComp?.id,
          category,
          swappable: true,
          required: child.visible !== false
        };
      } catch (error) {
        console.warn(`Failed to analyze component slot "${child.name}"`);
      }
    }
  }
  
  return Object.keys(slots).length > 0 ? slots : undefined;
}

/**
 * Extract layout behavior (semantic, no absolute coordinates)
 */
private static extractLayoutBehaviorOptimized(comp: ComponentNode | ComponentSetNode): any {
  const node = comp.type === 'COMPONENT_SET' ? 
    (comp.defaultVariant || comp.children[0]) : comp;
  
  if (!node || !('layoutMode' in node) || node.layoutMode === 'NONE') {
    return undefined;
  }
  
  const isIcon = 'width' in node && 'height' in node && 
    Math.max(node.width, node.height) <= 48;
  const isTouchTarget = 'height' in node && node.height >= 44;
  
  return {
    type: node.primaryAxisSizingMode === 'AUTO' ? 'hug-content' : 
          node.layoutAlign === 'STRETCH' ? 'fill-container' : 'fixed',
    direction: node.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical',
    hasInternalPadding: (node.paddingTop || 0) > 0,
    canWrap: node.layoutWrap === 'WRAP',
    minHeight: node.minHeight || undefined,
    isIcon,
    isTouchTarget
  };
}

/**
 * Extract style context (design system colors only, no detailed fills)
 */
private static extractStyleContextOptimized(comp: ComponentNode | ComponentSetNode): any {
  const node = comp.type === 'COMPONENT_SET' ? 
    (comp.defaultVariant || comp.children[0]) : comp;
  
  // Quick check for primary design system color
  let primaryColor: string | undefined;
  try {
    const styleInfo = this.extractStyleInfo(node as any);
    primaryColor = styleInfo?.primaryColor?.paintStyleName;
  } catch (error) {
    // Ignore styling errors
  }
  
  // Quick check for image slots (shallow scan)
  const hasImageSlot = this.hasImageSlotShallow(node);
  
  // Infer semantic role
  const semanticRole = this.inferSemanticRole(comp.name, comp.id);
  
  return {
    primaryColor,
    hasImageSlot,
    semanticRole
  };
}

/**
 * Helper: Guess component category for slots
 */
private static guessComponentCategory(name: string): 'icon' | 'button' | 'input' | 'image' | 'container' {
  const lowName = name.toLowerCase();
  if (lowName.includes('icon')) return 'icon';
  if (lowName.includes('button') || lowName.includes('btn')) return 'button';
  if (lowName.includes('input') || lowName.includes('field')) return 'input';
  if (lowName.includes('image') || lowName.includes('photo')) return 'image';
  return 'container';
}

/**
 * Helper: Estimate max text length
 */
private static estimateMaxLength(textNode: TextNode): number | undefined {
  if (!textNode.width) return undefined;
  const avgCharWidth = (textNode.fontSize as number || 14) * 0.6;
  const lines = textNode.textAutoResize === 'HEIGHT' ? 3 : 1;
  return Math.floor((textNode.width / avgCharWidth) * lines);
}

/**
 * Helper: Check for image slots (shallow)
 */
private static hasImageSlotShallow(node: any): boolean {
  if (!node || !('children' in node)) return false;
  
  // Only check immediate children
  for (const child of node.children) {
    if (child.type === 'RECTANGLE' || child.type === 'ELLIPSE') {
      try {
        const fills = child.fills;
        if (Array.isArray(fills) && fills.some(f => f.type === 'IMAGE')) {
          return true;
        }
      } catch (error) {
        // Ignore fill check errors
      }
    }
  }
  return false;
}

/**
 * Helper: Infer semantic role
 */
private static inferSemanticRole(name: string, id: string): 'navigation' | 'action' | 'display' | 'input' | 'container' {
  const lowName = name.toLowerCase();
  
  if (lowName.includes('nav') || lowName.includes('tab') || lowName.includes('menu')) {
    return 'navigation';
  }
  if (lowName.includes('button') || lowName.includes('cta')) {
    return 'action';
  }
  if (lowName.includes('card') || lowName.includes('item') || lowName.includes('list')) {
    return 'display';
  }
  if (lowName.includes('input') || lowName.includes('field') || lowName.includes('form')) {
    return 'input';
  }
  return 'container';
}
```

### **Крок 3: Оновити основний метод scanDesignSystem** ⏱️ 30 хвилин

**3.1 Знайти метод scanDesignSystem (приблизно line 600-700):**

**3.2 Замінити виклик analyzeComponent:**
```typescript
// ЗАМІНИТИ цей рядок (приблизно line 653):
// const componentInfo = await this.analyzeComponent(node as ComponentNode | ComponentSetNode);

// НА цей рядок:
const componentInfo = await this.analyzeComponentOptimized(node as ComponentNode | ComponentSetNode);
```

**3.3 Оновити інтерфейс повернення:**
```typescript
// Замінити тип повернення з ComponentInfo[] на LLMOptimizedComponentInfo[]
static async scanDesignSystem(): Promise<{
  components: LLMOptimizedComponentInfo[], // ← ЗМІНИТИ ТУТ
  colorStyles?: ColorStyleCollection,
  textStyles?: TextStyle[],
  designTokens?: DesignToken[],
  scanTime: number,
  version: string,
  fileKey?: string
}> {
```

### **Крок 4: Видалити важкі методи** ⏱️ 15 хвилин

**❌ КОМЕНТУВАТИ ці методи (НЕ видаляти, на всякий випадок):**

```typescript
// Line ~868: analyzeComponentStructure - рекурсивна бомба (90% проблеми)
/*
static async analyzeComponentStructure(...) {
  // ... весь метод закоментувати
}
*/

// Line ~932: extractNodeProperties - абсолютні координати
/*
private static async extractNodeProperties(...) {
  // ... весь метод закоментувати
}
*/

// Line ~1949: findComponentInstances - повне сканування
/*
static async findComponentInstances(...) {
  // ... весь метод закоментувати
}
*/

// Line ~1988: findVectorNodes - детальне сканування векторів
/*
static findVectorNodes(...) {
  // ... весь метод закоментувати
}
*/

// Line ~2014: findImageNodes - детальне сканування зображень
/*
static findImageNodes(...) {
  // ... весь метод закоментувати
}
*/
```

### **Крок 5: Оновити старий analyzeComponent** ⏱️ 15 хвилин

**5.1 Знайти метод analyzeComponent (line ~1369):**

**5.2 Видалити важкі виклики:**
```typescript
static async analyzeComponent(comp: ComponentNode | ComponentSetNode): Promise<ComponentInfo> {
  // ... зберегти початок методу до line ~1390
  
  // ❌ ЗАКОМЕНТУВАТИ ці рядки:
  // componentStructure = await this.analyzeComponentStructure(nodeToAnalyze as SceneNode);
  
  // ❌ ЗАКОМЕНТУВАТИ ці рядки:
  // const textLayers = this.findTextLayers(comp);
  // const componentInstances = await this.findComponentInstances(comp);
  // const vectorNodes = this.findVectorNodes(comp);
  // const imageNodes = this.findImageNodes(comp);
  
  // ... зберегти решту методу без змін
  
  return {
    // ... всі поля як раніше, але:
    componentStructure: undefined, // ← ЗМІНИТИ НА undefined
    textLayers: undefined, // ← ЗМІНИТИ НА undefined  
    componentInstances: undefined, // ← ЗМІНИТИ НА undefined
    vectorNodes: undefined, // ← ЗМІНИТИ НА undefined
    imageNodes: undefined, // ← ЗМІНИТИ НА undefined
    // ... решта полів без змін
  };
}
```

---

## 🧪 Тестування

### Після реалізації:

**1. Тест розміру файлу:**
```bash
# Запустити сканування в Figma плагіні
# Порівняти розмір нового JSON файлу:
# Очікуваний результат: 3.2MB → ~230KB (зменшення на 93%)
```

**2. Тест функціональності:**
```bash
# Запустити 5 тестових UI сценаріїв
python3 instance.py alt3
# Перевірити чи працює Stage 2 (UX/UI Designer) з новими даними
```

---

## ⚠️ Важливі попередження

**1. Не чіпати методи кольорів та стилів:**
- `scanFigmaVariables()` - залишити як є
- `analyzeTextHierarchy()` - залишити як є  
- `extractStyleInfo()` - використовувати, але результат не зберігати повністю

**2. Зворотна сумісність:**
- Старий інтерфейс `ComponentInfo` залишити в session-manager.ts
- Можна буде переключатись між форматами при потребі

**3. Логування:**
- Додавати console.log для кожного етапу оптимізації
- Логувати розміри даних для моніторингу

---

## 📊 Очікувані результати

- **Розмір JSON**: 3.2MB → ~230KB (93% зменшення)
- **Функціональність**: LLM отримує всю критичну інформацію для вибору компонентів
- **Продуктивність**: Пайплайн знову працює з Gemini API
- **Точність**: Зберігаються точні назви слотів для visibility override

**Критерій успіху**: Pipeline `python3 instance.py alt3` успішно генерує UI з новими оптимізованими даними.