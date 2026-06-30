<?php

use App\Http\Controllers\ClientCommsController;
use App\Http\Controllers\CommunicationsController;
use App\Http\Controllers\DirectoryController;
use App\Http\Controllers\DocumentsController;
use App\Http\Controllers\InvitationAcceptController;
use App\Http\Controllers\PlaybooksController;
use App\Http\Controllers\Reports\ProfitabilityReportsController;
use App\Http\Controllers\Reports\TimeReportsController;
use App\Http\Controllers\TodayController;
use App\Http\Controllers\Webhooks\MailgunInboundController;
use App\Http\Middleware\VerifyMailgunSignature;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Root (/) is handled by Laravel Folio → resources/views/pages/index.blade.php

// Mailgun inbound email webhook (signature-verified, no auth/session)
Route::post('/webhooks/mailgun/inbound', [MailgunInboundController::class, 'handle'])
    ->middleware(VerifyMailgunSignature::class)
    ->name('webhooks.mailgun.inbound');

// Language switcher (sets cookie + updates user record if authenticated)
Route::get('/language/{locale}', function (string $locale) {
    if (! in_array($locale, config('app.available_locales', ['en']))) {
        $locale = config('app.fallback_locale', 'en');
    }

    if ($user = request()->user()) {
        $user->update(['language' => $locale]);
    }

    return redirect()->back()->withCookie(
        cookie('language', $locale, 60 * 24 * 365, '/')
    );
})->name('language.switch');

// Public invitation acceptance (signed URLs)
Route::get('/invitation/{invitation}/accept', [InvitationAcceptController::class, 'show'])
    ->name('teams.invitations.accept')
    ->middleware('signed');
Route::post('/invitation/{invitation}/accept', [InvitationAcceptController::class, 'accept'])
    ->name('teams.invitations.accept.post')
    ->middleware('signed');

Route::middleware(['auth', 'verified'])->group(function () {
    // Main navigation routes
    Route::get('today', [TodayController::class, 'index'])->name('today');

    // Work routes are in routes/work.php
    // Inbox routes are in routes/inbox.php

    Route::get('playbooks', [PlaybooksController::class, 'index'])->name('playbooks');

    Route::get('directory', [DirectoryController::class, 'index'])->name('directory');

    // Consolidated communications view
    Route::get('communications', [CommunicationsController::class, 'index'])->name('communications.index');

    // Documents management
    Route::get('documents', [DocumentsController::class, 'index'])->name('documents');

    Route::get('reports', function () {
        return Inertia::render('reports/index');
    })->name('reports');

    // Time Reports
    Route::get('reports/time', [TimeReportsController::class, 'index'])->name('reports.time.index');
    Route::get('reports/time/by-user', [TimeReportsController::class, 'byUser'])->name('reports.time.by-user');
    Route::get('reports/time/by-project', [TimeReportsController::class, 'byProject'])->name('reports.time.by-project');
    Route::get('reports/time/actual-vs-estimated', [TimeReportsController::class, 'actualVsEstimated'])->name('reports.time.actual-vs-estimated');

    // Profitability Reports
    Route::get('reports/profitability', [ProfitabilityReportsController::class, 'index'])->name('reports.profitability.index');
    Route::get('reports/profitability/by-project', [ProfitabilityReportsController::class, 'byProject'])->name('reports.profitability.by-project');
    Route::get('reports/profitability/by-work-order', [ProfitabilityReportsController::class, 'byWorkOrder'])->name('reports.profitability.by-work-order');
    Route::get('reports/profitability/by-team-member', [ProfitabilityReportsController::class, 'byTeamMember'])->name('reports.profitability.by-team-member');
    Route::get('reports/profitability/by-client', [ProfitabilityReportsController::class, 'byClient'])->name('reports.profitability.by-client');

    // Client Communications
    Route::post('client-communications/draft', [ClientCommsController::class, 'draftUpdate'])
        ->name('client-communications.draft');
    Route::get('client-communications/preview/{message}', [ClientCommsController::class, 'preview'])
        ->name('client-communications.preview');

    Route::get('settings', function () {
        return Inertia::render('settings/index');
    })->name('settings.index');

    // Redirect dashboard to today
    Route::redirect('dashboard', '/today')->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/work.php';
require __DIR__.'/review.php';
require __DIR__.'/inbox.php';
require __DIR__.'/directory.php';
require __DIR__.'/playbooks.php';
require __DIR__.'/documents.php';
