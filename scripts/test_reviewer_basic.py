#!/usr/bin/env python3
"""
Базове тестування Design Reviewer системи БЕЗ API ключів
"""

import os
import json
from pathlib import Path

def test_file_structure():
    """Тест структури файлів"""
    print("📁 Тест структури файлів:")
    
    base_path = Path("/Users/stipa/UXPal")
    
    # Перевірити ключові папки
    tests = {
        "scripts/": base_path / "scripts",
        "python_outputs/": base_path / "python_outputs", 
        "screenshots/": base_path / "screenshots",
        "src/prompts/roles/reviewer.txt": base_path / "src/prompts/roles/reviewer.txt"
    }
    
    for name, path in tests.items():
        if path.exists():
            print(f"   ✅ {name}")
        else:
            print(f"   ❌ {name} - не знайдено")

def test_context_loading():
    """Тест завантаження контексту без API"""
    print("\n📋 Тест завантаження контексту:")
    
    # Імпорт без ініціалізації API
    import sys
    sys.path.append('scripts')
    
    # Створимо mock версію класу
    from design_reviewer import DesignReviewer
    
    # Mock init без API
    try:
        base_path = Path("/Users/stipa/UXPal")
        python_outputs_path = base_path / "python_outputs"
        
        # Знайти timestamp
        timestamp_files = list(python_outputs_path.glob("alt3_20250812_*"))
        if timestamp_files:
            # Взяти перший файл та витягнути timestamp
            first_file = timestamp_files[0].name
            # alt3_20250812_094750_1_user_request_analyzer.json -> 20250812_094750
            parts = first_file.split('_')
            if len(parts) >= 3:
                timestamp = f"{parts[1]}_{parts[2]}"
                print(f"   ✅ Знайдено timestamp: {timestamp}")
                
                # Перевірити існування файлів
                expected_files = [
                    f"alt3_{timestamp}_1_user_request_analyzer_output.txt",
                    f"alt3_{timestamp}_2_ux_ui_designer_output.txt", 
                    f"alt3_{timestamp}_3_json_engineer.json"
                ]
                
                for filename in expected_files:
                    if (python_outputs_path / filename).exists():
                        print(f"   ✅ {filename}")
                    else:
                        print(f"   ❌ {filename} - не знайдено")
                        
                return timestamp
            else:
                print("   ❌ Неправильний формат timestamp")
        else:
            print("   ❌ Timestamp файли не знайдені")
            
    except Exception as e:
        print(f"   ❌ Помилка: {e}")
    
    return None

def test_reviewer_prompt():
    """Тест завантаження reviewer prompt"""
    print("\n📝 Тест reviewer prompt:")
    
    prompt_path = Path("/Users/stipa/UXPal/src/prompts/roles/reviewer.txt")
    
    try:
        if prompt_path.exists():
            content = prompt_path.read_text(encoding='utf-8')
            print(f"   ✅ Prompt завантажено: {len(content)} символів")
            
            # Перевірити наявність ключових секцій
            key_sections = [
                "REVIEW CONTEXT",
                "CRITICAL ISSUES", 
                "OUTPUT FORMAT",
                "DESIGN REVIEW: APPROVED"
            ]
            
            for section in key_sections:
                if section in content:
                    print(f"   ✅ Секція '{section}' присутня")
                else:
                    print(f"   ❌ Секція '{section}' відсутня")
        else:
            print("   ❌ Reviewer prompt файл не знайдено")
            
    except Exception as e:
        print(f"   ❌ Помилка: {e}")

def test_cli_script():
    """Тест CLI скрипта"""
    print("\n🖥️  Тест CLI скрипта:")
    
    import subprocess
    import sys
    
    try:
        # Тест help
        result = subprocess.run([
            sys.executable, "scripts/run_review.py", "--help"
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            print("   ✅ CLI --help працює")
            # print("   📄 Help output:")
            # print("      " + result.stdout[:200] + "...")
        else:
            print(f"   ❌ CLI --help помилка: {result.stderr}")
            
    except Exception as e:
        print(f"   ❌ Помилка тестування CLI: {e}")

def test_screenshots():
    """Тест доступних скріншотів"""
    print("\n📸 Тест скріншотів:")
    
    screenshots_path = Path("/Users/stipa/UXPal/screenshots")
    
    if screenshots_path.exists():
        screenshots = list(screenshots_path.glob("*.png")) + list(screenshots_path.glob("*.jpg"))
        print(f"   ✅ Знайдено {len(screenshots)} скріншотів")
        
        for i, screenshot in enumerate(screenshots[:3]):  # Показати перші 3
            print(f"   📄 {screenshot.name}")
            
        if len(screenshots) > 3:
            print(f"   ... та ще {len(screenshots) - 3} файлів")
    else:
        print("   ❌ Папка screenshots не знайдена")

def main():
    print("🧪 БАЗОВЕ ТЕСТУВАННЯ DESIGN REVIEWER СИСТЕМИ")
    print("=" * 50)
    
    test_file_structure()
    timestamp = test_context_loading() 
    test_reviewer_prompt()
    test_cli_script()
    test_screenshots()
    
    print("\n" + "=" * 50)
    print("📋 РЕЗУЛЬТАТ ТЕСТУВАННЯ:")
    
    if timestamp:
        print(f"✅ Система готова до тестування з timestamp: {timestamp}")
        print("\n🎯 НАСТУПНІ КРОКИ:")
        print("1. Отримайте Gemini API key")
        print("2. Встановіть: export GEMINI_API_KEY='your-key'")
        print(f"3. Запустіть: python scripts/run_review.py {timestamp} screenshot_file.png --verbose")
    else:
        print("❌ Потрібно виправити проблеми перед повним тестуванням")

if __name__ == "__main__":
    main()