#!/usr/bin/env python3
"""
Design Reviewer Module for UXPal
Gemini-based visual analysis and JSON improvement system

Гібридна імплементація що поєднує:
- Gemini Vision API для аналізу скріншотів
- Інтеграцію з існуючим pipeline (python_outputs structure)
- Умовне проходження JSON Engineer при потребі
"""

import os
import json
import base64
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional, Tuple, List
import google.generativeai as genai


class DesignReviewer:
    """
    Головний клас для візуального review дизайнів через Gemini Vision API
    """
    
    def __init__(self, api_key: str = None):
        """
        Ініціалізація reviewer з Gemini API ключем
        """
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("Gemini API key не знайдений. Встановіть GEMINI_API_KEY змінну середовища або передайте через параметр.")
        
        # Конфігурація Gemini
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Шляхи до файлів
        self.base_path = Path("/Users/stipa/UXPal")
        self.python_outputs_path = self.base_path / "python_outputs"
        self.screenshots_path = self.base_path / "screenshots"
        self.reviewer_prompt_path = self.base_path / "src/prompts/roles/reviewer.txt"
        
        print("✅ DesignReviewer ініціалізовано з Gemini Vision API")
    
    def load_reviewer_prompt(self) -> str:
        """
        Завантажити reviewer prompt з файлу
        """
        try:
            if self.reviewer_prompt_path.exists():
                return self.reviewer_prompt_path.read_text(encoding='utf-8')
            else:
                print(f"⚠️ Reviewer prompt не знайдено за адресою: {self.reviewer_prompt_path}")
                return self.get_default_reviewer_prompt()
        except Exception as e:
            print(f"⚠️ Помилка завантаження reviewer prompt: {e}")
            return self.get_default_reviewer_prompt()
    
    def get_default_reviewer_prompt(self) -> str:
        """
        Запасний reviewer prompt якщо файл не знайдено
        """
        return """# Design Reviewer - UXPal Quality Assurance

You are a Senior UX/UI Designer reviewing a rendered interface for visual problems.

## REVIEW CONTEXT
- Original User Request: {USER_REQUEST}
- Analyzer Output: {ANALYZER_OUTPUT}
- Designer Output: {DESIGNER_OUTPUT}

## CRITICAL ISSUES TO CHECK:
1. Content cut off or cropped
2. Navigation bars with gaps from screen edges  
3. Poor text contrast (light gray on white)
4. Oversized containers with floating content
5. Mixed button sizes in same row

## OUTPUT FORMAT:
### If NO visual issues found:
Output only: "DESIGN REVIEW: APPROVED"

### If visual issues found:
Output in this exact format:

# IMPLEMENTATION REPORT

## Review Findings
[Describe issues found]

## Design Decisions  
[Explain corrections]

---

# DESIGN SPECIFICATION

{
  [Your improved JSON here]
}

Focus on fixing real problems visible in the image rather than redesigning working solutions."""
    
    def load_pipeline_context(self, timestamp: str) -> Dict:
        """
        Завантажити весь контекст pipeline з timestamp файлів (файли в python_outputs/, не в папках)
        """
        context = {}
        
        print(f"📁 Завантаження контексту для timestamp: {timestamp}")
        
        # Завантажити файли етапів pipeline
        try:
            # Stage 1: User Request Analyzer
            analyzer_output_file = self.python_outputs_path / f"alt3_{timestamp}_1_user_request_analyzer_output.txt"
            if analyzer_output_file.exists():
                context['analyzer_output'] = analyzer_output_file.read_text(encoding='utf-8')
                context['user_request'] = self.extract_user_request_from_analyzer(context['analyzer_output'])
            
            # Stage 2: UX/UI Designer  
            designer_output_file = self.python_outputs_path / f"alt3_{timestamp}_2_ux_ui_designer_output.txt"
            if designer_output_file.exists():
                context['designer_output'] = designer_output_file.read_text(encoding='utf-8')
            
            # Stage 3: JSON Engineer (поточний результат)
            json_engineer_file = self.python_outputs_path / f"alt3_{timestamp}_3_json_engineer.json"
            if json_engineer_file.exists():
                with open(json_engineer_file, 'r', encoding='utf-8') as f:
                    context['current_json'] = json.load(f)
            
            print(f"✅ Завантажено контекст: analyzer={bool(context.get('analyzer_output'))}, designer={bool(context.get('designer_output'))}, json={bool(context.get('current_json'))}")
            
        except Exception as e:
            print(f"⚠️ Помилка завантаження контексту: {e}")
        
        return context
    
    def extract_user_request_from_analyzer(self, analyzer_output: str) -> str:
        """
        Витягнути оригінальний user request з analyzer output
        """
        try:
            # Шукаємо секцію з оригінальним запитом
            lines = analyzer_output.split('\n')
            for i, line in enumerate(lines):
                if 'user request' in line.lower() or 'original request' in line.lower():
                    # Повертаємо наступний рядок або кілька рядків
                    request_lines = []
                    for j in range(i+1, min(i+5, len(lines))):
                        if lines[j].strip() and not lines[j].startswith('#'):
                            request_lines.append(lines[j].strip())
                    return ' '.join(request_lines)
            
            # Якщо не знайшли, повертаємо перші кілька рядків
            return ' '.join(lines[:3])
            
        except Exception as e:
            print(f"⚠️ Помилка витягування user request: {e}")
            return "User request не знайдено"
    
    def encode_image(self, image_path: Path) -> str:
        """
        Перетворити зображення в base64 для Gemini
        """
        try:
            with open(image_path, "rb") as f:
                return base64.b64encode(f.read()).decode('utf-8')
        except Exception as e:
            print(f"❌ Помилка кодування зображення: {e}")
            raise
    
    def review_design(self, timestamp: str, screenshot_filename: str) -> Dict:
        """
        Головна функція review дизайну
        
        Args:
            timestamp: Timestamp папки в python_outputs (наприклад "20250812_143736")  
            screenshot_filename: Ім'я файлу скріншота в папці screenshots
            
        Returns:
            Dict з результатами review
        """
        print(f"\n🔍 Початок review для timestamp: {timestamp}")
        print(f"📸 Скріншот: {screenshot_filename}")
        
        # 1. Завантажити контекст pipeline
        context = self.load_pipeline_context(timestamp)
        if not context:
            return {
                "status": "error",
                "message": f"Не вдалося завантажити контекст для timestamp: {timestamp}"
            }
        
        # 2. Знайти і завантажити скріншот
        screenshot_path = self.screenshots_path / screenshot_filename
        if not screenshot_path.exists():
            return {
                "status": "error", 
                "message": f"Скріншот не знайдено: {screenshot_path}"
            }
        
        # 3. Підготувати reviewer prompt з контекстом
        reviewer_prompt_template = self.load_reviewer_prompt()
        
        # Завантажити design system data
        design_system_path = self.base_path / "design-system" / "design-system-raw-data-2025-08-03T10-46-26.json"
        design_system_data = ""
        if design_system_path.exists():
            with open(design_system_path, 'r', encoding='utf-8') as f:
                design_system_data = f.read()
            print(f"📊 Reviewer loaded design system data: {len(design_system_data)} characters")
        else:
            print("⚠️ Design system data не знайдено для reviewer")
            design_system_data = "UXPal Design System - file not found"
        
        # Безпечна заміна змінних
        review_prompt = reviewer_prompt_template
        review_prompt = review_prompt.replace('{{USER_REQUEST}}', context.get('user_request', 'Не знайдено'))
        review_prompt = review_prompt.replace('{{ANALYZER_OUTPUT}}', context.get('analyzer_output', 'Не знайдено')[:2000])
        review_prompt = review_prompt.replace('{{DESIGNER_OUTPUT}}', context.get('designer_output', 'Не знайдено')[:2000])
        review_prompt = review_prompt.replace('{{DESIGN_SYSTEM_DATA}}', design_system_data)
        review_prompt = review_prompt.replace('{{INTERFACE_IMAGE}}', '[Скріншот дизайну]')
        
        # 4. Викликати Gemini Vision для аналізу
        try:
            print("🤖 Відправка запиту до Gemini Vision API...")
            
            # Завантажити зображення
            with open(screenshot_path, 'rb') as f:
                image_data = f.read()
            
            # Створити Gemini Image об'єкт
            import PIL.Image
            image = PIL.Image.open(screenshot_path)
            
            # Відправити запит
            response = self.model.generate_content([
                review_prompt,
                image
            ])
            
            review_content = response.text
            print("✅ Отримано відповідь від Gemini")
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Помилка Gemini API: {str(e)}"
            }
        
        # 5. Обробити відповідь і зберегти результати
        return self.process_review_response(review_content, timestamp, context)
    
    def process_review_response(self, review_content: str, timestamp: str, context: Dict) -> Dict:
        """
        Обробити відповідь reviewer і зберегти результати
        """
        # Зберегти звіт reviewer
        review_report_path = self.python_outputs_path / f"alt3_{timestamp}_4_design_reviewer.txt"
        review_report_path.write_text(review_content, encoding='utf-8')
        print(f"📝 Звіт reviewer збережено: {review_report_path}")
        
        # Перевірити чи потрібні покращення
        if "DESIGN REVIEW: APPROVED" in review_content:
            print("✅ Дизайн схвалено - покращення не потрібні")
            return {
                "status": "approved",
                "message": "Дизайн схвалено без змін",
                "report_path": str(review_report_path)
            }
        
        # Якщо потрібні покращення - витягнути JSON
        if "IMPROVEMENTS MADE" in review_content or "DESIGN SPECIFICATION" in review_content:
            print("🔧 Знайдено покращення - витягування JSON...")
            
            improved_json = self.extract_json_from_response(review_content)
            if improved_json:
                # Зберегти сирий JSON від reviewer
                raw_json_path = self.python_outputs_path / f"alt3_{timestamp}_4_design_reviewer_raw.json"
                with open(raw_json_path, 'w', encoding='utf-8') as f:
                    json.dump(improved_json, f, indent=2, ensure_ascii=False)
                
                print(f"💾 Raw JSON від reviewer збережено: {raw_json_path}")
                
                # Запустити JSON Engineer для фінальної обробки
                final_json = self.run_json_engineer(improved_json, context, timestamp)
                if final_json:
                    return {
                        "status": "improved",
                        "message": "Знайдено покращення, JSON оновлено та фінально оброблено JSON Engineer",
                        "report_path": str(review_report_path),
                        "raw_json_path": str(raw_json_path),
                        "final_json_path": final_json.get("final_json_path"),
                        "figma_ready_path": final_json.get("figma_ready_path")
                    }
                
                return {
                    "status": "improved", 
                    "message": "Знайдено покращення, JSON оновлено",
                    "report_path": str(review_report_path),
                    "raw_json_path": str(raw_json_path)
                }
            else:
                return {
                    "status": "error",
                    "message": "Покращення знайдено, але не вдалося витягнути JSON",
                    "report_path": str(review_report_path)
                }
        
        # Невідомий формат відповіді
        return {
            "status": "unknown",
            "message": "Невідомий формат відповіді reviewer",
            "report_path": str(review_report_path)
        }
    
    def extract_json_from_response(self, response: str) -> Optional[Dict]:
        """
        Витягнути JSON з відповіді Gemini reviewer
        """
        try:
            # Метод 1: Шукати JSON блок в markdown
            start_marker = "```json"
            end_marker = "```"
            
            start_idx = response.find(start_marker)
            if start_idx != -1:
                start_idx += len(start_marker)
                end_idx = response.find(end_marker, start_idx)
                if end_idx != -1:
                    json_str = response[start_idx:end_idx].strip()
                    
                    # Очистити коментарі JavaScript-стилю
                    import re
                    json_str = re.sub(r'//.*$', '', json_str, flags=re.MULTILINE)
                    json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
                    
                    return json.loads(json_str)
            
            # Метод 2: Шукати JSON після "# DESIGN SPECIFICATION"
            spec_marker = "# DESIGN SPECIFICATION"
            spec_idx = response.find(spec_marker)
            if spec_idx != -1:
                # Шукати перші дужки після marker
                start_brace = response.find("{", spec_idx)
                if start_brace != -1:
                    # Знайти відповідну закриваючу дужку
                    brace_count = 0
                    for i in range(start_brace, len(response)):
                        if response[i] == '{':
                            brace_count += 1
                        elif response[i] == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                json_str = response[start_brace:i+1]
                                return json.loads(json_str)
            
            print("⚠️ JSON не знайдено у відповіді reviewer")
            return None
            
        except json.JSONDecodeError as e:
            print(f"⚠️ Помилка парсингу JSON: {e}")
            return None
        except Exception as e:
            print(f"⚠️ Помилка витягування JSON: {e}")
            return None
    
    def run_json_engineer(self, improved_json: Dict, context: Dict, timestamp: str) -> Optional[Dict]:
        """
        Викликати JSON Engineer напряму з Gemini API (БЕЗ subprocess)
        """
        print("🔧 Запуск JSON Engineer для фінальної обробки...")
        
        try:
            # 1. Завантажити design-reviewer-json-engineer prompt
            design_reviewer_prompt_path = self.base_path / "src/prompts/roles/5 design-reviewer-json-engineer.txt"
            if not design_reviewer_prompt_path.exists():
                print(f"❌ Design reviewer JSON Engineer prompt не знайдено: {design_reviewer_prompt_path}")
                return None
            
            with open(design_reviewer_prompt_path, 'r', encoding='utf-8') as f:
                prompt_template = f.read()
            
            # 2. Підготувати input у форматі, що очікує prompt
            reviewer_improvements = f"REVIEWER IMPROVEMENTS:\n\n{json.dumps(improved_json, indent=2, ensure_ascii=False)}\n\n---RATIONALE-SEPARATOR---\n\nDesign improvements made by Gemini Vision reviewer based on visual analysis."
            
            # 3. Підставити reviewer output в prompt template
            if "{{REVIEWER_OUTPUT}}" in prompt_template:
                formatted_prompt = prompt_template.replace("{{REVIEWER_OUTPUT}}", reviewer_improvements)
            else:
                # Якщо template placeholder не знайдено, додати в кінець
                formatted_prompt = prompt_template + f"\n\n## Previous Stage Output (Stage 4: Design Reviewer):\n{reviewer_improvements}"
            
            # 4. Завантажити design system data для JSON Engineer
            design_system_path = self.base_path / "design-system" / "design-system-raw-data-2025-08-03T10-46-26.json"
            design_system_data = ""
            if design_system_path.exists():
                with open(design_system_path, 'r', encoding='utf-8') as f:
                    design_system_data = f.read()
                print(f"📊 Loaded design system data: {len(design_system_data)} characters")
            
            # Підставити design system data
            if "{{DESIGN_SYSTEM_DATA}}" in formatted_prompt:
                formatted_prompt = formatted_prompt.replace("{{DESIGN_SYSTEM_DATA}}", design_system_data)
            
            # Підставити user request analyzer output якщо є
            if context.get('user_request') and "{{USER_REQUEST_ANALYZER_OUTPUT}}" in formatted_prompt:
                formatted_prompt = formatted_prompt.replace("{{USER_REQUEST_ANALYZER_OUTPUT}}", context['user_request'])
            
            print(f"🤖 Відправка до JSON Engineer Gemini API (prompt length: {len(formatted_prompt)})...")
            
            # 5. Викликати Gemini API
            response = self.model.generate_content(formatted_prompt)
            
            if not response or not response.text:
                print("❌ JSON Engineer не повернув відповідь")
                return None
                
            print("✅ Отримано відповідь від JSON Engineer")
            
            # 6. Спробувати витягти JSON з відповіді
            try:
                # Якщо відповідь містить ```json блок
                if "```json" in response.text:
                    json_start = response.text.find("```json") + 7
                    json_end = response.text.find("```", json_start)
                    json_content = response.text[json_start:json_end].strip()
                else:
                    # Спробувати знайти JSON об'єкт
                    json_start = response.text.find("{")
                    if json_start == -1:
                        raise ValueError("JSON не знайдено у відповіді")
                    json_content = response.text[json_start:].strip()
                    # Знайти останню закриваючу дужку
                    brace_count = 0
                    json_end = json_start
                    for i, char in enumerate(json_content):
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                json_end = i + 1
                                break
                    json_content = json_content[:json_end]
                
                # Парсинг JSON
                final_json = json.loads(json_content)
                
                # 7. Створити результат у форматі, що очікується pipeline
                stage_result = {
                    "content": response.text,
                    "generatedJSON": final_json,
                    "metadata": {
                        "stage": "Stage 5: JSON Engineer",
                        "timestamp": int(datetime.now().timestamp()),
                        "promptUsed": True,
                        "inputStage": "Stage 4: Design Reviewer",
                        "promptLength": len(formatted_prompt),
                        "designSystemUsed": bool(design_system_data),
                        "componentsAvailable": len(design_system_data) // 1000,  # Rough estimate
                        "aiUsed": True,
                        "jsonGenerated": True,
                        "jsonValid": True
                    }
                }
                
                # 8. Зберегти результати
                stage5_result_path = self.python_outputs_path / f"alt3_{timestamp}_5_json_engineer.json"
                with open(stage5_result_path, 'w', encoding='utf-8') as f:
                    json.dump(stage_result, f, indent=2, ensure_ascii=False)
                
                print(f"💾 Stage 5 результат збережено: {stage5_result_path}")
                
                # 9. Зберегти фінальний JSON у figma-ready
                figma_ready_dir = self.base_path / "figma-ready"
                figma_ready_dir.mkdir(exist_ok=True)
                
                figma_ready_path = figma_ready_dir / "final_design.json"
                with open(figma_ready_path, 'w', encoding='utf-8') as f:
                    json.dump(final_json, f, indent=2, ensure_ascii=False)
                
                print(f"📁 JSON збережено у figma-ready: {figma_ready_path}")
                
                return {
                    "success": True,
                    "stage5_path": str(stage5_result_path),
                    "figma_ready_path": str(figma_ready_path),
                    "json_generated": True
                }
                
            except json.JSONDecodeError as e:
                print(f"❌ Помилка парсингу JSON від JSON Engineer: {e}")
                print(f"Raw response: {response.text[:500]}...")
                return None
            except Exception as e:
                print(f"❌ Помилка обробки відповіді JSON Engineer: {e}")
                return None
                
        except Exception as e:
            print(f"❌ Помилка виконання JSON Engineer: {e}")
            return None


