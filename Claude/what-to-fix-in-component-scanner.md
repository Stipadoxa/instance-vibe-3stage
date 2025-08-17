# What to Fix in Component Scanner

**Date**: 2025-08-16  
**Author**: Claude  
**Priority**: CRITICAL

## 🚨 КРИТИЧНА ПРОБЛЕМА: Text Style References НЕ сканються

### Проблема
Поточний component scanner НЕ зберігає посилання на Design System text styles при аналізі компонентів. Це призводить до втрати зв'язку між компонентами та дизайн-системою.

### Що відсутнє в `analyzeTextHierarchy()`

**Файл**: `src/core/component-scanner.ts` (приблизно лінія 800+)

```typescript
// ❌ ПОТОЧНИЙ КОД - збирає тільки сирі властивості:
const textHierarchyItem: TextHierarchy = {
  nodeName: textNode.name,
  nodeId: textNode.id,
  fontSize: fontSize,
  fontWeight: fontWeight,
  classification: classification,
  visible: textNode.visible,
  characters: textNode.characters,
  textColor: textColor
};
```

### Що потрібно додати

```typescript
// ✅ ВИПРАВЛЕНИЙ КОД - зберігає посилання на Design System:
const textHierarchyItem: TextHierarchy = {
  nodeName: textNode.name,
  nodeId: textNode.id,
  fontSize: fontSize,
  fontWeight: fontWeight,
  classification: classification,
  visible: textNode.visible,
  characters: textNode.characters,
  textColor: textColor,
  
  // 🆕 ДОДАТИ ЦІ ПОЛЯ:
  textStyleId: textNode.textStyleId || undefined,
  boundTextStyleId: textNode.boundTextStyleId || undefined,
  usesDesignSystemStyle: !!textNode.textStyleId || !!textNode.boundTextStyleId
};
```

### Також потрібно оновити інтерфейс

**Файл**: `src/core/session-manager.ts` (TextHierarchy interface)

```typescript
export interface TextHierarchy {
  nodeName: string;
  nodeId: string;
  fontSize: number;
  fontWeight: string | number;
  classification: 'primary' | 'secondary' | 'tertiary';
  visible: boolean;
  characters?: string;
  textColor?: ColorInfo;
  
  // 🆕 ДОДАТИ ЦІ ПОЛЯ:
  textStyleId?: string;           // ID стилю з Design System для швидкого рендерингу
  textStyleName?: string;         // Назва стилю для JSON Engineer lookup та fallback
  boundTextStyleId?: string;      // Bound variable для text style
  usesDesignSystemStyle?: boolean; // Флаг використання ДС
}
```

**Навіщо потрібна textStyleName:**
- **JSON Engineer lookup**: Конвертація назв в ID через таблицю відповідності
- **Fallback mechanism**: Якщо textStyleId не працює, використовує textStyleName
- **Debug information**: Для логування та troubleshooting у зрозумілому форматі
- **Pipeline compatibility**: Зберігає сумісність з існуючим workflow

### Поточний результат (НЕПРАВИЛЬНО)
```json
{
  "textHierarchy": [{
    "nodeName": "Supporting text",
    "fontSize": 14,
    "fontWeight": 400,
    "textColor": "#fcfdfd"
  }]
}
```

### Очікуваний результат (ПРАВИЛЬНО)
```json
{
  "textHierarchy": [{
    "nodeName": "Supporting text",
    "fontSize": 14,
    "fontWeight": 400,
    "textColor": "#fcfdfd",
    "textStyleId": "S:abc123def456",
    "usesDesignSystemStyle": true
  }]
}
```

### Наслідки проблеми

1. **Python pipeline НЕ ЗНАЄ** що текст використовує Design System стилі
2. **Stage 2 (UX/UI Designer)** працює тільки з назвами стилів, без технічного зв'язку
3. **Stage 3 (JSON Engineer)** НЕ МОЖЕ додати textStyleId для ефективного рендерингу
4. **Figma Renderer** змушений робити повільний lookup за назвами замість швидкого ID lookup
5. **Втрата consistency** - ненадійний зв'язок через назви які можуть змінитись

