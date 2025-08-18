# ALT4 Pipeline Implementation Plan

## Step 0: Setup New Branch
```bash
git checkout -b feature/alt4-pipeline
git push -u origin feature/alt4-pipeline
```

## Step 1: Create DS Data Filtering Utilities

### 1.1: Create `src/utils/ds_filters.py`
```python
import json
from typing import Dict, List, Any

class DesignSystemFilters:
    """Utilities for filtering design system data for different pipeline stages"""
    
    @staticmethod
    def create_component_selector_data(full_ds: str) -> str:
        """Create lightweight categorized component index for Stage 2a"""
        pass  # Implementation to be added
    
    @staticmethod
    def create_layout_composer_data(full_ds: str, selected_component_ids: List[str]) -> str:
        """Create filtered DS with full schemas for selected components only"""
        pass  # Implementation to be added
    
    @staticmethod
    def create_design_qa_data(full_ds: str) -> str:
        """Create lightweight validation data for Stage 3"""
        pass  # Implementation to be added
    
    @staticmethod
    def create_json_engineer_data(full_ds: str) -> str:
        """Create technical validation data for Stage 4"""
        pass  # Implementation to be added
```

**Test**: Create file with empty methods, import successfully
**Human Approval**: ✅ File created without errors

---

## Step 2: Implement Component Selector Filter

### 2.1: Add `create_component_selector_data` implementation
```python
@staticmethod
def create_component_selector_data(full_ds: str) -> str:
    """Create lightweight categorized component index for Stage 2a"""
    try:
        full_data = json.loads(full_ds)
        components = full_data.get('components', [])
        
        # Group by suggestedType (auto-categorization from scanner)
        categorized = {}
        for comp in components:
            category = comp.get('suggestedType', 'misc')
            if category not in categorized:
                categorized[category] = []
            
            categorized[category].append({
                'id': comp['id'],
                'name': comp['name'],
                'confidence': comp.get('confidence', 0.5),
                'variants': comp.get('variants', [])
            })
        
        # Sort by confidence within each category
        for category in categorized:
            categorized[category].sort(key=lambda x: x['confidence'], reverse=True)
        
        return json.dumps(categorized, indent=2)
        
    except Exception as e:
        print(f"Error creating component selector data: {e}")
        return json.dumps({"error": "Failed to process design system"})
```

**Test**: Run with actual DS file, verify categorized output
**Human Approval**: ✅ Categorization works correctly

---

## Step 3: Implement Layout Composer Filter

### 3.1: Add `create_layout_composer_data` implementation
```python
@staticmethod
def create_layout_composer_data(full_ds: str, selected_component_ids: List[str]) -> str:
    """Create filtered DS with full schemas for selected components only"""
    try:
        full_data = json.loads(full_ds)
        components = full_data.get('components', [])
        
        # Filter to only selected components with full schemas
        filtered_components = []
        for comp in components:
            if comp['id'] in selected_component_ids:
                filtered_components.append(comp)
        
        # Create filtered dataset
        filtered_data = {
            'components': filtered_components,
            'colorStyles': full_data.get('colorStyles', {}),
            'textStyles': full_data.get('textStyles', []),
            'designTokens': full_data.get('designTokens', [])
        }
        
        return json.dumps(filtered_data, indent=2)
        
    except Exception as e:
        print(f"Error creating layout composer data: {e}")
        return json.dumps({"error": "Failed to filter design system"})
```

**Test**: Run with list of component IDs, verify filtered output contains full schemas
**Human Approval**: ✅ Filtering works correctly

---

## Step 4: Implement Design QA Filter

### 4.1: Add `create_design_qa_data` implementation
```python
@staticmethod
def create_design_qa_data(full_ds: str) -> str:
    """Create lightweight validation data for Stage 3"""
    try:
        full_data = json.loads(full_ds)
        components = full_data.get('components', [])
        
        # Extract only validation-relevant data
        validation_data = {
            'validComponents': {},
            'textStyles': [style.get('name', '') for style in full_data.get('textStyles', [])],
            'colorStyles': []
        }
        
        # Extract component validation schemas
        for comp in components:
            validation_data['validComponents'][comp['id']] = {
                'name': comp['name'],
                'variants': comp.get('variants', []),
                'variantDetails': comp.get('variantDetails', {}),
                'textLayers': comp.get('textLayers', [])
            }
        
        # Extract color style names
        color_styles = full_data.get('colorStyles', {})
        if isinstance(color_styles, dict):
            for category, styles in color_styles.items():
                for style in styles:
                    validation_data['colorStyles'].append(style.get('name', ''))
        
        return json.dumps(validation_data, indent=2)
        
    except Exception as e:
        print(f"Error creating design QA data: {e}")
        return json.dumps({"error": "Failed to create validation data"})
```

