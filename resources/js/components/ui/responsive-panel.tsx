import * as React from 'react';

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ResponsivePanelProps {
    open: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    /**
     * Desktop width constraint. Ignored on mobile, where the panel is always
     * full-screen. Defaults to `sm:max-w-2xl`.
     */
    widthClassName?: string;
    /**
     * Which edge the panel slides from on desktop. On mobile a `bottom` panel
     * stays bottom-anchored (good for short forms); otherwise it is full-screen.
     */
    side?: 'right' | 'left' | 'bottom';
    className?: string;
    contentClassName?: string;
}

/**
 * Standardizes the "full-screen Sheet on mobile, side panel on desktop" pattern
 * used across detail/form panels. Reuses the Sheet primitive and useIsMobile so
 * behavior stays consistent with the app sidebar's 768px breakpoint.
 */
export function ResponsivePanel({
    open,
    onClose,
    title,
    description,
    children,
    widthClassName = 'sm:max-w-2xl',
    side = 'right',
    className,
    contentClassName,
}: ResponsivePanelProps): React.ReactElement {
    const isMobile = useIsMobile();
    const resolvedSide = side === 'bottom' && !isMobile ? 'right' : side;

    return (
        <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
            <SheetContent
                side={resolvedSide}
                className={cn(
                    'flex w-full flex-col overflow-y-auto p-0',
                    resolvedSide !== 'bottom' && widthClassName,
                    resolvedSide === 'bottom' && 'max-h-[90vh] rounded-t-xl',
                    className
                )}
            >
                {(title || description) && (
                    <SheetHeader className="border-b p-4 sm:p-6">
                        {title && <SheetTitle>{title}</SheetTitle>}
                        {description && (
                            <SheetDescription>{description}</SheetDescription>
                        )}
                    </SheetHeader>
                )}
                <div className={cn('flex-1 p-4 sm:p-6', contentClassName)}>
                    {children}
                </div>
            </SheetContent>
        </Sheet>
    );
}