### Пріоритет: КРИТИЧНИЙ
Без цього фікса фіча Text Styles з Design System не працює повноцінно, що суттєво впливає на якість згенерованих UI компонентів.

---

## 🚨 ДРУГА КРИТИЧНА ПРОБЛЕМА: Color Style & Variable References НЕ сканються

### Проблема з кольорами
Аналогічно до text styles, component scanner НЕ зберігає посилання на Design System color styles та variables при аналізі кольорів компонентів.

### Що відсутнє в `convertPaintToColorInfo()`

**Файл**: `src/core/component-scanner.ts`

```typescript
// ❌ ПОТОЧНИЙ КОД - збирає тільки resolved кольори:
static convertPaintToColorInfo(paint: Paint): ColorInfo | null {
  if (paint.type === 'SOLID' && paint.color) {
    return {
      type: 'SOLID',
      color: this.rgbToHex(paint.color),  // Тільки resolved значення
      opacity: paint.opacity || 1
    };
  }
}
```

### Що потрібно додати

```typescript
// ✅ ВИПРАВЛЕНИЙ КОД - зберігає посилання на Design System:
static convertPaintToColorInfo(paint: Paint): ColorInfo | null {
  if (paint.type === 'SOLID' && paint.color) {
    return {
      type: 'SOLID',
      color: this.rgbToHex(paint.color),
      opacity: paint.opacity || 1,
      
      // 🆕 ДОДАТИ ЦІ ПОЛЯ:
      paintStyleId: paint.paintStyleId || undefined,           // Color Style ID
      boundVariables: paint.boundVariables || undefined,       // Design Tokens
      usesDesignSystemColor: !!(paint.paintStyleId || paint.boundVariables)
    };
  }
}
```

### Поточний результат кольорів (НЕПРАВИЛЬНО)
```json
{
  "styleInfo": {
    "fills": [{
      "type": "SOLID",
      "color": "#00b53f",
      "opacity": 1
    }],
    "primaryColor": {
      "type": "SOLID", 
      "color": "#00b53f",
      "opacity": 1
    }
  }
}
```

### Очікуваний результат (ПРАВИЛЬНО)
```json
{
  "styleInfo": {
    "fills": [{
      "type": "SOLID",
      "color": "#00b53f",
      "opacity": 1,
      "paintStyleId": "S:abc123def456",
      "usesDesignSystemColor": true
    }],
    "primaryColor": {
      "type": "SOLID",
      "color": "#00b53f", 
      "opacity": 1,
      "paintStyleId": "S:abc123def456",
      "usesDesignSystemColor": true
    }
  }
}
```

### Наслідки проблеми з кольорами

1. **Python pipeline НЕ ЗНАЄ** що компонент використовує Color Styles з ДС
2. **Stage 2 (Designer)** працює тільки з hex кольорами, без зв'язку з ДС
3. **Stage 3 (JSON Engineer)** НЕ МОЖЕ додати paintStyleId для ефективного рендерингу
4. **Figma Renderer** втрачає інформацію про те, які кольори мають бути зв'язані з ДС
5. **Inconsistency** у кольоровій схемі між оригіналом та згенерованим UI

---

## Інші проблеми для подальшого вирішення

### TODO: Додати сканування layout properties
- `layoutMode`, `primaryAxisSizingMode`, `counterAxisSizingMode`
- Детальна структура parent-child для nested elements
- Advanced styling: shadows, borders, corner radius

---

## 🚨 ТРЕТЯ КРИТИЧНА ПРОБЛЕМА: Variable IDs повністю відсутні

### Проблема з variableId
При аналізі коду та JSON файлів виявилось, що `variableId` поля **ВЗАГАЛІ НЕ СКАНУЮТЬ**.

### Статистика з design-system JSON:
- **89 випадків** `"boundVariables": {}` - завжди порожні
- **0 випадків** `variableId` - поле взагалі відсутнє
- **Код не містить** жодної згадки про `variableId`

### Критичні відсутні поля в Paint objects:

```typescript
// ❌ ПОТОЧНИЙ КОД - збирає тільки paints як є:
static async convertPaintStyleToColorStyle(paintStyle: PaintStyle): Promise<ColorStyle> {
  return {
    id: paintStyle.id,
    name: paintStyle.name,
    paints: paintStyle.paints,  // ❌ Паінти містять boundVariables: {}
    // 🚨 ВІДСУТНЄ: обробка variableId з кожного paint
  };
}
```