**Test**: Verify output contains only validation-relevant data (~50KB)
**Human Approval**: ✅ QA data is lightweight and complete

---

## Step 5: Implement JSON Engineer Filter

### 5.1: Add `create_json_engineer_data` implementation
```python
@staticmethod
def create_json_engineer_data(full_ds: str) -> str:
    """Create technical validation data for Stage 4"""
    try:
        full_data = json.loads(full_ds)
        components = full_data.get('components', [])
        
        # Extract technical data needed for rendering fixes
        technical_data = {
            'componentSchemas': {},
            'textStyles': full_data.get('textStyles', []),
            'colorStyles': full_data.get('colorStyles', {}),
            'layoutValidation': {
                'forbiddenNativeProps': [
                    'horizontalSizing', 'layoutAlign', 'layoutGrow',
                    'layoutMode', 'primaryAxisSizingMode', 'counterAxisSizingMode'
                ],
                'requiredContainerProps': [
                    'horizontalSizing', 'layoutAlign'
                ]
            }
        }
        
        # Extract component technical schemas
        for comp in components:
            technical_data['componentSchemas'][comp['id']] = {
                'name': comp['name'],
                'variants': comp.get('variants', []),
                'variantDetails': comp.get('variantDetails', {}),
                'textLayers': comp.get('textLayers', []),
                'internalPadding': comp.get('internalPadding', {}),
                'autoLayoutBehavior': comp.get('autoLayoutBehavior', {})
            }
        
        return json.dumps(technical_data, indent=2)
        
    except Exception as e:
        print(f"Error creating JSON engineer data: {e}")
        return json.dumps({"error": "Failed to create technical data"})
```

**Test**: Verify output contains technical schemas (~200KB)
**Human Approval**: ✅ JSON Engineer data is complete

---

## Step 6: Create ALT4 Pipeline Runner

### 6.1: Create `src/pipelines/alt4_pipeline.py`
```python
import asyncio
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

from ..utils.ds_filters import DesignSystemFilters

class Alt4Pipeline:
    """ALT4 Pipeline: Enhanced 4-stage design generation with rollback capability"""
    
    def __init__(self, api_key: str, output_dir: str = "python_outputs"):
        self.api_key = api_key
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.rollback_states = {}  # Store stage outputs for rollback
    
    async def run(self, initial_input: str, run_id: Optional[str] = None) -> Dict[str, Any]:
        """Run complete ALT4 pipeline"""
        if not run_id:
            run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        print(f"🎯 Starting ALT4 Pipeline run: {run_id}")
        
        results = {}
        current_input = initial_input
        
        # Stage 1: User Request Analyzer (same as ALT3)
        results['stage_1'] = await self.run_stage_1(current_input, run_id)
        current_input = results['stage_1']['content']
        self.save_rollback_state('stage_1', run_id, results['stage_1'])
        
        return results
    
    async def run_stage_1(self, input_data: str, run_id: str) -> Dict[str, Any]:
        """Stage 1: User Request Analyzer - same as ALT3"""
        # TODO: Implementation
        pass
    
    def save_rollback_state(self, stage_name: str, run_id: str, stage_output: Dict[str, Any]):
        """Save stage output for potential rollback"""
        rollback_file = self.output_dir / f"alt4_{run_id}_rollback_{stage_name}.json"
        with open(rollback_file, 'w') as f:
            json.dump(stage_output, f, indent=2)
        
        print(f"💾 Saved rollback state: {stage_name}")
```

**Test**: Create file, import successfully, basic structure works
**Human Approval**: ✅ Pipeline structure created

---

## Step 7: Add ALT4 Command Integration

### 7.1: Modify `instance.py` to add ALT4 support
Add this to the argument parsing section:
```python
elif args[0] == "alt4":
    timestamp = args[1] if len(args) > 1 else None
    result = await pipeline.run_alt4(user_input, timestamp)
```

### 7.2: Add `run_alt4` method to main Pipeline class
```python
async def run_alt4(self, initial_input: str, timestamp: Optional[str] = None) -> Dict[str, Any]:
    """Run ALT4 pipeline with enhanced stages and rollback"""
    from .src.pipelines.alt4_pipeline import Alt4Pipeline
    
    alt4 = Alt4Pipeline(self.api_key, str(self.output_dir))
    return await alt4.run(initial_input, timestamp)
```

