# AI Designer Quick Reference

## Native Elements (ONLY these 3)
- `native-text` - Text with styling
- `native-rectangle` - Rectangles (can have image fills)
- `native-circle` - Circles (can have image fills)

## BANNED Types (Don't Exist)
- ❌ native-grid
- ❌ native-list-item
- ❌ native-rating
- ❌ native-image
- ❌ native-scroll
- ❌ native-[anything-else]

## Component Rules
1. Always use `componentNodeId` (not `id`)
2. Include ALL variants from schema
3. Use exact property names from textLayers
4. Variant values are case-sensitive

## Sizing Rules
- Full width: `"horizontalSizing": "FILL"`
- Fixed width: `"width": 200` (numeric only)
- NEVER: "100%", "50%", "full"

## Common Replacements
- Grid → layoutContainer + layoutWrap: "WRAP"
- Rating → star icon components
- Image → native-rectangle + fill type IMAGE
- List items → actual list-item components