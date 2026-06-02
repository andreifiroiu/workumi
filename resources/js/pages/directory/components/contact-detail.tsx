import { router } from '@inertiajs/react';
import {
    User,
    Mail,
    Phone,
    Building2,
    Briefcase,
    MessageSquare,
    Globe2,
    Tag as TagIcon,
    Calendar,
    Edit,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { Contact, Party } from '@/types/directory';

interface ContactDetailProps {
    contact: Contact;
    party?: Party;
    onEdit: (contact: Contact) => void;
}

const engagementTypeLabels: Record<string, string> = {
    requester: 'Requester',
    approver: 'Approver',
    stakeholder: 'Stakeholder',
    billing: 'Billing',
};

const engagementTypeColors: Record<string, string> = {
    requester: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    approver: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    stakeholder: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    billing: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
};

const commPrefLabels: Record<string, string> = {
    email: 'Email',
    phone: 'Phone',
    slack: 'Slack',
};

const commPrefIcons: Record<string, LucideIcon> = {
    email: Mail,
    phone: Phone,
    slack: MessageSquare,
};

export function ContactDetail({ contact, party, onEdit }: ContactDetailProps) {
    const handleDelete = () => {
        if (
            confirm(
                'Are you sure you want to delete this contact? This action cannot be undone.'
            )
        ) {
            router.delete(`/directory/contacts/${contact.id}`, {
                preserveScroll: true,
            });
        }
    };

    const CommIcon = commPrefIcons[contact.communicationPreference] || MessageSquare;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                        <h2 className="mb-2 text-2xl font-bold text-foreground">{contact.name}</h2>
                        {contact.title && (
                            <p className="mb-2 text-muted-foreground">{contact.title}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant="outline"
                                className={engagementTypeColors[contact.engagementType] || ''}
                            >
                                {engagementTypeLabels[contact.engagementType] ||
                                    contact.engagementType}
                            </Badge>
                            <Badge variant={contact.status === 'active' ? 'default' : 'secondary'}>
                                {contact.status}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(contact)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDelete}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                </div>
            </div>

            <Separator />

            {/* Organization */}
            {party && (
                <>
                    <div>
                        <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                            Organization
                        </h3>
                        <div
                            className="cursor-pointer rounded-lg border border-border bg-muted/50 p-3 transition-colors hover:bg-muted"
                            onClick={() => {
                                /* This will be handled by parent to open party detail */
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium text-foreground">{party.name}</p>
                            </div>
                        </div>
                    </div>
                    <Separator />
                </>
            )}

            {/* Contact Information */}
            <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                    Contact Information
                </h3>
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium text-foreground">Email</p>
                            <a
                                href={`mailto:${contact.email}`}
                                className="text-sm text-primary hover:underline"
                            >
                                {contact.email}
                            </a>
                        </div>
                    </div>
                    {contact.phone && (
                        <div className="flex items-start gap-3">
                            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Phone</p>
                                <a
                                    href={`tel:${contact.phone}`}
                                    className="text-sm text-primary hover:underline"
                                >
                                    {contact.phone}
                                </a>
                            </div>
                        </div>
                    )}
                    {contact.timezone && (
                        <div className="flex items-start gap-3">
                            <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Timezone</p>
                                <p className="text-sm text-muted-foreground">{contact.timezone}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Role & Engagement */}
            {(contact.role || contact.engagementType) && (
                <>
                    <Separator />
                    <div>
                        <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                            Role & Engagement
                        </h3>
                        <div className="space-y-3">
                            {contact.role && (
                                <div className="flex items-start gap-3">
                                    <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Role</p>
                                        <p className="text-sm text-muted-foreground">
                                            {contact.role}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-3">
                                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        Engagement Type
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {engagementTypeLabels[contact.engagementType] ||
                                            contact.engagementType}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Communication Preferences */}
            <Separator />
            <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                    Communication Preferences
                </h3>
                <div className="flex items-start gap-3">
                    <CommIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                        <p className="text-sm font-medium text-foreground">Preferred Method</p>
                        <p className="text-sm text-muted-foreground">
                            {commPrefLabels[contact.communicationPreference] ||
                                contact.communicationPreference}
                        </p>
                    </div>
                </div>
            </div>

            {/* Notes */}
            {contact.notes && (
                <>
                    <Separator />
                    <div>
                        <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                            Notes
                        </h3>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {contact.notes}
                        </p>
                    </div>
                </>
            )}

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
                <>
                    <Separator />
                    <div>
                        <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                            <TagIcon className="mr-2 inline-block h-4 w-4" />
                            Tags
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {contact.tags.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Metadata */}
            <Separator />
            <div>
                <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                    Metadata
                </h3>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Created {new Date(contact.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
