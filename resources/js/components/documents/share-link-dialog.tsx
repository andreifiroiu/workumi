import { useState, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Copy, Check, Eye, EyeOff, Link2, AlertCircle } from 'lucide-react';
import type { DocumentShareLink, ShareLinkDialogProps } from '@/types/documents.d';
import shareLinks from '@/routes/documents/share-links';
import { getCsrfToken } from '@/lib/csrf';

const EXPIRATION_OPTIONS = [
    { value: '1', label: '1 day' },
    { value: '7', label: '7 days' },
    { value: '30', label: '30 days' },
    { value: '90', label: '90 days' },
    { value: 'custom', label: 'Custom' },
    { value: 'never', label: 'Never expires' },
];

export function ShareLinkDialog({
    documentId,
    isOpen,
    onOpenChange,
    onCreated,
}: ShareLinkDialogProps) {
    const [expirationOption, setExpirationOption] = useState<string>('7');
    const [customDays, setCustomDays] = useState<string>('');
    const [enablePassword, setEnablePassword] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [allowDownload, setAllowDownload] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdLink, setCreatedLink] = useState<DocumentShareLink | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = useCallback(() => {
        setExpirationOption('7');
        setCustomDays('');
        setEnablePassword(false);
        setPassword('');
        setShowPassword(false);
        setAllowDownload(true);
        setCreatedLink(null);
        setCopied(false);
        setError(null);
    }, []);

    const handleOpenChange = useCallback(
        (open: boolean) => {
            if (!open) {
                resetForm();
            }
            onOpenChange(open);
        },
        [onOpenChange, resetForm]
    );

    const getExpirationDays = (): number | null => {
        if (expirationOption === 'never') {
            return null;
        }
        if (expirationOption === 'custom') {
            const days = parseInt(customDays, 10);
            return isNaN(days) || days < 1 ? null : days;
        }
        return parseInt(expirationOption, 10);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // Convert documentId to number for route helper
            const docId = typeof documentId === 'string' ? parseInt(documentId, 10) : documentId;
            const response = await fetch(shareLinks.store.url({ document: docId }), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    expires_in_days: getExpirationDays(),
                    password: enablePassword && password ? password : null,
                    allow_download: allowDownload,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to create share link');
            }

            const data = await response.json();
            setCreatedLink(data.shareLink);
            onCreated?.(data.shareLink);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = () => {
        if (!createdLink?.url) {
            return;
        }

        const textArea = document.createElement('textarea');
        textArea.value = createdLink.url;

        // Make it visible but off-screen to ensure it can be selected
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';

        document.body.appendChild(textArea);

        // Save current focus
        const activeElement = document.activeElement as HTMLElement;

        textArea.focus();
        textArea.setSelectionRange(0, textArea.value.length);

        let success = false;
        try {
            success = document.execCommand('copy');
        } catch (err) {
            console.error('execCommand error:', err);
        }

        document.body.removeChild(textArea);

        // Restore focus
        if (activeElement) {
            activeElement.focus();
        }

        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } else {
            console.error('execCommand returned false');
            setError('Failed to copy to clipboard');
        }
    };

    const handleCreateAnother = () => {
        resetForm();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5" aria-hidden="true" />
                        Create Share Link
                    </DialogTitle>
                    <DialogDescription>
                        {createdLink
                            ? 'Your share link has been created. Copy it to share with others.'
                            : 'Configure the settings for your share link.'}
                    </DialogDescription>
                </DialogHeader>

                {createdLink ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
                            <Input
                                value={createdLink.url}
                                readOnly
                                className="flex-1 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                                aria-label="Share link URL"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={copyToClipboard}
                                aria-label={copied ? 'Copied' : 'Copy link'}
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        <div className="text-sm text-muted-foreground">
                            <p>
                                <strong>Expires:</strong>{' '}
                                {createdLink.expiresAt
                                    ? new Date(createdLink.expiresAt).toLocaleDateString()
                                    : 'Never'}
                            </p>
                            <p>
                                <strong>Password protected:</strong>{' '}
                                {createdLink.hasPassword ? 'Yes' : 'No'}
                            </p>
                            <p>
                                <strong>Downloads allowed:</strong>{' '}
                                {createdLink.allowDownload ? 'Yes' : 'No'}
                            </p>
                        </div>

                        <DialogFooter className="sm:justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCreateAnother}
                            >
                                Create Another
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleOpenChange(false)}
                            >
                                Done
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="expiration">Expiration</Label>
                            <Select
                                value={expirationOption}
                                onValueChange={setExpirationOption}
                            >
                                <SelectTrigger
                                    id="expiration"
                                    aria-label="Expiration"
                                >
                                    <SelectValue placeholder="Select expiration" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EXPIRATION_OPTIONS.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {expirationOption === 'custom' && (
                                <div className="mt-2">
                                    <Label htmlFor="customDays" className="sr-only">
                                        Custom days
                                    </Label>
                                    <Input
                                        id="customDays"
                                        type="number"
                                        min="1"
                                        max="365"
                                        placeholder="Number of days (1-365)"
                                        value={customDays}
                                        onChange={(e) => setCustomDays(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="enablePassword"
                                    checked={enablePassword}
                                    onCheckedChange={(checked) =>
                                        setEnablePassword(checked === true)
                                    }
                                    aria-label="Password protect"
                                />
                                <Label
                                    htmlFor="enablePassword"
                                    className="cursor-pointer"
                                >
                                    Password protect this link
                                </Label>
                            </div>

                            {enablePassword && (
                                <div className="space-y-2 pl-6">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter a password"
                                            className="pr-10"
                                            minLength={4}
                                            maxLength={100}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={
                                                showPassword
                                                    ? 'Hide password'
                                                    : 'Show password'
                                            }
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="allowDownload"
                                checked={allowDownload}
                                onCheckedChange={(checked) =>
                                    setAllowDownload(checked === true)
                                }
                                aria-label="Allow download"
                            />
                            <Label
                                htmlFor="allowDownload"
                                className="cursor-pointer"
                            >
                                Allow recipients to download
                            </Label>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Spinner className="mr-2" />}
                                Create Link
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
