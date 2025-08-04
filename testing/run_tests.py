#!/usr/bin/env python3
"""
Main entry point for UXPal Automated Testing System.
Command-line interface for running tests and analyzing results.
"""

import sys
import os
import argparse
from typing import Optional

# Add testing directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from test_orchestrator import TestOrchestrator
from test_requests import TEST_REQUESTS

def main():
    """Main entry point with command line argument parsing."""
    
    # Get project root (parent of testing directory)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    parser = argparse.ArgumentParser(
        description="UXPal Automated Testing System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_tests.py full                    # Run complete test suite
  python run_tests.py debug test1_login       # Debug single test
  python run_tests.py quick test2_settings    # Quick test without interaction
  python run_tests.py list                    # List available tests
  python run_tests.py status                  # Show system status
        """
    )
    
    parser.add_argument('command', 
                       choices=['full', 'debug', 'quick', 'list', 'status', 'interactive'],
                       help='Command to execute')
    
    parser.add_argument('test_name', 
                       nargs='?',
                       help='Test name (required for debug/quick commands)')
    
    parser.add_argument('--target-rate',
                       type=float,
                       default=0.8,
                       help='Target success rate (default: 0.8)')
    
    parser.add_argument('--iterations',
                       type=int, 
                       default=1,
                       help='Number of iterations for debug mode (default: 1)')
    
    parser.add_argument('--project-root',
                       type=str,
                       default=project_root,
                       help=f'Project root directory (default: {project_root})')
    
    args = parser.parse_args()
    
    # Initialize orchestrator
    orchestrator = TestOrchestrator(args.project_root)
    
    # Execute command
    if args.command == 'full':
        run_full_suite(orchestrator, args.target_rate)
    
    elif args.command == 'debug':
        if not args.test_name:
            print("❌ Error: test_name required for debug command")
            print("Available tests:", ', '.join(TEST_REQUESTS.keys()))
            sys.exit(1)
        run_debug_mode(orchestrator, args.test_name, args.iterations)
    
    elif args.command == 'quick':
        if not args.test_name:
            print("❌ Error: test_name required for quick command")
            print("Available tests:", ', '.join(TEST_REQUESTS.keys()))
            sys.exit(1)
        run_quick_test(orchestrator, args.test_name)
    
    elif args.command == 'list':
        orchestrator.list_available_tests()
    
    elif args.command == 'status':
        show_system_status(orchestrator)
    
    elif args.command == 'interactive':
        run_interactive_mode(orchestrator)

def run_full_suite(orchestrator: TestOrchestrator, target_rate: float):
    """Run the complete test suite."""
    try:
        orchestrator.run_full_test_suite(target_success_rate=target_rate)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test suite interrupted by user")
    except Exception as e:
        print(f"\n❌ Error running test suite: {e}")
        sys.exit(1)

def run_debug_mode(orchestrator: TestOrchestrator, test_name: str, iterations: int):
    """Run debug mode for a single test."""
    try:
        orchestrator.run_single_test_debug(test_name, iterations)
    except KeyboardInterrupt:
        print("\n\n⚠️  Debug session interrupted by user")
    except Exception as e:
        print(f"\n❌ Error in debug mode: {e}")
        sys.exit(1)

def run_quick_test(orchestrator: TestOrchestrator, test_name: str):
    """Run quick test without human interaction."""
    print(f"🚀 Running quick test: {test_name}")
    
    try:
        success = orchestrator.quick_test(test_name)
        if success:
            print(f"✅ Quick test PASSED: {test_name}")
        else:
            print(f"❌ Quick test FAILED: {test_name}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error in quick test: {e}")
        sys.exit(1)

def show_system_status(orchestrator: TestOrchestrator):
    """Show current system status."""
    print("📊 SYSTEM STATUS")
    print("=" * 50)
    
    status = orchestrator.get_system_status()
    
    print(f"📁 Project Root: {status['project_root']}")
    print(f"🧪 Available Tests: {status['available_tests']}")
    print(f"📂 Results Directory: {status['results_directory']}")
    
    if status.get('latest_report_date'):
        print(f"📅 Latest Report: {status['latest_report_date']}")
        print(f"📈 Latest Success Rate: {status.get('latest_overall_success_rate', 0):.1%}")
    else:
        print("📋 No previous reports found")
    
    # Check if required files exist
    required_files = [
        'user-request.txt',
        'instance.py',
        'design-system/design-system-raw-data-*.json'
    ]
    
    print(f"\n🔍 File Check:")
    for file_pattern in required_files:
        file_path = os.path.join(status['project_root'], file_pattern)
        if '*' in file_pattern:
            import glob
            exists = bool(glob.glob(file_path))
        else:
            exists = os.path.exists(file_path)
        
        status_icon = "✅" if exists else "❌"
        print(f"  {status_icon} {file_pattern}")

def run_interactive_mode(orchestrator: TestOrchestrator):
    """Run interactive mode with menu."""
    while True:
        print(f"\n🤖 AUTOMATED TESTING SYSTEM")
        print("=" * 40)
        print("1. Run full test suite")
        print("2. Debug single test")
        print("3. Quick test")
        print("4. List available tests")
        print("5. Show system status")
        print("6. Exit")
        
        try:
            choice = input("\nSelect option (1-6): ").strip()
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        
        if choice == "1":
            target_rate = input("Target success rate (default 0.8): ").strip()
            try:
                target_rate = float(target_rate) if target_rate else 0.8
            except ValueError:
                target_rate = 0.8
            run_full_suite(orchestrator, target_rate)
        
        elif choice == "2":
            orchestrator.list_available_tests()
            test_name = input("\nEnter test name: ").strip()
            if test_name in TEST_REQUESTS:
                iterations = input("Number of iterations (default 1): ").strip()
                try:
                    iterations = int(iterations) if iterations else 1
                except ValueError:
                    iterations = 1
                run_debug_mode(orchestrator, test_name, iterations)
            else:
                print("❌ Invalid test name")
        
        elif choice == "3":
            orchestrator.list_available_tests()
            test_name = input("\nEnter test name: ").strip()
            if test_name in TEST_REQUESTS:
                run_quick_test(orchestrator, test_name)
            else:
                print("❌ Invalid test name")
        
        elif choice == "4":
            orchestrator.list_available_tests()
        
        elif choice == "5":
            show_system_status(orchestrator)
        
        elif choice == "6":
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice, please select 1-6")

if __name__ == "__main__":
    # Check if running without arguments - start interactive mode
    if len(sys.argv) == 1:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        orchestrator = TestOrchestrator(project_root)
        run_interactive_mode(orchestrator)
    else:
        main()