import {
    format as dateFnsFormat,
    formatDistance as dateFnsFormatDistance,
} from 'date-fns';
import { de, enUS, es, fr, ro } from 'date-fns/locale';

const locales = {
    en: enUS,
    es: es,
    fr: fr,
    de: de,
    ro: ro,
};

export function getDateFnsLocale(locale: string = 'en') {
    return locales[locale as keyof typeof locales] || enUS;
}

export function formatDate(
    date: Date | string | number,
    formatStr: string = 'PPP',
    locale?: string,
): string {
    const dateObj =
        typeof date === 'string' || typeof date === 'number'
            ? new Date(date)
            : date;
    const currentLocale =
        locale ||
        (typeof window !== 'undefined'
            ? localStorage.getItem('language')
            : null) ||
        'en';

    return dateFnsFormat(dateObj, formatStr, {
        locale: getDateFnsLocale(currentLocale),
    });
}

export function formatDistance(
    date: Date | string | number,
    baseDate: Date | string | number = new Date(),
    options?: { addSuffix?: boolean; locale?: string },
): string {
    const dateObj =
        typeof date === 'string' || typeof date === 'number'
            ? new Date(date)
            : date;
    const baseDateObj =
        typeof baseDate === 'string' || typeof baseDate === 'number'
            ? new Date(baseDate)
            : baseDate;
    const currentLocale =
        options?.locale ||
        (typeof window !== 'undefined'
            ? localStorage.getItem('language')
            : null) ||
        'en';

    return dateFnsFormatDistance(dateObj, baseDateObj, {
        addSuffix: options?.addSuffix,
        locale: getDateFnsLocale(currentLocale),
    });
}

/** Format a Date as YYYY-MM-DD using the local timezone. */
export function formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Calculate smart default due date based on work order due date.
 * If work order due date is within 1 week and in the future, use it.
 * Otherwise, default to 7 days from now.
 */
export function calculateDefaultDueDate(workOrderDueDate: string | null): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (workOrderDueDate) {
        const woDueDate = new Date(workOrderDueDate);
        // If work order due date is within 1 week and in the future, use it
        if (woDueDate <= oneWeekFromNow && woDueDate >= today) {
            return workOrderDueDate;
        }
    }

    // Default to 7 days from now
    return formatLocalDate(oneWeekFromNow);
}

export type DatePreset = 'today' | 'tomorrow' | 'nextMonday' | 'nextMonth';

/** Get a YYYY-MM-DD value for a quick-select date preset. */
export function getPresetDate(preset: DatePreset): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (preset) {
        case 'today':
            return formatLocalDate(today);
        case 'tomorrow': {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return formatLocalDate(tomorrow);
        }
        case 'nextMonday': {
            const nextMonday = new Date(today);
            const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
            nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
            return formatLocalDate(nextMonday);
        }
        case 'nextMonth': {
            const nextMonth = new Date(today);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            return formatLocalDate(nextMonth);
        }
    }
}
