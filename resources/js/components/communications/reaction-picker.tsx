import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactionPickerProps } from '@/types/communications';

// Common reaction emojis for quick selection
const QUICK_EMOJIS = [
    { emoji: '\u{1F44D}', label: 'Thumbs up' },      // thumbs up
    { emoji: '\u{1F44E}', label: 'Thumbs down' },    // thumbs down
    { emoji: '\u{2764}\u{FE0F}', label: 'Heart' },   // red heart
    { emoji: '\u{1F389}', label: 'Party' },          // party popper
    { emoji: '\u{1F44F}', label: 'Clap' },           // clapping hands
    { emoji: '\u{1F64F}', label: 'Thanks' },         // folded hands
    { emoji: '\u{1F440}', label: 'Eyes' },           // eyes
    { emoji: '\u{1F680}', label: 'Rocket' },         // rocket
    { emoji: '\u{2705}', label: 'Check mark' },      // check mark
    { emoji: '\u{1F4AF}', label: '100' },            // 100
    { emoji: '\u{1F914}', label: 'Thinking' },       // thinking
    { emoji: '\u{1F4A1}', label: 'Light bulb' },     // light bulb
];

export function ReactionPicker({ onReactionAdd }: ReactionPickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleEmojiSelect = (emoji: string) => {
        onReactionAdd(emoji);
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    aria-label="Add reaction"
                >
                    <SmilePlus className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-2"
                align="start"
                side="top"
            >
                <div className="grid grid-cols-6 gap-1">
                    {QUICK_EMOJIS.map(({ emoji, label }) => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => handleEmojiSelect(emoji)}
                            className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-md text-lg',
                                'hover:bg-accent transition-colors',
                                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1'
                            )}
                            aria-label={label}
                            title={label}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
