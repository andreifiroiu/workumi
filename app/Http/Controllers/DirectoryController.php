<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Party;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DirectoryController extends Controller
{
    /**
     * Display the directory page with all parties, contacts, and team members.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            return redirect()->route('account.teams.index');
        }

        // Fetch all parties for the current team
        $parties = Party::forTeam($team->id)
            ->with(['primaryContact', 'contacts', 'projects'])
            ->orderBy('name')
            ->get()
            ->map(fn (Party $party) => [
                'id' => (string) $party->id,
                'name' => $party->name,
                'type' => $party->type->value,
                'status' => $party->status,
                'primaryContactId' => $party->primary_contact_id ? (string) $party->primary_contact_id : null,
                'primaryContactName' => $party->primaryContact?->name ?? $party->contact_name,
                'email' => $party->email ?? $party->contact_email,
                'phone' => $party->phone,
                'website' => $party->website,
                'address' => $party->address,
                'notes' => $party->notes,
                'tags' => $party->tags ?? [],
                'linkedContactIds' => $party->contacts->pluck('id')->map(fn ($id) => (string) $id)->toArray(),
                'linkedProjectIds' => $party->projects->pluck('id')->map(fn ($id) => (string) $id)->toArray(),
                'createdAt' => $party->created_at->toISOString(),
                'lastActivity' => $party->last_activity?->toISOString() ?? $party->updated_at->toISOString(),
            ]);

        // Fetch all contacts for the current team
        $contacts = Contact::forTeam($team->id)
            ->with('party')
            ->orderBy('name')
            ->get()
            ->map(fn (Contact $contact) => [
                'id' => (string) $contact->id,
                'name' => $contact->name,
                'email' => $contact->email,
                'phone' => $contact->phone,
                'partyId' => (string) $contact->party_id,
                'partyName' => $contact->party->name,
                'title' => $contact->title,
                'role' => $contact->role,
                'engagementType' => $contact->engagement_type->value,
                'communicationPreference' => $contact->communication_preference->value,
                'timezone' => $contact->timezone,
                'notes' => $contact->notes,
                'status' => $contact->status,
                'tags' => $contact->tags ?? [],
                'createdAt' => $contact->created_at->toISOString(),
            ]);

        // Fetch all team members (users) for the current team
        $teamMembers = $team->allUsers()
            ->load('skills')
            ->map(fn (User $member) => [
                'id' => (string) $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'role' => $member->role,
                'avatar' => '',  // Could add gravatar or profile photo URL here
                'status' => 'active',  // Could add status field to users table if needed
                'skills' => $member->skills->map(fn ($skill) => [
                    'name' => $skill->skill_name,
                    'proficiency' => $skill->proficiency,
                ])->toArray(),
                'capacityHoursPerWeek' => $member->capacity_hours_per_week ?? 40,
                'currentWorkloadHours' => $member->current_workload_hours ?? 0,
                'timezone' => $member->timezone,
                'joinedAt' => $member->created_at->toISOString(),
                'assignedProjectIds' => [],  // Could fetch from project assignments
                'tags' => [],  // Could add tags field if needed
            ]);

        // Fetch projects for linking
        $projects = Project::where('team_id', $team->id)
            ->visibleTo($user->id)
            ->select('id', 'name', 'party_id')
            ->orderBy('name')
            ->get()
            ->map(fn (Project $project) => [
                'id' => (string) $project->id,
                'name' => $project->name,
                'partyId' => (string) $project->party_id,
            ]);

        return Inertia::render('directory/index', [
            'parties' => $parties,
            'contacts' => $contacts,
            'teamMembers' => $teamMembers,
            'projects' => $projects,
        ]);
    }
}
