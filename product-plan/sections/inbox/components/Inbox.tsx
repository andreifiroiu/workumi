import { useState } from 'react'
import { Search, CheckSquare, Archive, Clock, Inbox as InboxIcon } from 'lucide-react'
import type { InboxProps, InboxTab, InboxItem } from '@/../product/sections/inbox/types'
import { InboxTabs } from './InboxTabs'
import { InboxListItem } from './InboxListItem'
import { InboxSidePanel } from './InboxSidePanel'

// Design tokens: Primary (indigo), Secondary (emerald), Neutral (slate)
// Typography: Inter for headings and body, IBM Plex Mono for code

export function Inbox({
  inboxItems,
  currentTab = 'all',
  selectedItemIds = [],
  onTabChange,
  onViewItem,
  onApprove,
  onReject,
  onEdit,
  onDefer,
  onSelectItems,
  onBulkAction,
  onSearch,
  onCloseSidePanel,
}: InboxProps) {
  const [tab, setTab] = useState<InboxTab>(currentTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedItemIds)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  // Filter items by tab
  const filterByTab = (items: InboxItem[]) => {
    if (tab === 'all') return items
    if (tab === 'agent_drafts') return items.filter(item => item.type === 'agent_draft')
    if (tab === 'approvals') return items.filter(item => item.type === 'approval')
    if (tab === 'flagged') return items.filter(item => item.type === 'flag')
    if (tab === 'mentions') return items.filter(item => item.type === 'mention')
    return items
  }

  // Apply search filter
  const filteredItems = filterByTab(inboxItems).filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.title.toLowerCase().includes(query) ||
      item.contentPreview.toLowerCase().includes(query) ||
      item.sourceName.toLowerCase().includes(query) ||
      item.relatedWorkOrderTitle?.toLowerCase().includes(query) ||
      item.relatedProjectName?.toLowerCase().includes(query)
    )
  })

  // Sort by urgency and date
  const sortedItems = filteredItems.sort((a, b) => {
    const urgencyOrder = { urgent: 0, high: 1, normal: 2 }
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // Calculate counts for tabs
  const counts = {
    all: inboxItems.length,
    agent_drafts: inboxItems.filter(i => i.type === 'agent_draft').length,
    approvals: inboxItems.filter(i => i.type === 'approval').length,
    flagged: inboxItems.filter(i => i.type === 'flag').length,
    mentions: inboxItems.filter(i => i.type === 'mention').length,
  }

  // Handle tab change
  const handleTabChange = (newTab: InboxTab) => {
    setTab(newTab)
    setSelectedIds([])
    onTabChange?.(newTab)
  }

  // Handle item selection
  const toggleSelection = (itemId: string) => {
    const newSelection = selectedIds.includes(itemId)
      ? selectedIds.filter(id => id !== itemId)
      : [...selectedIds, itemId]
    setSelectedIds(newSelection)
    onSelectItems?.(newSelection)
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.length === sortedItems.length) {
      setSelectedIds([])
      onSelectItems?.([])
    } else {
      const allIds = sortedItems.map(item => item.id)
      setSelectedIds(allIds)
      onSelectItems?.(allIds)
    }
  }

  // Handle view item
  const handleViewItem = (itemId: string) => {
    setSelectedItemId(itemId)
    onViewItem?.(itemId)
  }

  // Handle close side panel
  const handleCloseSidePanel = () => {
    setSelectedItemId(null)
    onCloseSidePanel?.()
  }

  // Get selected item
  const selectedItem = selectedItemId
    ? inboxItems.find(item => item.id === selectedItemId) || null
    : null

  // Bulk actions
  const handleBulkApprove = () => {
    onBulkAction?.({ itemIds: selectedIds, action: 'approve' })
    setSelectedIds([])
  }

  const handleBulkDefer = () => {
    onBulkAction?.({ itemIds: selectedIds, action: 'defer' })
    setSelectedIds([])
  }

  const handleBulkArchive = () => {
    onBulkAction?.({ itemIds: selectedIds, action: 'archive' })
    setSelectedIds([])
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Inbox</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Review agent drafts, approvals, flagged items, and mentions
          </p>
        </div>

        {/* Tabs */}
        <InboxTabs currentTab={tab} counts={counts} onTabChange={handleTabChange} />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Search and Bulk Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                onSearch?.(e.target.value)
              }}
              placeholder="Search inbox items..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {selectedIds.length} selected
              </span>
              <button
                onClick={handleBulkApprove}
                className="px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors flex items-center gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                Approve All
              </button>
              <button
                onClick={handleBulkDefer}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Defer
              </button>
              <button
                onClick={handleBulkArchive}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
            </div>
          )}
        </div>

        {/* List */}
        {sortedItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <InboxIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {searchQuery ? 'No items found' : 'Inbox is empty'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'All caught up! No items need your attention right now.'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {/* Select All Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.length === sortedItems.length && sortedItems.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                />
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  Select all ({sortedItems.length} items)
                </span>
              </label>
            </div>

            {/* Items */}
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {sortedItems.map((item) => (
                <InboxListItem
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.includes(item.id)}
                  onSelect={() => toggleSelection(item.id)}
                  onView={() => handleViewItem(item.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Side Panel */}
      {selectedItem && (
        <InboxSidePanel
          item={selectedItem}
          onClose={handleCloseSidePanel}
          onApprove={() => {
            onApprove?.(selectedItem.id)
            handleCloseSidePanel()
          }}
          onReject={() => {
            onReject?.({ itemId: selectedItem.id, feedback: '' })
            handleCloseSidePanel()
          }}
          onEdit={() => {
            onEdit?.(selectedItem.id)
          }}
          onDefer={() => {
            onDefer?.(selectedItem.id)
            handleCloseSidePanel()
          }}
        />
      )}
    </div>
  )
}
