<?php

declare(strict_types=1);

use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();
});

test('a solo owner can still assign work to themselves', function () {
    // Nobody has been invited yet, so `team_user` is empty and a pivot-only
    // lookup returns an assignee picker with no one in it.
    $this->actingAs($this->user)->get('/work')
        ->assertStatus(200)
        ->assertInertia(function ($page) {
            $members = collect($page->toArray()['props']['teamMembers']);

            expect($members->pluck('id'))->toContain((string) $this->user->id);
        });
});

test('the work view lists the team owner among the assignable members', function () {
    // Owners are not written to team_user, so they only appear if pushed in
    // explicitly — without them the create-task assignee picker is empty on a
    // team the owner has not yet invited anyone to.
    $member = addTeamMember($this->team);

    $this->actingAs($this->user)->get('/work')
        ->assertStatus(200)
        ->assertInertia(function ($page) use ($member) {
            $ids = collect($page->toArray()['props']['teamMembers'])->pluck('id');

            expect($ids)->toContain((string) $this->user->id)
                ->and($ids)->toContain((string) $member->id)
                ->and($ids->duplicates())->toBeEmpty();
        });
});
