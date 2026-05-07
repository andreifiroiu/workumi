import { describe, expect, it, beforeEach } from 'vitest';
import { getCsrfToken, csrfHeaders } from '../csrf';

function setCookie(value: string) {
    Object.defineProperty(document, 'cookie', {
        writable: true,
        value,
        configurable: true,
    });
}

describe('getCsrfToken', () => {
    beforeEach(() => {
        setCookie('');
    });

    it('returns the XSRF-TOKEN cookie value', () => {
        setCookie('XSRF-TOKEN=abc123');
        expect(getCsrfToken()).toBe('abc123');
    });

    it('URL-decodes the cookie value', () => {
        setCookie('XSRF-TOKEN=' + encodeURIComponent('a=b/c+d'));
        expect(getCsrfToken()).toBe('a=b/c+d');
    });

    it('returns the right token when multiple cookies are present', () => {
        setCookie('foo=bar; XSRF-TOKEN=token-value; baz=qux');
        expect(getCsrfToken()).toBe('token-value');
    });

    it('returns empty string when XSRF-TOKEN is missing', () => {
        setCookie('foo=bar; baz=qux');
        expect(getCsrfToken()).toBe('');
    });
});

describe('csrfHeaders', () => {
    beforeEach(() => {
        setCookie('XSRF-TOKEN=tok');
    });

    it('includes the standard headers and the XSRF token', () => {
        const headers = csrfHeaders() as Record<string, string>;
        expect(headers['Content-Type']).toBe('application/json');
        expect(headers['X-Requested-With']).toBe('XMLHttpRequest');
        expect(headers['X-XSRF-TOKEN']).toBe('tok');
    });

    it('merges and overrides with extra headers', () => {
        const headers = csrfHeaders({ Accept: 'application/json', 'Content-Type': 'text/plain' }) as Record<string, string>;
        expect(headers['Accept']).toBe('application/json');
        expect(headers['Content-Type']).toBe('text/plain');
        expect(headers['X-XSRF-TOKEN']).toBe('tok');
    });
});
