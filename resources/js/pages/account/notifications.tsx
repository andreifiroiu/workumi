import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

interface NotificationChannel {
    key: string;
    label: string;
    enabled: boolean;
}

interface NotificationType {
    key: string;
    label: string;
    description: string;
}

interface NotificationsProps {
    dailyDigestHour: number;
    channels: NotificationChannel[];
    types: NotificationType[];
    preferences: Record<string, Record<string, boolean>>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Notification settings',
        href: '/account/notifications',
    },
];

const hourOptions = Array.from({ length: 24 }, (_, hour) => ({
    value: hour,
    label: `${hour.toString().padStart(2, '0')}:00`,
}));

const fieldName = (channel: string, type: string) => `${channel}_${type}`;

export default function Notifications({
    dailyDigestHour,
    channels,
    types,
    preferences,
}: NotificationsProps) {
    const { t } = useTranslation('settings');

    const initialMatrix: Record<string, boolean> = {};
    types.forEach((type) => {
        channels.forEach((channel) => {
            if (channel.enabled) {
                initialMatrix[fieldName(channel.key, type.key)] =
                    preferences[type.key]?.[channel.key] ?? false;
            }
        });
    });

    const form = useForm<Record<string, number | boolean>>({
        daily_digest_hour: dailyDigestHour,
        ...initialMatrix,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.patch('/account/notifications', {
            preserveScroll: true,
        });
    };

    const digestEmailOn = (form.data.email_daily_digest as boolean) ?? true;

    const gridTemplateColumns = `minmax(0, 1fr) repeat(${channels.length}, 4.5rem)`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('notifications.title')} />

            <SettingsLayout>
                <div className="space-y-8">
                    <HeadingSmall
                        title={t('notifications.title')}
                        description={t('notifications.description')}
                    />

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid gap-2">
                            <Label htmlFor="daily_digest_hour">
                                {t('notifications.hour_label')}
                            </Label>

                            <Select
                                value={String(form.data.daily_digest_hour)}
                                onValueChange={(value) =>
                                    form.setData(
                                        'daily_digest_hour',
                                        Number(value),
                                    )
                                }
                                disabled={!digestEmailOn}
                            >
                                <SelectTrigger className="w-full max-w-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {hourOptions.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={String(option.value)}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <p className="text-sm text-muted-foreground">
                                {t('notifications.hour_help')}
                            </p>

                            <InputError
                                className="mt-2"
                                message={form.errors.daily_digest_hour}
                            />
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-sm font-medium">
                                {t('notifications.matrix_heading')}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {t('notifications.matrix_description')}
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Channel column headers */}
                            <div
                                className="grid items-end gap-4"
                                style={{ gridTemplateColumns }}
                            >
                                <span />
                                {channels.map((channel) => (
                                    <div
                                        key={channel.key}
                                        className="flex flex-col items-center gap-1 text-center"
                                    >
                                        <span className="text-sm font-medium">
                                            {channel.label}
                                        </span>
                                        {!channel.enabled && (
                                            <span className="text-[10px] text-muted-foreground uppercase">
                                                {t('notifications.coming_soon')}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {types.map((type) => (
                                <div
                                    key={type.key}
                                    className="grid items-center gap-4 border-t pt-4"
                                    style={{ gridTemplateColumns }}
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium">
                                            {type.label}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {type.description}
                                        </p>
                                    </div>

                                    {channels.map((channel) => {
                                        const name = fieldName(
                                            channel.key,
                                            type.key,
                                        );
                                        const checked = channel.enabled
                                            ? (form.data[name] as boolean)
                                            : (preferences[type.key]?.[
                                                  channel.key
                                              ] ?? false);

                                        return (
                                            <div
                                                key={channel.key}
                                                className="flex justify-center"
                                            >
                                                <Switch
                                                    checked={checked}
                                                    onCheckedChange={(value) =>
                                                        form.setData(
                                                            name,
                                                            value,
                                                        )
                                                    }
                                                    disabled={
                                                        !channel.enabled ||
                                                        form.processing
                                                    }
                                                    aria-label={`${type.label} — ${channel.label}`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                disabled={form.processing}
                                data-test="update-notifications-button"
                            >
                                {t('notifications.save')}
                            </Button>

                            <Transition
                                show={form.recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">
                                    {t('notifications.saved')}
                                </p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
