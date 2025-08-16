# 🔄 Design Reviewer Phase 2 - Implementation Handoff

## 📊 **ПОТОЧНИЙ СТАТУС**

### **✅ ВЖЕ ЗРОБЛЕНО І ПРАЦЮЄ:**

#### **Phase 1 - Design Reviewer Core (100% готово):**
- ✅ **Gemini Vision API інтеграція** - працює ідеально з `gemini-1.5-flash`
- ✅ **Context loading з існуючого pipeline** - завантажує всі Stage 1-3 файли
- ✅ **CLI інтерфейс** - `python3 scripts/run_review.py timestamp screenshot.png --verbose`
- ✅ **Reviewer prompt система** - використовує `/src/prompts/roles/reviewer.txt`
- ✅ **Візуальний аналіз** - знаходить реальні проблеми у дизайні:
  - Bottom Navigation gaps
  - Inconsistent button sizes  
  - Poor text contrast
  - Missing edge-to-edge navigation
- ✅ **JSON extraction з Gemini відповідей** - парсить markdown + очищає коментарі
- ✅ **Файлова структура** - зберігає результати в правильному форматі

#### **Створені файли:**
```
scripts/design_reviewer.py     ✅ Головний модуль (533 рядки)
scripts/run_review.py         ✅ CLI інтерфейс (266 рядків)  
figma-ready/                  ✅ Папка для фінальних JSON
```

#### **Output файли (працюють):**
```
python_outputs/alt3_{timestamp}_4_design_reviewer.txt         ✅ Детальний звіт
python_outputs/alt3_{timestamp}_4_design_reviewer_raw.json    ✅ Покращений JSON від reviewer
```

#### **Перевірено з реальними даними:**
- ✅ **Timestamp**: `20250812_204137`  
- ✅ **Screenshot**: `figma_ready_20250812_204137.png`
- ✅ **Gemini знайшов проблеми** та згенерував покращення
- ✅ **Raw JSON зберігається** коректно

---

## 🔧 **ЩО ПОТРІБНО ЗРОБИТИ (Phase 2)**

### **Проблема: JSON Engineer Integration**

**Поточна ситуація:**
- Reviewer генерує JSON у неправильному форматі для UXPal
- Figma показує порожній фрейм через неправильну структуру
- JSON Engineer потрібен для конвертації reviewer JSON → правильний UXPal формат

**Спроба #1 (Node.js subprocess) - FAILED:**
- ❌ Module resolution issues: `Cannot find module './code.js'`
- ❌ Dependency conflicts з JSONEngineerRole  
- ❌ Path resolution проблеми з тимчасовими файлами

### **🎯 НОВИЙ ПІДХІД: Stage 3 Logic Reuse**

Замість subprocess - **скопіювати і адаптувати існуючий Stage 3 JSON Engineer workflow**.

---

## 📋 **ПЛАН ІМПЛЕМЕНТАЦІЇ Phase 2**

### **Крок 1: Створити адаптований prompt**
```bash
# Скопіювати існуючий JSON Engineer prompt
cp "/Users/stipa/UXPal/src/prompts/roles/5 json-engineer.txt" \
   "/Users/stipa/UXPal/src/prompts/roles/5 design-reviewer-json-engineer.txt"
```

**Редагувати prompt для нового input формату:**

**Було:**
```
Previous Stage Output (Stage 2: UX/UI Designer):
{UI specifications and rationale}
```

**Стане:**
```
Previous Stage Output (Stage 4: Design Reviewer):
REVIEWER IMPROVEMENTS:

{improved JSON from Gemini Vision reviewer}

---RATIONALE-SEPARATOR---

Design improvements made by Gemini Vision reviewer based on visual analysis.
Focus on converting this reviewer JSON to proper UXPal component structure.
```

### **Крок 2: Модифікувати `run_json_engineer()` метод**

**Замінити в `/Users/stipa/UXPal/scripts/design_reviewer.py`:**

