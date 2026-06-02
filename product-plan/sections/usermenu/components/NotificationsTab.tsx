import { useState } from 'react'
import { Mail, Smartphone, Monitor, Moon } from 'lucide-react'
import type { NotificationPreferences } from '@/../product/sections/usermenu/types'

interface NotificationsTabProps {
  notificationPreferences: NotificationPreferences
  onUpdateNotifications?: (preferences: Partial<NotificationPreferences>) => void
}

type NotificationType = keyof Omit<NotificationPreferences, 'quietHours'>

export function NotificationsTab({
  notificationPreferences,
  onUpdateNotifications,
}: NotificationsTabProps) {
  const [preferences, setPreferences] = useState(notificationPreferences)

  const notificationTypes: { key: NotificationType; label: string; description: string }[] = [
    {
      key: 'assignedToMe',
      label: 'Assigned to me',
      description: 'When a task or work order is assigned to you',
    },
    {
      key: 'mentioned',
      label: 'Mentions',
      description: 'When someone mentions you in a comment or thread',
    },
    {
      key: 'approvalRequested',
      label: 'Approval requests',
      description: 'When an agent requests your approval',
    },
    {
      key: 'taskDueSoon',
      label: 'Task due soon',
      description: 'Reminders for upcoming task deadlines',
    },
    {
      key: 'projectUpdates',
      label: 'Project updates',
      description: 'Status changes and milestone completions',
    },
    {
      key: 'agentCompletedWork',
      label: 'Agent completed work',
      description: 'When an AI agent finishes a task',
    },
    {
      key: 'weeklyDigest',
      label: 'Weekly digest',
      description: 'Summary of activity and upcoming items',
    },
  ]

  const toggleChannel = (type: NotificationType, channel: 'email' | 'push' | 'inApp') => {
    const updated = {
      ...preferences,
      [type]: {
        ...preferences[type],
        [channel]: !preferences[type][channel],
      },
    }
    setPreferences(updated)
    onUpdateNotifications?.(updated)
  }

  const toggleQuietHours = () => {
    const updated = {
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        enabled: !preferences.quietHours.enabled,
      },
    }
    setPreferences(updated)
    onUpdateNotifications?.(updated)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1">
          Notifications
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Control how you receive alerts across all your organizations
        </p>
      </div>

      <div className="space-y-8">
        {/* Notification Matrix */}
        <div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Notification Type
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Mail className="w-4 h-4 inline mr-1" />
                    <span className="hidden sm:inline">Email</span>
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Smartphone className="w-4 h-4 inline mr-1" />
                    <span className="hidden sm:inline">Push</span>
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Monitor className="w-4 h-4 inline mr-1" />
                    <span className="hidden sm:inline">In-App</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {notificationTypes.map((type) => (
                  <tr
                    key={type.key}
                    className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-50">
                        {type.label}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {type.description}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <button
                        onClick={() => toggleChannel(type.key, 'email')}
                        className={`
                          w-10 h-6 rounded-full transition-colors relative
                          ${
                            preferences[type.key].email
                              ? 'bg-indigo-600 dark:bg-indigo-500'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }
                        `}
                      >
                        <span
                          className={`
                            absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform
                            ${preferences[type.key].email ? 'translate-x-4' : 'translate-x-0'}
                          `}
                        />
                      </button>
                    </td>
                    <td className="text-center py-4 px-4">
                      <button
                        onClick={() => toggleChannel(type.key, 'push')}
                        className={`
                          w-10 h-6 rounded-full transition-colors relative
                          ${
                            preferences[type.key].push
                              ? 'bg-indigo-600 dark:bg-indigo-500'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }
                        `}
                      >
                        <span
                          className={`
                            absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform
                            ${preferences[type.key].push ? 'translate-x-4' : 'translate-x-0'}
                          `}
                        />
                      </button>
                    </td>
                    <td className="text-center py-4 px-4">
                      <button
                        onClick={() => toggleChannel(type.key, 'inApp')}
                        className={`
                          w-10 h-6 rounded-full transition-colors relative
                          ${
                            preferences[type.key].inApp
                              ? 'bg-indigo-600 dark:bg-indigo-500'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }
                        `}
                      >
                        <span
                          className={`
                            absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform
                            ${preferences[type.key].inApp ? 'translate-x-4' : 'translate-x-0'}
                          `}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-50">
                  Quiet Hours
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Pause non-urgent notifications during specific times
              </p>
            </div>
            <button
              onClick={toggleQuietHours}
              className={`
                w-12 h-7 rounded-full transition-colors relative flex-shrink-0
                ${
                  preferences.quietHours.enabled
                    ? 'bg-indigo-600 dark:bg-indigo-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                }
              `}
            >
              <span
                className={`
                  absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform
                  ${preferences.quietHours.enabled ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          {preferences.quietHours.enabled && (
            <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={preferences.quietHours.startTime}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={preferences.quietHours.endTime}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
