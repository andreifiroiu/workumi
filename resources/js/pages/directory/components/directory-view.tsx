import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
    Contact,
    DirectoryTab,
    Party,
    Project,
    TeamMember,
} from '@/types/directory';
import { Building2, Plus, Search, UserCircle2, Users } from 'lucide-react';
import { useState } from 'react';
import { ContactsList } from './contacts-list';
import { PartiesList } from './parties-list';
import { TeamList } from './team-list';

interface DirectoryViewProps {
    parties: Party[];
    contacts: Contact[];
    teamMembers: TeamMember[];
    projects: Project[];
    activeTab: DirectoryTab;
    onTabChange: (tab: DirectoryTab) => void;
    onPartyClick: (partyId: string) => void;
    onContactClick: (contactId: string) => void;
    onTeamMemberClick: (memberId: string) => void;
    onPartyAdd: () => void;
    onContactAdd: () => void;
}

const tabs: Array<{
    value: DirectoryTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}> = [
    { value: 'parties', label: 'Parties', icon: Building2 },
    { value: 'contacts', label: 'Contacts', icon: Users },
    { value: 'team', label: 'Team', icon: UserCircle2 },
];

export function DirectoryView({
    parties,
    contacts,
    teamMembers,
    activeTab,
    onTabChange,
    onPartyClick,
    onContactClick,
    onTeamMemberClick,
    onPartyAdd,
    onContactAdd,
}: DirectoryViewProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter data based on search query
    const filteredParties = searchQuery
        ? parties.filter(
              (p) =>
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.notes?.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : parties;

    const filteredContacts = searchQuery
        ? contacts.filter(
              (c) =>
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.partyName.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : contacts;

    const filteredTeamMembers = searchQuery
        ? teamMembers.filter(
              (m) =>
                  m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  m.role?.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : teamMembers;

    const handleAdd = () => {
        if (activeTab === 'parties') {
            onPartyAdd();
        } else if (activeTab === 'contacts') {
            onContactAdd();
        }
        // Team members are managed through user invitations, not created here
    };

    const showAddButton = activeTab === 'parties' || activeTab === 'contacts';

    return (
        <div className="flex h-full flex-1 flex-col">
            {/* Header */}
            <div className="border-b border-sidebar-border/70 px-4 py-4 sm:px-6 sm:py-6 dark:border-sidebar-border">
                <div className="mb-2 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Directory
                    </h1>
                    {showAddButton && (
                        <Button onClick={handleAdd} size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add {activeTab === 'parties' ? 'Party' : 'Contact'}
                        </Button>
                    )}
                </div>
                <p className="text-muted-foreground">
                    Manage parties, contacts, and team members
                </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-sidebar-border/70 dark:border-sidebar-border">
                <div className="flex flex-wrap gap-1 px-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.value;

                        return (
                            <button
                                key={tab.value}
                                onClick={() => onTabChange(tab.value)}
                                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                } `}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Search Bar */}
            <div className="border-b border-sidebar-border/70 px-6 py-4 dark:border-sidebar-border">
                <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${activeTab}...`}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {activeTab === 'parties' && (
                    <PartiesList
                        parties={filteredParties}
                        onPartyClick={onPartyClick}
                        searchQuery={searchQuery}
                    />
                )}

                {activeTab === 'contacts' && (
                    <ContactsList
                        contacts={filteredContacts}
                        onContactClick={onContactClick}
                        searchQuery={searchQuery}
                    />
                )}

                {activeTab === 'team' && (
                    <TeamList
                        teamMembers={filteredTeamMembers}
                        onTeamMemberClick={onTeamMemberClick}
                        searchQuery={searchQuery}
                    />
                )}
            </div>
        </div>
    );
}
