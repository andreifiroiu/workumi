<?php

use App\Http\Controllers\Api\MentionSearchController;
use App\Http\Controllers\PMCopilotController;
use App\Http\Controllers\ProjectRaciController;
use App\Http\Controllers\ProjectUserRateController;
use App\Http\Controllers\Work\CommunicationController;
use App\Http\Controllers\Work\DeliverableController;
use App\Http\Controllers\Work\DeliverableVersionController;
use App\Http\Controllers\Work\MessageController;
use App\Http\Controllers\Work\PartyController;
use App\Http\Controllers\Work\ProjectController;
use App\Http\Controllers\Work\TaskController;
use App\Http\Controllers\Work\TaskTransitionController;
use App\Http\Controllers\Work\TimeEntryController;
use App\Http\Controllers\Work\WorkController;
use App\Http\Controllers\Work\WorkOrderController;
use App\Http\Controllers\Work\WorkOrderListController;
use App\Http\Controllers\Work\WorkOrderTransitionController;
use App\Http\Controllers\WorkOrderAgentSettingsController;
use App\Http\Controllers\WorkOrderRaciController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('work')->group(function () {
    // Main work page
    Route::get('/', [WorkController::class, 'index'])->name('work');
    Route::patch('/preferences', [WorkController::class, 'updatePreference'])->name('work.preferences');

    // Projects
    Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
    Route::get('/projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
    Route::patch('/projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');
    Route::post('/projects/{project}/archive', [ProjectController::class, 'archive'])->name('projects.archive');
    Route::post('/projects/{project}/restore', [ProjectController::class, 'restore'])->name('projects.restore');
    Route::post('/projects/{project}/files', [ProjectController::class, 'uploadFile'])->name('projects.files.upload');
    Route::delete('/projects/{project}/files/{document}', [ProjectController::class, 'deleteFile'])->name('projects.files.delete');
    Route::patch('/projects/{project}/raci', [ProjectRaciController::class, 'update'])->name('projects.raci');
    Route::get('/projects/{project}/insights', [PMCopilotController::class, 'getProjectInsights'])->name('projects.insights');

    // Project-specific rate overrides
    Route::get('/projects/{project}/rates', [ProjectUserRateController::class, 'index'])->name('projects.rates.index');
    Route::post('/projects/{project}/rates', [ProjectUserRateController::class, 'store'])->name('projects.rates.store');
    Route::patch('/projects/{project}/rates/{rate}', [ProjectUserRateController::class, 'update'])->name('projects.rates.update');
    Route::delete('/projects/{project}/rates/{rate}', [ProjectUserRateController::class, 'destroy'])->name('projects.rates.destroy');

    // Work Order Lists
    Route::post('/work-order-lists', [WorkOrderListController::class, 'store'])->name('work-order-lists.store');
    Route::patch('/work-order-lists/{workOrderList}', [WorkOrderListController::class, 'update'])->name('work-order-lists.update');
    Route::delete('/work-order-lists/{workOrderList}', [WorkOrderListController::class, 'destroy'])->name('work-order-lists.destroy');
    Route::post('/work-order-lists/{workOrderList}/move-work-order', [WorkOrderListController::class, 'moveWorkOrder'])->name('work-order-lists.move-work-order');
    Route::post('/work-orders/{workOrder}/remove-from-list', [WorkOrderListController::class, 'removeFromList'])->name('work-orders.remove-from-list');
    Route::post('/projects/{project}/lists/reorder', [WorkOrderListController::class, 'reorder'])->name('projects.lists.reorder');
    Route::post('/projects/{project}/work-orders/reorder', [WorkOrderListController::class, 'reorderWorkOrders'])->name('projects.work-orders.reorder');

    // Work Orders
    Route::post('/work-orders', [WorkOrderController::class, 'store'])->name('work-orders.store');
    Route::get('/work-orders/{workOrder}', [WorkOrderController::class, 'show'])->name('work-orders.show');
    Route::patch('/work-orders/{workOrder}', [WorkOrderController::class, 'update'])->name('work-orders.update');
    Route::delete('/work-orders/{workOrder}', [WorkOrderController::class, 'destroy'])->name('work-orders.destroy');
    Route::patch('/work-orders/{workOrder}/status', [WorkOrderController::class, 'updateStatus'])->name('work-orders.status');
    Route::post('/work-orders/{workOrder}/transition', [WorkOrderTransitionController::class, 'transition'])->name('work-orders.transition');
    Route::patch('/work-orders/{workOrder}/raci', [WorkOrderRaciController::class, 'update'])->name('work-orders.raci');
    Route::post('/work-orders/{workOrder}/accept-routing', [WorkOrderController::class, 'acceptRoutingRecommendation'])->name('work-orders.accept-routing');
    Route::post('/work-orders/{workOrder}/archive', [WorkOrderController::class, 'archive'])->name('work-orders.archive');
    Route::post('/work-orders/{workOrder}/restore', [WorkOrderController::class, 'restore'])->name('work-orders.restore');
    Route::post('/work-orders/{workOrder}/files', [WorkOrderController::class, 'uploadFile'])->name('work-orders.files.upload');
    Route::delete('/work-orders/{workOrder}/files/{document}', [WorkOrderController::class, 'deleteFile'])->name('work-orders.files.delete');
    Route::post('/projects/{project}/work-orders/bulk-archive-delivered', [WorkOrderController::class, 'bulkArchiveDelivered'])->name('projects.work-orders.bulk-archive-delivered');

    // Work Order Agent Settings
    Route::patch('/work-orders/{workOrder}/agent-settings', [WorkOrderAgentSettingsController::class, 'update'])->name('work-orders.agent-settings');

    // PM Copilot Routes
    Route::post('/work-orders/{workOrder}/pm-copilot/trigger', [PMCopilotController::class, 'trigger'])->name('work-orders.pm-copilot.trigger');
    Route::get('/work-orders/{workOrder}/pm-copilot/suggestions', [PMCopilotController::class, 'getSuggestions'])->name('work-orders.pm-copilot.suggestions');
    Route::post('/pm-copilot/suggestions/{suggestion}/approve', [PMCopilotController::class, 'approveSuggestion'])->name('pm-copilot.suggestions.approve');
    Route::post('/pm-copilot/suggestions/{suggestion}/reject', [PMCopilotController::class, 'rejectSuggestion'])->name('pm-copilot.suggestions.reject');
    Route::post('/work-orders/{workOrder}/pm-copilot/alternatives/{alternativeId}/approve', [PMCopilotController::class, 'approveAlternative'])->name('work-orders.pm-copilot.alternatives.approve');
    Route::post('/work-orders/{workOrder}/pm-copilot/alternatives/{alternativeId}/reject', [PMCopilotController::class, 'rejectAlternative'])->name('work-orders.pm-copilot.alternatives.reject');
    Route::post('/work-orders/{workOrder}/pm-copilot/delegate', [PMCopilotController::class, 'delegatePlan'])->name('work-orders.pm-copilot.delegate');
    Route::post('/work-orders/{workOrder}/pm-copilot/tasks/{task}/assign', [PMCopilotController::class, 'assignTask'])->name('work-orders.pm-copilot.tasks.assign');
    Route::post('/work-orders/{workOrder}/pm-copilot/bulk-assign', [PMCopilotController::class, 'bulkAssignTasks'])->name('work-orders.pm-copilot.bulk-assign');

    // Tasks
    Route::post('/tasks', [TaskController::class, 'store'])->name('tasks.store');
    Route::get('/tasks/{task}', [TaskController::class, 'show'])->name('tasks.show');
    Route::patch('/tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');
    Route::patch('/tasks/{task}/status', [TaskController::class, 'updateStatus'])->name('tasks.status');
    Route::post('/tasks/{task}/transition', [TaskTransitionController::class, 'transition'])->name('tasks.transition');
    Route::patch('/tasks/{task}/checklist/{itemId}', [TaskController::class, 'toggleChecklist'])->name('tasks.checklist');
    Route::post('/tasks/{task}/checklist', [TaskController::class, 'addChecklistItem'])->name('tasks.checklist.add');
    Route::patch('/tasks/{task}/checklist/{itemId}/text', [TaskController::class, 'updateChecklistItem'])->name('tasks.checklist.update');
    Route::delete('/tasks/{task}/checklist/{itemId}', [TaskController::class, 'deleteChecklistItem'])->name('tasks.checklist.delete');
    Route::post('/tasks/{task}/promote', [TaskController::class, 'promote'])->name('tasks.promote');
    Route::post('/work-orders/{workOrder}/tasks/reorder', [TaskController::class, 'reorder'])->name('work-orders.tasks.reorder');
    Route::post('/tasks/{task}/archive', [TaskController::class, 'archive'])->name('tasks.archive');
    Route::post('/tasks/{task}/restore', [TaskController::class, 'restoreTask'])->name('tasks.restore');
    Route::post('/work-orders/{workOrder}/tasks/bulk-archive-completed', [TaskController::class, 'bulkArchiveCompleted'])->name('work-orders.tasks.bulk-archive-completed');

    // Time Entries
    Route::get('/time-entries', [TimeEntryController::class, 'index'])->name('time-entries.index');
    Route::post('/time-entries', [TimeEntryController::class, 'store'])->name('time-entries.store');
    Route::get('/time-entries/{timeEntry}', [TimeEntryController::class, 'show'])->name('time-entries.show');
    Route::patch('/time-entries/{timeEntry}', [TimeEntryController::class, 'update'])->name('time-entries.update');
    Route::delete('/time-entries/{timeEntry}', [TimeEntryController::class, 'destroy'])->name('time-entries.destroy');
    Route::post('/time-entries/{timeEntry}/stop', [TimeEntryController::class, 'stopById'])->name('time-entries.stop');
    Route::post('/tasks/{task}/timer/start', [TimeEntryController::class, 'startTimer'])->name('tasks.timer.start');
    Route::post('/tasks/{task}/timer/stop', [TimeEntryController::class, 'stopTimer'])->name('tasks.timer.stop');

    // Deliverables
    Route::post('/deliverables', [DeliverableController::class, 'store'])->name('deliverables.store');
    Route::get('/deliverables/{deliverable}', [DeliverableController::class, 'show'])->name('deliverables.show');
    Route::patch('/deliverables/{deliverable}', [DeliverableController::class, 'update'])->name('deliverables.update');
    Route::delete('/deliverables/{deliverable}', [DeliverableController::class, 'destroy'])->name('deliverables.destroy');
    Route::post('/deliverables/{deliverable}/files', [DeliverableController::class, 'uploadFile'])->name('deliverables.files.upload');
    Route::delete('/deliverables/{deliverable}/files/{document}', [DeliverableController::class, 'deleteFile'])->name('deliverables.files.delete');

    // Deliverable Versions
    Route::get('/deliverables/{deliverable}/versions', [DeliverableVersionController::class, 'index'])->name('deliverables.versions.index');
    Route::post('/deliverables/{deliverable}/versions', [DeliverableVersionController::class, 'store'])->name('deliverables.versions.store');
    Route::get('/deliverables/{deliverable}/versions/{version}', [DeliverableVersionController::class, 'show'])->name('deliverables.versions.show');
    Route::post('/deliverables/{deliverable}/versions/{version}/restore', [DeliverableVersionController::class, 'restore'])->name('deliverables.versions.restore');
    Route::delete('/deliverables/{deliverable}/versions/{version}', [DeliverableVersionController::class, 'destroy'])->name('deliverables.versions.destroy');

    // Communications (polymorphic: projects/{id}/communications, work-orders/{id}/communications, or tasks/{id}/communications)
    Route::get('/{type}/{id}/communications', [CommunicationController::class, 'show'])->name('communications.show');
    Route::post('/{type}/{id}/communications', [CommunicationController::class, 'store'])->name('communications.store');

    // Message operations (edit, delete, reactions)
    Route::patch('/communications/messages/{message}', [MessageController::class, 'update'])->name('communications.messages.update');
    Route::delete('/communications/messages/{message}', [MessageController::class, 'destroy'])->name('communications.messages.destroy');
    Route::post('/communications/messages/{message}/reactions', [MessageController::class, 'addReaction'])->name('communications.messages.reactions.store');
    Route::delete('/communications/messages/{message}/reactions/{emoji}', [MessageController::class, 'removeReaction'])->name('communications.messages.reactions.destroy');

    // Parties
    Route::get('/parties', [PartyController::class, 'index'])->name('parties.index');
    Route::post('/parties', [PartyController::class, 'store'])->name('parties.store');
    Route::patch('/parties/{party}', [PartyController::class, 'update'])->name('parties.update');
    Route::delete('/parties/{party}', [PartyController::class, 'destroy'])->name('parties.destroy');
});

// API routes for mentions search
Route::middleware(['auth', 'verified'])->prefix('api')->group(function () {
    Route::get('/mentions/search', [MentionSearchController::class, 'search'])->name('api.mentions.search');
});
