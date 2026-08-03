<?php

declare(strict_types=1);

namespace App\Http\Controllers\Work;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectMemberRequest;
use App\Models\AuditLog;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ProjectMemberController extends Controller
{
    /**
     * Grant one or more team members explicit access to the project.
     */
    public function store(StoreProjectMemberRequest $request, Project $project): RedirectResponse
    {
        $this->authorize('manageMembers', $project);

        $existingIds = $project->memberships()->pluck('user_id')->all();
        $newIds = array_values(array_diff($request->validated()['user_ids'], $existingIds));

        if ($newIds === []) {
            return back()->with('status', 'Those people are already members of this project.');
        }

        // attach() rather than syncWithoutDetaching() so an existing row's added_by_id is never
        // rewritten - re-adding someone must not erase who originally granted their access.
        try {
            $project->members()->attach(
                collect($newIds)
                    ->mapWithKeys(fn ($id) => [(int) $id => ['added_by_id' => $request->user()->id]])
                    ->all()
            );
        } catch (UniqueConstraintViolationException) {
            // Someone added the same person between the diff above and this insert.
            return back()->with('status', 'Those people are already members of this project.');
        }

        $this->logMemberChange(
            $request,
            $project,
            'project_members_added',
            sprintf('Added %d member(s) to project', count($newIds)),
        );

        return back()->with('status', count($newIds) === 1
            ? 'Member added successfully.'
            : count($newIds).' members added successfully.');
    }

    /**
     * Revoke an explicitly granted membership.
     *
     * Only explicit memberships are removable here. Access derived from ownership or a RACI role has
     * no membership row, so it is structurally out of reach of this endpoint.
     */
    public function destroy(Request $request, Project $project, User $user): RedirectResponse
    {
        $this->authorize('manageMembers', $project);

        if (! $project->memberships()->where('user_id', $user->id)->exists()) {
            abort(404, 'This user is not an explicit member of the project.');
        }

        $project->members()->detach($user->id);

        $this->logMemberChange(
            $request,
            $project,
            'project_member_removed',
            sprintf('Removed %s from project', $user->name),
        );

        // A stale relation would tell isVisibleTo the membership still exists.
        $project->unsetRelation('members');

        $isSelf = $request->user()->id === $user->id;

        // Going back to a project the actor can no longer open would dead-end on a 403.
        if (! $project->isVisibleTo($request->user()->id)) {
            return redirect()->route('work')->with('status', "You've left {$project->name}.");
        }

        return back()->with('status', $isSelf
            ? "You've left the project."
            : "{$user->name} was removed from the project.");
    }

    private function logMemberChange(Request $request, Project $project, string $action, string $details): void
    {
        $actor = $request->user();

        AuditLog::log(
            team: $project->team,
            actorType: 'user',
            actorId: (string) $actor->id,
            actorName: $actor->name,
            action: $action,
            details: $details,
            target: 'Project',
            targetId: (string) $project->id,
            ipAddress: $request->ip(),
        );
    }
}
