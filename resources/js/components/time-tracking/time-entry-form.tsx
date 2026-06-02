import { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';
import { Loader2, Clock, Save } from 'lucide-react';
import type { TimeEntry } from '@/types/work';

const timeEntrySchema = z.object({
    hours: z
        .number({ invalid_type_error: 'Hours is required' })
        .min(0.01, 'Hours must be at least 0.01')
        .max(24, 'Hours must be 24 or less'),
    date: z.string().min(1, 'Date is required'),
    note: z.string().max(500, 'Note must be 500 characters or less').optional(),
    is_billable: z.boolean(),
});

type TimeEntryFormValues = {
    hours: number | '';
    date: string;
    note: string;
    is_billable: boolean;
};

interface TimeEntryFormProps {
    taskId?: number;
    entry?: TimeEntry;
    onSuccess?: () => void;
    className?: string;
}

function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
}

function formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

export function TimeEntryForm({ taskId, entry, onSuccess, className }: TimeEntryFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const isEditMode = !!entry;

    const defaultValues: TimeEntryFormValues = entry
        ? {
              hours: Number(entry.hours),
              date: formatDateForInput(entry.date),
              note: entry.note || '',
              is_billable: entry.is_billable,
          }
        : {
              hours: '',
              date: getTodayDate(),
              note: '',
              is_billable: true,
          };

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
    } = useForm<TimeEntryFormValues>({
        resolver: zodResolver(timeEntrySchema),
        defaultValues,
    });

    useEffect(() => {
        if (entry) {
            reset({
                hours: Number(entry.hours),
                date: formatDateForInput(entry.date),
                note: entry.note || '',
                is_billable: entry.is_billable,
            });
        }
    }, [entry, reset]);

    const onSubmit = useCallback(
        (data: TimeEntryFormValues) => {
            setIsSubmitting(true);
            setSuccessMessage(null);

            if (isEditMode && entry) {
                router.patch(
                    `/work/time-entries/${entry.id}`,
                    {
                        hours: data.hours,
                        date: data.date,
                        note: data.note || null,
                        is_billable: data.is_billable,
                    },
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            setSuccessMessage('Time entry updated successfully');
                            setTimeout(() => setSuccessMessage(null), 3000);
                            onSuccess?.();
                        },
                        onFinish: () => {
                            setIsSubmitting(false);
                        },
                    }
                );
            } else {
                router.post(
                    '/work/time-entries',
                    {
                        taskId: taskId,
                        hours: data.hours,
                        date: data.date,
                        note: data.note || null,
                        is_billable: data.is_billable,
                    },
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            reset({
                                hours: '',
                                date: getTodayDate(),
                                note: '',
                                is_billable: true,
                            });
                            setSuccessMessage('Time entry logged successfully');
                            setTimeout(() => setSuccessMessage(null), 3000);
                            onSuccess?.();
                        },
                        onFinish: () => {
                            setIsSubmitting(false);
                        },
                    }
                );
            }
        },
        [taskId, entry, isEditMode, reset, onSuccess]
    );

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className={cn('space-y-4', className)}
            aria-label={isEditMode ? 'Edit time entry form' : 'Time entry form'}
        >
            {successMessage && (
                <div
                    role="status"
                    className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400"
                >
                    {successMessage}
                </div>
            )}

            <div className="grid gap-2">
                <Label htmlFor="hours">Hours</Label>
                <Controller
                    name="hours"
                    control={control}
                    render={({ field }) => (
                        <Input
                            id="hours"
                            type="number"
                            step="0.25"
                            min="0.01"
                            max="24"
                            placeholder="0.00"
                            aria-invalid={!!errors.hours}
                            value={field.value === '' ? '' : field.value}
                            onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === '' ? '' : parseFloat(val));
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                        />
                    )}
                />
                <InputError message={errors.hours?.message} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                    id="date"
                    type="date"
                    aria-invalid={!!errors.date}
                    {...register('date')}
                />
                <InputError message={errors.date?.message} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                    id="note"
                    placeholder="What did you work on? (optional)"
                    maxLength={500}
                    rows={3}
                    aria-invalid={!!errors.note}
                    {...register('note')}
                />
                <InputError message={errors.note?.message} />
            </div>

            <div className="flex items-center justify-between">
                <Label htmlFor="billable" className="cursor-pointer">
                    Billable
                </Label>
                <Controller
                    name="is_billable"
                    control={control}
                    render={({ field }) => (
                        <Switch
                            id="billable"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-label="Billable"
                        />
                    )}
                />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                    <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>{isEditMode ? 'Saving...' : 'Logging...'}</span>
                    </>
                ) : (
                    <>
                        {isEditMode ? <Save className="size-4" /> : <Clock className="size-4" />}
                        <span>{isEditMode ? 'Save Changes' : 'Log Time'}</span>
                    </>
                )}
            </Button>
        </form>
    );
}
