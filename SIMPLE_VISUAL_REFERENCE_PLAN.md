# Simple Visual Reference Integration Plan

## Overview

Add optional visual references to the existing AI pipeline. Drop 1-5 images in a folder, run the pipeline, done.

## Implementation

### 1. Folder Structure
```
/Users/dari/Documents/instance-vibe-pm/
├── user-request.txt
├── visual-references/        # New folder
│   ├── example1.jpg         # Any image files
│   ├── dashboard.png        # Any names work
│   └── inspiration.gif      # 1-5 images total
└── instance.py
```

### 2. Code Changes

#### A. Add Image Loading Function
```python
# Add to instance.py around line 690
def load_visual_references():
    """Load all images from visual-references folder"""
    ref_folder = "visual-references"
    if not os.path.exists(ref_folder):
        return []
    
    images = []
    for file in os.listdir(ref_folder):
        if file.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
            images.append(os.path.join(ref_folder, file))
    
    return sorted(images)  # Consistent order
```

#### B. Integrate into Pipeline
```python
# Modify Alternative3StagePipeline initialization (around line 696)
user_request = get_user_request()
visual_refs = load_visual_references()

if visual_refs:
    print(f"📸 Found {len(visual_refs)} visual references")

# Pass to each stage along with text prompt
```

#### C. Update Stage Prompts
Add this context to Stage 1 and Stage 2 when images are present:

```
VISUAL REFERENCES:
You have {len(visual_refs)} reference images showing desired visual style.
Use these to inform your design decisions while staying within the design system constraints.
Focus on: layout patterns, color schemes, visual hierarchy, component arrangements.
```

### 3. Testing

#### Test 1: No Images
- Run `python3 instance.py alt3`
- Should work exactly as before

#### Test 2: With Images  
- Create `visual-references/` folder
- Add 1-3 images
- Run `python3 instance.py alt3`
- Should incorporate visual style from images

### 4. Error Handling

- Missing folder: Skip visual references, continue normally
- Unreadable files: Skip bad files, process good ones
- No valid images: Continue with text-only pipeline

## That's It

- No image preprocessing 
- No complex file naming
- No multi-week implementation
- No performance optimization needed
- Claude's vision API handles everything

Total implementation time: 30 minutes.