<?php

use App\Http\Controllers\ReviewController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('review')->group(function () {
    Route::get('/', [ReviewController::class, 'index'])->name('review.index');
    Route::get('/{flow}', [ReviewController::class, 'show'])->name('review.show');
    Route::post('/{flow}/apply', [ReviewController::class, 'apply'])->name('review.apply');
});
