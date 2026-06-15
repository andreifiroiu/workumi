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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

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
                    Notes are saved as Markdown (.md) files in the Documents
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

            <Tabs defaultValue="write" className="flex min-h-0 flex-1 flex-col">
                <TabsList className="w-fit">
                    <TabsTrigger value="write">Write</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="write" className="min-h-0 flex-1">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your note in Markdown…"
                        className="h-full w-full resize-none rounded-md border border-input bg-background p-3 font-mono text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                    />
                </TabsContent>
                <TabsContent
                    value="preview"
                    className="min-h-0 flex-1 overflow-auto rounded-md border border-input p-3"
                >
                    {content.trim() ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{content}</ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Nothing to preview yet.
                        </p>
                    )}
                </TabsContent>
            </Tabs>

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
