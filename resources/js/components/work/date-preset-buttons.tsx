import { Button } from '@/components/ui/button';
import { getPresetDate, type DatePreset } from '@/lib/date-utils';

interface DatePresetOption {
    preset: DatePreset;
    label: string;
}

const DEFAULT_PRESETS: DatePresetOption[] = [
    { preset: 'today', label: 'Today' },
    { preset: 'tomorrow', label: 'Tomorrow' },
    { preset: 'nextMonday', label: 'Next Monday' },
    { preset: 'nextMonth', label: 'Next Month' },
];

interface DatePresetButtonsProps {
    /** Called with a YYYY-MM-DD string when a preset is selected. */
    onSelect: (date: string) => void;
    presets?: DatePresetOption[];
}

/** Quick-select buttons that set a date field to a predefined value. */
export function DatePresetButtons({
    onSelect,
    presets = DEFAULT_PRESETS,
}: DatePresetButtonsProps) {
    return (
        <div className="flex flex-wrap gap-1">
            {presets.map(({ preset, label }) => (
                <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => onSelect(getPresetDate(preset))}
                >
                    {label}
                </Button>
            ))}
        </div>
    );
}
