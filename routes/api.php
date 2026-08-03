<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\DeliverableController;
use App\Http\Controllers\Api\V1\PartyController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\TeamController;
use App\Http\Controllers\Api\V1\WorkOrderController;
use App\Http\Middleware\EnsureTokenCanWrite;
use App\Http\Middleware\ResolveTeamAccess;
use Illuminate\Support\Facades\Route;

/*
 * Sanctum personal access tokens only. Passport tokens are minted for MCP
 * clients with the `mcp:use` scope, and OAuthUser::tokenCan() returns true
 * unconditionally, so they would bypass the read-only token check here.
 *
 * A token belongs to a user, not a team: collections span every team the user
 * belongs to and each record carries its team_id, while `?team_id=` narrows to
 * one. Records looked up by ID are found in any reachable team.
 */
Route::prefix('v1')
    ->name('api.v1.')
    ->middleware(['auth:sanctum', ResolveTeamAccess::class])
    ->group(function () {
        Route::get('teams', [TeamController::class, 'index'])->name('teams.index');
        Route::get('teams/{team}', [TeamController::class, 'show'])->name('teams.show');
        Route::get('teams/{team}/members', [TeamController::class, 'members'])->name('teams.members');

        Route::get('projects', [ProjectController::class, 'index'])->name('projects.index');
        Route::get('projects/{project}', [ProjectController::class, 'show'])->name('projects.show');

        Route::get('work-orders', [WorkOrderController::class, 'index'])->name('work-orders.index');
        Route::get('work-orders/{work_order}', [WorkOrderController::class, 'show'])->name('work-orders.show');

        Route::get('tasks', [TaskController::class, 'index'])->name('tasks.index');
        Route::get('tasks/{task}', [TaskController::class, 'show'])->name('tasks.show');

        Route::get('deliverables', [DeliverableController::class, 'index'])->name('deliverables.index');
        Route::get('deliverables/{deliverable}', [DeliverableController::class, 'show'])->name('deliverables.show');

        Route::get('parties', [PartyController::class, 'index'])->name('parties.index');
        Route::get('parties/{party}', [PartyController::class, 'show'])->name('parties.show');

        Route::middleware(EnsureTokenCanWrite::class)->group(function () {
            Route::post('projects', [ProjectController::class, 'store'])->name('projects.store');
            Route::match(['put', 'patch'], 'projects/{project}', [ProjectController::class, 'update'])->name('projects.update');

            Route::post('work-orders', [WorkOrderController::class, 'store'])->name('work-orders.store');
            Route::match(['put', 'patch'], 'work-orders/{work_order}', [WorkOrderController::class, 'update'])->name('work-orders.update');

            Route::post('tasks', [TaskController::class, 'store'])->name('tasks.store');
            Route::match(['put', 'patch'], 'tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');

            Route::post('deliverables', [DeliverableController::class, 'store'])->name('deliverables.store');
            Route::match(['put', 'patch'], 'deliverables/{deliverable}', [DeliverableController::class, 'update'])->name('deliverables.update');
        });
    });
