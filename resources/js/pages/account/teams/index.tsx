import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Check, Plus, Trash2 } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Teams', href: '/account/teams' },
];

interface Team {
    id: number;
    name: string;
    slug?: string;
    user_id: number;
    created_at: string;
    updated_at: string;
    is_owner: boolean;
    is_current: boolean;
}

interface Props {
    teams: Team[];
    currentTeamId: number;
}

export default function TeamsIndex({ teams }: Props) {
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

    const createForm = useForm({
        name: '',
    });

    const handleCreateTeam = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/account/teams', {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setCreateDialogOpen(false);
            },
        });
    };

    const handleSwitchTeam = (teamId: number) => {
        router.post(
            `/account/teams/${teamId}/switch`,
            {},
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleDeleteTeam = () => {
        if (!teamToDelete) return;

        router.delete(`/account/teams/${teamToDelete.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteDialogOpen(false);
                setTeamToDelete(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teams" />

            <SettingsLayout>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <HeadingSmall
                            title="Teams"
                            description="Manage your teams and switch between them"
                        />

                        <Dialog
                            open={createDialogOpen}
                            onOpenChange={setCreateDialogOpen}
                        >
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Team
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <form onSubmit={handleCreateTeam}>
                                    <DialogHeader>
                                        <DialogTitle>Create New Team</DialogTitle>
                                        <DialogDescription>
                                            Create a new team to organize your
                                            work.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">
                                                Team Name
                                            </Label>
                                            <Input
                                                id="name"
                                                value={createForm.data.name}
                                                onChange={(e) =>
                                                    createForm.setData(
                                                        'name',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="My Team"
                                            />
                                            <InputError
                                                message={createForm.errors.name}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            type="submit"
                                            disabled={createForm.processing}
                                        >
                                            Create Team
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid gap-4">
                        {teams.map((team) => (
                            <Card key={team.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="flex items-center gap-2">
                                                {team.name}
                                                {team.is_current && (
                                                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
                                                        <Check className="h-3 w-3" />
                                                        Current
                                                    </span>
                                                )}
                                            </CardTitle>
                                            <CardDescription>
                                                {team.is_owner
                                                    ? 'You own this team'
                                                    : 'Member'}
                                            </CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            {!team.is_current && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleSwitchTeam(team.id)
                                                    }
                                                >
                                                    Switch
                                                </Button>
                                            )}
                                            {team.is_owner && teams.length > 1 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setTeamToDelete(team);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            </SettingsLayout>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Team</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{teamToDelete?.name}
                            "? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteTeam}>
                            Delete Team
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
