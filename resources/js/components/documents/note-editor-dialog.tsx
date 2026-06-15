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
import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';

const MdxNoteEditor = lazy(() => import('./mdx-note-editor'));

export interface NoteDocument {
    id: string;
    name: string;
    content?: string | null;
    folderId?: string | null;
}

interface NoteEditorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Existing note to edit, or null when creating a new note. */
    note: NoteDocument | null;
    /** URL to POST a new note to. */
    createUrl: string;
    /** Prefix for PATCH updates; the note id is appended (e.g. `/work/work-orders/1/notes`). */
    updateUrlPrefix: string;
    /** Folder the new note should be created in. */
    folderId?: string | null;
}

const stripMdExtension = (name: string): string => name.replace(/\.md$/i, '');

export function NoteEditorDialog({
    open,
    onOpenChange,
    note,
    createUrl,
    updateUrlPrefix,
    folderId,
}: NoteEditorDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[80vh] max-w-3xl flex-col">
                {/* Keyed so the form re-initializes whenever a different note is opened. */}
                <NoteEditorForm
                    key={note?.id ?? 'new'}
                    note={note}
                    createUrl={createUrl}
                    updateUrlPrefix={updateUrlPrefix}
                    folderId={folderId}
                    onClose={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

interface NoteEditorFormProps {
    note: NoteDocument | null;
    createUrl: string;
    updateUrlPrefix: string;
    folderId?: string | null;
    onClose: () => void;
}

function NoteEditorForm({
    note,
    createUrl,
    updateUrlPrefix,
    folderId,
    onClose,
}: NoteEditorFormProps) {
    const [name, setName] = useState(note ? stripMdExtension(note.name) : '');
    const [content, setContent] = useState(note?.content ?? '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            return;
        }

        setIsSaving(true);
        const payload = { name: trimmedName, content };
        const options = {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setIsSaving(false),
        };

        if (note) {
            router.patch(`${updateUrlPrefix}/${note.id}`, payload, options);
        } else {
            router.post(
                createUrl,
                { ...payload, folder_id: folderId ?? null },
                options,
            );
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{note ? 'Edit note' : 'New note'}</DialogTitle>
                <DialogDescription>
                    Formatting is saved as Markdown (.md) in the Documents
                    section.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-1">
                <label
                    htmlFor="note-name"
                    className="text-sm font-medium text-foreground"
                >
                    Title
                </label>
                <div className="flex items-center gap-2">
                    <Input
                        id="note-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Meeting notes"
                    />
                    <span className="text-sm text-muted-foreground">.md</span>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
                <Suspense
                    fallback={
                        <div className="flex h-full items-center justify-center rounded-md border border-input">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    }
                >
                    <MdxNoteEditor
                        markdown={note?.content ?? ''}
                        onChange={setContent}
                    />
                </Suspense>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isSaving}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !name.trim()}
                >
                    {isSaving ? 'Saving…' : 'Save note'}
                </Button>
            </DialogFooter>
        </>
    );
}
