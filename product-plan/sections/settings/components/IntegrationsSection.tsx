import type { Integration } from '@/../product/sections/settings/types'

interface IntegrationsSectionProps {
  integrations: Integration[]
  onConnect?: (integrationId: string) => void
  onDisconnect?: (integrationId: string) => void
  onConfigure?: (integrationId: string, settings: Record<string, unknown>) => void
}

export function IntegrationsSection({
  integrations,
  onConnect,
  onDisconnect,
}: IntegrationsSectionProps) {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
          Integrations
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Connect third-party services to your workspace
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-2xl">
                  {integration.name[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50">
                    {integration.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {integration.type}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  integration.status === 'connected'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {integration.status}
              </span>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {integration.description}
            </p>

            {integration.status === 'connected' ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Last synced: {integration.lastSyncAt && new Date(integration.lastSyncAt).toLocaleString()}
                </p>
                <button
                  onClick={() => onDisconnect?.(integration.id)}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-50 text-sm font-medium rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => onConnect?.(integration.id)}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Connect
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
