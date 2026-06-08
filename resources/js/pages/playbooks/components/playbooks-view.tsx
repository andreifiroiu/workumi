import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { PlaybooksViewProps, PlaybookTab } from '@/types/playbooks';
import { Plus, Search } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from './empty-state';
import { PlaybookCard } from './playbook-card';
import { PlaybookTabs } from './playbook-tabs';

export function PlaybooksView({
    playbooks,
    activeTab,
    onTabChange,
    searchQuery,
    onSearchChange,
    selectedTags,
    sortBy,
    onSortChange,
    onViewPlaybook,
    onCreatePlaybook,
}: PlaybooksViewProps) {
    // Calculate tab counts
    const tabCounts = useMemo(() => {
        return {
            all: playbooks.length,
            sop: playbooks.filter((p) => p.type === 'sop').length,
            checklist: playbooks.filter((p) => p.type === 'checklist').length,
            template: playbooks.filter((p) => p.type === 'template').length,
            acceptance_criteria: playbooks.filter(
                (p) => p.type === 'acceptance_criteria',
            ).length,
        } as Record<PlaybookTab, number>;
    }, [playbooks]);

    // Filter playbooks based on tab, search, tags
    const filteredPlaybooks = useMemo(() => {
        let filtered = playbooks;

        // Filter by tab
        if (activeTab !== 'all') {
            filtered = filtered.filter((p) => p.type === activeTab);
        }

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (p) =>
                    p.name.toLowerCase().includes(query) ||
                    p.description.toLowerCase().includes(query) ||
                    p.tags.some((t) => t.toLowerCase().includes(query)),
            );
        }

        // Filter by tags
        if (selectedTags.length > 0) {
            filtered = filtered.filter((p) =>
                selectedTags.every((tag) => p.tags.includes(tag)),
            );
        }

        // Sort
        if (sortBy === 'popular') {
            filtered.sort((a, b) => b.timesApplied - a.timesApplied);
        } else if (sortBy === 'recent') {
            filtered.sort(
                (a, b) =>
                    new Date(b.lastModified).getTime() -
                    new Date(a.lastModified).getTime(),
            );
        } else if (sortBy === 'alphabetical') {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        }

        return filtered;
    }, [playbooks, activeTab, searchQuery, selectedTags, sortBy]);

    return (
        <div className="flex h-full flex-col gap-4 p-4">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-semibold">Playbooks</h1>
                <Button
                    className="w-full sm:w-auto"
                    onClick={() => onCreatePlaybook('sop')}
                >
                    <Plus className="mr-2 size-4" />
                    Create Playbook
                </Button>
            </div>

            {/* Search bar */}
            <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search playbooks by name, description, or tags..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Tabs */}
            <PlaybookTabs
                activeTab={activeTab}
                onTabChange={onTabChange}
                counts={tabCounts}
            />

            {/* Sort filter */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select value={sortBy} onValueChange={onSortChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="recent">Recently Updated</SelectItem>
                        <SelectItem value="popular">Most Popular</SelectItem>
                        <SelectItem value="alphabetical">A-Z</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Playbook grid */}
            {filteredPlaybooks.length === 0 ? (
                <EmptyState
                    tab={activeTab}
                    onCreatePlaybook={onCreatePlaybook}
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredPlaybooks.map((playbook) => (
                        <PlaybookCard
                            key={playbook.id}
                            playbook={playbook}
                            onClick={() => onViewPlaybook(playbook.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