### Що повинно бути згідно Figma API:

```typescript
// ✅ ПРАВИЛЬНА СТРУКТУРА для Paint:
interface Paint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | ...;
  color?: RGB;
  opacity?: number;
  paintStyleId?: string;      // Color Style ID  
  boundVariables?: {          // Design Token посилання
    [field: string]: VariableAlias | Variable;
  };
}

// ✅ ПРАВИЛЬНА СТРУКТУРА для компонентів:
{
  "fills": [{
    "type": "SOLID",
    "color": "#00b53f",
    "paintStyleId": "S:abc123",        // ✅ Color Style reference
    "boundVariables": {                // ✅ Variable references  
      "color": {
        "type": "VARIABLE_ALIAS",
        "id": "VariableID:456"
      }
    }
  }]
}
```

### Наслідки відсутності variableId:

1. **Python pipeline НЕ ЗНАЄ** що компонент використовує Design Tokens
2. **Stage 3 (JSON Engineer)** НЕ МОЖЕ додати variable references для рендерингу  
3. **Figma Renderer НЕ МОЖЕ** застосувати Design Token при рендерингу
4. **Втрата зв'язку** між згенерованими компонентами та Variables
5. **Неможливість dynamic theming** - зміна токенів не впливає на UI
6. **Порушення Design System consistency** 

### Що потрібно виправити:

#### 1. В `convertPaintToColorInfo()`:
```typescript
static convertPaintToColorInfo(paint: Paint): ColorInfo | null {
  return {
    type: 'SOLID',
    color: this.rgbToHex(paint.color),
    opacity: paint.opacity || 1,
    
    // 🆕 ДОДАТИ ЦІ КРИТИЧНІ ПОЛЯ:
    paintStyleId: paint.paintStyleId,
    boundVariables: paint.boundVariables,
    variableReferences: this.extractVariableReferences(paint.boundVariables)
  };
}

// 🆕 НОВА ФУНКЦІЯ:
static extractVariableReferences(boundVars: any): VariableReference[] {
  // Парсинг boundVariables для отримання variable IDs
}
```

#### 2. В інтерфейсах:
```typescript
interface ColorInfo {
  type: string;
  color: string;
  opacity: number;
  
  // 🆕 ДОДАТИ:
  paintStyleId?: string;
  boundVariables?: any;
  variableReferences?: VariableReference[];
}
```

### Пріоритет: КРИТИЧНИЙ
**Без variableId система Design Tokens не функціонує взагалі** - це основа для зв'язку між компонентами та токенами.

## 🔄 Правильний workflow після фіксів

### Як має працювати pipeline після виправлень:

**1. Component Scanner →** збирає повну інформацію:
```json
{
  "textStyles": [
    {"id": "S:abc123", "name": "Body/Large", "fontSize": 16}
  ],
  "components": [{
    "textHierarchy": [{
      "textStyleId": "S:abc123",     // ✅ ID для технічного зв'язку
      "textStyleName": "Body/Large", // ✅ Назва для промпта
      "fontSize": 16                 // ✅ Resolved значення
    }]
  }]
}
```

**2. Stage 2 (Designer) →** працює з назвами (БЕЗ ЗМІН):
```json
{
  "type": "native-text",
  "textHierarchy": "Body/Large",  // ✅ Використовує назву
  "characters": "Sample text"
}
```

**3. Stage 3 (JSON Engineer) →** додає технічні ID:
```json
{
  "type": "native-text",
  "textHierarchy": "Body/Large",     // ✅ Назва залишається
  "textStyleId": "S:abc123",         // ✅ Додає ID через lookup
  "characters": "Sample text"
}
```

**4. Figma Renderer →** швидкий рендеринг:
```typescript
// Використовує ID для миттєвого застосування:
await textNode.setTextStyleIdAsync("S:abc123");
```

### Переваги:
- **Designer prompt НЕ ЗМІНЮЄТЬСЯ** - працює з назвами як зараз
- **JSON Engineer отримує lookup table** для конвертації назв в ID
- **Renderer стає швидшим** - ID lookup замість name search
- **Зберігається надійність** - якщо назва змінилась, ID залишається

