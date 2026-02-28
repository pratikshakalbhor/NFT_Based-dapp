# Design System - Implementation Guide

## Overview
A complete futuristic design system with animated backgrounds, professional typography, premium button styles, and card components.

## Components & Features

### 1. **Background.jsx** (`src/pages/Background.jsx`)
- Global animated background with three gradient blobs
- Purple, Indigo, and Pink glowing particles
- Fixed positioning with smooth pulse animations
- Automatically applied to the entire app

**Usage**: Already imported in App.js
```jsx
import Background from "./pages/Background";
```

---

### 2. **Typography System**
- **Heading Font**: Orbitron (futuristic, tech-forward)
  - Used for h1, h2, h3, h4, h5, h6
  - Letter spacing: 1px (for professional look)
  
- **Body Font**: Inter (clean, readable)
  - Used for all body text, paragraphs
  - Weights: 300 (light), 400 (regular), 500 (medium)

**Applied in**: `public/index.html` (Google Fonts) & `src/index.css` (CSS)

```html
<!-- Google Fonts Link -->
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
```

**CSS**:
```css
body {
  font-family: 'Inter', sans-serif;
}

h1, h2, h3 {
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 1px;
}
```

---

### 3. **Button Styles** (`src/components/buttons.css`)

#### Available Button Variants:

**Primary Button (Default)**
```jsx
<button className="btn-primary">Connect Wallet</button>
```
- Gradient: Purple → Indigo
- Hover: Scale up + glowing effect
- Shadow: Purple glow

**Secondary Button**
```jsx
<button className="btn-secondary">Secondary Action</button>
```
- Gradient: Indigo → Purple
- Similar effects to primary

**Outline Button**
```jsx
<button className="btn-outline">Cancel</button>
```
- Border: Purple
- Transparent background
- Hover: Fills with purple

**Small Button**
```jsx
<button className="btn-small">Small Text</button>
```
- Compact size: py-1 px-4
- Same gradient as primary

#### Using the Button Component

```jsx
import Button from './components/Button';

// Primary
<Button variant="primary" onClick={handleClick}>Connect</Button>

// Secondary  
<Button variant="secondary">Secondary</Button>

// Outline
<Button variant="outline">Cancel</Button>

// With size
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// Disabled state
<Button disabled>Disabled</Button>
```

---

### 4. **Card Component** (`src/components/Card.jsx`)

Premium card styling with glassmorphism effect.

```jsx
import Card from './components/Card';

<Card>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>
```

**Features**:
- Gradient background with backdrop blur
- Purple border with transparency
- Smooth hover animations
- Shadow effects

**Options**:
```jsx
<Card animated={true} className="custom-class">
  Content
</Card>
```

---

## Color Palette

- **Primary**: Purple (#9333EA → #4F46E5)
- **Accent**: Pink/Magenta (#EC4899)
- **Background**: Black (#000) with dark navy gradients (#0B1120)
- **Text**: White (#fff)
- **Secondary**: Indigo (#4F46E5)

---

## Animation System

### Available Animations:
1. **Pulse Animation** (Background blobs)
   - Duration: 4-6s
   - Effect: Opacity fade in/out

2. **Scale Transition** (Buttons)
   - Duration: 300ms
   - Effect: Hover scale up (scale-105)

3. **Button Glow** (Premium buttons)
   - Duration: 0.6s
   - Effect: Shadow pulsing

---

## Quick Integration Guide

### Step 1: Update Button Usage
Replace old button classes with new ones:

**Before**:
```jsx
<button className="old-button-class">Click</button>
```

**After**:
```jsx
<Button variant="primary">Click</Button>
// or
<button className="btn-primary">Click</button>
```

### Step 2: Wrap Content in Cards
```jsx
<Card>
  <h3>Section Title</h3>
  <p>Your content</p>
</Card>
```

### Step 3: Use Typography Classes
```jsx
<h1>Main Heading</h1>  {/* Orbitron */}
<h2>Sub Heading</h2>    {/* Orbitron */}
<p>Body text</p>        {/* Inter */}
```

---

## Files Created/Modified

✅ **Created**:
- `src/components/Button.jsx` - Reusable button component
- `src/components/Card.jsx` - Reusable card component  
- `src/components/buttons.css` - Button styles

✅ **Modified**:
- `src/pages/Background.jsx` - Simplified animated background
- `public/index.html` - Added Google Fonts
- `src/index.css` - Updated typography system

---

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid, Flexbox, Gradients
- CSS Animations & Transitions
- Backdrop filter (for Card component)

---

## Tips for Consistency

1. Always use the Button component or button classes
2. Wrap main sections in Card components
3. Use heading tags (h1, h2, h3) for titles - they'll auto-style
4. Maintain purple/indigo color scheme
5. Use 'Inter' font for body copy
6. Use 'Orbitron' for headings

---

## Need Custom Styling?
- Extend button classes in `buttons.css`
- Modify Card props with `className` prop
- Update color palette in Tailwind config for global changes
