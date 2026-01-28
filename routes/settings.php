<?php

use App\Http\Controllers\Settings\AgencyController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    // Redirect to appropriate settings page based on role
    Route::get('settings', function () {
        /** @var User $user */
        $user = Auth::user();
        if ($user->hasRole('agency')) {
            return redirect()->route('settings.general');
        }

        return redirect()->route('profile.edit');
    });

    // Default settings for all users
    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');

    // Agency-specific settings - only accessible by users with 'agency' role
    Route::middleware('role.permission:,agency')->group(function () {
        Route::get('settings/general', [AgencyController::class, 'general'])->name('settings.general');
        Route::post('settings/general', [AgencyController::class, 'updateGeneral'])->name('settings.general.update');

        Route::get('settings/brands', [AgencyController::class, 'brands'])->name('settings.brands');
        Route::post('settings/brands', [AgencyController::class, 'storeBrand'])->name('settings.brands.store');
        Route::delete('settings/brands/{brand}', [AgencyController::class, 'deleteBrand'])->name('settings.brands.delete');

        Route::get('settings/agency', [AgencyController::class, 'agency'])->name('settings.agency');
        Route::post('settings/agency', [AgencyController::class, 'updateAgency'])->name('settings.agency.update');

        Route::get('settings/integration', [AgencyController::class, 'integration'])->name('settings.integration');
        Route::get('settings/account', [AgencyController::class, 'account'])->name('settings.account');
    });
});
