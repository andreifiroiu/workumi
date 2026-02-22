import { router } from '@inertiajs/react';
import type { InboxAction, BulkActionPayload } from '@/types/inbox';

interface ActionCallbacks {
    onSuccess?: () => void;
    onError?: () => void;
}

export function useInboxActions() {
    const approveItem = (itemId: string, callbacks?: ActionCallbacks) => {
        router.post(`/inbox/${itemId}/approve`, {}, {
            preserveScroll: true,
            onSuccess: () => callbacks?.onSuccess?.(),
            onError: () => callbacks?.onError?.(),
        });
    };

    const rejectItem = (itemId: string, feedback: string, callbacks?: ActionCallbacks) => {
        router.post(`/inbox/${itemId}/reject`, { feedback }, {
            preserveScroll: true,
            onSuccess: () => callbacks?.onSuccess?.(),
            onError: () => callbacks?.onError?.(),
        });
    };

    const deferItem = (itemId: string, callbacks?: ActionCallbacks) => {
        router.post(`/inbox/${itemId}/defer`, {}, {
            preserveScroll: true,
            onSuccess: () => callbacks?.onSuccess?.(),
            onError: () => callbacks?.onError?.(),
        });
    };

    const archiveItem = (itemId: string, callbacks?: ActionCallbacks) => {
        router.delete(`/inbox/${itemId}`, {
            preserveScroll: true,
            onSuccess: () => callbacks?.onSuccess?.(),
            onError: () => callbacks?.onError?.(),
        });
    };

    const bulkAction = (payload: BulkActionPayload, callbacks?: ActionCallbacks) => {
        router.post('/inbox/bulk', payload, {
            preserveScroll: true,
            onSuccess: () => callbacks?.onSuccess?.(),
            onError: () => callbacks?.onError?.(),
        });
    };

    return {
        approveItem,
        rejectItem,
        deferItem,
        archiveItem,
        bulkAction,
    };
}
