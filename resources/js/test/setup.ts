import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// jsdom does not provide localStorage on an opaque origin, so supply a
// minimal in-memory implementation for code that persists client-side state.
if (typeof globalThis.localStorage === 'undefined') {
    const memoryStore = new Map<string, string>();
    const storageMock: Storage = {
        get length() {
            return memoryStore.size;
        },
        clear: () => memoryStore.clear(),
        getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key)! : null),
        key: (index) => Array.from(memoryStore.keys())[index] ?? null,
        removeItem: (key) => {
            memoryStore.delete(key);
        },
        setItem: (key, value) => {
            memoryStore.set(key, String(value));
        },
    };

    Object.defineProperty(globalThis, 'localStorage', {
        value: storageMock,
        configurable: true,
    });
    Object.defineProperty(window, 'localStorage', {
        value: storageMock,
        configurable: true,
    });
}
