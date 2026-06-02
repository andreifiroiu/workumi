import { useState } from 'react'
import { Search, Plus, BookOpen, SlidersHorizontal } from 'lucide-react'
import type { PlaybooksProps, PlaybookTab, PlaybookType } from '@/../product/sections/playbooks/types'
import { PlaybookTabs } from './PlaybookTabs'
import { PlaybookCard } from './PlaybookCard'

// Design tokens: Primary (indigo), Secondary (emerald), Neutral (slate)
// Typography: Inter for headings and body, IBM Plex Mono for code

export function Playbooks({
  playbooks,
  currentTab = 'all',
  onTabChange,
  onViewPlaybook,
  onCreatePlaybook,
  onSearch,
}: PlaybooksProps) {
  const [tab, setTab] = useState<PlaybookTab>(currentTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'alphabetical'>('popular')

  // Filter playbooks by tab
  const filterByTab = (items: typeof playbooks) => {
    if (tab === 'all') return items
    return items.filter(p => p.type === tab)
  }

  // Get all unique tags
  const allTags = Array.from(new Set(playbooks.flatMap(p => p.tags))).sort()

  // Apply search and tag filters
  const filteredPlaybooks = filterByTab(playbooks).filter(playbook => {
    const matchesSearch =
      !searchQuery ||
      playbook.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      playbook.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      playbook.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every(tag => playbook.tags.includes(tag))

    return matchesSearch && matchesTags
  })

  // Sort playbooks
  const sortedPlaybooks = [...filteredPlaybooks].sort((a, b) => {
    if (sortBy === 'popular') {
      return b.timesApplied - a.timesApplied
    }
    if (sortBy === 'recent') {
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    }
    if (sortBy === 'alphabetical') {
      return a.name.localeCompare(b.name)
    }
    return 0
  })

  // Calculate counts for tabs
  const counts = {
    all: playbooks.length,
    sop: playbooks.filter(p => p.type === 'sop').length,
    checklist: playbooks.filter(p => p.type === 'checklist').length,
    template: playbooks.filter(p => p.type === 'template').length,
    acceptance_criteria: playbooks.filter(p => p.type === 'acceptance_criteria').length,
  }

  // Handle tab change
  const handleTabChange = (newTab: PlaybookTab) => {
    setTab(newTab)
    onTabChange?.(newTab)
  }

  // Handle tag toggle
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // Handle create with type selection
  const handleCreate = (type: PlaybookType) => {
    onCreatePlaybook?.(type)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-6 py-8">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Playbooks</h1>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
                Reusable SOPs, checklists, templates, and acceptance criteria that define "how we do things"
              </p>
            </div>
            <button
              onClick={() => handleCreate(tab === 'all' ? 'sop' : (tab as PlaybookType))}
              className="px-5 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 dark:shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Create Playbook
            </button>
          </div>
        </div>

        {/* Tabs */}
        <PlaybookTabs currentTab={tab} counts={counts} onTabChange={handleTabChange} />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                onSearch?.(e.target.value)
              }}
              placeholder="Search playbooks by name, description, or tags..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-3 sm:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent cursor-pointer transition-all"
            >
              <option value="popular">Most Popular</option>
              <option value="recent">Recently Updated</option>
              <option value="alphabetical">A-Z</option>
            </select>
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Filter by tags:</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedTags.includes(tag)
                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                #{tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Results Count */}
        <div className="mb-5 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-white">{sortedPlaybooks.length}</span>
          <span>of</span>
          <span className="font-semibold text-slate-900 dark:text-white">{counts.all}</span>
          <span>playbooks</span>
          {selectedTags.length > 0 && (
            <>
              <span>•</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} applied
              </span>
            </>
          )}
        </div>

        {/* Playbook Grid */}
        {sortedPlaybooks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center mx-auto mb-5 border border-slate-200 dark:border-slate-800">
              <BookOpen className="w-10 h-10 text-slate-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {searchQuery || selectedTags.length > 0 ? 'No playbooks found' : `No ${tab === 'all' ? 'playbooks' : tab.replace('_', ' ')} yet`}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
              {searchQuery || selectedTags.length > 0
                ? 'Try adjusting your search or filters to find what you\'re looking for'
                : `Create your first ${tab === 'all' ? 'playbook' : tab.replace('_', ' ')} to establish best practices and guide your team`}
            </p>
            {!searchQuery && selectedTags.length === 0 && (
              <button
                onClick={() => handleCreate(tab === 'all' ? 'sop' : (tab as PlaybookType))}
                className="px-5 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-600/20 dark:shadow-indigo-500/20"
              >
                Create First Playbook
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedPlaybooks.map((playbook) => (
              <PlaybookCard
                key={playbook.id}
                playbook={playbook}
                onView={() => onViewPlaybook?.(playbook.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
