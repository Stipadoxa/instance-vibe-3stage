const { PromptLoader } = require('./src/pipeline/PromptLoader.ts');

console.log('🧪 Testing Integrated PromptLoader...\n');

async function testIntegratedPromptLoader() {
  const loader = new PromptLoader();

  try {
    // Test 1: Load role prompt
    console.log('📋 Test 1: Loading role prompt...');
    const rolePrompt = await loader.loadPrompt('roles/product-manager');
    console.log('✅ Product Manager role loaded:', rolePrompt.substring(0, 100) + '...\n');

    // Test 2: Load QA prompt
    console.log('📋 Test 2: Loading QA prompt...');
    const qaPrompt = await loader.loadPrompt('qa/pm-qa');
    console.log('✅ PM QA prompt loaded:', qaPrompt.substring(0, 100) + '...\n');

    // Test 3: Load and interpolate QA prompt
    console.log('📋 Test 3: Load and interpolate QA prompt...');
    const interpolatedQA = await loader.loadAndInterpolate('qa/product-designer-qa', {
      CONTENT_TO_REVIEW: 'Sample UX Design Brief content...',
      ORIGINAL_INPUT: 'Create a mobile banking app'
    });
    console.log('✅ Interpolated QA prompt created');
    console.log('📄 Preview:', interpolatedQA.substring(0, 200) + '...\n');

    // Test 4: Build fix prompt
    console.log('📋 Test 4: Building fix prompt...');
    const fixPrompt = await loader.buildFixPrompt(
      'ui-designer',
      'Missing component property specifications and unclear layout structure',
      'component layout',
      'Previous component layout that was rejected...'
    );
    console.log('✅ Fix prompt built successfully');
    console.log('📄 Preview:', fixPrompt.substring(0, 200) + '...\n');

    // Test 5: Cache functionality
    console.log('📋 Test 5: Testing cache...');
    console.log('🔢 Cache size:', loader.getCacheSize());
    console.log('💾 PM cached:', loader.isCached('roles/product-manager'));
    console.log('💾 QA cached:', loader.isCached('qa/pm-qa'));

    console.log('\n🎉 All tests passed! PromptLoader integration complete.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testIntegratedPromptLoader();