---

### TODO: Покращити підтримку Design Tokens
- ✅ Сканування Variables API (вже працює)
- ❌ **КРИТИЧНО**: Сканування variableId з Paint objects  
- ❌ **КРИТИЧНО**: Обробка boundVariables 
- ❌ Зберігання variable references в component schema
- ❌ Категоризація токенів за типами

---

## 📋 Рекомендації для покращення Component Scanner

### 1. Додати структуру parent-child для nested elements

**Проблема**: Поточний сканер використовує `findAll()` що знаходить всі елементи плоско, втрачаючи ієрархію.

**Рішення**:
```typescript
interface ComponentStructure {
  id: string;
  type: string;
  name: string;
  children: ComponentStructure[];
  parent?: string;
  depth: number;
}

static analyzeComponentStructure(comp: ComponentNode): ComponentStructure {
  // Рекурсивний обхід дерева компонента
  // Збереження parent-child зв'язків
  // Визначення глибини вкладеності
}
```

**Переваги**:
- Python pipeline розуміє внутрішню архітектуру компонентів
- Можливість точного відтворення nested layouts
- Кращий аналіз складних компонентів

### 2. Зберігати layout modes та sizing information

**Проблема**: Відсутні критичні layout властивості компонентів.

**Рішення**:
```typescript
interface LayoutInfo {
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode: 'FIXED' | 'AUTO';
  counterAxisSizingMode: 'FIXED' | 'AUTO';
  primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX';
  itemSpacing: number;
  constraints: {
    horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
    vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  };
}

static extractLayoutInfo(comp: ComponentNode): LayoutInfo {
  // Сканування всіх layout властивостей
  // Аналіз auto-layout поведінки
  // Збереження constraints
}
```

**Переваги**:
- Точне відтворення layout поведінки
- Правильне sizing в різних контекстах
- Кращий responsive design

### 3. Сканувати advanced styling properties

**Проблема**: Поточний сканер збирає тільки базові кольори, ігноруючи складне стилювання.

**Рішення**:
```typescript
interface AdvancedStyleInfo {
  // Shadows & Effects
  effects: Effect[];
  dropShadows: DropShadowEffect[];
  innerShadows: InnerShadowEffect[];
  blurs: BlurEffect[];
  
  // Borders & Strokes
  strokes: Paint[];
  strokeWeight: number;
  strokeAlign: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeCap: StrokeCap;
  strokeJoin: StrokeJoin;
  dashPattern: number[];
  
  // Corner radius
  cornerRadius: number;
  rectangleCornerRadii: [number, number, number, number];
  
  // Opacity & Blend modes
  opacity: number;
  blendMode: BlendMode;
  isMask: boolean;
}

static extractAdvancedStyling(node: SceneNode): AdvancedStyleInfo {
  // Збір всіх effects
  // Аналіз stroke properties
  // Обробка corner radius variants
  // Збереження blend modes
}
```

**Переваги**:
- Повне відтворення візуального стилю
- Підтримка складних design effects
- Кращий UI consistency

### 4. Покращити аналіз auto-layout поведінки

**Проблема**: Поточний аналіз auto-layout дуже поверхневий.

**Рішення**:
```typescript
interface AutoLayoutBehavior {
  isAutoLayout: boolean;
  layoutMode: 'HORIZONTAL' | 'VERTICAL' | 'WRAP';
  layoutWrap: 'NO_WRAP' | 'WRAP';
  
  // Sizing behavior
  resizeMode: 'FIXED' | 'HUG' | 'FILL';
  primaryAxisBehavior: 'FIXED' | 'AUTO';
  counterAxisBehavior: 'FIXED' | 'AUTO';
  
  // Spacing & padding
  itemSpacing: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  
  // Alignment
  primaryAxisAlignment: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignment: 'MIN' | 'CENTER' | 'MAX';
  
  // Children behavior
  childrenSizingModes: Array<{
    nodeId: string;
    layoutAlign: 'INHERIT' | 'STRETCH';
    layoutGrow: number;
  }>;
}

static analyzeAutoLayoutBehavior(comp: ComponentNode): AutoLayoutBehavior {
  // Глибокий аналіз auto-layout properties
  // Вивчення children layout behavior
  // Розуміння responsive patterns
}
```

