import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InboxTabsProps } from '@/types/inbox';
import {
    CheckCircle,
    FileText,
    Flag,
    Inbox,
    MessageSquare,
} from 'lucide-react';

export function InboxTabs({ currentTab, counts, onTabChange }: InboxTabsProps) {
    const tabs = [
        { value: 'all' as const, label: 'All', icon: Inbox },
        {
            value: 'agent_drafts' as const,
            label: 'Agent Drafts',
            icon: FileText,
        },
        { value: 'approvals' as const, label: 'Approvals', icon: CheckCircle },
        { value: 'flagged' as const, label: 'Flagged', icon: Flag },
        { value: 'mentions' as const, label: 'Mentions', icon: MessageSquare },
    ];

    return (
        <div className="border-b border-sidebar-border/70 px-6 dark:border-sidebar-border">
            <Tabs value={currentTab} onValueChange={onTabChange}>
                <TabsList className="flex h-auto flex-wrap justify-start border-0 bg-transparent p-0">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="flex items-center gap-2 rounded-none border-b-2 border-transparent shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent"
                            >
                                <Icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                                {counts[tab.value] > 0 && (
                                    <Badge
                                        variant="secondary"
                                        className="ml-1 text-xs"
                                    >
                                        {counts[tab.value]}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
            </Tabs>
        </div>
    );
}
