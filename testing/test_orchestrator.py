"""
Test Orchestrator for UXPal automated testing system.
Main controller that manages the complete testing workflow with human decision points.
"""

import os
import json
from typing import Dict, List, Optional
from batch_runner import BatchTestRunner
from test_dashboard import TestingDashboard
from test_requests import TEST_REQUESTS

class TestOrchestrator:
    def __init__(self, project_root: str):
        """Initialize orchestrator with project root path."""
        self.project_root = project_root
        self.batch_runner = BatchTestRunner(project_root)
        self.dashboard = TestingDashboard(f"{project_root}/testing/results")
        self.test_sequence = [
            "test1_login",
            "test2_settings", 
            "test3_product_listing",
            "test4_product_detail",
            "test5_seller_dashboard"
        ]

    def run_full_test_suite(self, target_success_rate: float = 0.8) -> None:
        """Execute complete testing workflow with human checkpoints."""

        print("🤖 AUTOMATED TESTING SUITE STARTING")
        print("=" * 60)
        print(f"🎯 Target success rate: {int(target_success_rate * 100)}%")
        print(f"📋 Project root: {self.project_root}")
        print("=" * 60)

        all_batch_results = []

        # **HUMAN DECISION POINT 1: Confirm test sequence**
        print(f"\n📋 Planned test sequence:")
        for i, test_name in enumerate(self.test_sequence, 1):
            test_config = TEST_REQUESTS[test_name]
            print(f"  {i}. {test_config['name']} ({test_config['complexity']})")

        while True:
            proceed = input(f"\n🤔 Proceed with full test suite? (y/n/customize): ").lower().strip()
            if proceed in ['y', 'n', 'customize']:
                break
            print("Please enter 'y', 'n', or 'customize'")

        if proceed == 'n':
            print("❌ Test suite cancelled by user")
            return
        elif proceed == 'customize':
            self.test_sequence = self._customize_test_sequence()
            if not self.test_sequence:
                print("❌ No tests selected, exiting")
                return

        # Execute test sequence
        for i, test_name in enumerate(self.test_sequence, 1):
            print(f"\n{'=' * 70}")
            print(f"🧪 TEST {i}/{len(self.test_sequence)}: {TEST_REQUESTS[test_name]['name']}")
            print(f"📊 Complexity: {TEST_REQUESTS[test_name]['complexity']}")
            print(f"🎯 Target: {int(target_success_rate * 100)}% success rate")
            print(f"{'=' * 70}")

            # **HUMAN DECISION POINT 2: Start individual test**
            while True:
                proceed = input(f"\n🚀 Start {test_name}? (y/n/skip/stop): ").lower().strip()
                if proceed in ['y', 'n', 'skip', 'stop']:
                    break
                print("Please enter 'y', 'n', 'skip', or 'stop'")

            if proceed == 'stop':
                print("🛑 Test suite stopped by user")
                break
            elif proceed == 'n':
                print("❌ Test suite cancelled by user")
                break
            elif proceed == 'skip':
                print(f"⏭️  Skipping {test_name}")
                continue

            # Run test batch
            print(f"\n🔄 Running batch for {test_name}...")
            batch_result = self.batch_runner.run_test_batch(
                test_name,
                target_success_rate=target_success_rate
            )

            all_batch_results.append(batch_result)

            # Show immediate results
            self._display_batch_summary(batch_result)

            # **HUMAN DECISION POINT 3: Handle test failure**
            if not batch_result["passed"]:
                print(f"\n⚠️  {test_name} did not meet success criteria ({batch_result['success_rate']:.1%} < {target_success_rate:.1%})")
                
                while True:
                    action = input("Continue to next test (c), retry this test (r), or stop (s)? ").lower().strip()
                    if action in ['c', 'r', 's']:
                        break
                    print("Please enter 'c', 'r', or 's'")

                if action == 's':
                    print("🛑 Test suite stopped by user")
                    break
                elif action == 'r':
                    print(f"🔄 Retrying {test_name}...")
                    retry_result = self.batch_runner.run_test_batch(
                        test_name,
                        target_success_rate=target_success_rate
                    )
                    all_batch_results[-1] = retry_result  # Replace last result
                    self._display_batch_summary(retry_result)

            print(f"\n✅ Completed {test_name}")

        # Generate final comprehensive report
        if all_batch_results:
            print(f"\n{'=' * 70}")
            print("📊 GENERATING COMPREHENSIVE REPORT") 
            print(f"{'=' * 70}")

            final_report = self.dashboard.generate_comprehensive_report(all_batch_results)

            # Display summary
            self.dashboard.display_summary(final_report)

            # **HUMAN DECISION POINT 4: Review detailed recommendations**
            while True:
                proceed = input(f"\n🔍 View detailed recommendations? (y/n): ").lower().strip()
                if proceed in ['y', 'n']:
                    break
                print("Please enter 'y' or 'n'")

            if proceed == 'y':
                self._display_detailed_recommendations(final_report)

        else:
            print("\n⚠️  No test results to analyze")

        print(f"\n🏁 Test suite completed!")

    def _customize_test_sequence(self) -> List[str]:
        """Allow user to customize test sequence."""
        print(f"\n📋 Available tests:")
        for i, (test_name, config) in enumerate(TEST_REQUESTS.items(), 1):
            print(f"  {i}. {test_name}: {config['name']} ({config['complexity']})")

        print(f"\nEnter test numbers separated by spaces (e.g., '1 3 5')")
        print(f"Or enter test names separated by spaces (e.g., 'test1_login test3_product_listing')")
        
        selection = input("Selection: ").strip()
        
        if not selection:
            return []

        selected_tests = []
        
        # Try parsing as numbers first
        try:
            numbers = [int(x) for x in selection.split()]
            test_list = list(TEST_REQUESTS.keys())
            for num in numbers:
                if 1 <= num <= len(test_list):
                    selected_tests.append(test_list[num - 1])
        except ValueError:
            # Try parsing as test names
            names = selection.split()
            for name in names:
                if name in TEST_REQUESTS:
                    selected_tests.append(name)

        if selected_tests:
            print(f"\n✅ Selected tests:")
            for test_name in selected_tests:
                print(f"  • {TEST_REQUESTS[test_name]['name']}")
        else:
            print(f"\n❌ No valid tests selected")

        return selected_tests

    def _display_batch_summary(self, batch_result: Dict):
        """Display summary of batch test results."""
        print(f"\n📊 BATCH RESULTS:")
        print(f"  Test: {batch_result['test_name']}")
        print(f"  Success Rate: {batch_result['success_rate']:.1%}")
        print(f"  Qualified Successes: {batch_result['qualified_successes']}/{batch_result['total_iterations']}")
        print(f"  Target Met: {'✅ YES' if batch_result['passed'] else '❌ NO'}")
        
        if batch_result.get('summary'):
            summary = batch_result['summary']
            print(f"  Pipeline Success: {summary.get('pipeline_success_rate', 0):.1%}")
            print(f"  Quality Success: {summary.get('quality_success_rate', 0):.1%}")
            print(f"  Visual Success: {summary.get('visual_success_rate', 0):.1%}")

    def _display_detailed_recommendations(self, report: Dict):
        """Display detailed recommendations from the report."""
        recommendations = report.get("improvement_recommendations", [])
        
        if not recommendations:
            print("📋 No specific recommendations generated")
            return

        print(f"\n🔧 DETAILED RECOMMENDATIONS:")
        print(f"{'=' * 60}")
        
        for i, rec in enumerate(recommendations, 1):
            print(f"\n{i}. [{rec['priority']}] {rec['category'].upper()}")
            print(f"   Issue: {rec['issue']}")
            print(f"   Action: {rec['action']}")
            print(f"   File: {rec['prompt_section']}")
            if rec.get('affected_tests'):
                print(f"   Affected Tests: {', '.join(rec['affected_tests'])}")

        print(f"\n🚀 NEXT ACTIONS:")
        for action in report.get("next_actions", []):
            print(f"  • {action}")

    def run_single_test_debug(self, test_name: str, iterations: int = 1) -> None:
        """Run single test with detailed debugging output."""

        if test_name not in TEST_REQUESTS:
            print(f"❌ Unknown test: {test_name}")
            print(f"Available tests: {', '.join(TEST_REQUESTS.keys())}")
            return

        test_config = TEST_REQUESTS[test_name]
        print(f"🤔 DEBUG MODE: {test_config['name']}")
        print(f"📋 Complexity: {test_config['complexity']}")
        print(f"🔢 Running {iterations} iteration(s)")
        print(f"📝 Request: {test_config['request']}")
        
        results = []
        
        for i in range(iterations):
            if iterations > 1:
                print(f"\n--- Debug Iteration {i+1}/{iterations} ---")
            
            result = self.batch_runner.run_single_test(test_name)
            results.append(result)

            print(f"\n📊 Results:")
            print(f"  Pipeline Success: {result['success']}")
            print(f"  Quality Valid: {result['quality_valid']}")
            print(f"  Criteria Met: {result['criteria_met']}")
            print(f"  Execution Time: {result.get('execution_time', 0):.1f}s")

            if result.get("quality_report"):
                report = result["quality_report"]
                print(f"\n📊 Quality Report:")
                print(f"  Critical Issues: {len(report.get('critical_issues', []))}")
                if report.get('critical_issues'):
                    for issue in report['critical_issues']:
                        print(f"    • {issue}")
                
                print(f"  Warnings: {len(report.get('warnings', []))}")
                if report.get('warnings'):
                    for warning in report['warnings'][:3]:  # Show first 3
                        print(f"    • {warning}")
                
                metrics = report.get('metrics', {})
                print(f"  Native Elements: {metrics.get('native_element_count', 0)}")
                print(f"  Component Count: {metrics.get('component_count', 0)}")
                print(f"  Layout Depth: {metrics.get('layout_depth', 0)}")

            if not result["success"]:
                print(f"\n❌ Pipeline Errors:")
                if result.get("pipeline_errors"):
                    print(result["pipeline_errors"][:500])  # First 500 chars

            # **HUMAN DECISION POINT**
            if result["success"] and result["quality_valid"]:
                print(f"\n🤔 MANUAL REVIEW:")
                print(f"👀 File: {result.get('output_file', 'Not found')}")
                input("Press Enter after reviewing in Figma...")

        # Summary for multiple iterations
        if iterations > 1:
            successes = sum(1 for r in results if r["success"] and r["quality_valid"] and r["criteria_met"])
            print(f"\n📊 SUMMARY ({iterations} iterations):")
            print(f"  Overall Success Rate: {successes / iterations:.1%}")
            print(f"  Average Execution Time: {sum(r.get('execution_time', 0) for r in results) / iterations:.1f}s")

    def quick_test(self, test_name: str) -> bool:
        """Quick test run without human interaction for CI/automated testing."""
        if test_name not in TEST_REQUESTS:
            return False
            
        result = self.batch_runner.run_single_test(test_name)
        return (result["success"] and result["quality_valid"] and result["criteria_met"])

    def list_available_tests(self):
        """Display all available tests."""
        print(f"📋 Available Tests:")
        print(f"{'=' * 60}")
        
        for test_name, config in TEST_REQUESTS.items():
            print(f"• {test_name}")
            print(f"  Name: {config['name']}")
            print(f"  Complexity: {config['complexity']}")
            print(f"  Request: {config['request'][:100]}...")
            print()

    def get_system_status(self) -> Dict:
        """Get current system status and recent results."""
        status = {
            "project_root": self.project_root,
            "available_tests": len(TEST_REQUESTS),
            "results_directory": f"{self.project_root}/testing/results"
        }
        
        # Check for recent results
        try:
            reports = self.dashboard.load_historical_reports()
            if reports:
                latest_report = reports[-1]
                status["latest_report_date"] = latest_report.get("generated_at")
                status["latest_overall_success_rate"] = latest_report.get("overall_statistics", {}).get("overall_success_rate", 0)
        except:
            status["latest_report"] = None
            
        return status