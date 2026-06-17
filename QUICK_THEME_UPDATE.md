# Quick Theme Update - All Pages Light with Pink Variations 🎀

## ✅ Updated: `frontend/src/styles/pageThemes.ts`

Semua pages sekarang menggunakan **LIGHT THEME** dengan variasi pink yang berbeda:

### 🎭 ON STAGE - Glamorous Pink
- **Background:** White → Light Pink Blush
- **Primary:** Hot Pink (#ff2d72)
- **Accent:** Gold touches
- **Vibe:** Glamorous, spotlight-worthy
- **Buttons:** Pink gradient with big shadows
- **Cards:** White with pink borders, big hover effects

### 🛍️ SHOP - Soft Professional Pink
- **Background:** White → Very Subtle Pink
- **Primary:** Soft Pink (#ffc0cb)
- **Accent:** Rose tones
- **Vibe:** Clean, trustworthy, boutique
- **Buttons:** Clean pink-rose gradient
- **Cards:** White with subtle pink borders

### 🎉 EVENTS - Vibrant Energetic Pink
- **Background:** White → Pink Tint → Light Pink
- **Primary:** Deep Pink (#ff1493)
- **Accent:** Bright pinks
- **Vibe:** Party, celebration, energetic
- **Buttons:** Bold pink gradient, extra shadows, scale on hover
- **Cards:** White-to-pink gradient, lift on hover

### 📰 NEWS - Editorial Dusty Rose
- **Background:** White → Nearly White with Rose Hint
- **Primary:** Dusty Rose (#d8a7b1)
- **Accent:** Mauve, Blush
- **Vibe:** Magazine, sophisticated, elegant
- **Buttons:** Outline style (rose border)
- **Cards:** Left border accent, minimal shadows

---

## 🚀 How to Apply to Pages

### Method 1: Import and Use Helper
```tsx
import { getThemeClasses } from '../styles/pageThemes';

const OnStagePage = () => {
  const theme = getThemeClasses('onStage');
  
  return (
    <div className={theme.bgGradient}>
      <h1 className={theme.heading}>Title</h1>
      <button className={theme.button}>Click Me</button>
      <div className={theme.card}>Card Content</div>
    </div>
  );
};
```

### Method 2: Direct Tailwind Classes

#### ON STAGE Page:
```tsx
// Root container
<div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white">
  
  // Buttons
  <button className="px-8 py-4 bg-gradient-to-r from-pink-500 to-pink-400 text-white font-bold rounded-full shadow-lg shadow-pink-200 hover:shadow-xl hover:shadow-pink-300 hover:scale-105 transition-all duration-300">
    Get Started
  </button>
  
  // Cards
  <div className="bg-white/80 backdrop-blur-sm border-2 border-pink-200 rounded-2xl p-6 hover:border-pink-400 hover:shadow-xl hover:shadow-pink-100 transition-all duration-300">
    Card Content
  </div>
</div>
```

#### SHOP Page:
```tsx
// Root container
<div className="min-h-screen bg-gradient-to-b from-white via-pink-50/20 to-white">
  
  // Buttons
  <button className="px-6 py-3 bg-gradient-to-r from-pink-400 to-rose-400 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-pink-500 hover:to-rose-500 transition-all duration-200">
    Add to Cart
  </button>
  
  // Cards
  <div className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-pink-100 hover:border-pink-300 transition-all duration-200 p-4">
    Product Card
  </div>
</div>
```

#### EVENTS Page:
```tsx
// Root container
<div className="min-h-screen bg-gradient-to-b from-white via-pink-50/50 to-pink-100/20">
  
  // Buttons
  <button className="px-8 py-4 bg-gradient-to-r from-pink-600 via-pink-500 to-rose-500 text-white font-black rounded-full shadow-xl shadow-pink-300 hover:shadow-2xl hover:scale-105 transition-all duration-300">
    Book Now
  </button>
  
  // Cards
  <div className="bg-gradient-to-br from-white to-pink-50 border-2 border-pink-300 rounded-3xl p-6 hover:border-pink-500 hover:shadow-2xl hover:shadow-pink-200 hover:-translate-y-1 transition-all duration-300">
    Event Card
  </div>
</div>
```

#### NEWS Page:
```tsx
// Root container
<div className="min-h-screen bg-gradient-to-b from-white via-rose-50/10 to-white">
  
  // Buttons
  <button className="px-6 py-3 border-2 border-rose-300 text-rose-600 font-semibold rounded-lg hover:bg-rose-50 hover:border-rose-400 transition-all duration-200">
    Read More
  </button>
  
  // Cards
  <div className="bg-white rounded-xl shadow-sm border-l-4 border-rose-200 p-6 hover:border-rose-400 hover:shadow-lg transition-all duration-300">
    Article Card
  </div>
</div>
```

---

## 📝 Quick Reference - Pink Shades Per Page

### ON STAGE (Warmer/Vibrant):
- `pink-50/30` - Very light background
- `pink-200` - Borders
- `pink-400, pink-500` - Buttons, accents
- `pink-600` - Text highlights

### SHOP (Softer/Professional):
- `pink-50/20` - Very subtle background
- `pink-100, pink-300` - Borders
- `pink-400, rose-400, pink-500, rose-500` - Buttons
- `pink-500` - Text highlights

### EVENTS (Brighter/Bolder):
- `pink-50/50, pink-100/20` - Light backgrounds
- `pink-300, pink-500` - Borders
- `pink-500, pink-600, rose-500` - Buttons
- `pink-700` - Text highlights

### NEWS (Muted/Elegant):
- `rose-50/10` - Very minimal background
- `rose-200, rose-300, rose-400` - Borders, accents
- `rose-300, rose-400` - Outline buttons
- `rose-600` - Text highlights

---

## 🎨 Visual Differentiation Summary

| Page | Background Intensity | Pink Shade | Border Style | Shadow Style |
|------|---------------------|------------|--------------|--------------|
| **ON STAGE** | Medium (30%) | Warmer Hot Pink | Thick (2px) | Large, colored |
| **SHOP** | Subtle (20%) | Soft Professional | Thin (1px) | Small, clean |
| **EVENTS** | Strong (50%+) | Bright Deep Pink | Thick (2px) | XL, vibrant |
| **NEWS** | Minimal (10%) | Dusty Rose | Left accent (4px) | Subtle, editorial |

---

## ✨ Key Differences at a Glance

### Buttons:
- **ON STAGE:** Rounded-full, big shadows, pink gradient
- **SHOP:** Rounded-xl, clean shadows, pink-rose gradient
- **EVENTS:** Rounded-full, XL shadows, scale hover, bold gradient
- **NEWS:** Rounded-lg, outline style, no gradient

### Cards:
- **ON STAGE:** Backdrop blur, thick borders, XL shadows
- **SHOP:** Clean white, thin borders, small shadows
- **EVENTS:** Gradient background, thick borders, lift hover
- **NEWS:** Left border accent, minimal shadows, editorial

### Hover Effects:
- **ON STAGE:** Scale + big shadow increase
- **SHOP:** Shadow increase + border color change
- **EVENTS:** Scale + translate + shadow increase
- **NEWS:** Border thicken + shadow increase

---

## 🛠️ Implementation Status

### ✅ Done:
- Theme system created with 4 distinct light pink themes
- Helper functions ready to use
- Tailwind class templates documented

### ⏳ To Do:
Apply these classes to actual page files:
1. `frontend/src/pages/OnStage.tsx`
2. `frontend/src/pages/Shop.tsx` (or product pages)
3. `frontend/src/pages/Events.tsx`
4. `frontend/src/pages/News.tsx`

---

## 🚀 Next Step

Saya siap apply theme classes ini ke actual page files. Mau saya lanjut update semua 4 pages sekarang? 🎨