**Переваги**:
- Точне відтворення автоматичного layout
- Кращий responsive behavior
- Розуміння complex layout patterns

### 5. Додаткові покращення

#### A. Component Dependencies
```typescript
interface ComponentDependencies {
  usedComponents: string[];        // Nested component IDs
  requiredColorStyles: string[];   // Used color style IDs  
  requiredTextStyles: string[];    // Used text style IDs
  requiredVariables: string[];     // Used variable IDs
}
```

#### B. Interaction States
```typescript
interface InteractionStates {
  hasHoverState: boolean;
  hasPressedState: boolean;
  hasDisabledState: boolean;
  hasSelectedState: boolean;
  stateVariants: string[];         // State-related variants
}
```

---

## 📊 Пріоритизація виправлень

### Критичний пріоритет (ЗАРАЗ):
1. **textStyleId** - зв'язок з Text Styles
2. **paintStyleId** - зв'язок з Color Styles  
3. **variableId/boundVariables** - зв'язок з Design Tokens

### Високий пріоритет (НАСТУПНЕ):
4. **Layout information** - sizing modes, constraints
5. **Component structure** - parent-child relationships

### Середній пріоритет (ПІЗНІШЕ):
6. **Advanced styling** - shadows, borders, effects
7. **Auto-layout behavior** - детальний аналіз

### Низький пріоритет (МАЙБУТНЄ):
8. **Component dependencies** - usage tracking
9. **Interaction states** - hover, pressed, etc.

**Загальна оцінка поточної повноти: 75% → 95% після всіх фіксів**

---

## 🚨 КРИТИЧНІ ВИПРАВЛЕННЯ архітектури pipeline

### Проблема: Design System даних недоступні для JSON Engineer

**Поточна проблема**: JSON Engineer не має доступу до textStyles, colorStyles та designTokens для lookup операцій.

### 1. Виправити структуру design-system JSON

**Файл**: Результат `ComponentScanner.scanDesignSystem()`

**Поточна структура (НЕПОВНА)**:
```json
{
  "metadata": {
    "componentCount": 164,
    "colorStylesCount": 89
  },
  "components": [...],
  "colorStyles": {...}
  // 🚨 ВІДСУТНЄ: textStyles, designTokens
}
```

**Потрібна структура (ПОВНА)**:
```json
{
  "metadata": {
    "componentCount": 164,
    "colorStylesCount": 89,
    "textStylesCount": 12,        // 🆕 ДОДАТИ
    "designTokensCount": 45       // 🆕 ДОДАТИ
  },
  "components": [...],
  "colorStyles": {...},
  "textStyles": [               // 🆕 КРИТИЧНО ПОТРІБНО
    {
      "id": "S:abc123",
      "name": "Body/Large", 
      "fontSize": 16,
      "fontWeight": 400
    }
  ],
  "designTokens": [             // 🆕 КРИТИЧНО ПОТРІБНО
    {
      "id": "VariableID:xyz789",
      "name": "color-primary",
      "type": "COLOR",
      "value": {"r": 0, "g": 0.71, "b": 0.25}
    }
  ]
}
```

**Навіщо це потрібно:**
- **JSON Engineer** потребує lookup tables для конвертації назв в ID
- **Python pipeline** має розуміти повну картину Design System
- **Consistency** між сканованими даними та використанням

### 2. Виправити Component Scanner збереження

**Файл**: `src/core/component-scanner.ts` (scanDesignSystem method)

**Проблема**: Variables сканують але не зберігають в JSON результат.

**Поточний код**:
```typescript
const scanSession: ScanSession = {
  components,
  colorStyles,
  textStyles,        // ✅ Сканують
  designTokens,      // ✅ Сканують
  scanTime: Date.now(),
  version: "2.1.0"
};
```

**Проблема**: `textStyles` та `designTokens` не потрапляють в фінальний design-system JSON файл.

**Потрібне виправлення**: Перевірити чому ці поля не зберігаються в `design-system/design-system-raw-data-*.json`.

