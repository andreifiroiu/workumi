export function getCsrfToken(): string {
    const name = 'XSRF-TOKEN=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookies = decodedCookie.split(';');

    for (const cookie of cookies) {
        const trimmed = cookie.trim();
        if (trimmed.startsWith(name)) {
            return trimmed.substring(name.length);
        }
    }

    return '';
}

export function csrfHeaders(extra?: HeadersInit): HeadersInit {
    return {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': getCsrfToken(),
        ...(extra as Record<string, string> | undefined),
    };
}