**Test**: Run `python3 instance.py alt4 "test input"` - should create basic structure
**Human Approval**: ✅ ALT4 command works without errors

---

## Step 8: Implement Stage 1 (User Request Analyzer)

### 8.1: Complete `run_stage_1` in Alt4Pipeline
```python
async def run_stage_1(self, input_data: str, run_id: str) -> Dict[str, Any]:
    """Stage 1: User Request Analyzer - same as ALT3"""
    from ..instance import Pipeline  # Import main pipeline for reuse
    
    # Reuse existing ALT3 Stage 1 logic
    stage_1_prompt = self.load_prompt('alt1-user-request-analyzer.txt')
    
    # Format prompt with input
    formatted_prompt = stage_1_prompt.replace('{{USER_INPUT}}', input_data)
    
    # Call AI (reuse existing AI call logic)
    ai_response, token_usage = await self.call_ai(formatted_prompt)
    
    # Save outputs
    output_file = self.output_dir / f"alt4_{run_id}_1_user_request_analyzer.json"
    output_data = {
        'stage': 'User Request Analyzer',
        'input': input_data,
        'output': ai_response,
        'token_usage': token_usage,
        'timestamp': run_id
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    # Save clean output
    clean_output_file = self.output_dir / f"alt4_{run_id}_1_user_request_analyzer_output.txt"
    with open(clean_output_file, 'w') as f:
        f.write(ai_response)
    
    print(f"✅ Stage 1 complete: User Request Analyzer")
    return {'content': ai_response, 'metadata': output_data}

def load_prompt(self, filename: str) -> str:
    """Load prompt template from file"""
    prompt_path = Path("src/prompts/roles") / filename
    with open(prompt_path, 'r') as f:
        return f.read()

async def call_ai(self, prompt: str, visual_refs: Optional[List[str]] = None):
    """Call AI API - reuse existing implementation"""
    # TODO: Import and reuse existing AI call logic from main pipeline
    pass
```

**Test**: Run Stage 1 only, verify output files are created
**Human Approval**: ✅ Stage 1 generates correct outputs

---

## Step 9: Create Stage 2a Prompt (Component Selector)

### 9.1: Create `src/prompts/roles/alt4-2a-component-selector.txt`
```markdown
# Component Selector - Stage 2a

You are a Component Selection Specialist. Your job is to analyze user requirements and select 3-8 components needed to build the interface.

## Your Task
Read the user requirements and select the most appropriate components from the available design system.

## Input
USER REQUIREMENTS: {{USER_REQUIREMENTS}}
AVAILABLE COMPONENTS: {{COMPONENT_INDEX}}

## Selection Criteria
- Choose 3-8 components maximum
- Focus on core UI elements needed
- Consider component variants and capabilities
- Prioritize high-confidence components
- Include both structural (layouts) and content (buttons, text) components

## Output Format
```json
{
  "selectedComponents": [
    {
      "id": "component-id-here",
      "name": "Component Name",
      "category": "button",
      "reasoning": "Why this component was selected",
      "priority": "high|medium|low"
    }
  ],
  "rationale": "Overall reasoning for component selection strategy"
}
```

## Guidelines
- Select components that work together as a system
- Consider the user's domain (e-commerce, social, etc.)
- Balance functionality with simplicity
- Explain your reasoning for each selection
```

**Test**: Create prompt file, verify readable format
**Human Approval**: ✅ Prompt created and formatted correctly

---

## Step 10: Implement Stage 2a (Component Selector)

### 10.1: Add `run_stage_2a` to Alt4Pipeline
```python
async def run_stage_2a(self, input_data: str, run_id: str) -> Dict[str, Any]:
    """Stage 2a: Component Selector with lightweight DS"""
    print(f"🔧 Stage 2a: Component Selector")
    
    # Load full design system
    full_ds = self.load_design_system_data()
    
    # Create lightweight component index
    component_index = DesignSystemFilters.create_component_selector_data(full_ds)
    
    print(f"📊 Component index size: {len(component_index)} chars")
    
    # Load and format prompt
    stage_2a_prompt = self.load_prompt('alt4-2a-component-selector.txt')
    formatted_prompt = stage_2a_prompt.replace('{{USER_REQUIREMENTS}}', input_data)
    formatted_prompt = formatted_prompt.replace('{{COMPONENT_INDEX}}', component_index)
    
    # Call AI
    ai_response, token_usage = await self.call_ai(formatted_prompt)
    
    # Save outputs
    output_file = self.output_dir / f"alt4_{run_id}_2a_component_selector.json"
    output_data = {
        'stage': 'Component Selector',
        'input': input_data,
        'component_index_size': len(component_index),
        'output': ai_response,
        'token_usage': token_usage,
        'timestamp': run_id
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"✅ Stage 2a complete: Component Selector")
    return {'content': ai_response, 'metadata': output_data}

def load_design_system_data(self) -> str:
    """Load design system data - reuse existing logic"""
    # TODO: Import and reuse existing DS loading from main pipeline
    pass
```

