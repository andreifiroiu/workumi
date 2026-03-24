import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type Organization } from '@/types/workumi';
import { router, Link } from '@inertiajs/react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';

interface OrganizationSwitcherProps {
    currentOrganization: Organization;
    organizations: Organization[];
    className?: string;
}

export function OrganizationSwitcher({
    currentOrganization,
    organizations,
    className,
}: OrganizationSwitcherProps) {
    const switchOrganization = (orgId: number) => {
        router.post(
            `/settings/teams/${orgId}/switch`,
            {},
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-sidebar-accent ${className || ''}`}
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                        <span className="text-xs font-semibold">
                            {currentOrganization.name.substring(0, 2).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="truncate font-medium">
                            {currentOrganization.name}
                        </p>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="start">
                <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizations.map((org) => (
                    <DropdownMenuItem
                        key={org.id}
                        onClick={() => switchOrganization(org.id)}
                        className="flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-sidebar-primary/10 text-xs font-semibold">
                                {org.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span>{org.name}</span>
                        </div>
                        {org.id === currentOrganization.id && (
                            <Check className="h-4 w-4" />
                        )}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/settings/teams">
                        <Plus className="mr-2 h-4 w-4" />
                        Create organization
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
