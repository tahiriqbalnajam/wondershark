<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\BrandController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard')->middleware('role.permission:view-dashboard');
    
    Route::get('mypage', function () {
        return Inertia::render('mypage');
    })->name('mypage');

    // User Management Routes - Protected by permissions
    Route::middleware('role.permission:view-users')->group(function () {
        Route::get('users', [UserController::class, 'index'])->name('users.index');
    });

    // Admin Panel Routes - Protected by admin role or permission
    Route::middleware('role.permission:view-admin-panel')->group(function () {
        Route::get('admin', [AdminController::class, 'index'])->name('admin.index');
    });

    // Brand Management Routes - Only for agency users
    Route::middleware('role.permission:null,agency')->group(function () {
        Route::resource('brands', BrandController::class);
        Route::put('brands/{brand}/status', [BrandController::class, 'updateStatus'])->name('brands.status');
        Route::post('brands/generate-prompts', [BrandController::class, 'generatePrompts'])->name('brands.generatePrompts');
        Route::post('brands/get-existing-prompts', [BrandController::class, 'getExistingPrompts'])->name('brands.getExistingPrompts');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