```python
def run_json_engineer(self, improved_json: Dict, context: Dict, timestamp: str) -> Optional[Dict]:
    """
    Викликати JSON Engineer через існуючий Stage 3 механізм
    """
    import subprocess
    import tempfile
    
    print("🔧 Запуск JSON Engineer (Stage 3 reuse) для фінальної обробки...")
    
    try:
        # 1. Підготувати fake Stage 2 output для JSON Engineer
        fake_stage2_output = {
            "content": f"REVIEWER IMPROVEMENTS:\n\n{json.dumps(improved_json, indent=2, ensure_ascii=False)}\n\n---RATIONALE-SEPARATOR---\n\nDesign improvements made by Gemini Vision reviewer based on visual analysis.",
            "metadata": {
                "stage": "Stage 4: Design Reviewer",
                "timestamp": int(datetime.now().timestamp()),
                "promptUsed": True,
                "inputStage": "Stage 3: UX Designer", 
                "promptLength": 2000,
                "designSystemUsed": True,
                "componentsAvailable": 50,
                "aiUsed": True
            }
        }
        
        # 2. Створити тимчасовий файл input
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as temp_input:
            json.dump(fake_stage2_output, temp_input, indent=2, ensure_ascii=False)
            temp_input_path = temp_input.name
        
        # 3. Викликати instance.py з Stage 3 (JSON Engineer)
        result = subprocess.run([
            'python3', 'instance.py', 'alt3',
            f'--input-file={temp_input_path}',
            '--start-stage=3', 
            '--end-stage=3',
            f'--timestamp={timestamp}',
            '--design-reviewer-mode'  # Новий флаг для використання design-reviewer-json-engineer prompt
        ], 
        cwd=str(self.base_path),
        capture_output=True, 
        text=True,
        timeout=60,
        env={**os.environ, 'GEMINI_API_KEY': self.api_key}
        )
        
        if result.returncode == 0:
            # 4. Скопіювати результат як Stage 5
            stage3_result = self.python_outputs_path / f"alt3_{timestamp}_3_json_engineer.json"
            stage5_result = self.python_outputs_path / f"alt3_{timestamp}_5_json_engineer.json"
            
            if stage3_result.exists():
                # Копіювати та перейменувати
                shutil.copy2(stage3_result, stage5_result)
                
                # Завантажити та зберегти фінальний JSON у figma-ready
                with open(stage3_result, 'r', encoding='utf-8') as f:
                    final_result = json.load(f)
                
                if final_result.get('generatedJSON'):
                    figma_ready_dir = self.base_path / "figma-ready"
                    figma_ready_dir.mkdir(exist_ok=True)
                    
                    figma_ready_path = figma_ready_dir / "final_design.json"
                    with open(figma_ready_path, 'w', encoding='utf-8') as f:
                        json.dump(final_result['generatedJSON'], f, indent=2, ensure_ascii=False)
                    
                    return {
                        "success": True,
                        "stage5_path": str(stage5_result),
                        "figma_ready_path": str(figma_ready_path),
                        "json_generated": True
                    }
        
        return None
        
    except Exception as e:
        print(f"❌ Помилка JSON Engineer: {e}")
        return None
```

### **Крок 3: Додати флаг до instance.py**

**Модифікувати `/Users/stipa/UXPal/instance.py`:**

```python
# Додати новий аргумент
parser.add_argument('--design-reviewer-mode', action='store_true', 
                   help='Use design-reviewer-json-engineer prompt instead of standard json-engineer')

# У Stage 3 JSONEngineerRole
if args.design_reviewer_mode:
    prompt = await PromptLoader.loadPrompt('design-reviewer-json-engineer')
else:
    prompt = await PromptLoader.loadPrompt('json-engineer')
```

### **Крок 4: Тестування**

```bash
# Повний тест з новим підходом
export GEMINI_API_KEY=AIzaSyBiuyJMSL8SdZMYF3inWKOj2BTWSgj5df8
python3 scripts/run_review.py 20250812_204137 figma_ready_20250812_204137.png --verbose
```

**Очікувані результати:**
```
python_outputs/alt3_20250812_204137_5_json_engineer.json     ← Фінальний UXPal JSON  
figma-ready/final_design.json                               ← Готовий для Figma
```

### **Крок 5: Валідація Figma**

1. Взяти `figma-ready/final_design.json`
2. Вставити у Figma UXPal plugin
3. Перевірити що рендериться коректно (не порожній фрейм)

---

## 🎯 **Success Criteria Phase 2**

- ✅ **JSON Engineer працює** через Stage 3 reuse механізм
- ✅ **Фінальний JSON** генерується у правильному UXPal форматі  
- ✅ **Figma рендеринг** працює без порожніх фреймів
- ✅ **Файлова структура** відповідає існуючому pipeline
- ✅ **CLI workflow** залишається простим для користувача

---

## 📁 **Файли для модифікації**

### **Нові файли:**
```
/Users/stipa/UXPal/src/prompts/roles/5 design-reviewer-json-engineer.txt  ← СТВОРИТИ
```

### **Існуючі файли для редагування:**
```
/Users/stipa/UXPal/scripts/design_reviewer.py     ← Замінити run_json_engineer()
/Users/stipa/UXPal/instance.py                    ← Додати --design-reviewer-mode флаг
```

---

## 🚀 **Переваги нового підходу**

1. **Reuse існуючої логіки** - Stage 3 JSON Engineer вже працює ідеально
2. **Немає Node.js subprocess проблем** - все в Python ecosystem
3. **Той самий GeminiClient** - використовує ту саму API інтеграцію  
4. **Перевірений workflow** - Stage 3 генерує правильний UXPal JSON
5. **Простота налагодження** - якщо є проблеми, це ті самі проблеми що і в Stage 3

---

## 🔗 **Корисні команди для debugging**

```bash
# Тест існуючого Stage 3
python3 instance.py alt3 20250812_204137 --start-stage=3 --end-stage=3

# Перевірка prompt файлів  
ls -la /Users/stipa/UXPal/src/prompts/roles/5*

# Перевірка результатів
cat python_outputs/alt3_20250812_204137_5_json_engineer.json | jq .

# Швидкий тест Figma JSON
cp figma-ready/final_design.json ~/Desktop/test_figma.json
```

---

**Git Branch**: `feature/feedback-loop`  
**Базується на**: Functional Design Reviewer Core (Phase 1 complete)  
**Estimated time**: 2-3 години для Phase 2 completion

**Наступний інженер** - фокусуйся на **Stage 3 reuse підході**. Subprocess підхід вже випробуваний і має занадто багато залежностей. 

Удачі! 🚀