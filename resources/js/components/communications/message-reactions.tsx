import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MessageReactionsProps } from '@/types/communications';

export function MessageReactions({
    reactions,
    onToggleReaction,
}: MessageReactionsProps) {
    if (reactions.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-1 mt-2">
            {reactions.map((reaction) => (
                <Button
                    key={reaction.emoji}
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleReaction(reaction.emoji)}
                    className={cn(
                        'h-6 px-2 text-xs gap-1',
                        reaction.hasReacted
                            ? 'bg-primary/10 border-primary/30 hover:bg-primary/20'
                            : 'hover:bg-muted'
                    )}
                    aria-label={`${reaction.emoji} ${reaction.count} reaction${reaction.count !== 1 ? 's' : ''}${reaction.hasReacted ? ', you reacted' : ''}`}
                    aria-pressed={reaction.hasReacted}
                >
                    <span className="text-sm">{reaction.emoji}</span>
                    <span className={cn(
                        'font-medium',
                        reaction.hasReacted && 'text-primary'
                    )}>
                        {reaction.count}
                    </span>
                </Button>
            ))}
        </div>
    );
}
