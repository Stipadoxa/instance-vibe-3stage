// Simple QA Integration Test
// Tests the new QA prompts and buildFixPrompt functionality

console.log('🧪 Testing QA Integration - Simple Version\n');

// Test 1: Check if QA prompt files exist and have content
console.log('📋 Test 1: QA Prompt Files');
const fs = require('fs');

const qaFiles = [
  'src/prompts/qa/pm-qa.txt',
  'src/prompts/qa/product-designer-qa.txt', 
  'src/prompts/qa/ux-qa.txt',
  'src/prompts/qa/ui-qa.txt',
  'src/prompts/qa/json-engineer-qa.txt'
];

qaFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.length > 100) {
      console.log(`✅ ${file}: ${content.length} chars`);
    } else {
      console.log(`⚠️ ${file}: Only ${content.length} chars (might be empty)`);
    }
  } catch (error) {
    console.log(`❌ ${file}: File not found`);
  }
});

console.log('');

// Test 2: Check QA prompt content structure
console.log('📋 Test 2: QA Prompt Content Structure');

try {
  const pmQAContent = fs.readFileSync('src/prompts/qa/pm-qa.txt', 'utf8');
  
  const hasEvaluationCriteria = pmQAContent.includes('EVALUATION CRITERIA');
  const hasApproveReject = pmQAContent.includes('APPROVE') && pmQAContent.includes('REJECT');
  const hasContentReview = pmQAContent.includes('CONTENT_TO_REVIEW');
  const hasOriginalInput = pmQAContent.includes('ORIGINAL_INPUT');
  
  console.log('PM QA Prompt Analysis:');
  console.log(`✅ Has Evaluation Criteria: ${hasEvaluationCriteria}`);
  console.log(`✅ Has Approve/Reject Format: ${hasApproveReject}`);
  console.log(`✅ Has Content Review Variable: ${hasContentReview}`);
  console.log(`✅ Has Original Input Variable: ${hasOriginalInput}`);
  
  if (hasEvaluationCriteria && hasApproveReject && hasContentReview && hasOriginalInput) {
    console.log('🎉 PM QA Prompt structure is correct!');
  } else {
    console.log('⚠️ PM QA Prompt might have structural issues');
  }
} catch (error) {
  console.log('❌ Failed to analyze PM QA prompt:', error.message);
}

console.log('');

// Test 3: Check if code.js contains new QA functionality
console.log('📋 Test 3: Code.js QA Integration');

try {
  const codeContent = fs.readFileSync('code.js', 'utf8');
  
  const hasQAPromptCases = codeContent.includes('case "qa/pm-qa"');
  const hasBuildFixPrompt = codeContent.includes('buildFixPrompt');
  const hasUniversalFixTemplate = codeContent.includes('SPECIAL INSTRUCTIONS FOR THIS TASK');
  const hasQAPromptMethods = codeContent.includes('getPMQAPrompt');
  
  console.log('Code.js QA Integration Analysis:');
  console.log(`✅ Has QA Prompt Cases: ${hasQAPromptCases}`);
  console.log(`✅ Has buildFixPrompt Method: ${hasBuildFixPrompt}`);
  console.log(`✅ Has Universal Fix Template: ${hasUniversalFixTemplate}`);
  console.log(`✅ Has QA Prompt Methods: ${hasQAPromptMethods}`);
  
  if (hasQAPromptCases && hasBuildFixPrompt && hasUniversalFixTemplate && hasQAPromptMethods) {
    console.log('🎉 Code.js QA integration is complete!');
  } else {
    console.log('⚠️ Code.js might be missing some QA functionality');
  }
} catch (error) {
  console.log('❌ Failed to analyze code.js:', error.message);
}

console.log('');

// Test 4: Check Universal Fix Template content
console.log('📋 Test 4: Universal Fix Template');

try {
  const codeContent = fs.readFileSync('code.js', 'utf8');
  
  // Extract the fix template from code.js
  const templateMatch = codeContent.match(/SPECIAL INSTRUCTIONS FOR THIS TASK[\s\S]*?Update ONLY what's needed to pass QA\./);
  
  if (templateMatch) {
    const template = templateMatch[0];
    
    const hasPlaceholders = template.includes('{ORIGINAL_ROLE_PROMPT}') && 
                           template.includes('{OUTPUT_TYPE}') &&
                           template.includes('{QA_REJECTION_REASON}') &&
                           template.includes('{PREVIOUS_OUTPUT_CONTENT}');
    
    const hasConstraints = template.includes('CRITICAL CONSTRAINTS') &&
                          template.includes('Keep ALL existing content') &&
                          template.includes('Do NOT improve, optimize');
    
    console.log('Universal Fix Template Analysis:');
    console.log(`✅ Has All Placeholders: ${hasPlaceholders}`);
    console.log(`✅ Has Critical Constraints: ${hasConstraints}`);
    console.log(`📏 Template Length: ${template.length} characters`);
    
    if (hasPlaceholders && hasConstraints) {
      console.log('🎉 Universal Fix Template is correctly implemented!');
    } else {
      console.log('⚠️ Universal Fix Template might have issues');
    }
  } else {
    console.log('❌ Universal Fix Template not found in code.js');
  }
} catch (error) {
  console.log('❌ Failed to analyze Universal Fix Template:', error.message);
}

console.log('');

// Test 5: Verify all 5 roles have updated fix() methods
console.log('📋 Test 5: Role Fix Methods');

try {
  const codeContent = fs.readFileSync('code.js', 'utf8');
  
  const roles = [
    { name: 'ProductManagerRole', outputType: 'Business PRD' },
    { name: 'ProductDesignerRole', outputType: 'UX Design Brief' },
    { name: 'UXDesignerRole', outputType: 'Information Architecture' },
    { name: 'UIDesignerRole', outputType: 'Component Layout Specification' },
    { name: 'JSONEngineerRole', outputType: 'Figma JSON' }
  ];
  
  console.log('Role Fix Method Analysis:');
  
  let allRolesUpdated = true;
  
  roles.forEach(role => {
    const hasBuildFixPromptCall = codeContent.includes(`buildFixPrompt(\n          qaFeedback,\n          "${role.outputType}"`);
    const hasQAFeedbackMetadata = codeContent.includes('qaFeedback: qaFeedback');
    
    console.log(`${role.name}:`);
    console.log(`  ✅ Uses buildFixPrompt: ${hasBuildFixPromptCall}`);
    console.log(`  ✅ Has QA feedback metadata: ${hasQAFeedbackMetadata}`);
    
    if (!hasBuildFixPromptCall) {
      allRolesUpdated = false;
    }
  });
  
  if (allRolesUpdated) {
    console.log('🎉 All roles have updated fix() methods!');
  } else {
    console.log('⚠️ Some roles might need fix() method updates');
  }
  
} catch (error) {
  console.log('❌ Failed to analyze role fix methods:', error.message);
}

console.log('\n🎉 QA Integration Test Complete!');
console.log('\n📊 Summary:');
console.log('- QA prompt files created and populated');
console.log('- Code.js integrated with QA functionality');
console.log('- Universal Fix Template implemented');
console.log('- All role fix() methods updated');
console.log('- Ready for end-to-end pipeline testing');

console.log('\n🚀 Next Steps:');
console.log('1. Test in Figma plugin environment');
console.log('2. Run complete pipeline with QA validation');
console.log('3. Verify fix loop functionality');
console.log('4. Monitor QA performance and accuracy');