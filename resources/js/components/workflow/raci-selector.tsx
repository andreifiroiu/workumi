import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronDown, X } from 'lucide-react';
import * as React from 'react';

/** Special value for "None" selection in Radix Select */
const NONE_VALUE = '__none__';

/** User object for RACI assignment */
export interface RaciUser {
    id: number;
    name: string;
    avatar?: string;
}

/** RACI value structure */
export interface RaciValue {
    responsible_id: number | null;
    accountable_id: number | null;
    consulted_ids: number[];
    informed_ids: number[];
}

/** Entity type for RACI assignment */
export type RaciEntityType = 'project' | 'work_order';

export interface RaciSelectorProps {
    /** Current RACI value */
    value: RaciValue;
    /** Callback when RACI value changes */
    onChange: (value: RaciValue) => void;
    /** Array of available users for selection */
    users: RaciUser[];
    /** Entity type being assigned (project or work_order) */
    entityType: RaciEntityType;
    /** Whether the selector is disabled */
    disabled?: boolean;
    /** Callback when a change requires confirmation (existing assignment being replaced) */
    onConfirmationRequired?: (
        role: RaciRole,
        currentUserId: number | null,
        newUserId: number | null,
    ) => void;
    /** Custom class name */
    className?: string;
}

/** RACI role types */
export type RaciRole = 'responsible' | 'accountable' | 'consulted' | 'informed';

/** Role configuration with descriptions */
const RACI_ROLES: Record<
    RaciRole,
    {
        label: string;
        description: string;
        required: boolean;
        multiSelect: boolean;
    }
> = {
    responsible: {
        label: 'Responsible',
        description: 'The person who does the work',
        required: false,
        multiSelect: false,
    },
    accountable: {
        label: 'Accountable',
        description: 'The person ultimately answerable',
        required: true,
        multiSelect: false,
    },
    consulted: {
        label: 'Consulted',
        description: 'People whose opinions are sought',
        required: false,
        multiSelect: true,
    },
    informed: {
        label: 'Informed',
        description: 'People kept up-to-date on progress',
        required: false,
        multiSelect: true,
    },
};

/**
 * Gets initials from a user name.
 */
function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * User avatar component for display within selects.
 */
function UserAvatar({
    user,
    size = 'sm',
}: {
    user: RaciUser;
    size?: 'sm' | 'md';
}) {
    const sizeClass = size === 'sm' ? 'size-6' : 'size-8';
    const textClass = size === 'sm' ? 'text-xs' : 'text-sm';

    return (
        <Avatar className={sizeClass}>
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className={textClass}>
                {getInitials(user.name)}
            </AvatarFallback>
        </Avatar>
    );
}

/**
 * Single-select field for R and A roles.
 */
