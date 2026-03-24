# Tech Stack

This document defines the complete technical stack for Workumi, an AI-powered work orchestration platform built on Laravel with React/Inertia.js.

## Framework and Runtime

- **Application Framework:** Laravel 12
- **Language/Runtime:** PHP 8.3+
- **Package Manager:** Composer
- **Authentication:** Laravel Fortify (registration, login, password reset, email verification, two-factor authentication)
- **Authorization:** Laravel policies and gates

## Frontend

- **JavaScript Framework:** React 19
- **TypeScript:** Strict mode enabled for type safety
- **Bridge Layer:** Inertia.js (connects Laravel backend to React frontend without building an API)
- **UI Component Library:** Radix UI primitives with custom styling
- **CSS Framework:** Tailwind CSS v4 (utility-first CSS with Vite plugin)
- **Build Tool:** Vite (fast HMR, optimized production builds)
- **State Management:** TanStack Query for server state, React hooks and context for client state
- **JavaScript Package Manager:** npm

## Database and Storage

- **Primary Database:** MySQL 8.0+ (production and development for parity)
- **ORM/Query Builder:** Eloquent ORM (Laravel's built-in ORM)
- **Migrations:** Laravel migrations for version-controlled schema changes
- **Seeders and Factories:** Laravel seeders and model factories for test data

## AI and Machine Learning

- **AI Integration:** neuron-ai package (planned for AI agent functionality)
- **AI Agent Framework:** Custom-built agent orchestration system with Tool Gateway architecture
- **LLM Provider:** Primarily Anthropic Claude, with OpenAI integration planned

## Testing and Quality

- **Test Framework:** Pest (modern PHP testing framework with expressive syntax)
- **JavaScript Testing:** Vitest for React component testing (planned)
- **Code Formatting:** Laravel Pint (Laravel's opinionated PHP code formatter)
- **Static Analysis:** PHPStan with Larastan (catches bugs without running code)
- **JavaScript Linting:** ESLint (code quality and consistency for React/TypeScript)

## Queues and Background Processing

- **Queue System:** Laravel Queues (database driver initially, Redis future consideration)
- **Job Processing:** Laravel queue workers with supervisord or Laravel Horizon
- **Scheduling:** Laravel Task Scheduler for cron-like scheduled tasks

## Deployment and Infrastructure

- **Hosting:** Hetzner (cost-effective European cloud hosting)
- **Deployment Tool:** Laravel Forge (automated deployment, server management, SSL)
- **CI/CD:** Laravel Forge automated deployments from Git
- **Web Server:** Nginx (reverse proxy and static file serving)
- **Process Manager:** PHP-FPM (PHP process manager)

## Third-Party Services

- **Email Service:** Mailgun (transactional email delivery)
- **Error Tracking:** Sentry (error monitoring and performance tracking)
- **File Storage:** Local filesystem initially, S3-compatible storage (planned future addition)
- **Cache Store:** Database initially, Redis (planned future addition for caching and sessions)

## Development Tools

- **Version Control:** Git
- **Local Environment:** Laravel Valet
- **API Documentation:** Scribe
- **Database Management:** TablePlus

## Future Infrastructure Additions

These components are noted for future implementation but not immediate priorities:

- **Redis:** For advanced caching, session management, queue processing, and real-time features
- **S3-Compatible Storage:** For scalable document and artifact storage with CDN distribution
- **Websockets:** For real-time collaboration features (Laravel Reverb or Pusher)
- **Search Engine:** For full-text search capabilities (Meilisearch or Algolia)

## Architecture Patterns

- **Frontend Architecture:** Server-driven SPA using Inertia.js (no separate API needed)
- **State Management:** TanStack Query for server state, React hooks/context for client state
- **API Style:** Inertia controller responses (not RESTful JSON API)
- **Agent Architecture:** Tool Gateway pattern for controlled AI agent operations
- **Work Graph Model:** Domain-driven design with Parties > Projects > Work Orders > Tasks > Deliverables
- **Event Sourcing:** Laravel events for agent actions, state transitions, and audit logging

## Security and Compliance

- **Authentication:** Laravel Fortify with session-based auth
- **CSRF Protection:** Inertia CSRF token handling built-in
- **Input Validation:** Laravel Form Requests for backend validation
- **XSS Protection:** React's built-in JSX escaping, Laravel Blade escaping
- **Authorization:** Laravel policies for fine-grained permissions
- **Audit Logging:** Custom audit log for all AI agent operations and human approvals

## Notes

- **Incremental Infrastructure:** Redis and S3 are planned additions but not required for initial launch
- **AI Provider Flexibility:** The neuron-ai package provides abstraction; specific LLM providers can be swapped based on performance and cost requirements
- **Database Parity:** MySQL used in both development and production to ensure consistent behavior

---

## Multi-Organization Features

- Each organization has completely separate subscription, settings, data, team, AI budgets, and integrations
- Switching organizations changes full context while keeping user on same page type (Today to Today, Work to Work, etc.)
- User's profile, appearance settings, and notification preferences persist across all organizations

## Layout Pattern

Sidebar navigation with the following structure:
- **Sidebar width:** 280px on desktop
- **Logo area:** Top of sidebar with Workumi branding
- **Navigation items:** Vertically stacked below logo
- **User menu:** Pinned at bottom of sidebar
- **Content area:** Takes remaining horizontal space to the right

## Responsive Behavior

- **Desktop (1024px+):** Full sidebar always visible, content area adjusts
- **Tablet (768px-1023px):** Sidebar collapses to hamburger menu, opens as overlay
- **Mobile (<768px):** Sidebar hidden by default, hamburger menu opens full-width overlay

## Design Notes

- Active navigation item highlighted with indigo (primary color) background and text
- Hover states use subtle indigo tints
- Sidebar background uses slate-50 (light mode) and slate-900 (dark mode)
- Navigation items have clear visual feedback for active/inactive states
- User menu visually separated from navigation items with a subtle border
- Organization switcher appears above user profile with dropdown animation
- Organization dropdown has shadow and border for clear visual separation
- Current organization highlighted in dropdown with indigo accent
- Smooth transitions for sidebar open/close on mobile and dropdown interactions

---

# Typography

Workumi uses two carefully selected Google Fonts that provide excellent readability, modern aesthetics, and strong support for UI design.

## Font Families

### Inter (Heading and Body)

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

---

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

### Red (Errors and Destructive Actions)
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
