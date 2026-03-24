# Typography

Workumi uses two carefully selected Google Fonts that provide excellent readability, modern aesthetics, and strong support for UI design.

## Font Families

### Inter (Heading & Body)

**Use for:** All UI text, headings, buttons, labels, body copy

Inter is a highly legible sans-serif typeface designed specifically for user interfaces. It features:
- Excellent on-screen readability at all sizes
- Tall x-height for clarity
- Optimized letter spacing and proportions
- Support for 100+ languages
- Multiple weights for hierarchy

**Google Fonts Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

**Weights Used:**
- 400 (Regular) - Body text, labels, secondary information
- 500 (Medium) - Buttons, emphasized text, navigation items
- 600 (Semi-Bold) - Headings, section titles, strong emphasis
- 700 (Bold) - Large headings, primary CTAs, critical information

### IBM Plex Mono (Monospace)

**Use for:** Code, data, IDs, timestamps, technical information

IBM Plex Mono is a monospaced typeface that pairs beautifully with Inter. It features:
- Clear character differentiation (1, l, I are distinct)
- Comfortable for extended reading of technical content
- Professional, modern aesthetic
- Matches Inter's x-height and visual weight

**Google Fonts Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');
```

**Weights Used:**
- 400 (Regular) - Code snippets, data values, IDs
- 500 (Medium) - Emphasized code, highlighted values

## Type Scale

Workumi uses a consistent type scale across the application:

| Token | Size | Line Height | Use Case |
|-------|------|-------------|----------|
| `text-xs` | 12px | 1.5 | Captions, timestamps, metadata |
| `text-sm` | 14px | 1.5 | Labels, secondary text, table cells |
| `text-base` | 16px | 1.5 | Body text, form inputs, buttons |
| `text-lg` | 18px | 1.5 | Emphasized body text, large buttons |
| `text-xl` | 20px | 1.25 | Section subheadings, card titles |
| `text-2xl` | 24px | 1.25 | H3 headings, modal titles |
| `text-3xl` | 30px | 1.25 | H2 headings, page subtitles |
| `text-4xl` | 36px | 1.25 | H1 headings, hero text |

## Font Weights

| Token | Weight | Use Case |
|-------|--------|----------|
| `font-normal` | 400 | Body text, default text |
| `font-medium` | 500 | Buttons, navigation, emphasized text |
| `font-semibold` | 600 | Headings, section titles, strong emphasis |
| `font-bold` | 700 | Primary headings, critical information |

## Usage Guidelines

### Headings

```tsx
// H1 - Page titles
<h1 className="text-4xl font-semibold text-slate-900 dark:text-slate-100">
  Today
</h1>

// H2 - Section titles
<h2 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
  Approvals Queue
</h2>

// H3 - Subsection titles
<h3 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">
  Recent Activity
</h3>

// Card/Component titles
<h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
  Work Order #1234
</h4>
```

### Body Text

```tsx
// Primary body text
<p className="text-base text-slate-600 dark:text-slate-300">
  This is the main body text for paragraphs and content.
</p>

// Secondary text (labels, captions)
<span className="text-sm text-slate-500 dark:text-slate-400">
  Last updated 2 hours ago
</span>

// Metadata and timestamps
<span className="text-xs text-slate-400 dark:text-slate-500">
  Created Jan 8, 2026
</span>
```

### Buttons and Interactive Elements

```tsx
// Primary button
<button className="text-base font-medium">
  Approve
</button>

// Secondary button
<button className="text-sm font-medium">
  Cancel
</button>

// Navigation items
<a className="text-base font-medium">
  Today
</a>
```

### Code and Data

```tsx
// Code snippets
<code className="font-mono text-sm bg-slate-100 dark:bg-slate-800">
  const workOrder = { id: 1234 }
</code>

// Data values
<span className="font-mono text-sm text-slate-700 dark:text-slate-300">
  WO-2024-0042
</span>

// IDs and references
<span className="font-mono text-xs text-slate-500 dark:text-slate-400">
  #abc123
</span>
```

## Line Heights

Use appropriate line heights for readability:

- **Tight (1.25):** For headings and titles where space is limited
- **Normal (1.5):** For body text, buttons, and most UI elements
- **Relaxed (1.75):** For long-form content and reading-heavy interfaces

```tsx
// Tight for headings
className="leading-tight"  // 1.25

// Normal for UI elements (default)
className="leading-normal"  // 1.5

// Relaxed for long-form content
className="leading-relaxed"  // 1.75
```

## Text Colors

Follow these patterns for consistent text hierarchy:

```tsx
// Primary text (headings, important content)
className="text-slate-900 dark:text-slate-100"

// Body text (paragraphs, descriptions)
className="text-slate-600 dark:text-slate-300"

// Secondary text (labels, captions)
className="text-slate-500 dark:text-slate-400"

// Tertiary text (metadata, timestamps)
className="text-slate-400 dark:text-slate-500"

// Interactive text (links)
className="text-indigo-600 dark:text-indigo-400"

// Success text
className="text-emerald-600 dark:text-emerald-400"

// Error text
className="text-red-600 dark:text-red-400"
```

## Responsive Typography

Adjust font sizes for different screen sizes when needed:

```tsx
// Responsive headings
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold">
  Dashboard
</h1>

// Responsive body text (use sparingly)
<p className="text-sm sm:text-base">
  Content that needs to scale
</p>
```

## Accessibility Guidelines

- Maintain a minimum font size of 14px (text-sm) for body text
- Use 16px (text-base) as the default for best readability
- Ensure sufficient color contrast (see tailwind-colors.md)
- Use semantic HTML elements (h1, h2, p) for proper document structure
- Avoid using color alone to convey meaning (pair with text/icons)
- Keep line lengths between 45-75 characters for optimal readability

## Installation

Import both fonts in your main CSS file or HTML head:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');
```

Or via HTML:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Then configure in your Tailwind CSS (tokens.css):

```css
@theme {
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
```
