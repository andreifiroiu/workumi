import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { DialogFooter } from '@/components/ui/dialog';

interface RateEditFormProps {
    userId: string;
    userName: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

interface FormErrors {
    internal_rate?: string;
    billing_rate?: string;
    effective_date?: string;
    general?: string;
}

export function RateEditForm({
    userId,
    onSuccess,
    onCancel,
}: RateEditFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    const [internalRate, setInternalRate] = useState('');
    const [billingRate, setBillingRate] = useState('');
    const [effectiveDate, setEffectiveDate] = useState(
        new Date().toISOString().split('T')[0]
    );

    const validateRate = (value: string, fieldName: string): string | null => {
        if (!value.trim()) {
            return `${fieldName} is required`;
        }

        const numValue = parseFloat(value);

        if (isNaN(numValue)) {
            return `${fieldName} must be a valid number`;
        }

        if (numValue <= 0) {
            return `${fieldName} must be a positive number`;
        }

        // Check for max 2 decimal places
        const decimalParts = value.split('.');
        if (decimalParts.length === 2 && decimalParts[1].length > 2) {
            return `${fieldName} must have maximum 2 decimal places`;
        }

        return null;
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        const internalRateError = validateRate(internalRate, 'Internal rate');
        if (internalRateError) {
            newErrors.internal_rate = internalRateError;
        }

        const billingRateError = validateRate(billingRate, 'Billing rate');
        if (billingRateError) {
            newErrors.billing_rate = billingRateError;
        }

        if (!effectiveDate) {
            newErrors.effective_date = 'Effective date is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        const data = {
            user_id: userId,
            internal_rate: parseFloat(internalRate),
            billing_rate: parseFloat(billingRate),
            effective_date: effectiveDate,
        };

        // Always create a new rate (POST) - rates are immutable for history tracking
        router.post('/account/settings/rates', data, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                onSuccess?.();
            },
            onError: (formErrors: Record<string, string>) => {
                setIsSubmitting(false);
                setErrors(formErrors as FormErrors);
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} aria-label="Rate creation form">
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="internal_rate">Internal Rate (Cost per Hour)</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                        </span>
                        <Input
                            id="internal_rate"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={internalRate}
                            onChange={(e) => setInternalRate(e.target.value)}
                            placeholder="0.00"
                            className="pl-7"
                            aria-describedby={errors.internal_rate ? 'internal_rate_error' : undefined}
                            aria-invalid={!!errors.internal_rate}
                        />
                    </div>
                    <InputError message={errors.internal_rate} id="internal_rate_error" />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="billing_rate">Billing Rate (Revenue per Hour)</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                        </span>
                        <Input
                            id="billing_rate"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={billingRate}
                            onChange={(e) => setBillingRate(e.target.value)}
                            placeholder="0.00"
                            className="pl-7"
                            aria-describedby={errors.billing_rate ? 'billing_rate_error' : undefined}
                            aria-invalid={!!errors.billing_rate}
                        />
                    </div>
                    <InputError message={errors.billing_rate} id="billing_rate_error" />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="effective_date">Effective Date</Label>
                    <Input
                        id="effective_date"
                        type="date"
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                        aria-describedby={errors.effective_date ? 'effective_date_error' : undefined}
                        aria-invalid={!!errors.effective_date}
                    />
                    <InputError message={errors.effective_date} id="effective_date_error" />
                    <p className="text-xs text-muted-foreground">
                        This rate will apply to time entries on or after this date.
                        Previous rates are preserved for historical calculations.
                    </p>
                </div>
            </div>

            <DialogFooter>
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={isSubmitting || !internalRate || !billingRate || !effectiveDate}
                >
                    {isSubmitting ? 'Creating...' : 'Create Rate'}
                </Button>
            </DialogFooter>
        </form>
    );
}
