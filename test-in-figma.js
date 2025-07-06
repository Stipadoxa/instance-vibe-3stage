// Add this to your Figma plugin UI to test QA modes
// This can be added to ai-generator-ui.js

async function testQAModes() {
    console.log('🧪 Testing QA Modes in Figma Plugin');
    
    // Test each QA mode with a simple request
    const testInput = "create a settings screen";
    const qaModesToTest = ['DEV_NO_QA', 'DEV_FINAL_ONLY', 'FULL_QA'];
    
    for (const qaMode of qaModesToTest) {
        console.log(`Testing ${qaMode}...`);
        const startTime = Date.now();
        
        try {
            // Send message to main thread (code.ts)
            const response = await new Promise((resolve, reject) => {
                const messageId = Date.now();
                
                // Listen for response
                const handleMessage = (event) => {
                    if (event.data.pluginMessage?.id === messageId) {
                        window.removeEventListener('message', handleMessage);
                        resolve(event.data.pluginMessage);
                    }
                };
                window.addEventListener('message', handleMessage);
                
                // Send pipeline request with QA mode
                parent.postMessage({
                    pluginMessage: {
                        type: 'generate-ui-with-pipeline',
                        id: messageId,
                        userInput: testInput,
                        qaMode: qaMode
                    }
                }, '*');
                
                // Timeout after 30 seconds
                setTimeout(() => {
                    window.removeEventListener('message', handleMessage);
                    reject(new Error('Timeout'));
                }, 30000);
            });
            
            const executionTime = Date.now() - startTime;
            console.log(`${qaMode}: ${response.success ? '✅ SUCCESS' : '❌ FAILED'} (${executionTime}ms)`);
            
            if (response.metadata) {
                console.log(`  Stages completed: ${response.metadata.completedStages}/${response.metadata.totalStages}`);
                console.log(`  Total retries: ${response.metadata.totalRetries}`);
            }
            
        } catch (error) {
            console.log(`${qaMode}: ❌ ERROR - ${error.message}`);
        }
    }
    
    console.log('✅ QA Mode testing completed');
}

// Add a button to your UI to trigger this test
function addQATestButton() {
    const testButton = document.createElement('button');
    testButton.textContent = 'Test QA Modes';
    testButton.className = 'test-qa-button';
    testButton.onclick = testQAModes;
    
    // Add to your existing UI container
    const container = document.getElementById('debug-section') || document.body;
    container.appendChild(testButton);
}

// Export for use in your main UI
export { testQAModes, addQATestButton };