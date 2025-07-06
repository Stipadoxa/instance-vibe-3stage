// Test QA Integration with New Pipeline System
// This script tests the integrated QA validation and fix loop functionality

const fs = require('fs');

// Mock classes to simulate the pipeline without requiring full Figma API
class MockGeminiAPI {
  async generateContent(prompt, options = {}) {
    console.log('📡 Mock API call with prompt length:', prompt.length);
    console.log('🔧 Options:', options);
    
    // Simulate different responses based on prompt content
    if (prompt.includes('QA evaluator')) {
      // Simulate QA rejection for testing fix loop
      return `Status: REJECT
Reason: Missing specific user types and detailed use cases. The PRD contains generic "users" references without context and lacks priority levels for functional requirements.`;
    } else if (prompt.includes('SPECIAL INSTRUCTIONS FOR THIS TASK')) {
      // Simulate fix response
      return `Updated Business PRD with specific user types (mobile banking customers, elderly users, tech-savvy millennials) and detailed use cases with priority levels (High, Medium, Low) for all functional requirements.`;
    } else {
      // Simulate normal generation
      return `{
  "title": "Business PRD for Mobile Banking App",
  "domainAnalysis": {
    "primaryDomain": "Financial Services",
    "confidenceLevel": "High"
  },
  "userTypes": ["Mobile banking customers", "Business account holders"],
  "useCases": ["Check account balance", "Transfer funds", "Pay bills"]
}`;
    }
  }
}

// Load and test the compiled code.js functionality
function loadCodeJS() {
  const codeContent = fs.readFileSync('./code.js', 'utf8');
  
  // Extract the classes we need by evaluating the code
  // This is a simplified approach - in real usage, classes are already loaded
  const vm = require('vm');
  const context = {
    console,
    JSON,
    Object,
    String,
    Array,
    Date,
    setTimeout,
    clearTimeout,
    figma: {
      clientStorage: {
        setAsync: async () => {},
        getAsync: async () => null
      },
      fileKey: 'test-file',
      root: { name: 'Test File' }
    }
  };
  
  try {
    vm.createContext(context);
    vm.runInContext(codeContent, context);
    
    return {
      PromptLoader: context.PromptLoader,
      UniversalQualityGate: context.UniversalQualityGate,
      BaseRole: context.BaseRole,
      ProductManagerRole: context.ProductManagerRole
    };
  } catch (error) {
    console.error('❌ Error loading code.js:', error.message);
    return null;
  }
}

async function testQAIntegration() {
  console.log('🧪 Testing QA Integration with Pipeline System\n');
  
  const classes = loadCodeJS();
  if (!classes) {
    console.error('❌ Failed to load classes from code.js');
    return;
  }
  
  const { PromptLoader, UniversalQualityGate, ProductManagerRole } = classes;
  
  try {
    // Test 1: QA Prompt Loading
    console.log('📋 Test 1: QA Prompt Loading');
    const promptLoader = new PromptLoader();
    
    const pmQAPrompt = await promptLoader.loadPrompt('qa/pm-qa');
    console.log('✅ PM QA prompt loaded:', pmQAPrompt.substring(0, 100) + '...');
    
    const productDesignerQAPrompt = await promptLoader.loadPrompt('qa/product-designer-qa');
    console.log('✅ Product Designer QA prompt loaded:', productDesignerQAPrompt.substring(0, 100) + '...');
    
    console.log('');
    
    // Test 2: UniversalQualityGate QA Validation
    console.log('📋 Test 2: UniversalQualityGate QA Validation');
    const mockAPI = new MockGeminiAPI();
    const qualityGate = new UniversalQualityGate(mockAPI);
    
    const testContent = `{
  "title": "Basic PRD",
  "users": ["users"],
  "features": ["login", "dashboard"]
}`;
    
    const qaResult = await qualityGate.validate({
      content: testContent,
      stage: 'pm',
      originalInput: 'Create a mobile banking app'
    });
    
    console.log('🔍 QA Result:', {
      approved: qaResult.approved,
      issues: qaResult.issues,
      feedback: qaResult.feedback.substring(0, 100) + '...'
    });
    
    console.log('');
    
    // Test 3: BaseRole buildFixPrompt
    console.log('📋 Test 3: BaseRole buildFixPrompt');
    const pmRole = new ProductManagerRole(mockAPI);
    
    const fixPrompt = await pmRole.buildFixPrompt(
      'Missing specific user types and detailed use cases',
      'Business PRD', 
      testContent
    );
    
    console.log('🔧 Fix prompt generated:', fixPrompt.length, 'characters');
    console.log('📝 Fix prompt preview:', fixPrompt.substring(0, 200) + '...');
    
    console.log('');
    
    // Test 4: Full Fix Loop Simulation
    console.log('📋 Test 4: Full Fix Loop Simulation');
    
    const originalInput = { content: 'Create a mobile banking app' };
    const previousOutput = { content: testContent };
    
    const fixResult = await pmRole.fix(
      originalInput,
      'Missing specific user types and detailed use cases',
      previousOutput
    );
    
    console.log('🔄 Fix result:', {
      success: fixResult.success,
      fixed: fixResult.metadata?.fixed,
      outputType: fixResult.metadata?.outputType,
      contentLength: fixResult.content.length
    });
    
    console.log('');
    console.log('🎉 All QA integration tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the tests
testQAIntegration();