import InputError from '@/components/input-error';

interface FormErrorSummaryProps {
    /** The form's `errors` object, straight from useForm. */
    errors: Record<string, string | undefined>;
    /** Keys that already have their own <InputError> somewhere in the form. */
    rendered: string[];
}

/**
 * Shows the errors a form has no field for.
 *
 * A field can be conditionally rendered, or hidden entirely because the page
 * fixes its value — but the server can still reject it. An error with nowhere to
 * display reads to the user as a submit button that silently does nothing, so
 * whatever is left over is shown here rather than dropped.
 */
export function FormErrorSummary({ errors, rendered }: FormErrorSummaryProps) {
    const shown = new Set(rendered);

    const unmapped = Object.entries(errors)
        .filter(([field, message]) => !shown.has(field) && Boolean(message))
        .map(([, message]) => message as string);

    if (unmapped.length === 0) {
        return null;
    }

    return (
        <div className="grid gap-1">
            {unmapped.map((message) => (
                <InputError key={message} message={message} />
            ))}
        </div>
    );
}