**Test**: Run Stage 2a, verify component selection output
**Human Approval**: ✅ Component selection works and creates appropriate outputs

---

## Step 11: Create Stage 2b Prompt (Layout Composer)

### 11.1: Create `src/prompts/roles/alt4-2b-layout-composer.txt`
```markdown
# Layout Composer - Stage 2b

You are a Layout Composition Specialist. You receive selected components and create complete UI layouts using their full schemas.

## Your Task
Create a complete UI layout using the selected components with their full design system schemas.

## Input
USER REQUIREMENTS: {{USER_REQUIREMENTS}}
SELECTED COMPONENTS: {{SELECTED_COMPONENTS}}
COMPONENT SCHEMAS: {{COMPONENT_SCHEMAS}}

## Your Responsibilities
1. Use ONLY the selected components (no additional component selection)
2. Apply correct variants based on component schemas
3. Create proper layout hierarchy with containers
4. Assign real content to text properties
5. Set appropriate spacing and sizing

## Technical Requirements
- Use exact `componentNodeId` values from schemas
- Use exact variant values from `variantDetails`
- Use exact text property names from `textLayers`
- Include proper layout containers with spacing
- Follow mobile-first approach (375px width)

## Output Format
Complete JSON specification ready for technical validation.

```json
{
  "type": "layoutContainer",
  "layoutMode": "VERTICAL",
  "items": [
    // Complete UI structure here
  ]
}
```
```

**Test**: Create prompt file, verify format and requirements
**Human Approval**: ✅ Layout Composer prompt created

---

## Step 12: Implement Stage 2b (Layout Composer)

### 12.1: Add `run_stage_2b` to Alt4Pipeline
```python
async def run_stage_2b(self, stage_2a_output: str, user_requirements: str, run_id: str) -> Dict[str, Any]:
    """Stage 2b: Layout Composer with filtered DS for selected components"""
    print(f"🎨 Stage 2b: Layout Composer")
    
    # Parse selected components from Stage 2a
    try:
        selection_data = json.loads(stage_2a_output)
        selected_ids = [comp['id'] for comp in selection_data.get('selectedComponents', [])]
        print(f"📦 Selected {len(selected_ids)} components for layout")
    except Exception as e:
        print(f"❌ Error parsing Stage 2a output: {e}")
        return {'content': '{"error": "Failed to parse component selection"}', 'metadata': {}}
    
    # Load full design system and filter for selected components
    full_ds = self.load_design_system_data()
    filtered_ds = DesignSystemFilters.create_layout_composer_data(full_ds, selected_ids)
    
    print(f"📊 Filtered DS size: {len(filtered_ds)} chars")
    
    # Load and format prompt
    stage_2b_prompt = self.load_prompt('alt4-2b-layout-composer.txt')
    formatted_prompt = stage_2b_prompt.replace('{{USER_REQUIREMENTS}}', user_requirements)
    formatted_prompt = formatted_prompt.replace('{{SELECTED_COMPONENTS}}', stage_2a_output)
    formatted_prompt = formatted_prompt.replace('{{COMPONENT_SCHEMAS}}', filtered_ds)
    
    # Call AI
    ai_response, token_usage = await self.call_ai(formatted_prompt)
    
    # Save outputs
    output_file = self.output_dir / f"alt4_{run_id}_2b_layout_composer.json"
    output_data = {
        'stage': 'Layout Composer',
        'selected_components': selected_ids,
        'filtered_ds_size': len(filtered_ds),
        'output': ai_response,
        'token_usage': token_usage,
        'timestamp': run_id
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"✅ Stage 2b complete: Layout Composer")
    return {'content': ai_response, 'metadata': output_data}
```

**Test**: Run Stage 2a + 2b sequence, verify layout composition
**Human Approval**: ✅ Layout composition works with filtered components

---

## Step 13: Create Stage 3 Prompt (Design QA)

