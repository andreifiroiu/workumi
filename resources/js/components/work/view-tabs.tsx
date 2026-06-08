import type { WorkView } from '@/types/work';
import { Archive, Calendar, Kanban, LayoutGrid, User } from 'lucide-react';

interface ViewTabsProps {
    currentView: WorkView;
    onViewChange: (view: WorkView) => void;
}

const views: Array<{
    value: WorkView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}> = [
    { value: 'all_projects', label: 'All Projects', icon: LayoutGrid },
    { value: 'my_work', label: 'My Work', icon: User },
    { value: 'by_status', label: 'By Status', icon: Kanban },
    { value: 'calendar', label: 'Calendar', icon: Calendar },
    { value: 'archive', label: 'Archive', icon: Archive },
];

export function ViewTabs({ currentView, onViewChange }: ViewTabsProps) {
    return (
        <div className="border-b border-sidebar-border/70 dark:border-sidebar-border">
            <div className="flex flex-wrap gap-1 px-4">
                {views.map((view) => {
                    const Icon = view.icon;
                    const isActive = currentView === view.value;

                    return (
                        <button
                            key={view.value}
                            onClick={() => onViewChange(view.value)}
                            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                                isActive
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            } `}
                        >
                            <Icon className="h-4 w-4" />
                            {view.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