### 3. Додати lookup методи в JSON Engineer

**Файл**: `src/prompts/roles/5 json-engineer.txt`

**Потрібні функції**:
```typescript
// В JSON Engineer Stage 3:
function resolveTextStyleId(styleName: string, textStyles: TextStyle[]): string | null {
  const style = textStyles.find(s => s.name === styleName);
  return style ? style.id : null;
}

function resolveColorStyleId(colorHex: string, colorStyles: ColorStyle[]): string | null {
  const style = colorStyles.find(s => s.colorInfo.color === colorHex);
  return style ? style.id : null;
}

function resolveVariableId(tokenName: string, designTokens: DesignToken[]): string | null {
  const token = designTokens.find(t => t.name === tokenName);
  return token ? token.id : null;
}
```

**Навіщо це потрібно:**
- **Автоматична конвертація** назв стилів в технічні ID
- **Двостороння сумісність** - зберігає і назву і ID
- **Robust fallback** - якщо lookup не спрацював, залишається назва

### 4. Виправити analyzeTextHierarchy сканування

**Файл**: `src/core/component-scanner.ts` (analyzeTextHierarchy method)

**Додати збереження назви стилю**:
```typescript
// В analyzeTextHierarchy, додати:
let textStyleName: string | undefined;
if (textNode.textStyleId) {
  // Отримати назву стилю через Figma API
  try {
    const textStyle = await figma.getLocalTextStyleByIdAsync(textNode.textStyleId);
    textStyleName = textStyle?.name;
  } catch (error) {
    console.warn(`Could not resolve text style name for ID: ${textNode.textStyleId}`);
  }
}

textHierarchy.push({
  nodeName: textNode.name,
  nodeId: textNode.id,
  fontSize,
  fontWeight,
  classification,
  visible: textNode.visible,
  characters,
  textColor,
  textStyleId: textNode.textStyleId,           // 🆕 ID
  textStyleName: textStyleName,                // 🆕 Назва
  usesDesignSystemStyle: !!textNode.textStyleId
});
```

**Навіщо це потрібно:**
- **Повна інформація** про зв'язок між компонентом та стилем
- **JSON Engineer lookup** можливість
- **Fallback compatibility** для існуючого workflow

---

### Пріоритет виправлень архітектури: КРИТИЧНИЙ

**Без цих виправлень**, фікси textStyleId та paintStyleId не матимуть сенсу, бо JSON Engineer не зможе виконати lookup операції.

**Послідовність виправлень**:
1. Виправити збереження textStyles/designTokens в design-system JSON
2. Додати textStyleName в Component Scanner  
3. Оновити TextHierarchy інтерфейс
4. Додати lookup логіку в JSON Engineer

---

## 📋 Інструкції для наступного агента

### Середовище і контекст

**Робоча директорія**: `/Users/stipa/UXPal`

**Головні файли для роботи**:
- `src/core/component-scanner.ts` - основний сканер компонентів
- `src/core/session-manager.ts` - інтерфейси TypeScript  
- `src/core/figma-renderer.ts` - рендерер (для розуміння використання)
- `design-system/design-system-raw-data-*.json` - приклади згенерованих даних

**Тестові дані**: Використовуй найновіший `design-system-raw-data-2025-08-16T17-44-33.json` для перевірки поточної структури.

### Технологічний стек

- **TypeScript** - основна мова
- **Figma Plugin API** - `figma.getLocalTextStylesAsync()`, `figma.getLocalPaintStylesAsync()`
- **Node.js** - для збірки та тестування

### Важливі деталі реалізації

#### 1. Figma API обмеження:
```typescript
// ✅ Правильно - async функції:
const textStyles = await figma.getLocalTextStylesAsync();
const textStyle = await figma.getLocalTextStyleByIdAsync(styleId);

// ❌ Неправильно - sync функції не існують:
const textStyles = figma.getLocalTextStyles(); // НЕ ІСНУЄ
```

#### 2. Поточна архітектура pipeline:
```
Component Scanner → design-system JSON → Python Stage 2 → Stage 3 JSON Engineer → Figma Renderer
```

