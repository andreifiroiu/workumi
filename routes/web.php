<?php

use App\Http\Controllers\ClientCommsController;
use App\Http\Controllers\CommunicationsController;
use App\Http\Controllers\DirectoryController;
use App\Http\Controllers\DocumentsController;
use App\Http\Controllers\InvitationAcceptController;
use App\Http\Controllers\PlaybooksController;
use App\Http\Controllers\Reports\ProfitabilityReportsController;
use App\Http\Controllers\Reports\TimeReportsController;
use App\Http\Controllers\SeoController;
use App\Http\Controllers\TodayController;
use App\Http\Controllers\Webhooks\MailgunInboundController;
use App\Http\Middleware\VerifyMailgunSignature;
use App\Services\Seo\PublicUrls;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Root (/) is handled by Laravel Folio → resources/views/pages/index.blade.php,
// which is also mounted under /es, /fr, /de and /ro (see FolioServiceProvider).

// Served from public/robots.txt in a deployed environment; this route is the
// fallback for a host where `seo:publish-robots` has not run.
Route::get('robots.txt', [SeoController::class, 'robots'])->name('seo.robots');
Route::get('sitemap.xml', [SeoController::class, 'sitemap'])->name('seo.sitemap');

// English is served without a prefix, so /en/... is a duplicate of /... .
//
// The query string is carried across by hand: a route parameter never includes
// it, so without this the alias would silently strip utm_* and gclid and turn
// campaign traffic into direct traffic.
Route::get('/en/{path?}', function (Request $request, ?string $path = null) {
    // The raw QUERY_STRING, not getQueryString(): Symfony sorts parameters in
    // the latter, and a redirect should hand back what it was given.
    $query = (string) $request->server->get('QUERY_STRING', '');

    return redirect('/'.ltrim((string) $path, '/').($query !== '' ? '?'.$query : ''), 301);
})->where('path', '.*')->name('seo.english-alias');

// Mailgun inbound email webhook (signature-verified, no auth/session)
Route::post('/webhooks/mailgun/inbound', [MailgunInboundController::class, 'handle'])
    ->middleware(VerifyMailgunSignature::class)
    ->name('webhooks.mailgun.inbound');

// Language switcher (sets cookie + updates user record if authenticated).
//
// Public pages take their language from the URL, so switching language there
// has to move the visitor to the other URL; the cookie is still set, so the
// authenticated app follows the same choice. Inside the app, where the cookie
// alone decides, the visitor stays where they were.
Route::get('/language/{locale}', function (string $locale, PublicUrls $urls) {
    if (! in_array($locale, config('app.available_locales', ['en']))) {
        $locale = config('app.fallback_locale', 'en');
    }

    if ($user = request()->user()) {
        $user->update(['language' => $locale]);
    }

    $cookie = cookie('language', $locale, 60 * 24 * 365, '/');

    $previous = (string) url()->previous();
    $previousPath = trim((string) parse_url($previous, PHP_URL_PATH), '/');

    if ($urls->pageForPath($previousPath) !== null) {
        return redirect($urls->translate($previousPath, $locale))->withCookie($cookie);
    }

    /*
     * Only the path is reused, never the host. url()->previous() returns the
     * Referer verbatim, so redirecting to it would let any external page send
     * a visitor of ours anywhere via /language/{locale}.
     */
    $previousHost = parse_url($previous, PHP_URL_HOST);

    $target = ($previousHost === null || $previousHost === request()->getHost())
        ? '/'.$previousPath
        : '/';

    return redirect($target)->withCookie($cookie);
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
    // Derived from member cost rates and margins, so restricted to team admins.
    Route::middleware('team.admin')->group(function () {
        Route::get('reports/profitability', [ProfitabilityReportsController::class, 'index'])->name('reports.profitability.index');
        Route::get('reports/profitability/by-project', [ProfitabilityReportsController::class, 'byProject'])->name('reports.profitability.by-project');
        Route::get('reports/profitability/by-work-order', [ProfitabilityReportsController::class, 'byWorkOrder'])->name('reports.profitability.by-work-order');
        Route::get('reports/profitability/by-team-member', [ProfitabilityReportsController::class, 'byTeamMember'])->name('reports.profitability.by-team-member');
        Route::get('reports/profitability/by-client', [ProfitabilityReportsController::class, 'byClient'])->name('reports.profitability.by-client');
    });

    // Client Communications
    Route::post('client-communications/draft', [ClientCommsController::class, 'draftUpdate'])
        ->name('client-communications.draft');
    Route::get('client-communications/preview/{message}', [ClientCommsController::class, 'preview'])
        ->name('client-communications.preview');

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
require __DIR__.'/capture.php';