function SingleSelectField({
    role,
    value,
    users,
    onChange,
    disabled,
}: {
    role: RaciRole;
    value: number | null;
    users: RaciUser[];
    onChange: (userId: number | null) => void;
    disabled?: boolean;
}) {
    const config = RACI_ROLES[role];
    const selectedUser = users.find((u) => u.id === value);

    const handleValueChange = (val: string) => {
        if (val === NONE_VALUE) {
            onChange(null);
        } else {
            onChange(parseInt(val, 10));
        }
    };

    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium">
                {config.label}
                {config.required && (
                    <span className="ml-1 text-destructive">*</span>
                )}
            </Label>
            <Select
                value={value?.toString() ?? ''}
                onValueChange={handleValueChange}
                disabled={disabled}
            >
                <SelectTrigger
                    className="w-full"
                    data-testid={`raci-${role}-trigger`}
                    aria-label={`Select ${config.label}`}
                >
                    <SelectValue
                        placeholder={`Select ${config.label.toLowerCase()}...`}
                    >
                        {selectedUser && (
                            <div className="flex items-center gap-2">
                                <UserAvatar user={selectedUser} />
                                <span className="truncate">
                                    {selectedUser.name}
                                </span>
                            </div>
                        )}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {!config.required && (
                        <SelectItem value={NONE_VALUE}>
                            <span className="text-muted-foreground">None</span>
                        </SelectItem>
                    )}
                    {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                            <div className="flex items-center gap-2">
                                <UserAvatar user={user} />
                                <span>{user.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
                {config.description}
            </p>
        </div>
    );
}

/**
 * Multi-select field for C and I roles using a popover with checkboxes.
 */
function MultiSelectField({
    role,
    value,
    users,
    onChange,
    disabled,
}: {
    role: RaciRole;
    value: number[];
    users: RaciUser[];
    onChange: (userIds: number[]) => void;
    disabled?: boolean;
}) {
    const config = RACI_ROLES[role];
    const selectedUsers = users.filter((u) => value.includes(u.id));
    const [open, setOpen] = React.useState(false);

    const handleToggle = (userId: number) => {
        if (value.includes(userId)) {
            onChange(value.filter((id) => id !== userId));
        } else {
            onChange([...value, userId]);
        }
    };

    const handleRemove = (userId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(value.filter((id) => id !== userId));
    };

    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium">{config.label}</Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-label={`Select ${config.label}`}
                        data-testid={`raci-${role}-trigger`}
                        className={cn(
                            'w-full justify-between font-normal',
                            !selectedUsers.length && 'text-muted-foreground',
                        )}
                        disabled={disabled}
                    >
                        {selectedUsers.length > 0 ? (
                            <div className="flex flex-wrap gap-1 py-0.5">
                                {selectedUsers.slice(0, 2).map((user) => (
                                    <Badge
                                        key={user.id}
                                        variant="secondary"
                                        className="flex items-center gap-1 pr-1"
                                    >
                                        <span className="max-w-[80px] truncate">
                                            {user.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) =>
                                                handleRemove(user.id, e)
                                            }
                                            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                                            aria-label={`Remove ${user.name}`}
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </Badge>
                                ))}
                                {selectedUsers.length > 2 && (
                                    <Badge variant="secondary">
                                        +{selectedUsers.length - 2}
                                    </Badge>
                                )}
                            </div>
                        ) : (
                            <span>Select {config.label.toLowerCase()}...</span>
                        )}
                        <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[min(280px,calc(100vw-2rem))] p-0"
                    align="start"
                >
                    <div className="max-h-[300px] overflow-y-auto p-2">
                        {users.length === 0 ? (
                            <p className="p-2 text-center text-sm text-muted-foreground">
                                No users available
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {users.map((user) => {
                                    const isChecked = value.includes(user.id);
                                    return (
                                        <label
                                            key={user.id}
                                            className={cn(
                                                'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent',
                                                isChecked && 'bg-accent/50',
                                            )}
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={() =>
                                                    handleToggle(user.id)
                                                }
                                                aria-label={user.name}
                                            />
                                            <UserAvatar user={user} />
                                            <span className="text-sm">
                                                {user.name}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
                {config.description}
            </p>
        </div>
    );
}

/**
 * RaciSelector component for assigning users to RACI roles.
 *
 * Provides a four-field layout for Responsible, Accountable, Consulted, and Informed.
 * - R and A use single-select (Radix UI Select)
 * - C and I use multi-select (Popover with Checkboxes)
 */
function RaciSelector({
    value,
    onChange,
    users,
    disabled = false,
    onConfirmationRequired,
    className,
}: RaciSelectorProps) {
    const handleSingleChange = (
        role: 'responsible' | 'accountable',
        userId: number | null,
    ) => {
        const currentValue =
            role === 'responsible'
                ? value.responsible_id
                : value.accountable_id;

        // Check if confirmation is required (existing assignment being replaced)
        if (
            currentValue !== null &&
            userId !== currentValue &&
            onConfirmationRequired
        ) {
            onConfirmationRequired(role, currentValue, userId);
            return;
        }

        onChange({
            ...value,
            [`${role}_id`]: userId,
        });
    };

    const handleMultiChange = (
        role: 'consulted' | 'informed',
        userIds: number[],
    ) => {
        onChange({
            ...value,
            [`${role}_ids`]: userIds,
        });
    };

    return (
        <div className={cn('space-y-6', className)}>
            <div className="grid gap-6 sm:grid-cols-2">
                <SingleSelectField
                    role="responsible"
                    value={value.responsible_id}
                    users={users}
                    onChange={(id) => handleSingleChange('responsible', id)}
                    disabled={disabled}
                />
                <SingleSelectField
                    role="accountable"
                    value={value.accountable_id}
                    users={users}
                    onChange={(id) => handleSingleChange('accountable', id)}
                    disabled={disabled}
                />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
                <MultiSelectField
                    role="consulted"
                    value={value.consulted_ids}
                    users={users}
                    onChange={(ids) => handleMultiChange('consulted', ids)}
                    disabled={disabled}
                />
                <MultiSelectField
                    role="informed"
                    value={value.informed_ids}
                    users={users}
                    onChange={(ids) => handleMultiChange('informed', ids)}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}

export { getInitials, RACI_ROLES, RaciSelector };
