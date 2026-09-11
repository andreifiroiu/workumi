<?php

use App\Http\Controllers\QuickCaptureController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('capture')->group(function () {
    Route::get('/options', [QuickCaptureController::class, 'options'])->name('capture.options');
    // Each parse spends the team's own LLM credits, so it is throttled: an
    // unthrottled button any member can hold down bills their provider.
    Route::post('/parse', [QuickCaptureController::class, 'parse'])
        ->middleware('throttle:20,1')
        ->name('capture.parse');
    Route::post('/', [QuickCaptureController::class, 'store'])->name('capture.store');
});
