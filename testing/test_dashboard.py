"""
Testing Dashboard for UXPal automated testing system.
Generates comprehensive reports and analysis from test results.
"""

import json
import os
import glob
from collections import defaultdict, Counter
from datetime import datetime
from typing import Dict, List, Any, Optional
from test_requests import TEST_REQUESTS

class TestingDashboard:
    def __init__(self, results_dir: str):
        """Initialize dashboard with results directory."""
        self.results_dir = results_dir
        self.reports_dir = f"{results_dir}/reports"
        self.raw_outputs_dir = f"{results_dir}/raw_outputs"

    def generate_comprehensive_report(self, batch_results: List[Dict]) -> Dict:
        """Generate detailed analysis across all test batches."""
        
        print("📊 Generating comprehensive report...")
        
        # Overall statistics
        overall_stats = self._calculate_overall_stats(batch_results)
        
        # Failure pattern analysis
        failure_patterns = self._analyze_failure_patterns(batch_results)
        
        # Component usage analysis
        component_usage = self._analyze_component_usage(batch_results)
        
        # Progressive difficulty analysis
        difficulty_progression = self._analyze_difficulty_progression(batch_results)
        
        # Prompt improvement recommendations
        recommendations = self._generate_recommendations(failure_patterns, batch_results)
        
        report = {
            "generated_at": datetime.now().isoformat(),
            "overall_statistics": overall_stats,
            "failure_patterns": failure_patterns,
            "component_usage_analysis": component_usage,
            "difficulty_progression": difficulty_progression,
            "improvement_recommendations": recommendations,
            "next_actions": self._suggest_next_actions(batch_results)
        }
        
        # Save report
        report_file = f"{self.reports_dir}/comprehensive_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        try:
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"💾 Report saved to: {report_file}")
        except Exception as e:
            print(f"⚠️  Failed to save report: {e}")
        
        return report

    def _calculate_overall_stats(self, batch_results: List[Dict]) -> Dict:
        """Calculate overall statistics across all batches."""
        if not batch_results:
            return {}
        
        total_tests = sum(batch["total_iterations"] for batch in batch_results)
        total_successes = sum(batch["qualified_successes"] for batch in batch_results)
        
        # Find best and worst performing tests
        test_performance = {}
        for batch in batch_results:
            test_name = batch["test_name"]
            success_rate = batch["success_rate"]
            test_performance[test_name] = success_rate
        
        best_test = max(test_performance.items(), key=lambda x: x[1]) if test_performance else ("none", 0)
        worst_test = min(test_performance.items(), key=lambda x: x[1]) if test_performance else ("none", 0)
        
        # Calculate average execution time
        all_results = []
        for batch in batch_results:
            all_results.extend(batch.get("results", []))
        
        avg_execution_time = 0
        if all_results:
            execution_times = [r.get("execution_time", 0) for r in all_results if r.get("execution_time")]
            avg_execution_time = sum(execution_times) / len(execution_times) if execution_times else 0
        
        return {
            "total_batches_run": len(batch_results),
            "total_test_iterations": total_tests,
            "total_qualified_successes": total_successes,
            "overall_success_rate": total_successes / total_tests if total_tests > 0 else 0,
            "average_execution_time": avg_execution_time,
            "best_performing_test": {
                "name": best_test[0],
                "success_rate": best_test[1]
            },
            "worst_performing_test": {
                "name": worst_test[0], 
                "success_rate": worst_test[1]
            },
            "tests_above_80_percent": len([rate for rate in test_performance.values() if rate >= 0.8]),
            "tests_below_50_percent": len([rate for rate in test_performance.values() if rate < 0.5])
        }

    def _analyze_failure_patterns(self, batch_results: List[Dict]) -> Dict:
        """Identify common failure modes across tests."""
        
        failure_categories = {
            "component_selection": [],
            "variant_syntax": [],
            "native_overuse": [],
            "layout_structure": [],
            "context_adaptation": [],
            "json_format": [],
            "pipeline_execution": [],
            "visual_review": []
        }
        
        total_iterations = 0
        
        for batch in batch_results:
            for result in batch.get("results", []):
                total_iterations += 1
                failure_type = self._categorize_failure(result)
                if failure_type:
                    failure_categories[failure_type].append({
                        "test": batch["test_name"],
                        "timestamp": result.get("timestamp", ""),
                        "details": self._extract_failure_details(result),
                        "execution_time": result.get("execution_time", 0)
                    })
        
        # Calculate frequencies and format results
        pattern_analysis = {}
        for category, failures in failure_categories.items():
            frequency = len(failures) / total_iterations if total_iterations > 0 else 0
            pattern_analysis[category] = {
                "count": len(failures),
                "frequency": frequency,
                "percentage": f"{frequency * 100:.1f}%",
                "examples": failures[:3],  # Show top 3 examples
                "affected_tests": list(set(f["test"] for f in failures))
            }
        
        return pattern_analysis

    def _categorize_failure(self, result: Dict) -> Optional[str]:
        """Categorize failure type based on result data."""
        if not result.get("success"):
            error = result.get("error", "").lower()
            if "timeout" in error or "execution" in error:
                return "pipeline_execution"
            elif "json" in error or "format" in error:
                return "json_format"
            else:
                return "pipeline_execution"
        
        elif not result.get("quality_valid"):
            issues = result.get("quality_report", {}).get("critical_issues", [])
            if issues:
                issue_text = " ".join(issues).lower()
                if "component" in issue_text and "invalid" in issue_text:
                    return "component_selection"
                elif "variant" in issue_text:
                    return "variant_syntax"
                elif "structure" in issue_text or "missing" in issue_text:
                    return "json_format"
                else:
                    return "json_format"
        
        elif not result.get("criteria_met"):
            warnings = result.get("quality_report", {}).get("warnings", [])
            if warnings:
                warning_text = " ".join(warnings).lower()
                if "component" in warning_text:
                    return "component_selection"
                elif "native" in warning_text:
                    return "native_overuse"
                elif "variant" in warning_text:
                    return "variant_syntax"
                elif "context" in warning_text:
                    return "context_adaptation"
                else:
                    return "layout_structure"
        
        elif result.get("visual_success") == False:
            return "visual_review"
        
        return None

    def _extract_failure_details(self, result: Dict) -> str:
        """Extract detailed failure information."""
        if not result.get("success"):
            return result.get("error", "Unknown pipeline error")
        
        quality_report = result.get("quality_report", {})
        
        if quality_report.get("critical_issues"):
            return quality_report["critical_issues"][0]
        elif quality_report.get("warnings"):
            return quality_report["warnings"][0]
        elif result.get("visual_success") == False:
            return "Failed visual review"
        
        return "Unknown failure"

    def _analyze_component_usage(self, batch_results: List[Dict]) -> Dict:
        """Analyze component usage patterns and success rates."""
        
        component_stats = defaultdict(lambda: {"used": 0, "successful": 0, "failed": 0})
        
        for batch in batch_results:
            required_components = TEST_REQUESTS.get(batch["test_name"], {}).get("success_criteria", {}).get("required_components", [])
            
            for result in batch.get("results", []):
                for component in required_components:
                    component_stats[component]["used"] += 1
                    
                    if (result.get("success") and result.get("quality_valid") and 
                        result.get("criteria_met") and result.get("visual_success")):
                        component_stats[component]["successful"] += 1
                    else:
                        component_stats[component]["failed"] += 1
        
        # Calculate success rates
        usage_analysis = {}
        for component, stats in component_stats.items():
            total = stats["used"]
            success_rate = stats["successful"] / total if total > 0 else 0
            
            usage_analysis[component] = {
                "total_usage": total,
                "successful_usage": stats["successful"],
                "failed_usage": stats["failed"],
                "success_rate": success_rate,
                "success_percentage": f"{success_rate * 100:.1f}%"
            }
        
        # Sort by success rate (lowest first - most problematic)
        sorted_components = sorted(usage_analysis.items(), key=lambda x: x[1]["success_rate"])
        
        return {
            "component_statistics": dict(sorted_components),
            "most_problematic_components": [comp[0] for comp in sorted_components[:3]],
            "most_successful_components": [comp[0] for comp in sorted_components[-3:]],
            "total_components_analyzed": len(component_stats)
        }

    def _analyze_difficulty_progression(self, batch_results: List[Dict]) -> Dict:
        """Analyze success rates across difficulty levels."""
        
        difficulty_stats = {}
        
        for batch in batch_results:
            test_name = batch["test_name"]
            test_config = TEST_REQUESTS.get(test_name, {})
            complexity = test_config.get("complexity", "unknown")
            success_rate = batch.get("success_rate", 0)
            
            if complexity not in difficulty_stats:
                difficulty_stats[complexity] = []
            
            difficulty_stats[complexity].append({
                "test_name": test_name,
                "success_rate": success_rate,
                "total_iterations": batch.get("total_iterations", 0),
                "qualified_successes": batch.get("qualified_successes", 0)
            })
        
        # Calculate average success rates by difficulty
        progression_analysis = {}
        for complexity, tests in difficulty_stats.items():
            avg_success_rate = sum(t["success_rate"] for t in tests) / len(tests)
            total_tests = sum(t["total_iterations"] for t in tests)
            total_successes = sum(t["qualified_successes"] for t in tests)
            
            progression_analysis[complexity] = {
                "average_success_rate": avg_success_rate,
                "success_percentage": f"{avg_success_rate * 100:.1f}%",
                "total_test_count": len(tests),
                "total_iterations": total_tests,
                "total_successes": total_successes,
                "tests": tests
            }
        
        return progression_analysis

    def _generate_recommendations(self, failure_patterns: Dict, batch_results: List[Dict]) -> List[Dict]:
        """Generate specific prompt improvement recommendations."""
        
        recommendations = []
        
        # High failure rate recommendations
        for category, data in failure_patterns.items():
            if data["frequency"] > 0.3:  # More than 30% failure rate
                recommendations.append({
                    "priority": "HIGH",
                    "category": category,
                    "issue": f"High failure rate in {category} ({data['percentage']})",
                    "action": self._get_category_fix_action(category),
                    "prompt_section": self._get_prompt_section_to_fix(category),
                    "affected_tests": data["affected_tests"]
                })
        
        # Medium failure rate recommendations
        for category, data in failure_patterns.items():
            if 0.15 < data["frequency"] <= 0.3:  # 15-30% failure rate
                recommendations.append({
                    "priority": "MEDIUM", 
                    "category": category,
                    "issue": f"Moderate failure rate in {category} ({data['percentage']})",
                    "action": self._get_category_fix_action(category),
                    "prompt_section": self._get_prompt_section_to_fix(category),
                    "affected_tests": data["affected_tests"]
                })
        
        # Progressive difficulty recommendations
        success_rates = [batch["success_rate"] for batch in batch_results]
        if len(success_rates) > 1:
            if success_rates[-1] < success_rates[0] * 0.8:  # Significant drop
                recommendations.append({
                    "priority": "MEDIUM",
                    "category": "complexity_scaling",
                    "issue": "Success rate decreasing significantly with complexity",
                    "action": "Review advanced reasoning prompts and complex decision making",
                    "prompt_section": "alt2-ux-ui-designer.txt - complex UI composition"
                })
        
        # Sort by priority
        priority_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
        recommendations.sort(key=lambda x: priority_order.get(x["priority"], 0), reverse=True)
        
        return recommendations

    def _get_category_fix_action(self, category: str) -> str:
        """Get specific fix action for failure category."""
        actions = {
            "component_selection": "Review component selection prompts and examples",
            "variant_syntax": "Fix variant formatting and structure examples",
            "native_overuse": "Add constraints about native element usage limits",
            "layout_structure": "Improve layout reasoning and container organization",
            "context_adaptation": "Enhance context understanding and icon/visibility handling",
            "json_format": "Review JSON structure requirements and validation",
            "pipeline_execution": "Check pipeline stability and error handling",
            "visual_review": "Review generated UI quality and user experience"
        }
        return actions.get(category, "Review and improve related prompts")

    def _get_prompt_section_to_fix(self, category: str) -> str:
        """Get specific prompt file section to fix."""
        sections = {
            "component_selection": "alt2-ux-ui-designer.txt - component selection logic",
            "variant_syntax": "alt2-ux-ui-designer.txt - variant handling examples",
            "native_overuse": "alt2-ux-ui-designer.txt - native element constraints",
            "layout_structure": "alt2-ux-ui-designer.txt - layout container organization",
            "context_adaptation": "alt2-ux-ui-designer.txt - context awareness",
            "json_format": "alt2-ux-ui-designer.txt - JSON output format",
            "pipeline_execution": "instance.py - pipeline error handling",
            "visual_review": "alt2-ux-ui-designer.txt - UI quality guidelines"
        }
        return sections.get(category, "Review related prompt sections")

    def _suggest_next_actions(self, batch_results: List[Dict]) -> List[str]:
        """Suggest next actions based on analysis."""
        actions = []
        
        if not batch_results:
            actions.append("Run initial test batches to gather data")
            return actions
        
        overall_success = sum(b["qualified_successes"] for b in batch_results) / sum(b["total_iterations"] for b in batch_results)
        
        if overall_success < 0.5:
            actions.append("Focus on fundamental prompt improvements - success rate below 50%")
            actions.append("Consider simplifying test complexity or increasing iteration counts")
        elif overall_success < 0.8:
            actions.append("Target specific failure patterns identified in recommendations")
            actions.append("Run focused tests on problematic areas")
        else:
            actions.append("System performing well - consider adding more complex test cases")
            actions.append("Focus on edge cases and advanced scenarios")
        
        # Add specific actions based on patterns
        failed_tests = [b["test_name"] for b in batch_results if b["success_rate"] < 0.5]
        if failed_tests:
            actions.append(f"Retry and debug specific failing tests: {', '.join(failed_tests)}")
        
        return actions

    def load_historical_reports(self) -> List[Dict]:
        """Load all historical comprehensive reports."""
        reports = []
        pattern = f"{self.reports_dir}/comprehensive_report_*.json"
        
        for file_path in glob.glob(pattern):
            try:
                with open(file_path, 'r') as f:
                    report = json.load(f)
                    reports.append(report)
            except Exception as e:
                print(f"⚠️  Failed to load report {file_path}: {e}")
        
        # Sort by generation time
        reports.sort(key=lambda x: x.get("generated_at", ""))
        return reports

    def display_summary(self, report: Dict):
        """Display human-readable summary of the report."""
        print(f"\n{'=' * 60}")
        print(f"📊 COMPREHENSIVE TEST REPORT")
        print(f"{'=' * 60}")
        
        stats = report.get("overall_statistics", {})
        print(f"🎯 Overall Success Rate: {stats.get('overall_success_rate', 0):.1%}")
        print(f"📈 Total Test Iterations: {stats.get('total_test_iterations', 0)}")
        print(f"✅ Qualified Successes: {stats.get('total_qualified_successes', 0)}")
        print(f"⏱️  Average Execution Time: {stats.get('average_execution_time', 0):.1f}s")
        
        print(f"\n🏆 Best Test: {stats.get('best_performing_test', {}).get('name', 'N/A')} ({stats.get('best_performing_test', {}).get('success_rate', 0):.1%})")
        print(f"⚠️  Worst Test: {stats.get('worst_performing_test', {}).get('name', 'N/A')} ({stats.get('worst_performing_test', {}).get('success_rate', 0):.1%})")
        
        print(f"\n🔍 TOP FAILURE PATTERNS:")
        patterns = report.get("failure_patterns", {})
        sorted_patterns = sorted(patterns.items(), key=lambda x: x[1]["frequency"], reverse=True)
        
        for pattern, data in sorted_patterns[:5]:
            if data["frequency"] > 0:
                print(f"  • {pattern}: {data['percentage']} ({data['count']} failures)")
        
        print(f"\n💡 KEY RECOMMENDATIONS:")
        for rec in report.get("improvement_recommendations", [])[:5]:
            print(f"  {rec['priority']}: {rec['issue']}")
        
        print(f"\n🚀 NEXT ACTIONS:")
        for action in report.get("next_actions", []):
            print(f"  • {action}")
        
        print(f"{'=' * 60}")