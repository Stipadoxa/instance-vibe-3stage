const PromptBuilder = require('./src/prompt-builder');

// Test the prompt builder
const builder = new PromptBuilder();

console.log('🧪 Testing Prompt Builder...\n');

// Test 1: List available roles
console.log('📋 Available roles:', builder.getAvailableRoles());

// Test 2: Load a role prompt
try {
  const rolePrompt = builder.loadRolePrompt('product-manager');
  console.log('✅ Product Manager role prompt loaded:', rolePrompt.substring(0, 100) + '...');
} catch (error) {
  console.log('❌ Failed to load role prompt:', error.message);
}

// Test 3: Build a fix prompt
try {
  const fixPrompt = builder.buildFixPrompt(
    'product-manager',
    'Missing user context and vague functional requirements',
    'PRD',
    'Previous PRD content here...'
  );
  console.log('✅ Fix prompt built successfully');
  console.log('📄 Preview:', fixPrompt.substring(0, 200) + '...');
} catch (error) {
  console.log('❌ Failed to build fix prompt:', error.message);
}

console.log('\n🎉 Test complete!');