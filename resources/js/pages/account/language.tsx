import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/hooks/use-language';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Language settings',
        href: '/account/language',
    },
];

const languageNames: Record<string, string> = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    ro: 'Română',
};

export default function Language({
    availableLocales,
}: {
    availableLocales: string[];
}) {
    const { t } = useTranslation('settings');
    const { t: tCommon } = useTranslation('common');
    const { language, changeLanguage } = useLanguage();
    const [selectedLanguage, setSelectedLanguage] = useState(language);

    const { processing, recentlySuccessful } = useForm({
        language: language,
    });

    const handleLanguageChange = (newLanguage: string) => {
        setSelectedLanguage(newLanguage as 'en' | 'es' | 'fr' | 'de' | 'ro');
        changeLanguage(newLanguage as 'en' | 'es' | 'fr' | 'de' | 'ro');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('language.title')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title={t('language.title')}
                        description={t('language.description')}
                    />

                    <form className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="language">
                                {t('language.label')}
                            </Label>

                            <Select
                                value={selectedLanguage}
                                onValueChange={handleLanguageChange}
                                name="language"
                            >
                                <SelectTrigger className="w-full max-w-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableLocales.map((locale) => (
                                        <SelectItem
                                            key={locale}
                                            value={locale}
                                        >
                                            {languageNames[locale]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing} type="button">
                                {tCommon('save')}
                            </Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">
                                    {t('language.updated')}
                                </p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
