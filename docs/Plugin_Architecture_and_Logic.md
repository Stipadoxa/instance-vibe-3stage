# AIDesigner Plugin - Architecture & Logic Documentation

## Overview

The AIDesigner plugin is a sophisticated Figma plugin that combines intelligent design system scanning, AI-powered UI generation, and comprehensive quality assurance. It provides a complete workflow for generating UI components based on text descriptions or reference images while maintaining high quality standards through multi-layered validation.

## Core Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Layer                                │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   AI Generator  │  Design System  │    Settings &    │
│       UI        │      Scanner    │   Configuration   │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                    State Management                             │
├─────────────────────────────────────────────────────────────────┤
│                     Core Services                               │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Component       │ Validation      │  Session        │
│ Scanner         │ Engine          │  Manager        │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ Design System   │ Figma           │  AI Integration │
│ Scanner Service │ Renderer        │  (Gemini)       │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                      Figma API                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Component Scanner (`src/core/component-scanner.ts`)

**Purpose**: Intelligent analysis and classification of design system components

**Key Features**:
- **Pattern Recognition**: Analyzes 50+ component types using sophisticated pattern matching
- **Variant Analysis**: Extracts component properties and variant configurations
- **Text Hierarchy**: Classifies text elements (primary/secondary/tertiary) for smart mapping
- **Confidence Scoring**: Provides 0.1-0.95 confidence ratings for type predictions
- **Instance Detection**: Identifies component instances vs. base components

**Algorithm Logic**:
```typescript
// Component classification algorithm
1. Name Analysis: Checks node names against known patterns
2. Structure Analysis: Examines child nodes and hierarchy
3. Property Analysis: Identifies variant properties and values
4. Visual Analysis: Considers styling and layout patterns
5. Confidence Calculation: Weights all factors for final score
```

### 2. Design System Scanner Service (`src/core/design-system-scanner-service.ts`)

**Purpose**: Orchestrates the scanning process with user feedback

**Features**:
- Progress tracking with real-time UI updates
- Persistent storage of scan results
- Component ID resolution for dynamic generation
- Manual override capabilities for type corrections

### 3. Validation Engine (`src/core/validation-engine.ts`)

**Purpose**: Multi-layered quality assurance system

**Validation Pipeline**:
```
Input JSON
    ↓
Structural Validation (JSON Schema)
    ↓
Component Validation (ID Existence)
    ↓
AI Quality Validation (Gemini)
    ↓
Auto-fix Processing (if needed)
    ↓
Quality Metrics Calculation
    ↓
Final Validated JSON
```

**Quality Metrics**:
- Structural compliance score (0-1)
- Component validity score (0-1)
- AI quality assessment (0-1)
- Overall quality score (weighted average)

### 4. Figma Renderer (`src/core/figma-renderer.ts`)

**Purpose**: Converts validated JSON to actual Figma elements

**Rendering Pipeline**:
```
Validated JSON
    ↓
Element Type Analysis
    ↓
┌─────────────┬─────────────┬─────────────┐
│   Native    │ Component   │   Layout    │
│  Elements   │ Instances   │ Properties  │
└─────────────┴─────────────┴─────────────┘
    ↓            ↓            ↓
Text Nodes   Variant Sets   Auto-layout
Rectangles   Property Maps  Constraints
Ellipses     ID Resolution  Positioning
    ↓
Final Figma Structure
```

### 5. AI Integration (`src/ai/gemini-api.ts`)

**Purpose**: Robust AI service integration with reliability features

**Features**:
- **Retry Logic**: Exponential backoff with configurable attempts
- **Error Categorization**: Distinguishes between recoverable and fatal errors
- **JSON Extraction**: Intelligent parsing of AI responses
- **Safety Configuration**: Content filtering and safety settings
- **Token Management**: Usage tracking and optimization

**Error Handling Strategy**:
```
API Call
    ↓
Success? → Yes → JSON Extraction → Validation
    ↓ No
Error Analysis
    ↓
Recoverable? → Yes → Exponential Backoff → Retry
    ↓ No
Return Detailed Error
```

## Data Flow Architecture

### Design System Scanning Flow

```
User Initiates Scan
        ↓
Page Analysis (Current/All Pages)
        ↓
Node Traversal (Recursive)
        ↓
Pattern Matching Algorithm
        ↓
Component Classification
        ↓
Variant Property Extraction
        ↓
Text Hierarchy Analysis
        ↓
Confidence Scoring
        ↓
Storage & UI Update
```

### AI Generation Flow

```
User Input (Text + Optional Image)
        ↓
Design System Context Loading
        ↓
Prompt Generation
    ┌───────────────┐
    │ System Role   │
    │ Component Set │
    │ User Request  │
    │ Platform Info │
    │ Quality Rules │
    └───────────────┘
        ↓
Gemini API Call
        ↓
Response Processing
        ↓
Validation Pipeline
    ┌─────────────────┐
    │ Structure Check │
    │ Component Check │
    │ AI Quality Check│
    │ Auto-fix (opt.) │
    └─────────────────┘
        ↓
Figma Rendering
        ↓
Session Tracking
```

### Iteration Flow

```
Modification Request
        ↓
Current State Analysis
        ↓
Modification Prompt Generation
        ↓
AI Processing
        ↓
Validation & Quality Check
        ↓
In-place Update
        ↓
History Tracking
```

## Key Algorithms

### 1. Component Type Classification

```typescript
function classifyComponent(node: SceneNode): ComponentTypeResult {
    const scores = {
        nameMatch: analyzeNodeName(node.name),
        structureMatch: analyzeNodeStructure(node),
        propertyMatch: analyzeVariantProperties(node),
        visualMatch: analyzeVisualProperties(node)
    };
    
    const confidence = calculateWeightedConfidence(scores);
    const componentType = determineHighestScoringType(scores);
    
    return { type: componentType, confidence };
}
```