### 13.1: Create `src/prompts/roles/alt4-3-design-qa.txt`
```markdown
# Design QA Validator - Stage 3

You are a Design QA Specialist focused on content quality and design system compliance.

## Your Task
Validate and fix design system compliance issues while preserving layout decisions.

## Input
USER REQUIREMENTS: {{USER_REQUIREMENTS}}
LAYOUT DESIGN: {{LAYOUT_DESIGN}}
VALIDATION_DATA: {{VALIDATION_DATA}}

## Your Focus Areas
1. **Component Validation**
   - All componentNodeId values exist in validation data
   - All required variants are present with correct values
   - Text properties use exact textLayers names

2. **Content Quality**
   - Real content (no "sample" or "placeholder" text)
   - Proper text style references
   - Appropriate color style usage

3. **Design System Compliance**
   - Correct variant combinations
   - Proper text hierarchy
   - Valid style references

## What NOT to Change
- Layout structure and container hierarchy
- Spacing and sizing relationships  
- Working component arrangements

## Output Format
Fixed JSON with design system compliance issues resolved.

```json
{
  // Fixed layout with QA improvements
}
```
```

**Test**: Create prompt file, verify QA-focused scope
**Human Approval**: ✅ Design QA prompt created with correct focus

---

## Step 14: Implement Stage 3 (Design QA)

### 14.1: Add `run_stage_3` to Alt4Pipeline
```python
async def run_stage_3(self, stage_2b_output: str, user_requirements: str, run_id: str) -> Dict[str, Any]:
    """Stage 3: Design QA with lightweight validation data"""
    print(f"🔍 Stage 3: Design QA")
    
    # Load design system and create QA validation data
    full_ds = self.load_design_system_data()
    qa_data = DesignSystemFilters.create_design_qa_data(full_ds)
    
    print(f"📊 QA validation data size: {len(qa_data)} chars")
    
    # Load and format prompt
    stage_3_prompt = self.load_prompt('alt4-3-design-qa.txt')
    formatted_prompt = stage_3_prompt.replace('{{USER_REQUIREMENTS}}', user_requirements)
    formatted_prompt = formatted_prompt.replace('{{LAYOUT_DESIGN}}', stage_2b_output)
    formatted_prompt = formatted_prompt.replace('{{VALIDATION_DATA}}', qa_data)
    
    # Call AI
    ai_response, token_usage = await self.call_ai(formatted_prompt)
    
    # Save outputs
    output_file = self.output_dir / f"alt4_{run_id}_3_design_qa.json"
    output_data = {
        'stage': 'Design QA',
        'qa_data_size': len(qa_data),
        'output': ai_response,
        'token_usage': token_usage,
        'timestamp': run_id
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"✅ Stage 3 complete: Design QA")
    return {'content': ai_response, 'metadata': output_data}
```

**Test**: Run Stages 2a + 2b + 3, verify QA validation
**Human Approval**: ✅ Design QA validates without breaking layout

---

## Step 15: Create Stage 4 Prompt (JSON Engineer)

### 15.1: Create `src/prompts/roles/alt4-4-json-engineer.txt`
```markdown
# JSON Engineer - Stage 4 (Final Safety Net)

You are a JSON Engineer responsible for ensuring 100% technical rendering compatibility.

## Your Task
Fix ALL technical issues that prevent Figma rendering while preserving design decisions.

## Input
USER REQUIREMENTS: {{USER_REQUIREMENTS}}
QA_VALIDATED_DESIGN: {{QA_VALIDATED_DESIGN}}
TECHNICAL_DATA: {{TECHNICAL_DATA}}

## Critical Technical Fixes
1. **Container Sizing (Prevents 100px width bug)**
   - Add missing `horizontalSizing: "FILL"` to nested containers
   - Add missing `layoutAlign: "STRETCH"` to nested containers
   - NEVER add primaryAxisSizingMode to nested containers

2. **Native Element Safety**
   - Remove forbidden properties from native-text elements
   - Ensure native-text has `flexFillRequired: true`
   - Remove width properties from native-text

3. **API Compatibility**
   - Validate all componentNodeId values exist
   - Ensure required properties present
   - Fix percentage values to numeric

## Validation Before Output
- Root container: primaryAxisSizingMode: "FIXED", width: 375
- Nested containers: horizontalSizing: "FILL", layoutAlign: "STRETCH"  
- Native text: flexFillRequired: true, no width properties
- All components: valid IDs and complete variants

## Output
Single JSON object ready for Figma rendering.
```

