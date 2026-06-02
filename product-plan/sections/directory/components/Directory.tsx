import { useState } from 'react'
import type {
  DirectoryProps,
  DirectoryTab,
  Party,
  Contact,
  TeamMember,
} from '@/../product/sections/directory/types'

export function Directory({
  parties,
  contacts,
  teamMembers,
  currentTab = 'parties',
  onTabChange,
  onViewParty,
  onViewContact,
  onViewTeamMember,
  onCreateParty,
  onCreateContact,
  onCreateTeamMember,
  onEditParty,
  onEditContact,
  onEditTeamMember,
  onDeleteParty,
  onDeleteContact,
  onDeleteTeamMember,
  onSearch,
}: DirectoryProps) {
  const [activeTab, setActiveTab] = useState<DirectoryTab>(currentTab)
  const [searchQuery, setSearchQuery] = useState('')

  const handleTabChange = (tab: DirectoryTab) => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  // Filter data based on search query
  const filteredParties = parties.filter(
    (party) =>
      party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.notes.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.partyName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredTeamMembers = teamMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                Directory
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Manage all people and entities involved in your work
              </p>
            </div>
            <button
              onClick={() => {
                if (activeTab === 'parties') onCreateParty?.()
                if (activeTab === 'contacts') onCreateContact?.()
                if (activeTab === 'team') onCreateTeamMember?.()
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add {activeTab === 'parties' ? 'Party' : activeTab === 'contacts' ? 'Contact' : 'Team Member'}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 -mb-px">
            <button
              onClick={() => handleTabChange('parties')}
              className={`px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'parties'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              Parties ({parties.length})
            </button>
            <button
              onClick={() => handleTabChange('contacts')}
              className={`px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'contacts'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              Contacts ({contacts.length})
            </button>
            <button
              onClick={() => handleTabChange('team')}
              className={`px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'team'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              Team ({teamMembers.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'parties' && (
          <PartiesList
            parties={filteredParties}
            onViewParty={onViewParty}
            onEditParty={onEditParty}
            onDeleteParty={onDeleteParty}
          />
        )}
        {activeTab === 'contacts' && (
          <ContactsList
            contacts={filteredContacts}
            onViewContact={onViewContact}
            onEditContact={onEditContact}
            onDeleteContact={onDeleteContact}
          />
        )}
        {activeTab === 'team' && (
          <TeamList
            teamMembers={filteredTeamMembers}
            onViewTeamMember={onViewTeamMember}
            onEditTeamMember={onEditTeamMember}
            onDeleteTeamMember={onDeleteTeamMember}
          />
        )}
      </div>
    </div>
  )
}

// Parties List Component
function PartiesList({
  parties,
  onViewParty,
}: {
  parties: Party[]
  onViewParty?: (id: string) => void
  onEditParty?: (id: string) => void
  onDeleteParty?: (id: string) => void
}) {
  if (parties.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">No parties found</p>
      </div>
    )
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      client: 'Client',
      vendor: 'Vendor',
      partner: 'Partner',
      'internal-department': 'Internal',
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      client: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      vendor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      partner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'internal-department':
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    }
    return colors[type] || colors['internal-department']
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {parties.map((party) => (
        <div
          key={party.id}
          onClick={() => onViewParty?.(party.id)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-1 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {party.name}
              </h3>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(party.type)}`}
                >
                  {getTypeLabel(party.type)}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    party.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {party.status}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center text-slate-600 dark:text-slate-400">
              <svg
                className="w-4 h-4 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="truncate">{party.primaryContactName}</span>
            </div>
            <div className="flex items-center text-slate-600 dark:text-slate-400">
              <svg
                className="w-4 h-4 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span className="truncate">{party.email}</span>
            </div>
            {party.phone && (
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <svg
                  className="w-4 h-4 mr-2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="truncate">{party.phone}</span>
              </div>
            )}
          </div>

          {party.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {party.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                >
                  {tag}
                </span>
              ))}
              {party.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  +{party.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Contacts List Component
function ContactsList({
  contacts,
  onViewContact,
}: {
  contacts: Contact[]
  onViewContact?: (id: string) => void
  onEditContact?: (id: string) => void
  onDeleteContact?: (id: string) => void
}) {
  if (contacts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">No contacts found</p>
      </div>
    )
  }

  const getEngagementColor = (type: string) => {
    const colors: Record<string, string> = {
      requester: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      approver: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      stakeholder:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      billing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    }
    return colors[type] || colors.requester
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Party
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Engagement
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                onClick={() => onViewContact?.(contact.id)}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {contact.name}
                  </div>
                  {contact.title && (
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {contact.title}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {contact.partyName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {contact.role}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEngagementColor(contact.engagementType)}`}
                  >
                    {contact.engagementType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {contact.email}
                  </div>
                  {contact.phone && (
                    <div className="text-sm text-slate-500 dark:text-slate-500">
                      {contact.phone}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      contact.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {contact.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Team List Component
function TeamList({
  teamMembers,
  onViewTeamMember,
}: {
  teamMembers: TeamMember[]
  onViewTeamMember?: (id: string) => void
  onEditTeamMember?: (id: string) => void
  onDeleteTeamMember?: (id: string) => void
}) {
  if (teamMembers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">No team members found</p>
      </div>
    )
  }

  const getProficiencyLabel = (level: number) => {
    const labels: Record<number, string> = {
      1: 'Basic',
      2: 'Intermediate',
      3: 'Advanced',
    }
    return labels[level] || 'Unknown'
  }

  const getCapacityColor = (current: number, total: number) => {
    const percentage = (current / total) * 100
    if (percentage >= 90) return 'text-red-600 dark:text-red-400'
    if (percentage >= 75) return 'text-amber-600 dark:text-amber-400'
    return 'text-emerald-600 dark:text-emerald-400'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {teamMembers.map((member) => (
        <div
          key={member.id}
          onClick={() => onViewTeamMember?.(member.id)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer"
        >
          <div className="flex items-start gap-4 mb-4">
            <img
              src={member.avatar}
              alt={member.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-1">
                {member.name}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{member.role}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    member.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {member.status}
                </span>
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-400">Capacity</span>
              <span
                className={`font-medium ${getCapacityColor(member.currentWorkloadHours, member.capacityHoursPerWeek)}`}
              >
                {member.currentWorkloadHours} / {member.capacityHoursPerWeek}h per week
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  (member.currentWorkloadHours / member.capacityHoursPerWeek) * 100 >= 90
                    ? 'bg-red-600 dark:bg-red-500'
                    : (member.currentWorkloadHours / member.capacityHoursPerWeek) * 100 >= 75
                      ? 'bg-amber-600 dark:bg-amber-500'
                      : 'bg-emerald-600 dark:bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min((member.currentWorkloadHours / member.capacityHoursPerWeek) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Skills */}
          <div>
            <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Skills
            </h4>
            <div className="space-y-2">
              {member.skills.slice(0, 3).map((skill) => (
                <div key={skill.name} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{skill.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {getProficiencyLabel(skill.proficiency)}
                  </span>
                </div>
              ))}
              {member.skills.length > 3 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  +{member.skills.length - 3} more skills
                </p>
              )}
            </div>
          </div>

          {member.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              {member.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
