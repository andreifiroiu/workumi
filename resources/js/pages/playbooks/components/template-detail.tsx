import { Separator } from '@/components/ui/separator';
import { FileStack, Briefcase, FileText } from 'lucide-react';
import type { TemplatePlaybook } from '@/types/playbooks';

interface TemplateDetailProps {
    playbook: TemplatePlaybook;
}

function TemplateTypeIcon({ type }: { type: string }) {
    const className = 'size-5 text-muted-foreground';
    switch (type) {
        case 'project':
            return <Briefcase className={className} />;
        case 'work-order':
            return <FileStack className={className} />;
        case 'document':
            return <FileText className={className} />;
        default:
            return <FileStack className={className} />;
    }
}

export function TemplateDetail({ playbook }: TemplateDetailProps) {
    const content = playbook.content;

    const getTemplateTypeLabel = (type: string) => {
        switch (type) {
            case 'project':
                return 'Project Template';
            case 'work-order':
                return 'Work Order Template';
            case 'document':
                return 'Document Template';
            default:
                return 'Template';
        }
    };

    return (
        <div className="space-y-6">
            {/* Template Type */}
            <div>
                <h3 className="mb-3 text-sm font-semibold">Template Type</h3>
                <div className="flex items-center gap-2 rounded-lg border p-3">
                    <TemplateTypeIcon type={content.templateType} />
                    <span className="font-medium">
                        {getTemplateTypeLabel(content.templateType)}
                    </span>
                </div>
            </div>

            <Separator />

            {/* Structure Preview */}
            <div>
                <h3 className="mb-3 text-sm font-semibold">Template Structure</h3>
                {content.structure && Object.keys(content.structure).length > 0 ? (
                    <div className="rounded-lg border">
                        <pre className="overflow-x-auto p-4 text-xs">
                            {JSON.stringify(content.structure, null, 2)}
                        </pre>
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                        <p className="text-sm text-muted-foreground">
                            No template structure defined yet.
                        </p>
                    </div>
                )}
            </div>

            {/* Template Instructions */}
            <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="mb-2 text-sm font-semibold">How to Use This Template</h4>
                <p className="text-xs text-muted-foreground">
                    This template can be applied to new {content.templateType === 'project' ? 'projects' : content.templateType === 'work-order' ? 'work orders' : 'documents'} to
                    ensure consistency and save time. The structure defined above will be used
                    as a starting point when creating new items from this template.
                </p>
            </div>
        </div>
    );
}
