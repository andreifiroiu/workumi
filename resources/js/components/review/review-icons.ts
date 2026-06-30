import {
    ArrowUpRight,
    Calendar,
    CalendarCheck,
    CalendarClock,
    CalendarPlus,
    CalendarRange,
    CheckCircle2,
    Clock,
    ListChecks,
    UserCheck,
    UserPlus,
    Users,
    type LucideIcon,
} from 'lucide-react';

/**
 * Maps the icon name strings sent by the backend (review flows + actions)
 * to their Lucide components, with a sensible fallback.
 */
export const reviewIcons: Record<string, LucideIcon> = {
    ArrowUpRight,
    Calendar,
    CalendarCheck,
    CalendarClock,
    CalendarPlus,
    CalendarRange,
    CheckCircle2,
    Clock,
    ListChecks,
    UserCheck,
    UserPlus,
    Users,
};

export const fallbackReviewIcon: LucideIcon = ListChecks;
