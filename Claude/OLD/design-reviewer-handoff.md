# 🔄 Design Reviewer System - Handoff Document

## 📋 **Поточний Статус**

### **✅ Завершено (Phase 1):**
- Гібридна архітектура Design Reviewer системи
- Gemini Vision API інтеграція
- Context loading з існуючого pipeline
- CLI інтерфейс для ручного запуску
- Базова структура файлів та папок

### **📁 Створені Файли:**
```
/Users/stipa/UXPal/
├── scripts/
│   ├── design_reviewer.py      ✅ Головний модуль
│   └── run_review.py          ✅ CLI скрипт
├── figma-ready/               ✅ Папка для фінальних JSON
├── Claude/
│   └── hybrid-design-reviewer-implementation-plan.md  ✅ План
```

---

## 🎯 **Наступні Кроки (Phase 2)**

### **Пріоритет 1: JSON Engineer Integration**
1. **Реалізувати `run_json_engineer()` метод** у `design_reviewer.py`
   - Викликати існуючий `JSONEngineerRole` з `code.js`
   - Через subprocess або Node.js integration
   - Зберігати результат як `stage5_final_engineer.json`

2. **Модифікувати `process_review_response()`**
   - Автоматично запускати JSON Engineer при знайдених покращеннях
   - Зберігати фінальний JSON у `figma-ready/final_design.json`

### **Пріоритет 2: Testing & Validation** 
3. **Протестувати з реальними даними**
   - Взяти існуючий timestamp (наприклад `20250812_143736`)
   - Зробити скріншот дизайну з Figma
   - Запустити повний цикл review → JSON Engineer

4. **Error handling покращення**
   - API rate limits для Gemini
   - Fallback механізми
   - Валідація JSON структур




Architecture Understanding for `run_json_engineer()` метод:

  JSONEngineerRole Invocation: Uses subprocess to call Node.js, similar to
  how instance.py invokes the alternative 3-stage pipeline (line 1079:
  asyncio.run(alt_runner.run_all_alt_stages...))

  Input Format: The JSON Engineer expects:
  - Analyzer output (Stage 1)
  - UX UI Designer output (Stage 2) with both rationale and JSON sections
  - Design system data - loaded via load_design_system_data() method

  Error Handling: Should behave like Stage 3 in the original pipeline -
  continue gracefully, save intermediate results, provide fallback to
  reviewer's improved JSON if JSON Engineer fails

  File Structure: Maintain exact timestamp-based naming:
  - alt3_{timestamp}_4_design_reviewer.json (Stage 4 - new)
  - alt3_{timestamp}_5_json_engineer.json (Stage 5 - final)

  Key Integration Points:
  1. Extract JSON section from Gemini's reviewer response (after "SECTION
  2:" or similar)
  2. Pass that JSON + full context to JSON Engineer via subprocess
  3. Handle rationale separator pattern (---RATIONALE-SEPARATOR---) in JSON
   Engineer response
  4. Save results in existing pipeline structure
---

## 🔧 **Технічні Деталі**

### **Архітектура:**
```
User → CLI → DesignReviewer → Gemini Vision API → Review Analysis
                ↓
      JSON Engineer (якщо потрібні зміни) → Final JSON → figma-ready/
```

### **Файлова Структура Outputs:**
```
python_outputs/alt3_[timestamp]/
├── stage4_reviewer.txt           # Звіт reviewer
├── stage4_reviewer_raw.json      # Покращений JSON від Gemini
└── stage5_final_engineer.json    # Після JSON Engineer

figma-ready/
└── final_design.json            # Копія для зручності в Figma
```

### **API Dependencies:**
- **Gemini Vision API** - для аналізу скріншотів
- **Існуючий pipeline** - використання JSONEngineerRole з code.js
- **Environment**: `GEMINI_API_KEY` змінна

---

## 🎮 **Workflow для Тестування**

