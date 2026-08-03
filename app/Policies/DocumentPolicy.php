<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Deliverable;
use App\Models\Document;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkOrder;

class DocumentPolicy
{
    /**
     * Determine if the user can view the document.
     *
     * Document access inherits from parent entity:
     * - Project documents require project view permission
     * - Team documents require team membership
     */
    public function view(User $user, Document $document): bool
    {
        // User must be in the same team
        if ($user->currentTeam?->id !== $document->team_id) {
            return false;
        }

        // Check access based on documentable type
        return $this->canAccessParentEntity($user, $document);
    }

    /**
     * Determine if the user can create documents.
     *
     * Requires team membership and access to the parent entity.
     */
    public function create(User $user, Document $document): bool
    {
        // User must be in the same team
        if ($user->currentTeam?->id !== $document->team_id) {
            return false;
        }

        // Check access based on documentable type
        return $this->canAccessParentEntity($user, $document);
    }

    /**
     * Determine if the user can update the document.
     *
     * Document access inherits from parent entity.
     */
    public function update(User $user, Document $document): bool
    {
        // User must be in the same team
        if ($user->currentTeam?->id !== $document->team_id) {
            return false;
        }

        // Check access based on documentable type
        return $this->canAccessParentEntity($user, $document);
    }

    /**
     * Determine if the user can delete the document.
     *
     * Document deletion inherits from parent entity.
     */
    public function delete(User $user, Document $document): bool
    {
        // User must be in the same team
        if ($user->currentTeam?->id !== $document->team_id) {
            return false;
        }

        // Check access based on documentable type
        return $this->canAccessParentEntity($user, $document);
    }

    /**
     * Determine if the user can create share links for the document.
     *
     * Share permission inherits from parent entity.
     */
    public function share(User $user, Document $document): bool
    {
        // User must be in the same team
        if ($user->currentTeam?->id !== $document->team_id) {
            return false;
        }

        // Check access based on documentable type
        return $this->canAccessParentEntity($user, $document);
    }

    /**
     * Check if the user can access the document's parent entity.
     */
    private function canAccessParentEntity(User $user, Document $document): bool
    {
        $documentable = $document->documentable;

        if ($documentable === null) {
            // If no parent entity, just require team membership
            return true;
        }

        // Check based on documentable type
        if ($documentable instanceof Project) {
            return $this->canAccessProject($user, $documentable);
        }

        if ($documentable instanceof Team) {
            // Team documents just require team membership (already checked above)
            return true;
        }

        // Work orders, tasks and deliverables carry their own visibility, inherited from the
        // project that contains them. A bare team check here would hand back the documents of
        // work the user has just been refused.
        if ($documentable instanceof WorkOrder
            || $documentable instanceof Task
            || $documentable instanceof Deliverable
        ) {
            return $user->currentTeam?->id === $documentable->team_id
                && $documentable->isVisibleTo($user->id);
        }

        if (property_exists($documentable, 'team_id')) {
            return $user->currentTeam?->id === $documentable->team_id;
        }

        // Default: allow if same team (already checked above)
        return true;
    }

    /**
     * Check if user can access a project.
     */
    private function canAccessProject(User $user, Project $project): bool
    {
        // User must be in the same team
        if ($user->currentTeam?->id !== $project->team_id) {
            return false;
        }

        // If project is not private, all team members can view
        if (! $project->is_private) {
            return true;
        }

        // For private projects, check if user has visibility
        return $project->isVisibleTo($user->id);
    }
}
