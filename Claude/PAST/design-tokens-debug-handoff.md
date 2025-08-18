# Design Tokens Debug Handoff

## 🎯 Мета
Налаштувати Design Tokens інтеграцію в Component Scanner для розв'язання Variable IDs в семантичні назви токенів (замість сирих hex кольорів).

## 🔍 Поточний стан проблеми

### ✅ Що працює:
- Component Scanner сканує та знаходить 109 Design Tokens
- `boundVariables` збираються правильно (385 входжень у JSON)
- Variables існують у Figma файлі (54 штуки у Variables панелі)
- Логи показують: `⚠️ Variable ID not found in map: VariableID:...`

### ❌ Основна проблема:
**variableMap порожня** - Variable IDs не розв'язуються в назви токенів, тому:
- `usesDesignToken: false` завжди
- `designToken` поля відсутні в результатах
- JSON Engineer отримує hex кольори замість семантичних назв

## 🛠️ Реалізація (завершена)

### Додано до коду:
1. **VariableDetails interface** (session-manager.ts:6-12)
2. **Розширено ColorInfo** з полями `designToken` та `usesDesignToken` (session-manager.ts:26-27)
3. **Variable Maps** (component-scanner.ts:71-73):
   ```typescript
   private static variableMap: Map<string, string> = new Map();
   private static variableDetails: Map<string, VariableDetails> = new Map();
   ```
4. **buildVariableMap()** метод (component-scanner.ts:85-109)
5. **Розширено convertPaintToColorInfo()** (component-scanner.ts:690-710)
6. **JSON Engineer промпт** доповнено Design Token Intelligence (5 json-engineer.txt:361-388)

## 🐛 Діагностика проблеми

### Логи при скануванні:
```
🎉 Comprehensive scan complete!
🔧 Design Tokens: 109  // ✅ Токени знаходяться
🎨 Color Styles: 89
⚠️ Variable ID not found in map: VariableID:... // ❌ variableMap порожня
```

### Debug логи додані:
- `🔧 Phase 1: Scanning Design Tokens...` - **З'ЯВЛЯЄТЬСЯ**
- `🔍 DEBUG: About to call scanFigmaVariables()` - **НЕ З'ЯВЛЯЄТЬСЯ**

## 🔬 Теорії причин

### Теорія 1: scanFigmaVariables() не викликається
**Ймовірність: ВИСОКА**
- `Phase 1` лог з'являється, але наступні debug логи не з'являються
- Можливо код падає або зупиняється в `scanFigmaVariables()`

### Теорія 2: figma.variables API недоступне
**Ймовірність: СЕРЕДНЯ**  
- Variables панель показує 54 токени, але API може їх не бачити
- Можливо токени в library, а не локальні

### Теорія 3: Variables API повертає інший формат
**Ймовірність: НИЗЬКА**
- API працює, але структура даних не відповідає очікуваній

## 🎯 Наступні кроки

### 1. Перевірити чи викликається scanFigmaVariables()
**Debug логи вже додані в код** (component-scanner.ts:517-545):
```typescript
console.log("🔍 DEBUG: About to call scanFigmaVariables()");
console.log("🔍 DEBUG: Entering scanFigmaVariables()");
console.log("🔧 Scanning Figma Variables (Design Tokens)...");
```

**Дії**: Запустити скан і перевірити чи з'являються ці логи після `Phase 1`.

### 2. Якщо scanFigmaVariables() не викликається:
- Перевірити чи немає помилки в коді перед викликом
- Додати try-catch навколо виклику
- Переконатися що `designTokens = await this.scanFigmaVariables();` виконується

### 3. Якщо scanFigmaVariables() викликається але повертає []:
**Debug логи в scanFigmaVariables()** (component-scanner.ts:87-105):
```typescript
console.log("🔍 DEBUG: figma object:", typeof figma);
console.log("🔍 DEBUG: figma.variables:", typeof figma.variables);
console.log(`✅ Found ${collections.length} variable collections`);
```

### 4. Перевірити Variables API доступність:
```typescript
// У scanFigmaVariables()
if (!figma.variables) {
  console.warn("❌ figma.variables API not available");
  console.warn("🔍 DEBUG: figma keys:", Object.keys(figma));
  return [];
}
```

### 5. Якщо API працює але variableMap не будується:
**Debug логи в buildVariableMap()** вже додані (component-scanner.ts:585-595):
```typescript
console.log('🔍 DEBUG: designTokens received:', designTokens);
console.log('🔍 DEBUG: First 3 designTokens:', designTokens.slice(0, 3));
```

## 📝 Технічні деталі

### boundVariables формат (з Figma API):
```javascript
paint.boundVariables = {
  "color": {
    "type": "VARIABLE_ALIAS", 
    "id": "VariableID:f4bb3c0ca3ce362f236db721d52bef5a1933b145/2475:19"
  }
}
```

### Очікуваний результат:
```typescript
// Замість
{ color: "#3B82F6", usesDesignToken: false }

// Має бути  
{ color: "#3B82F6", designToken: "Primary/Blue/500", usesDesignToken: true }
```

## 🚀 Швидке тестування

Для швидкої перевірки додай простий лог у `main()` функцію:
```typescript
console.log("🧪 FIGMA VARIABLES TEST:", typeof figma.variables);
```

Якщо показує `undefined` - Variables API недоступне в цій версії Figma.

## 📁 Змінені файли:
- `/src/core/component-scanner.ts` - основна логіка
- `/src/core/session-manager.ts` - interfaces  
- `/src/prompts/roles/5 json-engineer.txt` - промпт
- `/code.ts` - debug логи в message handler

Код скомпільований та готовий до тестування.