<?php

use App\Http\Controllers\Settings\AgentActivityController;
use App\Http\Controllers\Settings\AgentTemplateController;
use App\Http\Controllers\Settings\AgentWorkflowController;
use App\Http\Controllers\Settings\AIAgentsController;
use App\Http\Controllers\Settings\ApiKeysController;
use App\Http\Controllers\Settings\ApiTokenController;
use App\Http\Controllers\Settings\AuditLogController;
use App\Http\Controllers\Settings\IntegrationsController;
use App\Http\Controllers\Settings\InvitationController;
use App\Http\Controllers\Settings\LanguageController;
use App\Http\Controllers\Settings\NotificationsController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\TeamController;
use App\Http\Controllers\Settings\TeamMemberController;
use App\Http\Controllers\Settings\TwoFactorAuthenticationController;
use App\Http\Controllers\Settings\UserRateController;
use App\Http\Controllers\WorkspaceSettingsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    // ========================================================================
    // Account Routes (User Settings)
    // ========================================================================
    Route::prefix('account')->group(function () {
        Route::redirect('/', '/account/profile');

        Route::get('/profile', [ProfileController::class, 'edit'])->name('account.profile.edit');
        Route::patch('/profile', [ProfileController::class, 'update'])->name('account.profile.update');
        Route::delete('/profile', [ProfileController::class, 'destroy'])->name('account.profile.destroy');

        Route::get('/password', [PasswordController::class, 'edit'])->name('account.password.edit');
        Route::put('/password', [PasswordController::class, 'update'])
            ->middleware('throttle:6,1')
            ->name('account.password.update');

        Route::get('/appearance', function () {
            return Inertia::render('account/appearance');
        })->name('account.appearance.edit');

        Route::get('/language', [LanguageController::class, 'edit'])->name('account.language.edit');
        Route::patch('/language', [LanguageController::class, 'update'])->name('account.language.update');

        Route::get('/two-factor', [TwoFactorAuthenticationController::class, 'show'])
            ->name('account.two-factor.show');

        // Account Teams (for switching organizations)
        Route::get('/teams', [TeamController::class, 'index'])->name('account.teams.index');
        Route::post('/teams', [TeamController::class, 'store'])->name('account.teams.store');
        Route::patch('/teams/{team}', [TeamController::class, 'update'])->name('account.teams.update');
        Route::delete('/teams/{team}', [TeamController::class, 'destroy'])->name('account.teams.destroy');
        Route::post('/teams/{team}/switch', [TeamController::class, 'switch'])->name('account.teams.switch');

        // Account Settings - Rates (rates are immutable for history tracking, only create is allowed)
        Route::get('/settings/rates', [UserRateController::class, 'index'])->name('settings.rates.index');
        Route::post('/settings/rates', [UserRateController::class, 'store'])->name('settings.rates.store');

        // API Tokens (Sanctum personal access tokens for remote MCP / API access)
        Route::get('/api-tokens', [ApiTokenController::class, 'index'])->name('account.api-tokens.index');
        Route::post('/api-tokens', [ApiTokenController::class, 'store'])->name('account.api-tokens.store');
        Route::delete('/api-tokens/{token}', [ApiTokenController::class, 'destroy'])->name('account.api-tokens.destroy');
    });

    // ========================================================================
    // Workspace Settings (Admin)
    // ========================================================================
    Route::get('/settings', [WorkspaceSettingsController::class, 'index'])->name('settings.index');
    Route::patch('/settings/workspace', [WorkspaceSettingsController::class, 'updateWorkspace'])->name('settings.workspace.update');
    Route::patch('/settings/global-ai', [WorkspaceSettingsController::class, 'updateGlobalAI'])->name('settings.global-ai.update');

    // ========================================================================
    // Agent Templates
    // ========================================================================
    Route::get('/settings/agent-templates', [AgentTemplateController::class, 'index'])->name('settings.agent-templates.index');
    Route::get('/settings/agent-templates/{template}', [AgentTemplateController::class, 'show'])->name('settings.agent-templates.show');

    // ========================================================================
    // AI Agents
    // ========================================================================
    Route::post('/settings/agents', [AIAgentsController::class, 'store'])->name('settings.agents.store');
    Route::delete('/settings/agents/{agent}', [AIAgentsController::class, 'destroy'])->name('settings.agents.destroy');
    Route::patch('/settings/agents/{agent}', [AIAgentsController::class, 'update'])->name('settings.agents.update');
    Route::patch('/settings/agents/{agent}/configuration', [AIAgentsController::class, 'updateConfiguration'])->name('settings.agents.configuration.update');
    Route::post('/settings/agents/{agent}/run', [AIAgentsController::class, 'run'])->name('settings.agents.run');
    Route::get('/settings/agents/{agent}/activity', [AIAgentsController::class, 'activity'])->name('settings.agents.activity');

    // Legacy AI Agent routes (backward compatibility)
    Route::post('/settings/ai-agents/{agent}/toggle', [AIAgentsController::class, 'toggleAgent'])->name('settings.ai-agents.toggle');
    Route::patch('/settings/ai-agents/{agent}/config', [AIAgentsController::class, 'updateConfig'])->name('settings.ai-agents.config.update');
    Route::post('/settings/ai-agents/activity/{log}/approve', [AIAgentsController::class, 'approveOutput'])->name('settings.ai-agents.activity.approve');
    Route::post('/settings/ai-agents/activity/{log}/reject', [AIAgentsController::class, 'rejectOutput'])->name('settings.ai-agents.activity.reject');

    // ========================================================================
    // Agent Activity
    // ========================================================================
    Route::get('/settings/agent-activity/{agent}', [AgentActivityController::class, 'index'])->name('settings.agent-activity.index');
    Route::get('/settings/agent-activity/detail/{activity}', [AgentActivityController::class, 'show'])->name('settings.agent-activity.show');

    // ========================================================================
    // Agent Workflow States
    // ========================================================================
    Route::get('/settings/workflow-states', [AgentWorkflowController::class, 'index'])->name('settings.workflow-states.index');
    Route::get('/settings/workflow-states/{workflowState}', [AgentWorkflowController::class, 'show'])->name('settings.workflow-states.show');
    Route::post('/settings/workflow-states/{workflowState}/approve', [AgentWorkflowController::class, 'approve'])->name('settings.workflow-states.approve');
    Route::post('/settings/workflow-states/{workflowState}/reject', [AgentWorkflowController::class, 'reject'])->name('settings.workflow-states.reject');

    // ========================================================================
    // API Keys
    // ========================================================================
    Route::post('/settings/api-keys', [ApiKeysController::class, 'store'])->name('settings.api-keys.store');
    Route::delete('/settings/api-keys/{apiKey}', [ApiKeysController::class, 'destroy'])->name('settings.api-keys.destroy');

    // ========================================================================
    // Notifications
    // ========================================================================
    Route::patch('/settings/notifications', [NotificationsController::class, 'update'])->name('settings.notifications.update');

    // ========================================================================
    // Audit Log
    // ========================================================================
    Route::get('/settings/audit-log/export', [AuditLogController::class, 'export'])->name('settings.audit-log.export');

    // ========================================================================
    // Integrations
    // ========================================================================
    Route::post('/settings/integrations/{integration}/connect', [IntegrationsController::class, 'connect'])->name('settings.integrations.connect');
    Route::post('/settings/integrations/{integration}/disconnect', [IntegrationsController::class, 'disconnect'])->name('settings.integrations.disconnect');

    // ========================================================================
    // Team Members
    // ========================================================================
    Route::post('/settings/team-members', [TeamMemberController::class, 'store'])->name('settings.team-members.store');
    Route::patch('/settings/team-members/{user}', [TeamMemberController::class, 'update'])->name('settings.team-members.update');
    Route::delete('/settings/team-members/{user}', [TeamMemberController::class, 'destroy'])->name('settings.team-members.destroy');

    // ========================================================================
    // Invitations
    // ========================================================================
    Route::get('/settings/invitations', [InvitationController::class, 'index'])->name('settings.invitations.index');
    Route::delete('/settings/invitations/{invitation}', [InvitationController::class, 'destroy'])->name('settings.invitations.destroy');

    // ========================================================================
    // Legacy Routes (Backward Compatibility - Redirect to Account)
    // ========================================================================
    Route::redirect('settings/profile', '/account/profile');
    Route::redirect('settings/password', '/account/password');
    Route::redirect('settings/appearance', '/account/appearance');
    Route::redirect('settings/language', '/account/language');
    Route::redirect('settings/two-factor', '/account/two-factor');
    Route::redirect('settings/teams', '/account/teams');

    // Keep old named routes for backward compatibility (will be removed later)
    Route::get('_legacy/settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('_legacy/settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('_legacy/settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::get('_legacy/settings/password', [PasswordController::class, 'edit'])->name('user-password.edit');
    Route::put('_legacy/settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');
    Route::get('_legacy/settings/appearance', function () {
        return Inertia::render('account/appearance');
    })->name('appearance.edit');
    Route::get('_legacy/settings/language', [LanguageController::class, 'edit'])->name('language.edit');
    Route::patch('_legacy/settings/language', [LanguageController::class, 'update'])->name('language.update');
    Route::get('_legacy/settings/two-factor', [TwoFactorAuthenticationController::class, 'show'])->name('two-factor.show');
    Route::get('_legacy/settings/teams', [TeamController::class, 'index'])->name('teams.index');
    Route::post('_legacy/settings/teams', [TeamController::class, 'store'])->name('teams.store');
    Route::patch('_legacy/settings/teams/{team}', [TeamController::class, 'update'])->name('teams.update');
    Route::delete('_legacy/settings/teams/{team}', [TeamController::class, 'destroy'])->name('teams.destroy');
    Route::post('_legacy/settings/teams/{team}/switch', [TeamController::class, 'switch'])->name('teams.switch');

    // Team members (legacy)
    Route::get('_legacy/settings/teams/{team}/members', [TeamMemberController::class, 'index'])->name('teams.members.index');
    Route::post('_legacy/settings/teams/{team}/members', [TeamMemberController::class, 'store'])->name('teams.members.store');
    Route::delete('_legacy/settings/teams/{team}/members/{user}', [TeamMemberController::class, 'destroy'])->name('teams.members.destroy');
});
