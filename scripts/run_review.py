#!/usr/bin/env python3
"""
CLI скрипт для запуску Design Review системи UXPal

Використання:
    python run_review.py 20250812_143736 screenshot_20250812_143736.png
    python run_review.py 20250812_143736 screenshot_20250812_143736.png --verbose
    
Автоматично знаходить відповідну папку в python_outputs/ та запускає review.
"""

import sys
import os
from pathlib import Path
import argparse
from design_reviewer import DesignReviewer


def parse_arguments():
    """
    Парсинг аргументів командного рядка
    """
    parser = argparse.ArgumentParser(
        description="UXPal Design Review System - Візуальна перевірка згенерованих дизайнів",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Приклади використання:

  # Базовий review
  python run_review.py 20250812_143736 screenshot_20250812_143736.png
  
  # З детальним виводом
  python run_review.py 20250812_143736 screenshot_20250812_143736.png --verbose
  
  # Автоматичний пошук скріншота (якщо ім'я стандартне)
  python run_review.py 20250812_143736

Структура файлів:
  python_outputs/alt3_20250812_143736_*_*.json  <- вхідні дані
  screenshots/screenshot_20250812_143736.png    <- скріншот для аналізу
  python_outputs/alt3_20250812_143736/stage4_reviewer.txt  <- результат
        """
    )
    
    parser.add_argument(
        "timestamp", 
        help="Timestamp папки в python_outputs (наприклад: 20250812_143736)"
    )
    
    parser.add_argument(
        "screenshot", 
        nargs='?',  # Опціональний параметр
        help="Ім'я файлу скріншота в папці screenshots (наприклад: screenshot_20250812_143736.png)"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Детальний вивід процесу"
    )
    
    parser.add_argument(
        "--api-key",
        help="Gemini API ключ (якщо не встановлено через змінну GEMINI_API_KEY)"
    )
    
    return parser.parse_args()


def find_screenshot_automatically(timestamp: str, screenshots_path: Path) -> str:
    """
    Автоматичний пошук скріншота за timestamp
    """
    possible_names = [
        f"screenshot_{timestamp}.png",
        f"screenshot_{timestamp}.jpg", 
        f"screenshot_{timestamp}.jpeg",
        f"{timestamp}.png",
        f"design_{timestamp}.png"
    ]
    
    for name in possible_names:
        if (screenshots_path / name).exists():
            return name
    
    # Якщо не знайшли точну відповідність, шукаємо за частковим збігом
    for screenshot_file in screenshots_path.glob("*"):
        if timestamp in screenshot_file.name:
            return screenshot_file.name
    
    return None


def print_header():
    """
    Вивести заголовок програми
    """
    print("\n" + "="*60)
    print("🎨 UXPal Design Review System")
    print("   Візуальна перевірка якості згенерованих дизайнів")
    print("="*60 + "\n")


def print_results(result: dict, verbose: bool = False):
    """
    Вивести результати review
    """
    print("\n" + "-"*40)
    print("📊 РЕЗУЛЬТАТИ REVIEW")
    print("-"*40)
    
    status = result.get("status", "unknown")
    message = result.get("message", "Повідомлення відсутнє")
    
    if status == "approved":
        print("✅ СХВАЛЕНО: Дизайн пройшов усі перевірки")
        print(f"   {message}")
        
    elif status == "improved":
        print("🔧 ПОКРАЩЕНО: Знайдено та виправлено проблеми")
        print(f"   {message}")
        
        if verbose and result.get("raw_json_path"):
            print(f"📁 Raw Reviewer JSON: {result['raw_json_path']}")
        
        if result.get("figma_ready_path"):
            print(f"🎯 Ready for Figma: {result['figma_ready_path']}")
            
    elif status == "error":
        print("❌ ПОМИЛКА:")
        print(f"   {message}")
        
    else:
        print("❓ НЕВІДОМИЙ СТАТУС:")
        print(f"   {message}")
    
    # Завжди показуємо шлях до звіту
    if result.get("report_path"):
        print(f"📝 Детальний звіт: {result['report_path']}")
    
    print("\n" + "="*60)


def main():
    """
    Головна функція CLI скрипта
    """
    try:
        # Парсинг аргументів
        args = parse_arguments()
        
        if args.verbose:
            print_header()
            print(f"🔍 Timestamp: {args.timestamp}")
            if args.screenshot:
                print(f"📸 Скріншот: {args.screenshot}")
        
        # Ініціалізація reviewer
        try:
            api_key = args.api_key or os.getenv('GEMINI_API_KEY')
            reviewer = DesignReviewer(api_key=api_key)
            
            if args.verbose:
                print("✅ DesignReviewer ініціалізовано")
                
        except ValueError as e:
            print("❌ Помилка конфігурації:")
            print(f"   {e}")
            print("\n💡 Рішення:")
            print("   1. Встановіть змінну: export GEMINI_API_KEY='your-api-key'")
            print("   2. Або використовуйте: --api-key 'your-api-key'")
            return 1
        
        # Визначення скріншота
        screenshot_filename = args.screenshot
        if not screenshot_filename:
            if args.verbose:
                print("🔍 Автоматичний пошук скріншота...")
            
            screenshot_filename = find_screenshot_automatically(
                args.timestamp, 
                reviewer.screenshots_path
            )
            
            if not screenshot_filename:
                print("❌ Скріншот не знайдено")
                print(f"   Шукали в: {reviewer.screenshots_path}")
                print(f"   Очікувані назви: screenshot_{args.timestamp}.png")
                return 1
            
            if args.verbose:
                print(f"✅ Знайдено скріншот: {screenshot_filename}")
        
        # Перевірка існування скріншота
        screenshot_path = reviewer.screenshots_path / screenshot_filename
        if not screenshot_path.exists():
            print("❌ Скріншот не існує:")
            print(f"   {screenshot_path}")
            return 1
        
        # Запуск review
        if args.verbose:
            print("\n🚀 Запуск review процесу...")
        else:
            print_header()
            print(f"Аналізуємо дизайн: {args.timestamp}")
            print(f"Скріншот: {screenshot_filename}")
            print("\n🤖 Обробка через Gemini Vision API...")
        
        result = reviewer.review_design(args.timestamp, screenshot_filename)
        
        # Вивід результатів
        print_results(result, args.verbose)
        
        # Код виходу
        if result.get("status") == "error":
            return 1
        else:
            return 0
            
    except KeyboardInterrupt:
        print("\n\n⏹️  Операцію скасовано користувачем")
        return 1
        
    except Exception as e:
        print(f"\n❌ Несподівана помилка: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


def show_help():
    """
    Показати додаткову довідку
    """
    print("""
🎯 UXPal Design Review System - Довідка

ПРИЗНАЧЕННЯ:
Візуальна перевірка якості згенерованих дизайнів через Gemini Vision API.
Система аналізує скріншот дизайну та надає рекомендації з покращення.

WORKFLOW:
1. Запустіть основний pipeline (node code.js або python) 
2. Згенерований JSON скопіюйте в Figma та зробіть render
3. Зробіть скріншот та збережіть у screenshots/
4. Запустіть review: python run_review.py <timestamp> <screenshot>

ФАЙЛИ ЩО СТВОРЮЮТЬСЯ:
- stage4_reviewer.txt       - детальний звіт review
- stage4_reviewer_raw.json  - покращений JSON (якщо потрібно)
- stage5_final_engineer.json - фінальний JSON після JSON Engineer

НАЛАШТУВАННЯ:
export GEMINI_API_KEY="your-gemini-api-key"

ПРИКЛАДИ:
python run_review.py 20250812_143736 screenshot_20250812_143736.png
python run_review.py 20250812_143736 --verbose
""")


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] in ['--help', '-h', 'help']:
        show_help()
        sys.exit(0)
    
    sys.exit(main())