def main():
    """
    Тестова функція для перевірки модуля
    """
    print("🧪 Тестування DesignReviewer модуля...")
    
    try:
        # Ініціалізація
        reviewer = DesignReviewer()
        
        # Тест завантаження prompt
        prompt = reviewer.load_reviewer_prompt()
        print(f"✅ Reviewer prompt завантажено: {len(prompt)} символів")
        
        # Тест пошуку timestamp файлів
        timestamp_files = list(reviewer.python_outputs_path.glob("*20250812*"))
        print(f"📁 Знайдено {len(timestamp_files)} timestamp файлів для 20250812")
        
        if timestamp_files:
            # Витягнути timestamp з першого файлу
            filename = timestamp_files[0].name
            # Наприклад: alt3_20250812_143736_1_user_request_analyzer.json -> 20250812_143736
            parts = filename.split('_')
            if len(parts) >= 3:
                timestamp = f"{parts[1]}_{parts[2]}"  # 20250812_143736
                context = reviewer.load_pipeline_context(timestamp)
                print(f"📋 Контекст завантажено для {timestamp}: {list(context.keys())}")
        
        print("✅ Тестування завершено успішно")
        
    except Exception as e:
        print(f"❌ Помилка тестування: {e}")


if __name__ == "__main__":
    main()