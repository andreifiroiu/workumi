import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    TooltipProvider,
} from '@/components/ui/tooltip';
import { FileText, Bell, HelpCircle, Award } from 'lucide-react';
import type { CommunicationTypeSelectorProps, CommunicationType, CommunicationTypeOption } from '@/types/client-comms.d';

/**
 * Communication type options with labels and descriptions.
 * Matches backend CommunicationType enum.
 */
const communicationTypeOptions: CommunicationTypeOption[] = [
    {
        value: 'status_update',
        label: 'Status Update',
        description: 'Regular progress update on project or work order status',
    },
    {
        value: 'deliverable_notification',
        label: 'Deliverable Notification',
        description: 'Notification that a deliverable is ready or has changed status',
    },
    {
        value: 'clarification_request',
        label: 'Clarification Request',
        description: 'Request for additional information or clarification from the client',
    },
    {
        value: 'milestone_announcement',
        label: 'Milestone Announcement',
        description: 'Announcement of a completed milestone or significant achievement',
    },
];

/**
 * Get icon for communication type
 */
function getTypeIcon(type: CommunicationType) {
    switch (type) {
        case 'status_update':
            return FileText;
        case 'deliverable_notification':
            return Bell;
        case 'clarification_request':
            return HelpCircle;
        case 'milestone_announcement':
            return Award;
        default:
            return FileText;
    }
}

/**
 * CommunicationTypeSelector provides a dropdown to select the type of client communication.
 * Each option includes a description tooltip to help users understand the purpose.
 */
export function CommunicationTypeSelector({
    value,
    onChange,
    disabled = false,
}: CommunicationTypeSelectorProps) {
    return (
        <TooltipProvider>
            <Select
                value={value}
                onValueChange={(newValue) => onChange(newValue as CommunicationType)}
                disabled={disabled}
            >
                <SelectTrigger
                    className="w-full"
                    aria-label="Select communication type"
                >
                    <SelectValue placeholder="Select communication type" />
                </SelectTrigger>
                <SelectContent>
                    {communicationTypeOptions.map((option) => {
                        const Icon = getTypeIcon(option.value);
                        return (
                            <SelectItem
                                key={option.value}
                                value={option.value}
                                className="py-3"
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium">{option.label}</span>
                                        <span className="text-xs text-muted-foreground line-clamp-1">
                                            {option.description}
                                        </span>
                                    </div>
                                </div>
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
        </TooltipProvider>
    );
}

/**
 * Get label for a communication type value
 */
export function getCommunicationTypeLabel(type: CommunicationType | null | undefined): string {
    if (!type) return 'Unknown';
    const option = communicationTypeOptions.find((opt) => opt.value === type);
    return option?.label ?? type;
}

/**
 * Get description for a communication type value
 */
export function getCommunicationTypeDescription(type: CommunicationType | null | undefined): string {
    if (!type) return '';
    const option = communicationTypeOptions.find((opt) => opt.value === type);
    return option?.description ?? '';
}

export { communicationTypeOptions };