### **1. Підготовка:**
```bash
export GEMINI_API_KEY="your-api-key"
cd /Users/stipa/UXPal
```

### **2. Знайти існуючий timestamp:**
```bash
ls python_outputs/ | grep alt3_20250812
# Виберіть один з результатів, наприклад: alt3_20250812_143736
```

### **3. Створити скріншот:**
- Взяти JSON з `alt3_20250812_143736_3_json_engineer.json`
- Вставити в Figma plugin та зрендерити
- Зробити скріншот, зберегти як `screenshot_20250812_143736.png` у `/screenshots`

### **4. Запустити review:**
```bash
python scripts/run_review.py 20250812_143736 screenshot_20250812_143736.png --verbose
```

### **5. Перевірити результати:**
```bash
# Перевірити чи створився звіт
cat python_outputs/alt3_20250812_143736/stage4_reviewer.txt

# Якщо були покращення - перевірити JSON
ls python_outputs/alt3_20250812_143736/stage4_reviewer_raw.json
```

---

## 🐛 **Відомі Issues для Вирішення**

### **1. JSON Engineer Integration (CRITICAL)**
**Проблема**: Метод `run_json_engineer()` містить TODO коментар
**Рішення**: Імплементувати виклик `JSONEngineerRole` з code.js

**Варіанти:**
- **A) Subprocess**: `node -e "require('./code.js').JSONEngineerRole.execute(...)"`
- **B) Python-to-JS**: через `subprocess` або `PyExecJS`
- **C) Перепортувати логіку**: перенести JSONEngineerRole логіку в Python

### **2. Context Loading Optimization**
**Проблема**: Пошук файлів за timestamp може бути неточним
**Рішення**: Покращити логіку `load_pipeline_context()`

### **3. Error Recovery**
**Проблема**: При помилці Gemini API весь процес падає
**Рішення**: Додати fallback механізми та retry логіку

---

## 📊 **Success Metrics**

### **Phase 2 вважається завершеною коли:**
- ✅ Review system успішно викликає JSON Engineer при потребі
- ✅ Створюється коректний `stage5_final_engineer.json`
- ✅ Фінальний JSON копіюється у `figma-ready/final_design.json`
- ✅ Повний цикл тестується з реальними даними
- ✅ Error handling покриває основні сценарії помилок

### **Тестовий Сценарій:**
1. Взяти дизайн з видимими проблемами (наприклад, обрізаний текст)
2. Reviewer має знайти проблеми → статус "improved"  
3. JSON Engineer має виправити технічні аспекти
4. Фінальний JSON має рендеритися без проблем у Figma

---

## 🔗 **Корисні Посилання**

### **Файли для Reference:**
- `/src/prompts/roles/reviewer.txt` - Reviewer prompt
- `/src/prompts/roles/5 json-engineer.txt` - JSON Engineer prompt
- `code.js` - Існуючий pipeline та JSONEngineerRole клас

### **Тестові Дані:**
- `python_outputs/alt3_20250812_*` - Існуючі згенеровані дизайни
- `screenshots/` - Папка для тестових скріншотів

### **Документація:**
- `Claude/hybrid-design-reviewer-implementation-plan.md` - Повний план
- Цей файл - поточний handoff

---

## 💡 **Поради для Наступного Агента**

1. **Почніть з простого тесту** - запустіть `python scripts/design_reviewer.py` для базової перевірки
2. **Сфокусуйтесь на JSON Engineer інтеграції** - це ключова відсутня частина
3. **Використовуйте існуючі дані** - багато тестових timestamp вже є в python_outputs/
4. **Тестуйте поетапно** - спочатку без JSON Engineer, потім з інтеграцією
5. **Звертайте увагу на файлові шляхи** - система очікує специфічні назви файлів

---

**Git Branch**: `feature/feedback-loop`  
**Базується на**: `fix-horizontal-autolayout-height-bug` (містить всі останні фікси)

Удачі! 🚀
