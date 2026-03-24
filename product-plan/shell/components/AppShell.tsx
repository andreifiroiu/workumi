import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { MainNav } from './MainNav'
import { UserMenu } from './UserMenu'

export interface NavigationItem {
  label: string
  href: string
  isActive?: boolean
}

export interface User {
  name: string
  email?: string
  avatarUrl?: string
}

export interface Organization {
  id: string
  name: string
  plan?: string
  role?: string
  avatarUrl?: string
  lastActive?: string
  memberCount?: number
}

export interface AppShellProps {
  children: React.ReactNode
  navigationItems: NavigationItem[]
  user?: User
  organizations?: Organization[]
  currentOrganization?: Organization
  onNavigate?: (href: string) => void
  onSwitchOrganization?: (organizationId: string) => void
  onOpenProfile?: () => void
  onCreateOrganization?: () => void
  onOpenHelp?: () => void
  onOpenFeedback?: () => void
  onOpenTerms?: () => void
  onOpenOrgInNewTab?: (organizationId: string) => void
  onOpenOrgSettings?: (organizationId: string) => void
  onCopyOrgLink?: (organizationId: string) => void
  onLogout?: () => void
}

export function AppShell({
  children,
  navigationItems,
  user,
  organizations,
  currentOrganization,
  onNavigate,
  onSwitchOrganization,
  onOpenProfile,
  onCreateOrganization,
  onOpenHelp,
  onOpenFeedback,
  onOpenTerms,
  onOpenOrgInNewTab,
  onOpenOrgSettings,
  onCopyOrgLink,
  onLogout,
}: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-full lg:w-72
          bg-slate-50 dark:bg-slate-900
          border-r border-slate-200 dark:border-slate-800
          transform transition-transform duration-200 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Logo area */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
            Workumi
          </span>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <MainNav items={navigationItems} onNavigate={onNavigate} />
        </div>

        {/* User menu */}
        {user && (
          <div className="border-t border-slate-200 dark:border-slate-800">
            <UserMenu
              user={user}
              organizations={organizations}
              currentOrganization={currentOrganization}
              onSwitchOrganization={onSwitchOrganization}
              onOpenProfile={onOpenProfile}
              onCreateOrganization={onCreateOrganization}
              onOpenHelp={onOpenHelp}
              onOpenFeedback={onOpenFeedback}
              onOpenTerms={onOpenTerms}
              onOpenOrgInNewTab={onOpenOrgInNewTab}
              onOpenOrgSettings={onOpenOrgSettings}
              onCopyOrgLink={onCopyOrgLink}
              onLogout={onLogout}
            />
          </div>
        )}
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
