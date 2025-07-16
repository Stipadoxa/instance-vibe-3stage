# Laser-Focused JSON Engineer Prompt Fixes

## 1. Add CRITICAL WARNING Section (Insert at top after role description)

```markdown
🚨 CRITICAL STRUCTURE ERROR TO AVOID 🚨

THE #1 CAUSE OF 100x100 FRAME FAILURES:

❌ NEVER nest "items" inside "layoutContainer":
{
  "layoutContainer": {
    "name": "Screen",
    "width": 375,
    "items": [...]  // ❌ WRONG - Creates broken frames
  }
}

✅ ALWAYS put "items" at root level:
{
  "layoutContainer": {
    "name": "Screen", 
    "width": 375
  },
  "items": [...]  // ✅ CORRECT - Creates proper auto-layout
}

This single mistake causes width properties to be ignored and creates 100x100 default frames instead of properly sized auto-layout containers.
```

## 2. Update Existing "MANDATORY ROOT STRUCTURE RULE" Section

**Replace the current text:**
```
🔴 ROOT LEVEL (Main Screen) - MANDATORY Split Structure:
```

**With this enhanced version:**
```
🔴 ROOT LEVEL (Main Screen) - MANDATORY Split Structure:

⚠️ CRITICAL: The "items" array MUST be at the ROOT level, NOT nested inside "layoutContainer"

❌ FATAL ERROR - This breaks width application:
{
  "layoutContainer": {
    "name": "Screen Name",
    "layoutMode": "VERTICAL", 
    "width": 375,
    "items": [...]  // ❌ CAUSES 100x100 FRAMES
  }
}

✅ REQUIRED STRUCTURE - This enables proper width:
{
  "layoutContainer": {
    "name": "Screen Name",
    "layoutMode": "VERTICAL",
    "width": 375
  },
  "items": [...]  // ✅ CORRECT POSITION
}
```

## 3. Add to Success Checklist

**Add these items to the "Auto-Layout Creation Success Checklist":**

```markdown
=📐 ROOT STRUCTURE VALIDATION (CRITICAL)
[ ] ✅ "items" array is at ROOT level (parallel to "layoutContainer")
[ ] ❌ NO "items" array nested inside "layoutContainer" object
[ ] ✅ "layoutContainer" object contains ONLY layout properties (no items)
[ ] ❌ NO nested structure that creates frames instead of auto-layouts
```

## 4. Add Validation Rule to Output Format Section

**Add this immediately before the output format examples:**

```markdown
## MANDATORY PRE-OUTPUT VALIDATION

Before generating your JSON, verify this exact structure:

✅ CORRECT ROOT STRUCTURE:
{
  "layoutContainer": { /* layout properties only */ },
  "items": [ /* all content here */ ]
}

❌ INVALID STRUCTURE (causes 100x100 frames):
{
  "layoutContainer": { 
    /* properties */
    "items": [ /* WRONG - never nest items here */ ]
  }
}

If your JSON has items nested inside layoutContainer, you MUST restructure it before output.
```

## 5. Add Quick Reference Box

**Insert this prominently near the top:**

```markdown
┌─────────────────────────────────────────────────┐
│ 🔴 QUICK REFERENCE: ROOT STRUCTURE RULE        │
│                                                 │
│ ROOT JSON MUST ALWAYS LOOK LIKE:               │
│ {                                               │
│   "layoutContainer": { layout props },         │
│   "items": [ content ]                         │
│ }                                               │
│                                                 │
│ NEVER PUT "items" INSIDE "layoutContainer"      │
└─────────────────────────────────────────────────┘
```

## Summary of Changes

These focused additions will:

1. **Make the error impossible to miss** with prominent warnings
2. **Provide clear before/after examples** of wrong vs right structure  
3. **Add validation checkpoints** to catch the mistake
4. **Reference the specific 100x100 frame symptom** so the engineer understands the consequence
5. **Keep existing content intact** while adding laser-focused prevention

The changes target the exact mistake that caused your issue without bloating the prompt with unnecessary information.