#### 3. Існуючі структури даних:
```typescript
// Поточний TextHierarchy (НЕ міняй existing поля):
interface TextHierarchy {
  nodeName: string;           // ✅ Зберегти
  nodeId: string;            // ✅ Зберегти  
  fontSize: number;          // ✅ Зберегти
  fontWeight: string | number; // ✅ Зберегти
  classification: 'primary' | 'secondary' | 'tertiary'; // ✅ Зберегти
  visible: boolean;          // ✅ Зберегти
  characters?: string;       // ✅ Зберегти
  textColor?: ColorInfo;     // ✅ Зберегти
  
  // 🆕 Додати тільки ці поля
}
```

### Методи тестування

#### 1. Перевірка роботи сканера:
```bash
# В Figma Plugin Console:
python3 instance.py alt3  # Запуск base pipeline
```

#### 2. Перевірка JSON результату:
```bash
# Перевірити найновіший файл:
ls -la design-system/design-system-raw-data-*.json | tail -1
```

#### 3. Тестування з реальними компонентами:
- Використовуй компонент "Button" (ID: "10:3907") з test data
- Перевір textHierarchy для "snackbar" (ID: "10:3856")

### Критичні помилки, яких треба уникати

#### 1. НЕ руйнуй existing workflow:
- **НЕ змінюй** існуючі поля в інтерфейсах
- **НЕ ламай** сумісність з Python pipeline
- **НЕ видаляй** resolved значення (fontSize, fontWeight, etc.)

#### 2. НЕ припускай наявність API:
```typescript
// ❌ НЕ припускай що це існує:
figma.getTextStyleByName("Body/Large")

// ✅ Використовуй тільки задокументовані API:
figma.getLocalTextStylesAsync()
figma.getLocalTextStyleByIdAsync(id)
```

#### 3. Обробляй помилки:
```typescript
try {
  const textStyle = await figma.getLocalTextStyleByIdAsync(textNode.textStyleId);
  textStyleName = textStyle?.name;
} catch (error) {
  console.warn(`Could not resolve text style name: ${error}`);
  textStyleName = undefined; // Fallback
}
```

### Особливості Figma Plugin розробки

#### 1. Async operations потрібні:
```typescript
// Всі Figma API calls асинхронні
await figma.loadAllPagesAsync();
const styles = await figma.getLocalTextStylesAsync();
```

#### 2. Error handling критичний:
```typescript
// Figma може тимчасово не відповідати
try {
  // Figma API call
} catch (error) {
  console.warn("Figma API temporary issue:", error);
  // Graceful fallback
}
```

#### 3. Console logging для дебагу:
```typescript
console.log("🔍 Scanning text styles...");
console.log(`✅ Found ${textStyles.length} text styles`);
console.warn("⚠️ Could not resolve style name");
console.error("❌ Critical error:", error);
```

### Критерії успіху

#### 1. design-system JSON містить:
```json
{
  "textStyles": [...],     // ✅ Має з'явитись
  "designTokens": [...],   // ✅ Має з'явитись
  "components": [{
    "textHierarchy": [{
      "textStyleId": "S:...",    // ✅ Має з'явитись
      "textStyleName": "Body/Large", // ✅ Має з'явитись
      "usesDesignSystemStyle": true  // ✅ Має з'явитись
    }]
  }]
}
```

#### 2. Зворотна сумісність:
- Python pipeline продовжує працювати
- Існуючі JSON файли валідні
- Renderer отримує додаткову інформацію

#### 3. Performance:
- Сканування не повільніше ніж зараз
- Мінімум додаткових Figma API calls
- Graceful degradation при помилках

### Пріоритети для агента

**КРИТИЧНО (зробити першим)**:
1. Додати textStyleId + textStyleName в analyzeTextHierarchy
2. Оновити TextHierarchy interface  
3. Перевірити збереження textStyles в JSON

**ВИСОКО (зробити другим)**:
4. Додати paintStyleId в convertPaintToColorInfo
5. Додати boundVariables обробку

**СЕРЕДНЬО (якщо залишиться час)**:
6. Покращити error handling
7. Додати performance logging

### Контакт і допомога

Якщо виникають питання про існуючий код або архітектуру - перечитай цей документ. Всі критичні деталі тут описані.

**Успіхів! 🚀**
