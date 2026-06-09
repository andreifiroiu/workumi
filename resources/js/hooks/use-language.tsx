import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { SharedData } from '@/types';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'ro';

const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

export function useLanguage() {
    const { i18n } = useTranslation();
    const { auth } = usePage<SharedData>().props;

    // Sync i18n with user's language preference on mount
    useEffect(() => {
        if (auth?.user?.language && i18n.language !== auth.user.language) {
            i18n.changeLanguage(auth.user.language);
        }
    }, [auth?.user?.language, i18n]);

    const changeLanguage = useCallback(
        async (language: Language) => {
            // Update i18next
            await i18n.changeLanguage(language);

            // Store in localStorage for client-side persistence
            localStorage.setItem('language', language);

            // Store in cookie for SSR
            setCookie('language', language);

            // Update server-side via Inertia (will update database)
            router.patch(
                '/account/language',
                { language },
                {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['auth'],
                },
            );
        },
        [i18n],
    );

    return {
        language: i18n.language as Language,
        changeLanguage,
        availableLanguages: ['en', 'es', 'fr', 'de', 'ro'] as Language[],
    } as const;
}
