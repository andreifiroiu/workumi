import { CaptureConfirmation } from '@/components/quick-capture/capture-confirmation';
import { QuickCapturePanel } from '@/components/quick-capture/quick-capture-panel';
import { useCaptureOptions } from '@/components/quick-capture/use-capture-options';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

/**
 * Typing into a field should insert the character, not open the panel, so the
 * shortcut stands down whenever the user is editing something.
 */
function isTypingInto(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    );
}

/**
 * The floating capture button, mounted once in the app layout so every section
 * has it.
 */
export function QuickCaptureLauncher() {
    const [open, setOpen] = useState(false);
    // Bumped on every open so the panel remounts with a blank form, rather than
    // being reset from an effect.
    const [session, setSession] = useState(0);
    const { auth } = usePage<SharedData>().props;

    // A viewer cannot create anything, so the launcher stays out of their way
    // entirely: no button, no shortcut, and no options request.
    const canCapture = auth?.can?.writeContent === true;

    // Held here, not in the panel, so the parent lists survive the remount and
    // are fetched once per page rather than once per open.
    const { options, isLoading, error, reload } = useCaptureOptions(
        open && canCapture,
    );

    const openPanel = useCallback(() => {
        setSession((current) => current + 1);
        setOpen(true);
    }, []);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key !== 'c' || event.metaKey || event.ctrlKey || event.altKey) {
            return;
        }

        if (isTypingInto(event.target)) {
            return;
        }

        event.preventDefault();
        openPanel();
    }, [openPanel]);

    useEffect(() => {
        if (!canCapture) {
            return;
        }

        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown, canCapture]);

    if (!canCapture) {
        return null;
    }

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        size="icon"
                        onClick={openPanel}
                        aria-label="Quick capture"
                        className="fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-lg transition-shadow hover:shadow-xl"
                    >
                        <Plus className="size-6" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                    Quick capture <kbd className="ml-1 font-mono">c</kbd>
                </TooltipContent>
            </Tooltip>

            <QuickCapturePanel
                key={session}
                open={open}
                onOpenChange={setOpen}
                options={options}
                isLoadingOptions={isLoading}
                optionsError={error}
                onCaptureCreatedParent={reload}
            />

            <CaptureConfirmation />
        </>
    );
}
