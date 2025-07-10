# Claude Development Documentation

## Testing System

### Testing Branch: `create-test-UI`
- **Purpose**: Contains simplified testing interface for development
- **Location**: `git checkout create-test-UI`
- **Status**: Preserved on remote for future use

### Testing Features

#### 1. Automatic Design System Scan
- **Feature**: Plugin automatically scans design system on startup
- **Status**: ✅ Merged to main
- **Benefits**: Eliminates manual scan step during development

#### 2. Hardcoded User Requests
- **File**: `user-request.txt` 
- **Purpose**: Consistent testing prompts without manual input
- **Usage**: Edit file content → run `python3 instance.py alt3`
- **Status**: ✅ Merged to main

#### 3. Simplified JSON Renderer (Testing Branch Only)
- **Feature**: Minimal AI Generator tab with only JSON input + render button
- **Status**: ❌ Not merged (too simplified for production)
- **Access**: Switch to `create-test-UI` branch

### Development Workflow

#### Current Test Setup (Main Branch)
1. **Edit prompt**: Modify `user-request.txt` 
2. **Run pipeline**: `python3 instance.py alt3`
3. **Copy JSON**: From output file to Figma plugin
4. **Render**: Use full AI Generator interface

#### Alternative Test Setup (Testing Branch)
1. **Switch branch**: `git checkout create-test-UI`
2. **Edit prompt**: Modify `user-request.txt`
3. **Run pipeline**: `python3 instance.py alt3` 
4. **Copy JSON**: From output file to simplified JSON renderer
5. **Render**: One-click render with minimal interface

### Current Test Prompt
```
create mobile login page with 2 fields, first one has label "Your e-mail" and filled with 123@example.ua, second one is empty and has error state with supportive text "Please enter your password". Below should be primarry button that reads "Sign in" and a text only button "Sign up". At the very bottom should be small footnote text "By continuing you agree to the Policy and Rules" where Polisy and Rules is a link and so it should be formatted in Primary color.
```

### Key Features Implemented

#### Auto-Scan on Plugin Startup
- **Location**: `code.ts:285-294`
- **Triggers**: No saved scan OR different file scan
- **Benefits**: Immediate design system availability

#### Hardcoded Testing Integration
- **Location**: `instance.py:610-618`
- **Fallback**: Command line input if file doesn't exist
- **Benefits**: Consistent testing, no manual prompt entry

#### UI Message Handling
- **Location**: `code.ts:308-315`
- **Purpose**: Proper UI feedback for scan results
- **Benefits**: Visual confirmation of scan completion

### Notes for Future Development

1. **Testing Branch Preservation**: `create-test-UI` contains simplified UI for rapid testing
2. **Production Features**: Auto-scan and hardcoded testing suitable for main branch
3. **UI Simplification**: Kept separate to maintain full feature set in production
4. **Context Recovery**: This documentation helps recover testing setup after context loss

### Commands Reference

```bash
# Switch to testing branch
git checkout create-test-UI

# Run test pipeline
python3 instance.py alt3

# Switch back to main
git checkout main

# Update test prompt
echo "new prompt here" > user-request.txt
```