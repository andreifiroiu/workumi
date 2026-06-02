import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { InertiaFormProps } from '@inertiajs/react';
import type { TemplateContent, TemplateType } from '@/types/playbooks';

interface TemplateFormProps {
    form: InertiaFormProps<{
        type: string;
        name: string;
        description: string;
        content: TemplateContent;
        tags: string[];
        aiGenerated: boolean;
    }>;
}

export function TemplateForm({ form }: TemplateFormProps) {
    const content = form.data.content as TemplateContent;

    const handleStructureChange = (value: string) => {
        try {
            const parsed = JSON.parse(value);
            form.setData('content', {
                ...content,
                structure: parsed,
            });
        } catch {
            // Invalid JSON, update anyway to show the user their input
            form.setData('content', {
                ...content,
                structure: { _raw: value },
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Template Type */}
            <div className="space-y-2">
                <Label htmlFor="templateType">Template Type</Label>
                <Select
                    value={content.templateType}
                    onValueChange={(value: TemplateType) =>
                        form.setData('content', {
                            ...content,
                            templateType: value,
                        })
                    }
                >
                    <SelectTrigger id="templateType">
                        <SelectValue placeholder="Select template type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="project">Project Template</SelectItem>
                        <SelectItem value="work-order">Work Order Template</SelectItem>
                        <SelectItem value="document">Document Template</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Choose what this template will be used to create
                </p>
            </div>

            {/* Template Structure */}
            <div className="space-y-2">
                <Label htmlFor="structure">Template Structure (JSON)</Label>
                <textarea
                    id="structure"
                    value={JSON.stringify(content.structure, null, 2)}
                    onChange={(e) => handleStructureChange(e.target.value)}
                    placeholder={`{\n  "example": "Define your template structure here",\n  "fields": ["field1", "field2"]\n}`}
                    rows={12}
                    className="font-mono flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                    Define the structure of your template in JSON format
                </p>
            </div>

            {/* Help Text */}
            <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="mb-2 text-sm font-semibold">Template Examples</h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                    <p>
                        <strong>Project Template:</strong> Define phases, milestones,
                        default team members
                    </p>
                    <p>
                        <strong>Work Order Template:</strong> Standard fields, default
                        assignees, checklists
                    </p>
                    <p>
                        <strong>Document Template:</strong> Sections, headings, boilerplate
                        content
                    </p>
                </div>
            </div>
        </div>
    );
}
