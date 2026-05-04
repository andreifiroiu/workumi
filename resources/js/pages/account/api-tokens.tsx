import ApiTokenController from '@/actions/App/Http/Controllers/Settings/ApiTokenController';
import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Check, Copy, Key, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface PersonalAccessToken {
    id: number;
    name: string;
    abilities: string[];
    lastUsedAt: string | null;
    createdAt: string;
}

interface Props {
    tokens: PersonalAccessToken[];
    newToken: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'API Tokens', href: '/account/api-tokens' },
];

export default function ApiTokens({ tokens, newToken }: Props) {
    const [generateOpen, setGenerateOpen] = useState(false);
    const [revokeToken, setRevokeToken] = useState<PersonalAccessToken | null>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="API Tokens" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="API Tokens"
                        description="Personal access tokens let you authenticate to the Workumi MCP server and API from external tools like Claude Code or Claude.ai."
                    />

                    {newToken && <NewTokenAlert token={newToken} />}

                    <div className="space-y-3">
                        {tokens.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No tokens yet. Generate one to get started.
                            </p>
                        ) : (
                            tokens.map((token) => (
                                <TokenRow
                                    key={token.id}
                                    token={token}
                                    onRevoke={() => setRevokeToken(token)}
                                />
                            ))
                        )}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGenerateOpen(true)}
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Generate new token
                    </Button>
                </div>
            </SettingsLayout>

            <GenerateTokenDialog
                open={generateOpen}
                onOpenChange={setGenerateOpen}
            />

            <RevokeTokenDialog
                token={revokeToken}
                onOpenChange={(open) => {
                    if (!open) setRevokeToken(null);
                }}
            />
        </AppLayout>
    );
}

function TokenRow({
    token,
    onRevoke,
}: {
    token: PersonalAccessToken;
    onRevoke: () => void;
}) {
    const createdAt = new Date(token.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    const lastUsed = token.lastUsedAt
        ? new Date(token.lastUsedAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          })
        : 'Never';

    const isReadOnly = !token.abilities.includes('*') && !token.abilities.includes('write');

    return (
        <div className="flex items-center justify-between rounded-md border px-4 py-3">
            <div className="flex items-center gap-3">
                <Key className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{token.name}</p>
                        {isReadOnly && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                Read only
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Created {createdAt} · Last used {lastUsed}
                    </p>
                </div>
            </div>
            <Button
                variant="ghost"
                size="icon"
                onClick={onRevoke}
                title="Revoke token"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

function NewTokenAlert({ token }: { token: string }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
            <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-200">
                Token generated — copy it now. It won't be shown again.
            </p>
            <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-white px-3 py-2 font-mono text-xs dark:bg-black/20">
                    {token}
                </code>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copy}
                    className="shrink-0"
                >
                    {copied ? (
                        <Check className="h-3.5 w-3.5" />
                    ) : (
                        <Copy className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1.5">{copied ? 'Copied' : 'Copy'}</span>
                </Button>
            </div>
        </div>
    );
}

function GenerateTokenDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm({ name: '', access: 'full' as 'full' | 'read' });

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            form.reset();
            form.clearErrors();
        }
        onOpenChange(isOpen);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(ApiTokenController.store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                handleOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate API Token</DialogTitle>
                    <DialogDescription>
                        Give this token a descriptive name so you know where it's used.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="token-name">Token name</Label>
                        <Input
                            id="token-name"
                            placeholder="e.g. Claude Code — MacBook"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            autoFocus
                        />
                        {form.errors.name && (
                            <p className="text-sm text-destructive">
                                {form.errors.name}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Access level</Label>
                        <div className="flex flex-col gap-2">
                            {(['full', 'read'] as const).map((value) => (
                                <label
                                    key={value}
                                    className="flex cursor-pointer items-center gap-2"
                                >
                                    <input
                                        type="radio"
                                        name="access"
                                        value={value}
                                        checked={form.data.access === value}
                                        onChange={() => form.setData('access', value)}
                                        className="accent-primary"
                                    />
                                    <span className="text-sm">
                                        {value === 'full' ? 'Full access' : 'Read only'}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {form.data.access === 'read'
                                ? 'This token can only read data. Write operations will be rejected.'
                                : 'This token can read and write all data in your team.'}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={form.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing || !form.data.name.trim()}
                        >
                            {form.processing ? 'Generating...' : 'Generate token'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function RevokeTokenDialog({
    token,
    onOpenChange,
}: {
    token: PersonalAccessToken | null;
    onOpenChange: (open: boolean) => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRevoke = () => {
        if (!token) return;
        setIsSubmitting(true);
        router.delete(ApiTokenController.destroy.url(token.id), {
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                onOpenChange(false);
            },
            onError: () => {
                setIsSubmitting(false);
            },
        });
    };

    return (
        <AlertDialog open={token !== null} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Revoke token?</AlertDialogTitle>
                    <AlertDialogDescription>
                        <strong>{token?.name}</strong> will be permanently revoked.
                        Any tool or integration using it will lose access immediately.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleRevoke}
                        disabled={isSubmitting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isSubmitting ? 'Revoking...' : 'Revoke token'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
