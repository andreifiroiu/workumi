# Milestone 1: Foundation & Shell

This milestone adapts your existing Laravel React starter kit to implement the Workumi application structure.

## Overview

**Goal**: Add application-specific structure, design system, and navigation shell to your existing starter kit.

**Assumptions**:
- ✅ Laravel 12 installed
- ✅ Inertia.js configured
- ✅ React + TypeScript set up
- ✅ Authentication working (Fortify)
- ✅ Tailwind CSS configured
- ✅ Vite configured

## What You'll Add

1. Design tokens (colors, typography)
2. Application data types
3. Navigation routes
4. Application shell with sidebar
5. User menu with org switching
6. Placeholder pages for all sections

## Step 1: Update Design Tokens

Update **resources/css/app.css** to include Workumi design tokens:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');

@import 'tailwindcss';

@theme {
  /* Colors - Primary (Purple) */
  --color-primary-50: #f5f3ff;
  --color-primary-100: #ede9fe;
  --color-primary-200: #ddd6fe;
  --color-primary-300: #c4b5fd;
  --color-primary-400: #a78bfa;
  --color-primary-500: #8b5cf6;
  --color-primary-600: #7c3aed;
  --color-primary-700: #6d28d9;
  --color-primary-800: #5b21b6;
  --color-primary-900: #4c1d95;

  /* Colors - Success (Green/Teal) */
  --color-success-50: #f0fdfa;
  --color-success-100: #ccfbf1;
  --color-success-200: #99f6e4;
  --color-success-300: #5eead4;
  --color-success-400: #2dd4bf;
  --color-success-500: #14b8a6;
  --color-success-600: #0d9488;
  --color-success-700: #0f766e;
  --color-success-800: #115e59;
  --color-success-900: #134e4a;

  /* Colors - Neutral (Slate) */
  --color-neutral-50: #f8fafc;
  --color-neutral-100: #f1f5f9;
  --color-neutral-200: #e2e8f0;
  --color-neutral-300: #cbd5e1;
  --color-neutral-400: #94a3b8;
  --color-neutral-500: #64748b;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1e293b;
  --color-neutral-900: #0f172a;

  /* Typography */
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}

/* Override body background to use our neutral palette */
body {
  @apply bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100;
  font-family: var(--font-body);
}
```

## Step 2: Install Additional Dependencies

```bash
npm install lucide-react date-fns
```

## Step 3: Add Application Types

Create **resources/js/types/workumi.ts**:

```typescript
// Extend existing User type from starter kit
export interface User {
  id: string
  displayName: string
  email: string
  timezone: string
  language: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'Starter' | 'Team' | 'Business'
  role: 'Owner' | 'Admin' | 'Member'
  memberCount: number
  lastActive: string
  isCurrent: boolean
}

export interface NavigationItem {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  isActive: boolean
  badge?: number
}

// Work entities - add more as needed from data-model/types.ts
export interface Party {
  id: string
  type: 'client' | 'vendor' | 'partner' | 'internal'
  name: string
  email?: string
  phone?: string
}

export interface Project {
  id: string
  partyId: string | null
  name: string
  status: 'active' | 'on-hold' | 'completed' | 'cancelled'
  startDate: string
  targetEndDate?: string
}

export interface WorkOrder {
  id: string
  projectId: string
  title: string
  status: 'draft' | 'approved' | 'in-progress' | 'blocked' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigneeId?: string
}

export interface Task {
  id: string
  workOrderId: string
  title: string
  status: 'todo' | 'in-progress' | 'blocked' | 'review' | 'done'
  assigneeId?: string
}
```

Update **resources/js/types/index.d.ts** (or create if it doesn't exist):

```typescript
import { User, Organization } from './workumi'

export interface User extends User {
  // Keep any existing User properties from starter kit
  name: string
  email_verified_at?: string
}

