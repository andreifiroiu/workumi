import { useState } from 'react'
import { Sun, Moon, Monitor, Maximize2, Minimize2, Sidebar, Home } from 'lucide-react'
import type { AppearanceSettings } from '@/../product/sections/usermenu/types'

interface AppearanceTabProps {
  appearanceSettings: AppearanceSettings
  onUpdateAppearance?: (settings: Partial<AppearanceSettings>) => void
}

export function AppearanceTab({
  appearanceSettings,
  onUpdateAppearance,
}: AppearanceTabProps) {
  const [settings, setSettings] = useState(appearanceSettings)

  const updateSetting = <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    onUpdateAppearance?.({ [key]: value })
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1">
          Appearance
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Customize how the interface looks and feels
        </p>
      </div>

      <div className="space-y-8">
        {/* Theme Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">
            Theme
          </label>
          <div className="grid sm:grid-cols-3 gap-4">
            <button
              onClick={() => updateSetting('theme', 'light')}
              className={`
                relative p-6 rounded-xl border-2 transition-all
                ${
                  settings.theme === 'light'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }
              `}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <Sun className="w-6 h-6 text-slate-700" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-slate-900 dark:text-slate-50">Light</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Bright and clean
                  </div>
                </div>
              </div>
              {settings.theme === 'light' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>

            <button
              onClick={() => updateSetting('theme', 'dark')}
              className={`
                relative p-6 rounded-xl border-2 transition-all
                ${
                  settings.theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }
              `}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <Moon className="w-6 h-6 text-slate-300" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-slate-900 dark:text-slate-50">Dark</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Easy on the eyes
                  </div>
                </div>
              </div>
              {settings.theme === 'dark' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>

            <button
              onClick={() => updateSetting('theme', 'system')}
              className={`
                relative p-6 rounded-xl border-2 transition-all
                ${
                  settings.theme === 'system'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }
              `}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600 flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-slate-900 dark:text-slate-50">System</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Match your OS
                  </div>
                </div>
              </div>
              {settings.theme === 'system' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Density */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">
            Density
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => updateSetting('density', 'comfortable')}
              className={`
                relative p-6 rounded-xl border-2 transition-all text-left
                ${
                  settings.density === 'comfortable'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Maximize2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-50 mb-1">
                    Comfortable
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Generous spacing and larger touch targets
                  </div>
                </div>
              </div>
              {settings.density === 'comfortable' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>

            <button
              onClick={() => updateSetting('density', 'compact')}
              className={`
                relative p-6 rounded-xl border-2 transition-all text-left
                ${
                  settings.density === 'compact'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Minimize2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-50 mb-1">
                    Compact
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Tighter spacing for more content on screen
                  </div>
                </div>
              </div>
              {settings.density === 'compact' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar Default */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">
            Sidebar
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => updateSetting('sidebarDefault', 'expanded')}
              className={`
                relative p-6 rounded-xl border-2 transition-all text-left
                ${
                  settings.sidebarDefault === 'expanded'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Sidebar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-50 mb-1">
                    Expanded
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Show navigation labels by default
                  </div>
                </div>
              </div>
              {settings.sidebarDefault === 'expanded' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>

            <button
              onClick={() => updateSetting('sidebarDefault', 'collapsed')}
              className={`
                relative p-6 rounded-xl border-2 transition-all text-left
                ${
                  settings.sidebarDefault === 'collapsed'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Sidebar className="w-5 h-5 text-slate-600 dark:text-slate-400 rotate-180" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-50 mb-1">
                    Collapsed
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Show icons only for more space
                  </div>
                </div>
              </div>
              {settings.sidebarDefault === 'collapsed' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Start Page */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">
            Start Page
          </label>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { value: 'today', label: 'Today', description: 'Your daily priorities' },
              { value: 'work', label: 'Work', description: 'Projects and tasks' },
              { value: 'inbox', label: 'Inbox', description: 'Items needing review' },
            ].map((page) => (
              <button
                key={page.value}
                onClick={() => updateSetting('startPage', page.value as 'today' | 'work' | 'inbox')}
                className={`
                  relative p-6 rounded-xl border-2 transition-all text-left
                  ${
                    settings.startPage === page.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }
                `}
              >
                <div className="flex flex-col items-start gap-2">
                  <Home className="w-8 h-8 text-slate-600 dark:text-slate-400" />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-50">
                      {page.label}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {page.description}
                    </div>
                  </div>
                </div>
                {settings.startPage === page.value && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
