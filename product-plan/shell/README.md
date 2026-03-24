# Application Shell

The Workumi application shell provides a persistent navigation layout with sidebar navigation, user menu, and organization switching capabilities.

## Overview

The shell wraps all sections of the application and provides:

- **Sidebar Navigation**: 280px sidebar (desktop) with collapsible hamburger menu (mobile/tablet)
- **Main Navigation**: Quick access to all major sections (Today, Work, Inbox, Playbooks, Directory, Reports, Settings)
- **User Menu**: Profile access, organization switching, help links, and sign-out
- **Multi-Organization Support**: Switch between multiple organizations with different plans and roles
- **Responsive Design**: Adapts to desktop (1024px+), tablet (768px-1023px), and mobile (<768px)

## Components

### AppShell

The main shell component that wraps all page content.

**Props:**
- `children` - Page content to render in the main area
- `navigationItems` - Array of navigation items with label, href, and active state
- `user` - Current user profile information
- `organizations` - List of organizations the user belongs to
- `currentOrganization` - The currently active organization
- `onNavigate` - Callback when user clicks a navigation item
- `onSwitchOrganization` - Callback when user switches organizations
- `onOpenProfile` - Callback to open user profile settings
- `onCreateOrganization` - Callback to create a new organization
- `onOpenHelp` - Callback to open help & support
- `onOpenFeedback` - Callback to open feedback form
- `onOpenTerms` - Callback to open terms & privacy
- `onOpenOrgInNewTab` - Callback to open organization in new tab
- `onOpenOrgSettings` - Callback to open organization settings
- `onCopyOrgLink` - Callback to copy organization link
- `onLogout` - Callback to sign out

**Example:**
```tsx
import { AppShell } from './components'

function App() {
  const navigationItems = [
    { label: 'Today', href: '/today', isActive: true },
    { label: 'Work', href: '/work', isActive: false },
    { label: 'Inbox', href: '/inbox', isActive: false },
    { label: 'Playbooks', href: '/playbooks', isActive: false },
    { label: 'Directory', href: '/directory', isActive: false },
    { label: 'Reports', href: '/reports', isActive: false },
    { label: 'Settings', href: '/settings', isActive: false },
  ]

  const user = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    avatarUrl: 'https://example.com/avatar.jpg'
  }

  const organizations = [
    {
      id: 'org-001',
      name: 'Acme Agency',
      plan: 'Pro',
      role: 'Owner',
      memberCount: 12,
      lastActive: '2026-01-07T14:30:00Z',
      avatarUrl: null
    }
  ]

  return (
    <AppShell
      navigationItems={navigationItems}
      user={user}
      organizations={organizations}
      currentOrganization={organizations[0]}
      onNavigate={(href) => console.log('Navigate to:', href)}
      onSwitchOrganization={(id) => console.log('Switch to org:', id)}
      onLogout={() => console.log('Logout')}
    >
      <div className="p-8">
        {/* Your page content here */}
        <h1>Today</h1>
      </div>
    </AppShell>
  )
}
```

### MainNav

Navigation list for section links. Used internally by AppShell.

**Props:**
- `items` - Array of NavigationItem objects
- `onNavigate` - Callback when navigation item is clicked

### UserMenu

Dropdown menu for user profile and organization management. Used internally by AppShell.

**Props:**
- `user` - Current user information
- `organizations` - List of organizations
- `currentOrganization` - Currently active organization
- `onSwitchOrganization` - Callback for switching organizations
- `onOpenProfile` - Callback to open profile
- `onCreateOrganization` - Callback to create organization
- `onOpenHelp` - Callback to open help
- `onOpenFeedback` - Callback to open feedback
- `onOpenTerms` - Callback to open terms
- `onOpenOrgInNewTab` - Callback to open org in new tab
- `onOpenOrgSettings` - Callback to open org settings
- `onCopyOrgLink` - Callback to copy org link
- `onLogout` - Callback to sign out

## Layout Pattern

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ┌─────────────────┐ ┌──────────────────────┐  │
│  │                 │ │                      │  │
│  │   Logo Area     │ │                      │  │
│  │   (Workumi)    │ │                      │  │
│  │                 │ │                      │  │
│  ├─────────────────┤ │    Main Content      │  │
│  │                 │ │      Area            │  │
│  │   Navigation    │ │   (Your Pages)       │  │
│  │                 │ │                      │  │
│  │  • Today        │ │                      │  │
│  │  • Work         │ │                      │  │
│  │  • Inbox        │ │                      │  │
│  │  • Playbooks    │ │                      │  │
│  │  • Directory    │ │                      │  │
│  │  • Reports      │ │                      │  │
│  │  • Settings     │ │                      │  │
│  │                 │ │                      │  │
│  ├─────────────────┤ │                      │  │
│  │                 │ │                      │  │
│  │   User Menu     │ │                      │  │
│  │   (Profile)     │ │                      │  │
│  │                 │ │                      │  │
│  └─────────────────┘ └──────────────────────┘  │
│                                                  │
│   280px sidebar       Flexible content area     │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Responsive Behavior