### 2. Text Hierarchy Classification

```typescript
function classifyTextHierarchy(textNodes: TextNode[]): TextHierarchy {
    return textNodes.map(node => {
        const fontSize = node.fontSize;
        const fontWeight = node.fontWeight;
        const position = node.absoluteBoundingBox;
        
        const hierarchyScore = calculateHierarchyScore({
            fontSize, fontWeight, position, context
        });
        
        return {
            node,
            hierarchy: determineHierarchyLevel(hierarchyScore),
            confidence: hierarchyScore.confidence
        };
    });
}
```

### 3. Quality Assessment Algorithm

```typescript
function assessQuality(json: any, context: ValidationContext): QualityMetrics {
    const structural = validateStructure(json);           // 0-1 score
    const component = validateComponents(json, context);  // 0-1 score  
    const aiQuality = await validateWithAI(json);        // 0-1 score
    
    const overall = (
        structural * 0.3 +
        component * 0.4 +
        aiQuality * 0.3
    );
    
    return { structural, component, aiQuality, overall };
}
```

## State Management

### Reactive State System

```typescript
// Centralized state with pub/sub pattern
const state = {
    designSystem: { components: [], scanProgress: 0 },
    generation: { currentPrompt: '', isGenerating: false },
    sessions: { current: null, history: [] },
    ui: { activeTab: 'generator', settings: {} }
};

// State updates trigger UI re-renders
stateManager.subscribe('designSystem.components', updateComponentList);
stateManager.subscribe('generation.isGenerating', updateLoadingState);
```

### Session Persistence

```typescript
// Figma's clientStorage for persistence
async function saveSession(sessionData: SessionData) {
    const fileInfo = SessionService.getCurrentFileInfo();
    const sessionKey = `session_${fileInfo.fileId}`;
    
    await figma.clientStorage.setAsync(sessionKey, {
        ...sessionData,
        timestamp: Date.now(),
        version: CURRENT_VERSION
    });
}
```

## Quality Assurance Pipeline

### Multi-Layer Validation

1. **Structural Validation**
   - JSON schema compliance
   - Required property presence
   - Data type verification

2. **Component Validation**
   - Component ID existence in design system
   - Variant property validity
   - Property value constraints

3. **AI Quality Validation**
   - Semantic correctness assessment
   - Design principle adherence
   - User intent alignment

4. **Auto-fix Processing**
   - Automatic error correction
   - Suggestion generation
   - Fallback handling

### Error Recovery Strategies

```typescript
async function handleValidationError(error: ValidationError): Promise<FixResult> {
    switch (error.type) {
        case 'MISSING_COMPONENT':
            return await suggestAlternativeComponent(error.componentId);
        case 'INVALID_PROPERTY':
            return await fixPropertyValue(error.property, error.value);
        case 'STRUCTURAL_ERROR':
            return await restructureJSON(error.path, error.expected);
        default:
            return await requestAIFix(error);
    }
}
```

## Performance Optimizations

### 1. Scanning Optimization
- Lazy loading of component analysis
- Progress batching for UI updates
- Caching of pattern matching results

### 2. AI Request Optimization
- Request deduplication
- Response caching
- Concurrent request limiting

### 3. Rendering Optimization
- Batch node creation
- Efficient property application
- Minimal re-renders

## Security Considerations

### API Security
- Secure API key storage
- Request validation
- Response sanitization

### Content Safety
- AI safety settings enabled
- Content filtering
- User input validation

## Error Handling Strategy

### Error Categories
1. **Recoverable Errors**: Network issues, temporary API failures
2. **User Errors**: Invalid input, missing components
3. **System Errors**: Plugin crashes, Figma API issues
4. **AI Errors**: Model failures, unexpected responses

### Recovery Mechanisms
- Automatic retry with exponential backoff
- Graceful degradation of features
- User-friendly error messages
- State preservation during errors

## Extension Points

The plugin architecture supports extension through:

1. **Custom Component Types**: Add new pattern recognition rules
2. **Validation Rules**: Implement custom quality checks
3. **AI Providers**: Plugin different AI services
4. **Rendering Strategies**: Custom Figma element creation
5. **UI Themes**: Customizable interface appearance

## Current Capabilities Summary

### Design System Intelligence
- ✅ Automatic component discovery (50+ types)
- ✅ Variant analysis and property extraction
- ✅ Text hierarchy classification
- ✅ Confidence-based type suggestions

### AI-Powered Generation
- ✅ Multi-modal input (text + images)
- ✅ Platform-aware generation (mobile/desktop)
- ✅ Quality assurance with auto-improvement
- ✅ Intelligent retry mechanisms

### User Experience
- ✅ Real-time progress feedback
- ✅ Session persistence across restarts
- ✅ Seamless design iteration workflow
- ✅ Comprehensive debugging tools

### Technical Robustness
- ✅ Multi-layer error handling
- ✅ Automatic quality validation
- ✅ Performance optimization
- ✅ Security best practices

## Future Enhancement Possibilities

- **Multi-AI Provider Support**: Integration with Claude, GPT-4, etc.
- **Advanced Pattern Learning**: Machine learning for component recognition
- **Collaborative Features**: Team design system sharing
- **Version Control**: Design iteration history and branching
- **Custom Templates**: User-defined generation templates
- **Advanced Analytics**: Usage metrics and optimization insights

---

*This documentation reflects the current state of the AIDesigner plugin as of the latest commit (20432f5) and includes all implemented features: simple property conditions, extended auto-layout support, media properties validation, enhanced text properties, and component scanning enhancements.*