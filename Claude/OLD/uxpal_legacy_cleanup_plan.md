# UXPal Legacy Code Cleanup Plan for Claude Code

## 🎯 **Problem Analysis**

Your UXPal Figma plugin is generating two types of non-lethal console errors:

1. **Camera Permissions Policy Violation**: `[Violation] Potential permissions policy violation: camera is not allowed in this document`
2. **Datadog Analytics Failure**: `browser-intake-datadoghq.com/api/v2/rum?...` (408 error)

These errors suggest legacy code fragments from:
- Unused camera/media capture functionality 
- Analytics/tracking integration attempts
- Possible development/debugging remnants

## 🔍 **Detection Strategy**

### **Phase 1: Static Code Analysis**
Claude Code should search for these patterns across your entire codebase:

#### **Camera/Media Related Legacy Code**
```bash
# Search patterns for camera/media permissions
grep -r "camera" --include="*.js" --include="*.ts" --include="*.html" .
grep -r "getUserMedia" --include="*.js" --include="*.ts" .
grep -r "mediaDevices" --include="*.js" --include="*.ts" .
grep -r "navigator.camera" --include="*.js" --include="*.ts" .
grep -r "permissions.*camera" --include="*.js" --include="*.ts" .
```

#### **Analytics/Tracking Legacy Code**
```bash
# Search patterns for Datadog/analytics
grep -r "datadoghq" --include="*.js" --include="*.ts" --include="*.html" .
grep -r "dd-api-key" --include="*.js" --include="*.ts" --include="*.html" .
grep -r "browser-intake" --include="*.js" --include="*.ts" .
grep -r "analytics" --include="*.js" --include="*.ts" .
grep -r "tracking" --include="*.js" --include="*.ts" .
grep -r "rum" --include="*.js" --include="*.ts" .
```

#### **Permissions Policy Related Code**
```bash
# Search for permissions policy references
grep -r "permissions-policy" --include="*.html" --include="*.js" .
grep -r "feature-policy" --include="*.html" --include="*.js" .
grep -r "allow=" --include="*.html" .
```

### **Phase 2: File-Specific Examination**

#### **Primary Files to Analyze**
Based on your codebase structure, Claude Code should examine:

1. **`code.js`** - Main plugin code (compiled)
2. **`component-scanner.ts`** - Component scanning logic
3. **`manifest.json`** - Plugin permissions and configuration
4. **HTML UI files** - Any embedded analytics or camera code
5. **Service files** - Session, scanner, and API services
6. **Build/bundled files** - Check for included dependencies

#### **Specific Locations to Check**

**In HTML Files:**
- `<script>` tags with external analytics
- `<meta>` tags with permissions policies
- Embedded Datadog or tracking snippets
- Camera-related iframe permissions

**In JavaScript/TypeScript:**
- Import statements for analytics libraries
- Camera API calls (`navigator.mediaDevices.getUserMedia`)
- Datadog initialization code
- Analytics event tracking calls
- Debug/development tracking code

## 🧹 **Elimination Strategy**

### **Phase 3: Safe Removal Process**

#### **Step 1: Backup and Branch**
```bash
# Create backup branch before cleanup
git checkout -b legacy-code-cleanup
git commit -m "Pre-cleanup checkpoint"
```

#### **Step 2: Camera-Related Code Removal**
**Target these patterns for removal:**

```javascript
// Remove camera permission requests
navigator.mediaDevices.getUserMedia({video: true})
navigator.camera.getPicture()
navigator.getUserMedia()

// Remove camera-related permissions
"permissions": ["camera", "microphone"]

// Remove HTML permissions attributes
allow="camera; microphone"
```

**Replacement Strategy:**
- Replace with error handling or feature flags
- Remove from manifest permissions
- Update HTML meta policies to explicitly deny camera

#### **Step 3: Analytics/Datadog Code Removal**
**Target these patterns:**

```javascript
// Remove Datadog initialization
import { datadogRum } from '@datadog/browser-rum'
DD_RUM.init({...})

// Remove analytics calls
datadog.track()
analytics.page()
rum.addTiming()

// Remove tracking URLs
'https://browser-intake-datadoghq.com/api/v2/rum'
```

