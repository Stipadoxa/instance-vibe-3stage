
const esbuild = require('esbuild');

async function runTest() {
  console.log('🧪 Building and running isolated migrator test file...');
  
  try {
    // Build the test file
    const buildResult = await esbuild.build({
      entryPoints: ['test-migrator-isolated.ts'],
      bundle: true,
      outfile: 'test-migrator-isolated.js',
      platform: 'browser',
      target: 'es2017',
      write: true,
      logLevel: 'info',
      format: 'iife'
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