// Extend PageProps to include Workumi-specific data
export type PageProps
  T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
  auth: {
    user: User
  }
  currentOrganization?: Organization | null
  organizations?: Organization[]
}
```

## Step 4: Update HandleInertiaRequests Middleware

Update **app/Http/Middleware/HandleInertiaRequests.php**:

```php
<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => (string) $request->user()->id,
                    'displayName' => $request->user()->name,
                    'email' => $request->user()->email,
                    'timezone' => $request->user()->timezone ?? 'UTC',
                    'language' => $request->user()->language ?? 'en-US',
                    'name' => $request->user()->name,
                    'email_verified_at' => $request->user()->email_verified_at,
                ] : null,
            ],
            // TODO: Add real organization logic later
            'currentOrganization' => $request->user() ? [
                'id' => 'org-001',
                'name' => 'Default Organization',
                'slug' => 'default',
                'plan' => 'Starter',
                'role' => 'Owner',
                'memberCount' => 1,
                'lastActive' => now()->toISOString(),
                'isCurrent' => true,
            ] : null,
            'organizations' => $request->user() ? [
                [
                    'id' => 'org-001',
                    'name' => 'Default Organization',
                    'slug' => 'default',
                    'plan' => 'Starter',
                    'role' => 'Owner',
                    'memberCount' => 1,
                    'lastActive' => now()->toISOString(),
                    'isCurrent' => true,
                ],
            ] : [],
        ];
    }
}
```

## Step 5: Add Database Fields for User Preferences

Create migration:

```bash
php artisan make:migration add_preferences_to_users_table
```

**database/migrations/xxxx_add_preferences_to_users_table.php**:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('timezone')->default('UTC')->after('email');
            $table->string('language')->default('en-US')->after('timezone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['timezone', 'language']);
        });
    }
};
```

Run migration:

```bash
php artisan migrate
```

## Step 6: Create Application Shell Components