**Test**: Create prompt with technical focus on rendering fixes
**Human Approval**: ✅ JSON Engineer prompt focuses on technical safety

---

## Step 16: Implement Stage 4 (JSON Engineer)

### 16.1: Add `run_stage_4` to Alt4Pipeline
```python
async def run_stage_4(self, stage_3_output: str, user_requirements: str, run_id: str) -> Dict[str, Any]:
    """Stage 4: JSON Engineer with technical validation data"""
    print(f"⚙️ Stage 4: JSON Engineer (Final Safety Net)")
    
    # Load design system and create technical data
    full_ds = self.load_design_system_data()
    technical_data = DesignSystemFilters.create_json_engineer_data(full_ds)
    
    print(f"📊 Technical data size: {len(technical_data)} chars")
    
    # Load and format prompt
    stage_4_prompt = self.load_prompt('alt4-4-json-engineer.txt')
    formatted_prompt = stage_4_prompt.replace('{{USER_REQUIREMENTS}}', user_requirements)
    formatted_prompt = formatted_prompt.replace('{{QA_VALIDATED_DESIGN}}', stage_3_output)
    formatted_prompt = formatted_prompt.replace('{{TECHNICAL_DATA}}', technical_data)
    
    # Call AI
    ai_response, token_usage = await self.call_ai(formatted_prompt)
    
    # Save outputs
    output_file = self.output_dir / f"alt4_{run_id}_4_json_engineer.json"
    output_data = {
        'stage': 'JSON Engineer',
        'technical_data_size': len(technical_data),
        'output': ai_response,
        'token_usage': token_usage,
        'timestamp': run_id
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"✅ Stage 4 complete: JSON Engineer")
    return {'content': ai_response, 'metadata': output_data}
```

**Test**: Run complete pipeline Stages 1-4, verify final JSON
**Human Approval**: ✅ JSON Engineer produces renderable output

---

## Step 17: Complete ALT4 Pipeline Integration

### 17.1: Update Alt4Pipeline `run` method to execute all stages
```python
async def run(self, initial_input: str, run_id: Optional[str] = None) -> Dict[str, Any]:
    """Run complete ALT4 pipeline"""
    if not run_id:
        run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    print(f"🎯 Starting ALT4 Pipeline run: {run_id}")
    
    results = {}
    
    # Stage 1: User Request Analyzer
    results['stage_1'] = await self.run_stage_1(initial_input, run_id)
    self.save_rollback_state('stage_1', run_id, results['stage_1'])
    
    # Stage 2a: Component Selector
    results['stage_2a'] = await self.run_stage_2a(results['stage_1']['content'], run_id)
    self.save_rollback_state('stage_2a', run_id, results['stage_2a'])
    
    # Stage 2b: Layout Composer
    results['stage_2b'] = await self.run_stage_2b(
        results['stage_2a']['content'], 
        results['stage_1']['content'], 
        run_id
    )
    self.save_rollback_state('stage_2b', run_id, results['stage_2b'])
    
    # Stage 3: Design QA
    results['stage_3'] = await self.run_stage_3(
        results['stage_2b']['content'],
        results['stage_1']['content'],
        run_id
    )
    self.save_rollback_state('stage_3', run_id, results['stage_3'])
    
    # Stage 4: JSON Engineer
    results['stage_4'] = await self.run_stage_4(
        results['stage_3']['content'],
        results['stage_1']['content'], 
        run_id
    )
    self.save_rollback_state('stage_4', run_id, results['stage_4'])
    
    # Save final JSON to figma-ready
    await self.save_final_json(results['stage_4']['content'], run_id)
    
    print(f"🎉 ALT4 Pipeline complete: {run_id}")
    return results
```

**Test**: Run complete `python3 instance.py alt4 "create a login form"`
**Human Approval**: ✅ Complete pipeline runs from start to finish

---

## Step 18: Add Final JSON Processing

### 18.1: Add `save_final_json` method
```python
async def save_final_json(self, json_engineer_output: str, run_id: str):
    """Extract and save final JSON to figma-ready directory"""
    try:
        # Extract JSON from AI response (reuse existing logic)
        final_json_str = self.extract_json_from_response(json_engineer_output)
        final_json = json.loads(final_json_str)
        
        # Save to figma-ready directory
        figma_ready_dir = Path("figma-ready")
        figma_ready_dir.mkdir(exist_ok=True)
        figma_ready_file = figma_ready_dir / f"figma_ready_alt4_{run_id}.json"
        
        with open(figma_ready_file, 'w') as f:
            json.dump(final_json, f, indent=2)
        
        print(f"💾 Final JSON saved: {figma_ready_file}")
        
    except Exception as e:
        print(f"❌ Error saving final JSON: {e}")

def extract_json_from_response(self, response: str) -> str:
    """Extract JSON from AI response - reuse existing logic"""
    # TODO: Import and reuse existing JSON extraction logic
    pass
```

