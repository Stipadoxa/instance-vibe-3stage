
const esbuild = require('esbuild');

async function runTest() {
  console.log('🧪 Building and running corrected JSON test file...');
  
  try {
    // Build the test file
    const buildResult = await esbuild.build({
      entryPoints: ['test-corrected-json.ts'],
      bundle: true,
      outfile: 'test-corrected-json.js',
      platform: 'node',
      target: 'node16',
      write: true,
      logLevel: 'info',
      format: 'cjs'
    });
    
    if (buildResult.errors.length > 0) {
      console.error('❌ Test build failed:', buildResult.errors);
      return;
    }
    
    console.log('✅ Test build successful');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

runTest();
