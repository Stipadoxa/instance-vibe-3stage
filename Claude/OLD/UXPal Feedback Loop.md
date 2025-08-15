UXPal Feedback Loop

🎯 Мета Проекту

Додати візуальну перевірку якості до вашого 3-етапного pipeline, створивши систему що "дивиться" на згенерований дизайн і виправляє проблеми.

📊 Архітектура Системи

Поточний Pipeline (3 етапи):
User Request → Analyzer → Designer → JSON Engineer → Figma
Новий Pipeline (5 етапів):
User Request → Analyzer → Designer → JSON Engineer → Figma → Screenshot → Reviewer → JSON Engineer → Final Figma

ФАЗА 1:
Створити безпечну git гілку
bashcd /Users/stipa/UXPal
git status  # перевірити поточний стан
git checkout -b feature/visual-feedback-loop

ФАЗА 2: Створення Review Module
Створити базовий модуль
Файл: /Users/stipa/UXPal/scripts/design_reviewer.py
"""
Design Reviewer Module for UXPal
Analyzes screenshots and improves JSON when issues found
"""
Що насправді робить модуль:

Збирає ВЕСЬ контекст генерації:

- Оригінальний user-request
- user_request_analyzer_output (що він зрозумів з запиту)
- alt2-ux-ui-designer.txt (інструкції як дизайнити)
- ux_ui_designer_output (що він створив)
- figma_ready_json (технічно правильний)
- Скріншот (як це виглядає в Figma)
- reviewer.txt (інструкція що і як перевіряти)
 відправляє це на Джеміні АРІ (як і всі попередні рази пайплайну) 
 
 
 🎯 Що робить design_reviewer.py з відповіддю Gemini
Gemini повертає текст, який може бути:

"DESIGN REVIEW: APPROVED" - все добре
Текст з JSON всередині - знайдені проблеми і виправлення


📝 Логіка обробки відповіді:
Крок 1: Отримати відповідь
pythonresponse = self.model.generate_content([prompt, image])
gemini_text = response.text  # це просто рядок тексту
Крок 2: Визначити тип відповіді
pythonif "APPROVED" in gemini_text:
    # Все добре, проблем немає
    status = "approved"
else:
    # Є проблеми, треба шукати JSON з виправленнями
    status = "needs_improvement"
Крок 3: Якщо є виправлення - витягнути JSON
pythonif status == "needs_improvement":
    # Gemini повернув щось типу:
    """
    # IMPLEMENTATION REPORT
    Знайдено проблеми з навігацією...
    
    # DESIGN SPECIFICATION
    {
      "type": "layoutContainer",
      ...покращений JSON...
    }
    """
    
    # Треба витягнути JSON частину
    json_start = gemini_text.find('{')
    json_end = gemini_text.rfind('}') + 1
    
    if json_start >= 0 and json_end > json_start:
        json_string = gemini_text[json_start:json_end]
        improved_json = json.loads(json_string)
Крок 4: Зберегти результати
Якщо APPROVED:
python# Зберігаємо тільки звіт
review_report = f"""
Stage 4: Design Review
Status: APPROVED
Timestamp: {datetime.now()}
No visual issues found.
"""
save_to_file("stage4_reviewer.txt", review_report)
Якщо IMPROVEMENTS:

Після отримання improved JSON від Gemini:
pythonclass DesignReviewer:
    def review_design(self, context, screenshot_path):
        # ... код review ...
        
        if status == "needs_improvement":
            # Отримали improved JSON від Gemini
            improved_json = self.extract_json(gemini_response)
            
            # ВАЖЛИВО: Прогнати через JSON Engineer!
            final_json = self.run_json_engineer(improved_json, context)
            
            # Зберегти ОБА файли
            self.save_files({
                "stage4_reviewer_raw.json": improved_json,  # від Gemini
                "stage5_final_engineer.json": final_json,   # після Engineer
                "figma-ready/design_final.json": final_json # для Figma
            })
            
            return {
                "status": "improved",
                "reviewer_json": improved_json,
                "final_json": final_json
            }
Метод для виклику JSON Engineer:
pythondef run_json_engineer(self, improved_json, context):
    """Прогнати покращений JSON через Engineer"""
    
    # Формуємо вхід для Engineer (як від Designer)
    engineer_input = f"""
# IMPLEMENTATION REPORT
Review corrections applied
    
# DESIGN SPECIFICATION
{json.dumps(improved_json)}
"""
    
    # Викликаємо Engineer (використовуємо існуючий код)
    from your_pipeline import run_json_engineer_stage
    
    final_json = run_json_engineer_stage(
        designer_output=engineer_input,
        design_system_data=context.get('design_system')
    )
    
    return final_json

🔄 Правильна послідовність:
pythondef complete_review_cycle(self):
    # 1. Review візуальних проблем
    gemini_response = self.call_gemini(screenshot, context)
    
    if "APPROVED" in gemini_response:
        return "Use original stage3_engineer.json"
    
    # 2. Витягнути improved JSON
    improved_json = self.extract_json(gemini_response)
    
    # 3. Прогнати через JSON Engineer
    final_json = self.run_json_engineer(improved_json)
    
    # 4. Зберегти всі версії
    save("stage4_reviewer_improved.json", improved_json)
    save("stage5_final_engineer.json", final_json)
    
    # 5. Повернути фінальний результат
    return "Use stage5_final_engineer.json for Figma"

📁 Файли що створюються:
Якщо APPROVED:
python_outputs/[timestamp]/
├── stage4_reviewer.txt         # тільки звіт
Якщо IMPROVEMENTS:
python_outputs/[timestamp]/
├── stage4_reviewer.txt         # звіт з поясненнями
├── stage4_reviewer_raw.json    # що повернув Gemini
├── stage5_final_engineer.json  # після JSON Engineer
└── figma-ready/
    └── design_final.json       # копія для зручності
