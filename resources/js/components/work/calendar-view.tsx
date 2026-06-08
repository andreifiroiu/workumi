import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Project, WorkOrder } from '@/types/work';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { CalendarEvent } from './calendar-event';

interface CalendarViewProps {
    projects: Project[];
    workOrders: WorkOrder[];
}

export function CalendarView({ projects, workOrders }: CalendarViewProps) {
    const isMobile = useIsMobile();
    const [currentDate, setCurrentDate] = useState(new Date());

    // Get calendar data for current month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Generate calendar grid (including previous month overflow days)
    const calendarDays: Array<{
        date: Date;
        isCurrentMonth: boolean;
        dayNumber: number;
    }> = [];

    // Previous month overflow days
    if (startingDayOfWeek > 0) {
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            calendarDays.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                isCurrentMonth: false,
                dayNumber: prevMonthLastDay - i,
            });
        }
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push({
            date: new Date(year, month, day),
            isCurrentMonth: true,
            dayNumber: day,
        });
    }

    // Next month overflow days to fill grid
    const remainingDays = 42 - calendarDays.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
        calendarDays.push({
            date: new Date(year, month + 1, day),
            isCurrentMonth: false,
            dayNumber: day,
        });
    }

    // Get items for a specific date
    const getItemsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];

        const projectsOnDate = projects.filter((p) => {
            if (!p.targetEndDate) return false;
            return p.targetEndDate.startsWith(dateStr);
        });

        const workOrdersOnDate = workOrders.filter((wo) => {
            return wo.dueDate?.startsWith(dateStr);
        });

        return { projects: projectsOnDate, workOrders: workOrdersOnDate };
    };

    // Navigation
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const monthName = currentDate.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
    });

    // Check if date is today
    const isToday = (date: Date) => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    // Stats
    const totalItems = projects.length + workOrders.length;
    const overdueItems = [
        ...projects.filter(
            (p) => p.targetEndDate && new Date(p.targetEndDate) < new Date(),
        ),
        ...workOrders.filter(
            (wo) => wo.dueDate && new Date(wo.dueDate) < new Date(),
        ),
    ].length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                        {monthName}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={goToToday}>
                        Today
                    </Button>
                </div>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                            {totalItems}
                        </span>
                        <span className="text-muted-foreground">items</span>
                        {overdueItems > 0 && (
                            <>
                                <span className="mx-1 text-border">•</span>
                                <span className="font-medium text-destructive">
                                    {overdueItems}
                                </span>
                                <span className="text-muted-foreground">
                                    overdue
                                </span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToPreviousMonth}
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToNextMonth}
                            aria-label="Next month"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile: agenda list of current-month days that have items */}
            {isMobile ? (
                (() => {
                    const agendaDays = calendarDays
                        .filter((day) => day.isCurrentMonth)
                        .map((day) => ({
                            ...day,
                            items: getItemsForDate(day.date),
                        }))
                        .filter(
                            (day) =>
                                day.items.projects.length > 0 ||
                                day.items.workOrders.length > 0,
                        );

                    if (agendaDays.length === 0) {
                        return (
                            <div className="rounded-xl border border-border bg-card p-8 text-center">
                                <CalendarIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                    Nothing scheduled in {monthName}.
                                </p>
                            </div>
                        );
                    }

                    return (
                        <div className="space-y-4">
                            {agendaDays.map((day) => (
                                <div key={day.date.toISOString()}>
                                    <div className="mb-2 flex items-center gap-2">
                                        <span
                                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                                                isToday(day.date)
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-foreground'
                                            }`}
                                        >
                                            {day.dayNumber}
                                        </span>
                                        <span className="text-sm font-medium text-muted-foreground">
                                            {day.date.toLocaleDateString(
                                                'default',
                                                {
                                                    weekday: 'long',
                                                },
                                            )}
                                        </span>
                                    </div>
                                    <div className="space-y-1 pl-9">
                                        {day.items.projects.map((project) => (
                                            <CalendarEvent
                                                key={project.id}
                                                item={project}
                                                type="project"
                                            />
                                        ))}
                                        {day.items.workOrders.map(
                                            (workOrder) => (
                                                <CalendarEvent
                                                    key={workOrder.id}
                                                    item={workOrder}
                                                    type="workOrder"
                                                />
                                            ),
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()
            ) : (
                /* Desktop: month grid */
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 border-b border-border bg-muted">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                            (day) => (
                                <div
                                    key={day}
                                    className="px-2 py-3 text-center text-xs font-bold tracking-wide text-muted-foreground uppercase"
                                >
                                    {day}
                                </div>
                            ),
                        )}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, index) => {
                            const items = getItemsForDate(day.date);
                            const hasItems =
                                items.projects.length > 0 ||
                                items.workOrders.length > 0;
                            const isTodayDate = isToday(day.date);

                            return (
                                <div
                                    key={index}
                                    className={`min-h-[120px] border-r border-b border-border p-2 ${
                                        !day.isCurrentMonth ? 'bg-muted/50' : ''
                                    } ${index % 7 === 6 ? 'border-r-0' : ''} ${
                                        index >= 35 ? 'border-b-0' : ''
                                    }`}
                                >
                                    <div
                                        className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${
                                            isTodayDate
                                                ? 'bg-primary text-primary-foreground'
                                                : day.isCurrentMonth
                                                  ? 'text-foreground'
                                                  : 'text-muted-foreground'
                                        }`}
                                    >
                                        {day.dayNumber}
                                    </div>

                                    {hasItems && (
                                        <div className="space-y-1">
                                            {items.projects.map((project) => (
                                                <CalendarEvent
                                                    key={project.id}
                                                    item={project}
                                                    type="project"
                                                />
                                            ))}
                                            {items.workOrders.map(
                                                (workOrder) => (
                                                    <CalendarEvent
                                                        key={workOrder.id}
                                                        item={workOrder}
                                                        type="workOrder"
                                                    />
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded border border-indigo-300 bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/30" />
                    <span className="text-muted-foreground">Projects</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded border border-emerald-300 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30" />
                    <span className="text-muted-foreground">Work Orders</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded border border-red-300 bg-red-100 dark:border-red-800 dark:bg-red-950/30" />
                    <span className="text-muted-foreground">Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded border border-orange-300 bg-orange-100 dark:border-orange-800 dark:bg-orange-950/30" />
                    <span className="text-muted-foreground">High Priority</span>
                </div>
            </div>
        </div>
    );
}
