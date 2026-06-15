import {
    BlockTypeSelect,
    BoldItalicUnderlineToggles,
    codeBlockPlugin,
    codeMirrorPlugin,
    CodeToggle,
    CreateLink,
    headingsPlugin,
    InsertTable,
    InsertThematicBreak,
    linkDialogPlugin,
    linkPlugin,
    listsPlugin,
    ListsToggle,
    markdownShortcutPlugin,
    MDXEditor,
    quotePlugin,
    Separator,
    tablePlugin,
    thematicBreakPlugin,
    toolbarPlugin,
    UndoRedo,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

interface MdxNoteEditorProps {
    /** Initial markdown content. Subsequent edits are reported via onChange. */
    markdown: string;
    onChange: (markdown: string) => void;
}

/**
 * WYSIWYG markdown editor for work order notes. The editor renders rich text
 * while reading and writing plain Markdown, so notes stay as `.md` documents.
 *
 * Loaded lazily so its (sizeable) dependencies stay out of the main bundle and
 * only load when a note is actually opened.
 */
export default function MdxNoteEditor({
    markdown,
    onChange,
}: MdxNoteEditorProps) {
    const isDark =
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark');

    return (
        <MDXEditor
            markdown={markdown}
            onChange={onChange}
            className={`mdx-note-editor h-full overflow-auto rounded-md border border-input ${
                isDark ? 'dark-theme' : ''
            }`}
            contentEditableClassName="prose prose-sm dark:prose-invert max-w-none min-h-[200px]"
            plugins={[
                headingsPlugin(),
                listsPlugin(),
                quotePlugin(),
                thematicBreakPlugin(),
                linkPlugin(),
                linkDialogPlugin(),
                tablePlugin(),
                codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
                codeMirrorPlugin({
                    codeBlockLanguages: {
                        txt: 'Plain text',
                        js: 'JavaScript',
                        ts: 'TypeScript',
                        tsx: 'TSX',
                        json: 'JSON',
                        bash: 'Bash',
                        php: 'PHP',
                        css: 'CSS',
                        html: 'HTML',
                    },
                }),
                markdownShortcutPlugin(),
                toolbarPlugin({
                    toolbarContents: () => (
                        <>
                            <UndoRedo />
                            <Separator />
                            <BoldItalicUnderlineToggles />
                            <CodeToggle />
                            <Separator />
                            <BlockTypeSelect />
                            <ListsToggle />
                            <Separator />
                            <CreateLink />
                            <InsertTable />
                            <InsertThematicBreak />
                        </>
                    ),
                }),
            ]}
        />
    );
}
