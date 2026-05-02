import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MyWorkCard } from './my-work-card';
import type { WorkOrder } from '@/types/work';

interface KanbanCardProps {
    workOrder: WorkOrder;
    isOverlay?: boolean;
}

export function KanbanCard({ workOrder, isOverlay = false }: KanbanCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: workOrder.id,
    });

    const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={isDragging && !isOverlay ? 'opacity-40' : undefined}
        >
            <MyWorkCard workOrder={workOrder} />
        </div>
    );
}