**Replacement Strategy:**
- Replace with local logging or remove entirely
- Use Figma's built-in analytics if needed
- Implement feature flags for development tracking

#### **Step 4: Configuration Cleanup**
**Update these files:**

**manifest.json:**
```json
{
  "permissions": [
    // Remove: "camera", "microphone"
    // Keep only: necessary Figma API permissions
  ]
}
```

**HTML Head:**
```html
<!-- Add explicit camera denial -->
<meta http-equiv="Permissions-Policy" content="camera=(), microphone=()">
```

## 🛠️ **Implementation Commands for Claude Code**

### **Automated Search and Replace Commands**

```bash
# Phase 1: Identify all camera references
find . -name "*.js" -o -name "*.ts" -o -name "*.html" | xargs grep -l "camera\|getUserMedia\|mediaDevices"

# Phase 2: Identify all analytics references  
find . -name "*.js" -o -name "*.ts" -o -name "*.html" | xargs grep -l "datadoghq\|analytics\|tracking\|dd-api"

# Phase 3: Safe removal (manual review required)
# Note: Claude Code should show each match and ask for confirmation
```

### **File-by-File Cleanup Checklist**

#### **High Priority Files:**
1. ✅ **manifest.json** - Remove camera permissions
2. ✅ **code.js** - Remove analytics calls and camera code
3. ✅ **component-scanner.ts** - Check for camera icon scanning code
4. ✅ **HTML UI files** - Remove analytics scripts and camera permissions
5. ✅ **Service files** - Remove tracking/analytics services

#### **Medium Priority Files:**
6. ✅ **Build configuration** - Remove analytics dependencies
7. ✅ **Package.json** - Remove analytics packages
8. ✅ **Environment files** - Remove analytics API keys

## 🧪 **Testing Strategy**

### **Verification Steps:**
1. **Build test** - Ensure plugin compiles without errors
2. **Runtime test** - Load plugin in Figma and check console
3. **Feature test** - Verify core functionality works
4. **Permission test** - Confirm no camera permission requests
5. **Network test** - Check no analytics network calls

### **Expected Outcomes:**
- ✅ No camera permission policy violations
- ✅ No Datadog/analytics network errors  
- ✅ Clean console output during development
- ✅ All UXPal core features working normally

## 🚨 **Safety Guidelines**

### **Code Removal Rules:**
1. **Never remove** - Core plugin functionality
2. **Always backup** - Before making changes
3. **Test incrementally** - Remove code in small batches
4. **Document changes** - Track what was removed and why
5. **Keep fallbacks** - Add feature flags for conditional features

### **Rollback Plan:**
```bash
# If issues arise, rollback to checkpoint
git reset --hard HEAD~1
git checkout main
```

## 📋 **Claude Code Execution Checklist**

### **Phase 1: Discovery**
- [ ] Run search commands to identify legacy code locations
- [ ] Generate report of all files containing camera/analytics code
- [ ] Categorize findings by risk level (safe to remove vs. needs review)

### **Phase 2: Analysis**  
- [ ] Examine each file for context and dependencies
- [ ] Identify code that's definitely legacy vs. potentially needed
- [ ] Create removal plan with specific line numbers/sections

### **Phase 3: Execution**
- [ ] Create backup branch
- [ ] Remove obvious legacy code (analytics, unused camera)
- [ ] Update configurations (manifest, HTML policies)
- [ ] Test after each major removal

### **Phase 4: Validation**
- [ ] Build plugin successfully
- [ ] Test in Figma environment
- [ ] Verify clean console output
- [ ] Confirm all UXPal features work correctly

---

## 🎉 **Expected Benefits**

After cleanup:
- **Cleaner debugging** - No more irrelevant console errors
- **Better performance** - Removed unused network calls
- **Improved security** - No unnecessary permissions
- **Professional polish** - Clean console for better user experience
- **Easier maintenance** - Less legacy code to maintain

This plan gives Claude Code a systematic approach to identify and safely remove the legacy code causing your console errors while preserving all the core UXPal functionality.