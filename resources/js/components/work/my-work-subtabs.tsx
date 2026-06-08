import { cn } from '@/lib/utils';
import type { MyWorkSubtab } from '@/types/work';
import { Briefcase, CheckSquare, FolderKanban, Layers } from 'lucide-react';

interface MyWorkSubtabsProps {
    activeTab: MyWorkSubtab;
    onTabChange: (tab: MyWorkSubtab) => void;
    className?: string;
}

const subtabs: Array<{
    value: MyWorkSubtab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}> = [
    { value: 'tasks', label: 'Tasks', icon: CheckSquare },
    { value: 'work_orders', label: 'Work Orders', icon: Briefcase },
    { value: 'projects', label: 'Projects', icon: FolderKanban },
    { value: 'all', label: 'All', icon: Layers },
];

export function MyWorkSubtabs({
    activeTab,
    onTabChange,
    className,
}: MyWorkSubtabsProps) {
    return (
        <div className={cn('border-b border-border', className)}>
            <div
                className="flex flex-wrap gap-1 px-4"
                role="tablist"
                aria-label="My Work subtabs"
            >
                {subtabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.value;

                    return (
                        <button
                            key={tab.value}
                            role="tab"
                            aria-selected={isActive}
                            data-state={isActive ? 'active' : 'inactive'}
                            onClick={() => onTabChange(tab.value)}
                            className={cn(
                                'flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground',
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