**Test**: Verify final JSON is saved to figma-ready directory
**Human Approval**: ✅ Final JSON saved correctly

---

## Step 19: Add Rollback Functionality

### 19.1: Add rollback commands to Alt4Pipeline
```python
def rollback_to_stage(self, run_id: str, stage_name: str) -> str:
    """Rollback to a previous stage output"""
    rollback_file = self.output_dir / f"alt4_{run_id}_rollback_{stage_name}.json"
    
    if not rollback_file.exists():
        raise FileNotFoundError(f"Rollback state not found: {stage_name}")
    
    with open(rollback_file, 'r') as f:
        rollback_data = json.load(f)
    
    print(f"🔄 Rolled back to {stage_name}")
    return rollback_data['content']

def list_rollback_states(self, run_id: str) -> List[str]:
    """List available rollback states for a run"""
    rollback_files = list(self.output_dir.glob(f"alt4_{run_id}_rollback_*.json"))
    stages = [f.name.split('_rollback_')[1].split('.json')[0] for f in rollback_files]
    return sorted(stages)
```

### 19.2: Add rollback command to instance.py
```python
elif args[0] == "alt4-rollback":
    if len(args) < 3:
        print("Usage: python3 instance.py alt4-rollback <run_id> <stage_name>")
        return
    
    run_id = args[1]
    stage_name = args[2]
    
    from .src.pipelines.alt4_pipeline import Alt4Pipeline
    alt4 = Alt4Pipeline(api_key, str(output_dir))
    
    try:
        rollback_content = alt4.rollback_to_stage(run_id, stage_name)
        print(f"✅ Rollback successful. Content length: {len(rollback_content)}")
    except Exception as e:
        print(f"❌ Rollback failed: {e}")
```

**Test**: Create rollback states and test rollback command
**Human Approval**: ✅ Rollback functionality works correctly

---

## Step 20: Add Visual Feedback Integration

### 20.1: Create visual feedback trigger for ALT4
```python
# Add to instance.py
elif args[0] == "alt4-visual":
    if len(args) < 3:
        print("Usage: python3 instance.py alt4-visual <run_id> <screenshot.png>")
        return
    
    run_id = args[1]
    screenshot_path = args[2]
    
    # Load ALT4 final JSON
    figma_ready_file = f"figma-ready/figma_ready_alt4_{run_id}.json"
    
    if not os.path.exists(figma_ready_file):
        print(f"❌ ALT4 output not found: {figma_ready_file}")
        return
    
    # Run visual feedback (reuse existing visual feedback logic)
    result = await pipeline.run_visual_feedback_alt4(run_id, screenshot_path)
    print(f"✅ ALT4 Visual feedback complete")
```

**Test**: Test visual feedback integration with ALT4 outputs
**Human Approval**: ✅ Visual feedback works with ALT4 pipeline

---

## Step 21: Add Debugging and Status Commands

### 21.1: Add ALT4 status command
```python
# Add to instance.py
elif args[0] == "alt4-status":
    if len(args) < 2:
        print("Usage: python3 instance.py alt4-status <run_id>")
        return
    
    run_id = args[1]
    
    from .src.pipelines.alt4_pipeline import Alt4Pipeline
    alt4 = Alt4Pipeline(api_key, str(output_dir))
    
    # Check which stages completed
    stages = ['stage_1', 'stage_2a', 'stage_2b', 'stage_3', 'stage_4']
    completed = []
    
    for stage in stages:
        output_file = Path(f"python_outputs/alt4_{run_id}_{stage.replace('_', '')}_*.json")
        if list(Path("python_outputs").glob(f"alt4_{run_id}_{stage}*.json")):
            completed.append(stage)
    
    print(f"📊 ALT4 Pipeline Status for {run_id}:")
    for stage in stages:
        status = "✅" if stage in completed else "❌"
        print(f"  {status} {stage}")
    
    # Check rollback states
    rollback_states = alt4.list_rollback_states(run_id)
    print(f"🔄 Available rollback states: {', '.join(rollback_states)}")
```