Create **resources/js/Components/Shell/** directory with these files:

### AppShell.tsx

```tsx
import React, { PropsWithChildren, useState } from 'react'
import { NavigationItem, User, Organization } from '@/types/workumi'
import MainNav from './MainNav'
import UserMenu from './UserMenu'
import { Menu } from 'lucide-react'

interface AppShellProps extends PropsWithChildren {
  navigationItems: NavigationItem[]
  user: User | null
  organizations: Organization[]
  currentOrganization: Organization | null
  onNavigate: (href: string) => void
  onSwitchOrganization: (orgId: string) => void
  onOpenProfile: () => void
  onLogout: () => void
}

export default function AppShell({
  children,
  navigationItems,
  user,
  organizations,
  currentOrganization,
  onNavigate,
  onSwitchOrganization,
  onOpenProfile,
  onLogout,
}: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-neutral-200 dark:lg:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-center h-16 px-4 border-b border-neutral-200 dark:border-neutral-800">
            <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
              Workumi
            </h1>
          </div>
          <MainNav items={navigationItems} onNavigate={onNavigate} />
        </div>
        {user && (
          <UserMenu
            user={user}
            organizations={organizations}
            currentOrganization={currentOrganization}
            onSwitchOrganization={onSwitchOrganization}
            onOpenProfile={onOpenProfile}
            onLogout={onLogout}
          />
        )}
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-neutral-950 z-50 flex flex-col lg:hidden">
            <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-200 dark:border-neutral-800">
              <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
                Workumi
              </h1>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MainNav items={navigationItems} onNavigate={onNavigate} />
            </div>
            {user && (
              <UserMenu
                user={user}
                organizations={organizations}
                currentOrganization={currentOrganization}
                onSwitchOrganization={onSwitchOrganization}
                onOpenProfile={onOpenProfile}
                onLogout={onLogout}
              />
            )}
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center h-16 px-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="ml-4 text-xl font-bold text-primary-600 dark:text-primary-400">
            Workumi
          </h1>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
```

### MainNav.tsx

```tsx
import React from 'react'
import { Link } from '@inertiajs/react'
import { NavigationItem } from '@/types/workumi'

interface MainNavProps {
  items: NavigationItem[]
  onNavigate: (href: string) => void
}

export default function MainNav({ items, onNavigate }: MainNavProps) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
              transition-colors
              ${
                item.isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }
            `}
          >
            {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-600 text-white">
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
```

### UserMenu.tsx

```tsx
import React, { useState, useRef, useEffect } from 'react'
import { User, Organization } from '@/types/workumi'
import { ChevronDown, Check, User, LogOut } from 'lucide-react'

interface UserMenuProps {
  user: User
  organizations: Organization[]
  currentOrganization: Organization | null
  onSwitchOrganization: (orgId: string) => void
  onOpenProfile: () => void
  onLogout: () => void
}

export default function UserMenu({
  user,
  organizations,
  currentOrganization,
  onSwitchOrganization,
  onOpenProfile,
  onLogout,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={menuRef} className="relative p-3 border-t border-neutral-200 dark:border-neutral-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-semibold">
          {user.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {user.displayName}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {currentOrganization?.name || 'No organization'}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          {/* Organizations */}
          {organizations.length > 1 && (
            <div className="p-2 border-b border-neutral-200 dark:border-neutral-700">
              <div className="px-2 py-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                Organizations
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    onSwitchOrganization(org.id)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  <span className="flex-1 text-left">{org.name}</span>
                  {org.isCurrent && <Check className="w-4 h-4 text-primary-600" />}
                </button>
              ))}
            </div>
          )}

          {/* User Actions */}
          <div className="p-2">
            <button
              onClick={() => {
                onOpenProfile()
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => {
                onLogout()
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 text-red-600 dark:text-red-400"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

### index.ts

```typescript
export { default as AppShell } from './AppShell'
export { default as MainNav } from './MainNav'
export { default as UserMenu } from './UserMenu'
```

## Step 7: Create Application Layout

Create **resources/js/Layouts/AppLayout.tsx**:

```tsx
import React, { PropsWithChildren } from 'react'
import { usePage, router } from '@inertiajs/react'
import { PageProps } from '@/types'
import { NavigationItem } from '@/types/workumi'
import { AppShell } from '@/Components/Shell'
import { Home, Briefcase, Inbox, BookOpen, Users, BarChart3, Settings } from 'lucide-react'

export default function AppLayout({ children }: PropsWithChildren) {
  const { auth, currentOrganization, organizations } = usePage<PageProps>().props
  const currentPath = window.location.pathname

  const navigationItems: NavigationItem[] = [
    {
      label: 'Today',
      href: route('today'),
      icon: Home,
      isActive: currentPath === route('today'),
    },
    {
      label: 'Work',
      href: route('work'),
      icon: Briefcase,
      isActive: currentPath.startsWith('/work'),
    },
    {
      label: 'Inbox',
      href: route('inbox'),
      icon: Inbox,
      isActive: currentPath === route('inbox'),
      badge: 0, // Will be dynamic later
    },
    {
      label: 'Playbooks',
      href: route('playbooks'),
      icon: BookOpen,
      isActive: currentPath.startsWith('/playbooks'),
    },
    {
      label: 'Directory',
      href: route('directory'),
      icon: Users,
      isActive: currentPath.startsWith('/directory'),
    },
    {
      label: 'Reports',
      href: route('reports'),
      icon: BarChart3,
      isActive: currentPath.startsWith('/reports'),
    },
    {
      label: 'Settings',
      href: route('settings'),
      icon: Settings,
      isActive: currentPath.startsWith('/settings'),
    },
  ]

  return (
    <AppShell
      navigationItems={navigationItems}
      user={auth.user}
      organizations={organizations || []}
      currentOrganization={currentOrganization}
      onNavigate={(href) => router.visit(href)}
      onSwitchOrganization={(orgId) => {
        // TODO: Implement organization switching
        console.log('Switch to org:', orgId)
      }}
      onOpenProfile={() => router.visit(route('profile.edit'))}
      onLogout={() => router.post(route('logout'))}
    >
      {children}
    </AppShell>
  )
}
```

## Step 8: Add Application Routes

Update **routes/web.php** to add your application routes (keep existing auth routes):

```php
<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Existing starter kit routes...
Route::get('/', function () {
    return redirect()->route('today');
});

Route::middleware('auth')->group(function () {
    // Existing profile routes from starter kit
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Workumi application routes
    Route::get('/today', fn() => Inertia::render('Today/Index'))->name('today');
    Route::get('/work', fn() => Inertia::render('Work/Index'))->name('work');
    Route::get('/inbox', fn() => Inertia::render('Inbox/Index'))->name('inbox');
    Route::get('/playbooks', fn() => Inertia::render('Playbooks/Index'))->name('playbooks');
    Route::get('/directory', fn() => Inertia::render('Directory/Index'))->name('directory');
    Route::get('/reports', fn() => Inertia::render('Reports/Index'))->name('reports');
    Route::get('/settings', fn() => Inertia::render('Settings/Index'))->name('settings');
});

// Keep existing auth routes from starter kit
require __DIR__.'/auth.php';
```

## Step 9: Create Page Components

Create these page files in **resources/js/Pages/**:

### Today/Index.tsx

```tsx
import React from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { PageProps } from '@/types'
import { Head } from '@inertiajs/react'

export default function TodayIndex({ auth }: PageProps) {
  return (
    <>
      <Head title="Today" />
      <div className="p-8">
        <h1 className="text-4xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Today
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Daily command center - coming in Milestone 3
        </p>
        <div className="mt-6 p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Welcome, <span className="font-semibold">{auth.user.displayName}</span>!
          </p>
        </div>
      </div>
    </>
  )
}

TodayIndex.layout = (page: React.ReactElement) => <AppLayout>{page}</AppLayout>
```

Create similar files for:
- **Work/Index.tsx**
- **Inbox/Index.tsx**
- **Playbooks/Index.tsx**
- **Directory/Index.tsx**
- **Reports/Index.tsx**
- **Settings/Index.tsx**

Each should follow the same pattern with different section names.

## Step 10: Update Progress Component (Optional)

If you want to customize the Inertia progress bar color, update **resources/js/app.tsx**:

```tsx
createInertiaApp({
    // ... existing config
    progress: {
        color: '#7c3aed', // Primary-600 purple
    },
})
```

## Testing Checklist

Run your dev servers:

```bash
# Terminal 1
php artisan serve

# Terminal 2
npm run dev
```

### Verify Everything Works

- [ ] Navigate to http://localhost:8000
- [ ] Log in with starter kit auth
- [ ] You're redirected to /today
- [ ] Sidebar appears with purple branding
- [ ] All 7 navigation items are visible
- [ ] Clicking navigation changes pages
- [ ] Active route is highlighted in purple
- [ ] User menu dropdown works
- [ ] Profile link goes to existing profile page
- [ ] Logout works (uses starter kit logout)
- [ ] Mobile hamburger menu works (<1024px)
- [ ] Dark mode works with purple/teal colors
- [ ] Fonts load correctly (Inter, IBM Plex Mono)

### Check TypeScript

```bash
npx tsc --noEmit
```

## Project Structure After Changes

```
resources/
├── css/
│   └── app.css (updated with design tokens)
├── js/
│   ├── Components/
│   │   ├── Shell/ (new)
│   │   │   ├── AppShell.tsx
│   │   │   ├── MainNav.tsx
│   │   │   ├── UserMenu.tsx
│   │   │   └── index.ts
│   │   └── ... (existing from starter kit)
│   ├── Layouts/
│   │   ├── AppLayout.tsx (new)
│   │   ├── AuthenticatedLayout.tsx (from starter kit)
│   │   └── GuestLayout.tsx (from starter kit)
│   ├── Pages/
│   │   ├── Today/Index.tsx (new)
│   │   ├── Work/Index.tsx (new)
│   │   ├── Inbox/Index.tsx (new)
│   │   ├── Playbooks/Index.tsx (new)
│   │   ├── Directory/Index.tsx (new)
│   │   ├── Reports/Index.tsx (new)
│   │   ├── Settings/Index.tsx (new)
│   │   ├── Auth/ (existing from starter kit)
│   │   ├── Profile/ (existing from starter kit)
│   │   └── ... (other existing pages)
│   ├── types/
│   │   ├── workumi.ts (new)
│   │   ├── index.d.ts (updated)
│   │   └── global.d.ts (from starter kit)
│   └── app.tsx (updated progress color)
```

## What's Different from Starter Kit

1. **New AppLayout** - Your app uses `AppLayout` with sidebar, starter kit auth pages still use their `AuthenticatedLayout`/`GuestLayout`
2. **Design tokens** - Purple/teal color scheme added to Tailwind
3. **New types** - Workumi-specific types for organizations, navigation, etc.
4. **7 new routes** - Your application sections
5. **User preferences** - Added timezone/language to users table

## Next Steps

You now have a solid foundation. Next milestones will build on this:

1. **Milestone 2**: Multi-organization support (database structure)
2. **Milestone 3**: Today section implementation
3. **Milestone 4**: Work management (projects, work orders, tasks)
4. **Milestone 5**: Inbox & approvals
5. **Milestone 6**: Playbooks & SOPs

## Troubleshooting

### Route Helper Not Found

If `route('today')` doesn't work, ensure you have ziggy installed (usually included in starter kit):

```bash
composer require tightenco/ziggy
```

### Navigation Not Highlighting

Check that `route('section-name')` matches your route names exactly in web.php.

### User Menu Not Showing Organizations

Organizations list is mocked in `HandleInertiaRequests` - this will be replaced with real data in Milestone 2.

### Tailwind Classes Not Working

- Verify `tailwind.config.ts` includes correct content paths
- Check that `@tailwind` directives are in your CSS
- Restart dev server after config changes

### Fonts Not Loading

- Check network tab for font requests
- Verify Google Fonts import in CSS
- Try adding font-display: swap

### Dark Mode Not Working

- Check system preferences are set to dark mode
- Verify all components use `dark:` variants
- Add `class="dark"` to html element to force dark mode

### Navigation Not Highlighting

- Verify pathname/location detection logic
- Check `isActive` prop is set correctly
- Ensure route paths match exactly

## Additional Resources

- Review `shell/README.md` for complete shell documentation
- Check `design-system/` for color and typography guides
- Reference `data-model/types.ts` for all type definitions

---

**Ready to proceed?** The foundation is set. Start building features in the next milestones!