**Desktop (1024px+):**
- Sidebar always visible at 280px width
- Content area takes remaining horizontal space
- User menu opens as dropdown above trigger

**Tablet (768px-1023px):**
- Sidebar hidden by default
- Hamburger menu button in top-left shows sidebar as overlay
- Sidebar slides in from left with backdrop
- Clicking backdrop closes sidebar

**Mobile (<768px):**
- Same as tablet but sidebar takes full width when open
- Navigation items remain stacked vertically
- User menu dropdown still functional

## Navigation Icons

The MainNav component uses Lucide icons mapped to section names:

- **Today**: Zap (lightning bolt)
- **Work**: Briefcase
- **Inbox**: Inbox
- **Playbooks**: BookOpen
- **Directory**: Users
- **Reports**: BarChart3
- **Settings**: Settings

## Organization Switching

Organizations are displayed in the user menu dropdown with:

- Organization avatar or building icon
- Organization name
- Plan tier badge (Free, Starter, Pro, etc.)
- User's role (Owner, Admin, Member)
- Last active timestamp (relative time, e.g., "2h ago")
- Checkmark indicator for current organization
- Hover actions for non-current orgs:
  - Open in new tab
  - Go to org settings
  - Copy org link

### Multi-Organization Features

- Each organization has completely separate subscription, settings, data, team, AI budgets, and integrations
- Switching organizations changes full context while keeping user on same page type (Today→Today, Work→Work, etc.)
- User's profile, appearance settings, and notification preferences persist across all organizations

## Design Notes

- **Active Navigation State**: Indigo background (indigo-100/indigo-900) with indigo text
- **Hover States**: Subtle slate tints (slate-100/slate-800)
- **Sidebar Background**: slate-50 (light) / slate-900 (dark)
- **Borders**: Subtle borders using slate-200/slate-800
- **Transitions**: Smooth 200ms transitions for sidebar open/close and dropdown
- **Shadows**: Shadow-2xl for dropdown menu for clear visual separation
- **Mobile Menu Button**: Fixed position at top-4 left-4, z-50

## Dependencies

- **React**: useState hook for menu state management
- **Lucide React**: Icon components
- **Tailwind CSS v4**: For all styling (no custom CSS)

## Implementation Notes

1. **No Router Dependency**: The shell doesn't include routing logic. Pass navigation callbacks that integrate with your router.
2. **Props-Based**: All data and callbacks via props. No internal state except UI interactions (menu open/close).
3. **Accessible**: Proper ARIA labels on buttons, semantic HTML elements.
4. **Dark Mode**: Full dark mode support using Tailwind's `dark:` variants.
5. **Scroll Handling**: Sidebar navigation and main content areas independently scrollable.

## Integration Example

```tsx
// In your Next.js app
import { AppShell } from '@/components/shell'
import { useRouter } from 'next/router'
import { useSession } from '@/lib/auth'

export default function Layout({ children }) {
  const router = useRouter()
  const { user, organizations, currentOrg } = useSession()

  const navigationItems = [
    { label: 'Today', href: '/today', isActive: router.pathname === '/today' },
    { label: 'Work', href: '/work', isActive: router.pathname === '/work' },
    // ... other items
  ]

  return (
    <AppShell
      navigationItems={navigationItems}
      user={user}
      organizations={organizations}
      currentOrganization={currentOrg}
      onNavigate={(href) => router.push(href)}
      onSwitchOrganization={(id) => switchOrg(id)}
      onLogout={() => signOut()}
    >
      {children}
    </AppShell>
  )
}
```

## Testing Checklist

- [ ] Sidebar opens and closes on mobile/tablet
- [ ] Navigation items highlight correctly based on active state
- [ ] User menu dropdown opens and closes
- [ ] Organization switching works correctly
- [ ] All callbacks fire with correct parameters
- [ ] Dark mode styles render correctly
- [ ] Responsive breakpoints work as expected
- [ ] Keyboard navigation works (tab through items)
- [ ] Screen reader announces navigation items correctly
- [ ] Clicking backdrop closes mobile menu
- [ ] Organization hover actions appear and function
- [ ] Layout doesn't break with long organization names
- [ ] Scrolling works independently in sidebar and main content
