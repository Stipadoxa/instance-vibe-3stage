# Simple Native Element Test Plan

## 🎯 Objective
Test current native element behavior across 9 user scenarios to understand system capabilities and identify any gaps.

**Time Estimate**: 40 minutes total

---

## 📋 Test Scenarios

### High Significance (Should use native elements heavily)
1. **Product Tour/Onboarding** (Expected: 0.8-0.9)
2. **Landing Page/Hero** (Expected: 0.7-0.9) 
3. **About Us/Company Story** (Expected: 0.7-0.8)

### Medium Significance (Selective native elements)
4. **Dashboard Home - High Impact** (Expected: 0.6-0.7)
5. **Success States/Confirmations** (Expected: 0.6-0.8)
6. **Item Detail View** (Expected: 0.5-0.6)
7. **Browse/Search Results** (Expected: 0.4-0.5)

### Low Significance (Should use mostly components)
8. **Dashboard Home - Low Impact** (Expected: 0.3-0.4)
9. **Settings/Configuration** (Expected: 0.1-0.3)

---

## 🚀 Test Process (5 minutes per scenario)

### For Each Test Case:

#### Step 1: Run Pipeline (1 min)
```bash
# Copy request to user-request.txt
echo "[REQUEST TEXT]" > user-request.txt

# Run pipeline
python3 instance.py alt3

# Note timestamp for file identification
```

#### Step 2: Analyze Output (2 min)
Check `python_outputs/alt3_[timestamp]_2_ux_ui_designer_output.txt`:
- Does it mention native elements?
- What's the reasoning for using/not using them?

Check `figma-ready/figma_ready_[timestamp].json`:
- Count native-text, native-rectangle, native-circle elements
- Are they used appropriately for the scenario?

#### Step 3: Quick Figma Test (2 min)
- Copy JSON to Figma plugin
- Click Render
- Visual check: Do native elements render correctly?

---

## 📊 Results Template

| Scenario | Expected Score | Native Elements Found | Component/Native Balance | Notes |
|----------|---------------|----------------------|-------------------------|-------|
| 1. Product Tour | 0.8-0.9 | `native-text: X, native-rectangle: Y` | Mostly native / Mixed / Mostly components | |
| 2. Landing Hero | 0.7-0.9 | | | |
| 3. About Us | 0.7-0.8 | | | |
| 4. Dashboard High | 0.6-0.7 | | | |
| 5. Success State | 0.6-0.8 | | | |
| 6. Item Detail | 0.5-0.6 | | | |
| 7. Search Results | 0.4-0.5 | | | |
| 8. Dashboard Low | 0.3-0.4 | | | |
| 9. Settings | 0.1-0.3 | | | |

---

## 🔍 What to Look For

### ✅ Good Behavior
- High significance scenarios use native elements for visual impact
- Low significance scenarios stick to components  
- Native elements enhance rather than replace design system
- Figma rendering works without errors

### ❌ Potential Issues
- High impact scenarios using only components (missed opportunity)
- Low impact scenarios overusing native elements (unnecessary complexity)
- Native elements that don't render properly in Figma
- JSON structure errors

---

## 🛠️ Quick Fixes (if needed)

### If High Impact Scenarios Need More Native Elements:
Edit `src/prompts/roles/alt2-ux-ui-designer.txt` to:
- Emphasize native elements for high-significance moments
- Add specific examples for landing pages, onboarding flows

### If Low Impact Scenarios Use Too Many Native Elements:
Edit prompts to:
- Prefer components for utility screens
- Reserve native elements for true visual enhancement

### If Rendering Issues:
- Check `figma-renderer.ts` native element handling
- Validate JSON structure in problematic outputs

---

## 📝 Test Execution

### Run Tests:
```bash
# Test 1: Product Tour
echo "Create a mobile welcome screen for new users downloading our marketplace app. Show them the key benefits with clear visuals and a prominent 'Get Started' button. Should feel exciting on mobile." > user-request.txt
python3 instance.py alt3

# Test 2: Landing Hero  
echo "Design a mobile homepage that immediately shows our marketplace value. Include a search bar at the top, featured categories, and clear buttons for 'Buy' and 'Sell'. Should work great on phone screens." > user-request.txt
python3 instance.py alt3

# Test 3: About Us
echo "Create a mobile 'About Us' screen that tells our marketplace story with engaging visuals. Should scroll well on mobile and build trust with new app users." > user-request.txt
python3 instance.py alt3

# Test 4: Dashboard High
echo "Design a mobile seller dashboard showing their key stats - earnings, active listings, messages. Should feel like a mini business dashboard on their phone." > user-request.txt
python3 instance.py alt3

# Test 5: Success State
echo "Create a mobile success screen celebrating when someone posts their first item. Big visual confirmation with next step suggestions, optimized for mobile interaction." > user-request.txt
python3 instance.py alt3

# Test 6: Item Detail
echo "Create a mobile product detail screen with swipeable photos, item info, and prominent 'Contact Seller' button. Should work well with mobile gestures." > user-request.txt
python3 instance.py alt3

# Test 7: Search Results
echo "Design a mobile search results screen with item cards showing photos and prices. Include easy-to-tap filters and smooth scrolling." > user-request.txt
python3 instance.py alt3

# Test 8: Dashboard Low
echo "Create a simple mobile account screen with recent activity, saved items, and quick action buttons. Clean and thumb-friendly for daily use." > user-request.txt
python3 instance.py alt3

# Test 9: Settings
echo "Design a mobile settings screen with notification toggles, privacy options, and account preferences. Should be easy to navigate with one hand." > user-request.txt
python3 instance.py alt3
```

---

## 🎯 Success Criteria

**System is working well if:**
- Tests 1-3 (high significance) use native elements thoughtfully
- Tests 8-9 (low significance) rely primarily on components
- Tests 4-7 (medium) show balanced usage
- All outputs render correctly in Figma
- No JSON structure errors

**Time Investment**: 40 minutes for complete analysis
**Next Steps**: Make targeted prompt adjustments based on gaps found

---

**This approach focuses on understanding current behavior rather than assuming problems exist.**