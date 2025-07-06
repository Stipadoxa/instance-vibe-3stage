// Simple test script to run QA mode testing
// Run this with: node test-qa-modes.js

// Mock API client that simulates different response times and success rates
class MockAPIClient {
  constructor() {
    this.callCount = 0;
  }

  async generateContent(prompt, options = {}) {
    this.callCount++;
    
    // Simulate network delay based on QA mode
    const qaMode = options.qaMode || 'DEV_NO_QA';
    const delays = {
      'DEV_NO_QA': 100,
      'DEV_FINAL_ONLY': 300, 
      'FULL_QA': 800
    };
    
    await new Promise(resolve => setTimeout(resolve, delays[qaMode]));
    
    // Simulate different success rates
    const successRates = {
      'DEV_NO_QA': 0.85,
      'DEV_FINAL_ONLY': 0.90,
      'FULL_QA': 0.95
    };
    
    const shouldSucceed = Math.random() < successRates[qaMode];
    
    if (shouldSucceed) {
      // Return mock successful response
      return JSON.stringify({
        title: `Generated Content (Call #${this.callCount})`,
        domainAnalysis: {
          primaryDomain: "Business/SaaS",
          confidenceLevel: "High"
        },
        success: true,
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(`Mock API failure (Call #${this.callCount})`);
    }
  }
}

// Import the test components (using require for Node.js compatibility)
async function runTests() {
  try {
    console.log('🚀 Starting QA Mode Testing\n');
    
    // Mock the classes for testing without actual imports
    const { PipelineOrchestrator } = require('./dist/pipeline/orchestrator/PipelineOrchestrator.js');
    const { PipelineTestRunner, PIPELINE_TEST_CASES } = require('./dist/tests/pipeline-test-cases.js');
    
    const apiClient = new MockAPIClient();
    const orchestrator = new PipelineOrchestrator(apiClient);
    const testRunner = new PipelineTestRunner(orchestrator);
    
    // Test 1: Show QA mode information
    console.log('📋 Available QA Modes:');
    const modes = orchestrator.getAvailableQAModes();
    modes.forEach(({ mode, preset }) => {
      console.log(`  ${mode}: ${preset.description}`);
    });
    console.log('');
    
    // Test 2: Run a single test case with different QA modes
    const testCase = PIPELINE_TEST_CASES.find(tc => tc.id === 'simple-001');
    console.log(`🧪 Testing: ${testCase.name}\n`);
    
    console.log('Running with DEV_NO_QA...');
    const devNoQA = await testRunner.runTestWithQAMode(testCase, 'DEV_NO_QA');
    console.log(`Result: ${devNoQA.passed ? '✅ PASSED' : '❌ FAILED'} (${devNoQA.executionTime}ms)\n`);
    
    console.log('Running with DEV_FINAL_ONLY...');
    const devFinalOnly = await testRunner.runTestWithQAMode(testCase, 'DEV_FINAL_ONLY');
    console.log(`Result: ${devFinalOnly.passed ? '✅ PASSED' : '❌ FAILED'} (${devFinalOnly.executionTime}ms)\n`);
    
    console.log('Running with FULL_QA...');
    const fullQA = await testRunner.runTestWithQAMode(testCase, 'FULL_QA');
    console.log(`Result: ${fullQA.passed ? '✅ PASSED' : '❌ FAILED'} (${fullQA.executionTime}ms)\n`);
    
    // Test 3: Performance comparison
    console.log('⚡ Performance Comparison:');
    console.log(`DEV_NO_QA: ${devNoQA.executionTime}ms`);
    console.log(`DEV_FINAL_ONLY: ${devFinalOnly.executionTime}ms`);
    console.log(`FULL_QA: ${fullQA.executionTime}ms`);
    
    const speedup = ((fullQA.executionTime - devNoQA.executionTime) / fullQA.executionTime * 100).toFixed(1);
    console.log(`DEV_NO_QA is ${speedup}% faster than FULL_QA\n`);
    
    // Test 4: Run QA mode comparison (if you want the full test)
    // console.log('🔍 Running full QA mode comparison...');
    // const comparison = await testRunner.runQAModeComparison(testCase);
    // console.log('Comparison complete!\n');
    
    console.log('✅ QA Mode testing completed successfully!');
    console.log(`Total API calls made: ${apiClient.callCount}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();