**Test**: Run status command on completed pipeline
**Human Approval**: ✅ Status command shows pipeline progress correctly

---

## Step 22: Create Documentation and Testing

### 22.1: Create `docs/ALT4_USAGE.md`
```markdown
# ALT4 Pipeline Usage Guide

## Basic Usage
```bash
# Run complete ALT4 pipeline
python3 instance.py alt4 "create a product listing page"

# Check pipeline status
python3 instance.py alt4-status 20250818_143022

# Rollback to previous stage if needed
python3 instance.py alt4-rollback 20250818_143022 stage_3

# Run visual feedback on final output
python3 instance.py alt4-visual 20250818_143022 screenshot.png
```

## Pipeline Stages
1. **Stage 1**: User Request Analyzer (same as ALT3)
2. **Stage 2a**: Component Selector (categorized, lightweight)  
3. **Stage 2b**: Layout Composer (filtered components)
4. **Stage 3**: Design QA (content validation)
5. **Stage 4**: JSON Engineer (technical safety net)

## Output Files
- `python_outputs/alt4_{timestamp}_*` - Individual stage outputs
- `figma-ready/figma_ready_alt4_{timestamp}.json` - Final result
- `python_outputs/alt4_{timestamp}_rollback_*` - Rollback states

## Testing Points
- After Stage 4: Test JSON in Figma plugin
- After Visual Feedback: Test improved JSON in Figma plugin
```

**Test**: Follow documentation to run complete workflow
**Human Approval**: ✅ Documentation is accurate and complete

---

## Step 23: Final Integration Testing

### 23.1: Test complete ALT4 workflow
```bash
# Test basic pipeline
python3 instance.py alt4 "create an e-commerce product page with image, title, price, and add to cart button"

# Verify outputs exist
ls python_outputs/alt4_*
ls figma-ready/figma_ready_alt4_*

# Test status
python3 instance.py alt4-status <run_id>

# Test rollback
python3 instance.py alt4-rollback <run_id> stage_3

# Test visual feedback
python3 instance.py alt4-visual <run_id> test_screenshot.png
```

**Human Testing Required**: 
1. ✅ Copy final JSON to Figma plugin - does it render?
2. ✅ Is component selection appropriate for request?
3. ✅ Are all stages completing without errors?
4. ✅ Do rollback states work correctly?

---

## Step 24: Commit and Create PR

### 24.1: Commit ALT4 implementation
```bash
git add .
git commit -m "feat: implement ALT4 pipeline with 4-stage architecture

- Add Component Selector (2a) with categorized components
- Add Layout Composer (2b) with filtered DS
- Move Design QA before JSON Engineer for safety net
- Add rollback capability for all stages  
- Maintain compatibility with existing ALT3 pipeline
- Add comprehensive status and debugging commands"

git push origin feature/alt4-pipeline
```

### 24.2: Create Pull Request
**Title**: `feat: ALT4 Pipeline - Enhanced 4-Stage Architecture with Rollback`

**Description**:
```markdown
## Overview
Implements ALT4 pipeline alongside existing ALT3 with enhanced architecture:

## Key Features
- ✅ 4-stage optimized pipeline (2a+2b, QA→Engineer order)
- ✅ Dynamic DS filtering for each stage
- ✅ Auto-categorized component selection
- ✅ Stage rollback capability
- ✅ Comprehensive debugging tools
- ✅ Full backward compatibility with ALT3

## Testing
- [ ] Basic pipeline runs without errors
- [ ] Final JSON renders correctly in Figma
- [ ] Component selection is contextually appropriate
- [ ] Rollback functionality works
- [ ] Visual feedback integration works
- [ ] All output files are created correctly

## Commands
- `python3 instance.py alt4 "prompt"`
- `python3 instance.py alt4-status <run_id>`
- `python3 instance.py alt4-rollback <run_id> <stage>`
- `python3 instance.py alt4-visual <run_id> <screenshot>`
```

**Human Approval**: ✅ PR created and ready for review

---

## Summary

This implementation plan creates a robust ALT4 pipeline with:

✅ **4 optimized stages** with proper separation of concerns  
✅ **Dynamic DS filtering** for each stage's specific needs  
✅ **Auto-categorized component selection** using existing scanner data  
✅ **Stage rollback capability** for debugging and recovery  
✅ **Comprehensive testing points** for quality assurance  
✅ **Full backward compatibility** with existing ALT3 workflow  
✅ **Granular steps** that prevent code agent overreach  

Each step includes testing points and human approval gates to ensure safe, incremental progress.
