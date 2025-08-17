# 📋 План Гібридної Імплементації Design Reviewer

## 🔍 **Аналіз Існуючої Архітектури**

### **Поточний Pipeline (code.js):**
```
Stage 1: User Request Analyzer
Stage 2: UX/UI Designer  
Stage 3: UX Designer
Stage 4: UI Designer
Stage 5: JSON Engineer → Gemini API → Технічно валідний JSON
```

### **Файлова Структура:**
- **Outputs**: `/python_outputs/[timestamp]_[stage]_[role].json`
- **Reviewer Prompt**: `/src/prompts/roles/reviewer.txt` ✅
- **Screenshots**: `/screenshots/` ✅
- **JSON Engineer**: `JSONEngineerRole` клас у `code.js`

---

## 🎯 **Гібридна Модель - План Реалізації**

### **Етап 4: Design Reviewer** (новий)
```
Stage 4: Design Reviewer → Gemini API → "APPROVED" або improved JSON
Stage 5: JSON Engineer (якщо reviewer дав зміни) → Gemini API → final JSON
```

### **Workflow:**
1. **Ручний запуск** після Stage 3 (UX Designer)
2. **Gemini Vision** аналізує скріншот + контекст  
3. **Умовне проходження** Stage 5 тільки якщо є зміни
4. **CLI інтерфейс** як в англійському файлі

---

## 📂 **Структура Файлів**

```bash
/Users/stipa/UXPal/
├── scripts/                     # Нова папка
│   ├── design_reviewer.py       # Головний модуль
│   └── run_review.py           # CLI скрипт
├── src/prompts/roles/
│   └── reviewer.txt            # ✅ Вже є
├── screenshots/                # ✅ Вже є  
├── python_outputs/[timestamp]/ # ✅ Існуюча структура
│   ├── stage4_reviewer.txt     # Новий: звіт reviewer
│   ├── stage4_reviewer_raw.json # Новий: якщо є зміни
│   └── stage5_final_engineer.json # Новий: фінальний JSON
└── figma-ready/                # Нова папка для зручності
    └── final_design.json       # Копія для Figma
```

---

## 🔧 **Компоненти Системи**

### **1. DesignReviewer Class**
```python
class DesignReviewer:
    def __init__(self, gemini_api_key):
        # Gemini client + reviewer prompt
    
    def review_design(self, timestamp_folder, screenshot_path):
        # Завантажити весь контекст з timestamp папки
        # Відправити Gemini: prompt + image + context
        # Повернути: "APPROVED" або improved JSON
    
    def run_json_engineer(self, improved_json, context):
        # Викликати існуючий JSONEngineerRole з code.js
        # Через subprocess або direct import
```

### **2. Context Loader**
```python
def load_pipeline_context(timestamp_folder):
    return {
        'user_request': load_analyzer_output(timestamp_folder),
        'analyzer_output': load_analyzer_output(timestamp_folder), 
        'designer_output': load_designer_output(timestamp_folder),
        'design_system': load_design_system()
    }
```

### **3. CLI Script (run_review.py)**
```bash
# Використання:
python scripts/run_review.py 20250812_143736 screenshot_20250812_143736.png
# Автоматично знайде папку в python_outputs/
```

---

## 🚀 **Етапи Імплементації**

### **Phase 1: Standalone Module**
1. ✅ Створити `scripts/design_reviewer.py` 
2. ✅ Інтеграція з Gemini Vision API
3. ✅ Context loading з існуючих файлів
4. ✅ CLI скрипт `run_review.py`

### **Phase 2: JSON Engineer Integration**  
1. ✅ Виклик JSONEngineerRole з code.js
2. ✅ Збереження результатів у правильний формат
3. ✅ Копіювання до figma-ready/

### **Phase 3: Workflow Integration**
1. ✅ Модифікація code.js для автовиклику reviewer
2. ✅ Опціональний автоматичний режим
3. ✅ Звіти та метрики якості

---

## 📝 **Специфікації**

### **Input Parameters:**
```bash
run_review.py [timestamp] [screenshot_filename] [--auto-engineer]
```

### **Expected Outputs:**
```bash
# Якщо APPROVED:
python_outputs/20250812_143736/stage4_reviewer.txt

# Якщо IMPROVEMENTS:  
python_outputs/20250812_143736/stage4_reviewer.txt
python_outputs/20250812_143736/stage4_reviewer_raw.json
python_outputs/20250812_143736/stage5_final_engineer.json
figma-ready/final_design.json
```

### **API Integration:**
- **Gemini Vision API** для image + text analysis
- **Template system** для reviewer prompt з placeholder-ами
- **Error handling** для API limits та connection issues

---

## 🛡️ **Safety Features**

1. **Backup originals** - ніколи не перезаписувати
2. **Clear file naming** - timestamp + stage prefixes  
3. **Validation** - JSON parsing перед збереженням
4. **Graceful failures** - continue pipeline навіть при reviewer помилках
5. **Context preservation** - зберігати всі метадані

---

## ⚡ **Quick Start Commands**

```bash
# Setup
mkdir -p /Users/stipa/UXPal/scripts
mkdir -p /Users/stipa/UXPal/figma-ready

# Test run  
cd /Users/stipa/UXPal
python scripts/run_review.py 20250812_143736 screenshot_20250812_143736.png

# Expected: Review completed + files created in timestamp folder
```

---

## 🎯 **Ключові Переваги Гібридної Моделі**

### **Від Claude-based підходу:**
- ✅ Готова архітектура та CLI інтерфейс
- ✅ Безпека файлів та обробка помилок
- ✅ Зрозумілий workflow для користувача

### **Від Gemini-based підходу:**
- ✅ Повна інтеграція з існуючим pipeline
- ✅ Використання всього контексту генерації
- ✅ JSON Engineer етап для технічної валідності
- ✅ Економічність (Gemini дешевший за Claude)

### **Унікальні Features:**
- 🔄 **Умовне проходження JSON Engineer** - тільки при змінах
- 📁 **Збереження в існуючу структуру** - python_outputs/timestamp/
- 🖼️ **Gemini Vision** для аналізу скріншотів
- ⚡ **CLI запуск** з автоматичним пошуком файлів

---

**Цей план поєднує найкращі елементи обох підходів:** готову архітектуру з Claude файлу + повну інтеграцію з вашим існуючим Gemini-based pipeline.