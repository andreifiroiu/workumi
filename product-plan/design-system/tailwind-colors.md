# Tailwind Color Palette

Workumi uses three carefully selected Tailwind color palettes to create a professional, trustworthy interface that supports both light and dark modes.

## Primary Color: Indigo

**Use for:** Primary actions, links, active navigation states, focus indicators, primary buttons

Indigo conveys professionalism, trust, and reliability. It's the main interactive color throughout the application.

```css
indigo-50  #eef2ff  /* Lightest backgrounds, hover states */
indigo-100 #e0e7ff  /* Subtle backgrounds */
indigo-200 #c7d2fe  /* Borders, dividers */
indigo-300 #a5b4fc  /* Disabled states */
indigo-400 #818cf8  /* Hover states */
indigo-500 #6366f1  /* Primary buttons, links */
indigo-600 #4f46e5  /* Primary button hover, active states */
indigo-700 #4338ca  /* Primary button pressed */
indigo-800 #3730a3  /* Dark mode primary */
indigo-900 #312e81  /* Dark mode hover */
indigo-950 #1e1b4b  /* Darkest accents */
```

### Usage Examples
- Primary buttons: `bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800`
- Links: `text-indigo-600 hover:text-indigo-700`
- Active navigation: `bg-indigo-50 text-indigo-600` (light) / `bg-indigo-900 text-indigo-200` (dark)
- Focus rings: `focus:ring-2 focus:ring-indigo-500`

## Secondary Color: Emerald

**Use for:** Success states, positive actions, completion indicators, secondary CTAs

Emerald represents growth, success, and positive outcomes. Use it to reinforce successful actions and completed states.

```css
emerald-50  #ecfdf5  /* Success backgrounds */
emerald-100 #d1fae5  /* Subtle success states */
emerald-200 #a7f3d0  /* Success borders */
emerald-300 #6ee7b7  /* Success indicators */
emerald-400 #34d399  /* Secondary buttons */
emerald-500 #10b981  /* Success text, icons */
emerald-600 #059669  /* Secondary button hover */
emerald-700 #047857  /* Success emphasis */
emerald-800 #065f46  /* Dark mode success */
emerald-900 #064e3b  /* Dark mode success hover */
emerald-950 #022c22  /* Darkest success accents */
```

### Usage Examples
- Success messages: `bg-emerald-50 text-emerald-700 border-emerald-200`
- Completed tasks: `text-emerald-600`
- Approval badges: `bg-emerald-100 text-emerald-700`
- Secondary buttons: `bg-emerald-600 hover:bg-emerald-700`

## Neutral Color: Slate

**Use for:** Text, backgrounds, borders, dividers, disabled states

Slate provides a cool, neutral foundation that works beautifully in both light and dark modes. It's the backbone of the visual hierarchy.

```css
slate-50  #f8fafc  /* Page backgrounds (light mode) */
slate-100 #f1f5f9  /* Card backgrounds */
slate-200 #e2e8f0  /* Borders, dividers */
slate-300 #cbd5e1  /* Input borders */
slate-400 #94a3b8  /* Placeholder text */
slate-500 #64748b  /* Secondary text */
slate-600 #475569  /* Body text */
slate-700 #334155  /* Emphasized text */
slate-800 #1e293b  /* Headings */
slate-900 #0f172a  /* Page backgrounds (dark mode) */
slate-950 #020617  /* Darkest backgrounds */
```

### Usage Examples
- Page background: `bg-slate-50 dark:bg-slate-900`
- Card background: `bg-white dark:bg-slate-800`
- Body text: `text-slate-600 dark:text-slate-300`
- Headings: `text-slate-800 dark:text-slate-100`
- Borders: `border-slate-200 dark:border-slate-700`
- Subtle dividers: `border-slate-100 dark:border-slate-800`

## Additional Semantic Colors

While indigo, emerald, and slate are your primary palette, you may need additional Tailwind colors for specific semantic purposes:

### Red (Errors & Destructive Actions)
```css
red-600  /* Error text, destructive buttons */
red-100  /* Error backgrounds */
red-200  /* Error borders */
```

### Amber (Warnings)
```css
amber-600  /* Warning text */
amber-100  /* Warning backgrounds */
amber-200  /* Warning borders */
```

### Blue (Info)
```css
blue-600  /* Info text */
blue-100  /* Info backgrounds */
blue-200  /* Info borders */
```

## Dark Mode Strategy

All components should support dark mode using Tailwind's `dark:` variant. Follow these patterns:

```tsx
// Backgrounds
className="bg-white dark:bg-slate-800"

// Text
className="text-slate-900 dark:text-slate-100"

// Borders
className="border-slate-200 dark:border-slate-700"

// Cards with shadows
className="bg-white dark:bg-slate-800 shadow-sm dark:shadow-slate-900/50"

// Interactive elements
className="hover:bg-slate-50 dark:hover:bg-slate-700"
```

## Accessibility Guidelines

- Ensure text contrast meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- Use `slate-600` or darker for body text on light backgrounds
- Use `slate-300` or lighter for body text on dark backgrounds
- Test focus indicators are visible in both light and dark modes
- Use semantic colors (red for errors, emerald for success) with additional text/icons, not color alone

## Complete Color Reference

For the full set of Tailwind v4 colors and utilities, refer to:
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- Always use Tailwind's built-in color utilities (e.g., `bg-indigo-600`, `text-slate-800`)
- Never define custom colors unless absolutely necessary
