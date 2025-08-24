<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\PostPromptController;

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
        Route::get('users/create', [UserController::class, 'create'])->name('users.create')->middleware('role.permission:create-users');
        Route::post('users', [UserController::class, 'store'])->name('users.store')->middleware('role.permission:create-users');
        Route::get('users/{user}/edit', [UserController::class, 'edit'])->name('users.edit')->middleware('role.permission:edit-users');
        Route::patch('users/{user}', [UserController::class, 'update'])->name('users.update')->middleware('role.permission:edit-users');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy')->middleware('role.permission:delete-users');
    });

    // Admin Panel Routes - Protected by admin role or permission
    Route::middleware('role.permission:view-admin-panel')->group(function () {
        Route::get('admin', [AdminController::class, 'index'])->name('admin.index');
        
        // AI Models Management - Admin only
        Route::resource('admin/ai-models', \App\Http\Controllers\Admin\AiModelController::class)->names([
            'index' => 'admin.ai-models.index',
            'create' => 'admin.ai-models.create',
            'store' => 'admin.ai-models.store',
            'show' => 'admin.ai-models.show',
            'edit' => 'admin.ai-models.edit',
            'update' => 'admin.ai-models.update',
            'destroy' => 'admin.ai-models.destroy',
        ]);
        Route::post('admin/ai-models/{aiModel}/toggle', [\App\Http\Controllers\Admin\AiModelController::class, 'toggle'])
            ->name('admin.ai-models.toggle');
        Route::post('admin/ai-models/{aiModel}/test', [\App\Http\Controllers\Admin\AiModelController::class, 'test'])
            ->name('admin.ai-models.test');

        // Citation Check Management - Admin only
        Route::prefix('admin/citation-check')->name('admin.citation-check.')->middleware('role.permission:manage-citation-check')->group(function () {
            Route::get('/', [\App\Http\Controllers\Admin\CitationCheckController::class, 'index'])->name('index');
            Route::get('/{post}', [\App\Http\Controllers\Admin\CitationCheckController::class, 'show'])->name('show');
            Route::post('/run-check', [\App\Http\Controllers\Admin\CitationCheckController::class, 'runCheck'])->name('run-check');
            Route::post('/{post}/recheck', [\App\Http\Controllers\Admin\CitationCheckController::class, 'recheck'])->name('recheck');
            Route::post('/bulk-check', [\App\Http\Controllers\Admin\CitationCheckController::class, 'bulkCheck'])->name('bulk-check');
        });

        // Job Monitoring - Admin only
        Route::prefix('admin/jobs')->name('admin.jobs.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Admin\JobMonitorController::class, 'index'])->name('index');
            Route::post('/{jobId}/retry', [\App\Http\Controllers\Admin\JobMonitorController::class, 'retry'])->name('retry');
            Route::delete('/{jobId}', [\App\Http\Controllers\Admin\JobMonitorController::class, 'delete'])->name('delete');
            Route::post('/clear', [\App\Http\Controllers\Admin\JobMonitorController::class, 'clear'])->name('clear');
        });

        // System Settings - Admin only
        Route::prefix('admin/settings')->name('admin.settings.')->middleware('role.permission:manage-system')->group(function () {
            Route::get('/', [\App\Http\Controllers\Admin\SystemSettingsController::class, 'index'])->name('index');
            Route::post('/update', [\App\Http\Controllers\Admin\SystemSettingsController::class, 'update'])->name('update');
        });

        // Post Permissions Management - Admin only
        Route::prefix('admin/post-permissions')->name('admin.post-permissions.')->middleware('role.permission:manage-system')->group(function () {
            Route::get('/', [\App\Http\Controllers\Admin\PostPermissionController::class, 'index'])->name('index');
            Route::patch('/users/{user}', [\App\Http\Controllers\Admin\PostPermissionController::class, 'updateUser'])->name('users.update');
            Route::patch('/brands/{brand}', [\App\Http\Controllers\Admin\PostPermissionController::class, 'updateBrand'])->name('brands.update');
            Route::post('/users/bulk-update', [\App\Http\Controllers\Admin\PostPermissionController::class, 'bulkUpdateUsers'])->name('users.bulk-update');
            Route::post('/brands/bulk-update', [\App\Http\Controllers\Admin\PostPermissionController::class, 'bulkUpdateBrands'])->name('brands.bulk-update');
        });

        // User Management - Admin only
        Route::prefix('admin/users')->name('admin.users.')->middleware('role.permission:manage-system')->group(function () {
            Route::get('/', [\App\Http\Controllers\Admin\UserController::class, 'index'])->name('index');
            Route::get('/create', [\App\Http\Controllers\Admin\UserController::class, 'create'])->name('create');
            Route::post('/', [\App\Http\Controllers\Admin\UserController::class, 'store'])->name('store');
            Route::get('/{user}', [\App\Http\Controllers\Admin\UserController::class, 'show'])->name('show');
            Route::get('/{user}/edit', [\App\Http\Controllers\Admin\UserController::class, 'edit'])->name('edit');
            Route::patch('/{user}', [\App\Http\Controllers\Admin\UserController::class, 'update'])->name('update');
            Route::delete('/{user}', [\App\Http\Controllers\Admin\UserController::class, 'destroy'])->name('destroy');
            Route::patch('/{user}/toggle-post-permission', [\App\Http\Controllers\Admin\UserController::class, 'togglePostPermission'])->name('toggle-post-permission');
            Route::post('/bulk-update-post-permissions', [\App\Http\Controllers\Admin\UserController::class, 'bulkUpdatePostPermissions'])->name('bulk-update-post-permissions');
        });
    });

    // Brand Management Routes - Only for agency users
    Route::middleware('role.permission:null,agency')->group(function () {
        Route::resource('brands', BrandController::class);
        Route::put('brands/{brand}/status', [BrandController::class, 'updateStatus'])->name('brands.status');
        Route::post('brands/generate-prompts', [BrandController::class, 'generatePrompts'])->name('brands.generatePrompts');
        Route::post('brands/generate-multi-model-prompts', [BrandController::class, 'generateMultiModelPrompts'])->name('brands.generateMultiModelPrompts');
        Route::post('brands/get-prompts-with-ratio', [BrandController::class, 'getPromptsWithRatio'])->name('brands.getPromptsWithRatio');
        Route::post('brands/get-existing-prompts', [BrandController::class, 'getExistingPrompts'])->name('brands.getExistingPrompts');
        
        // Brand Prompts Management Routes
        Route::get('brands/{brand}/prompts', [\App\Http\Controllers\Brand\BrandPromptController::class, 'index'])->name('brands.prompts.index');
        Route::put('brands/{brand}/prompts/{prompt}', [\App\Http\Controllers\Brand\BrandPromptController::class, 'update'])->name('brands.prompts.update');
        Route::delete('brands/{brand}/prompts/{prompt}', [\App\Http\Controllers\Brand\BrandPromptController::class, 'destroy'])->name('brands.prompts.destroy');
        Route::post('brands/{brand}/prompts/bulk-update', [\App\Http\Controllers\Brand\BrandPromptController::class, 'bulkUpdate'])->name('brands.prompts.bulkUpdate');
        
        // Post Management Routes
        Route::resource('posts', PostController::class);
        Route::post('posts/{post}/citations', [PostController::class, 'storeCitation'])->name('posts.citations.store');
        Route::get('posts/{post}/prompts', [PostController::class, 'showPrompts'])->name('posts.prompts');
        
        // Post Prompts Management Routes
        Route::get('posts/{post}/manage-prompts', [PostPromptController::class, 'index'])->name('posts.prompts.index');
        Route::post('posts/{post}/generate-prompts', [PostPromptController::class, 'generatePrompts'])->name('posts.generatePrompts');
        Route::post('posts/{post}/get-prompts-with-ratio', [PostPromptController::class, 'getPromptsWithRatio'])->name('posts.getPromptsWithRatio');
        Route::post('posts/{post}/add-custom-prompt', [PostPromptController::class, 'addCustomPrompt'])->name('posts.addCustomPrompt');
        Route::put('post-prompts/{postPrompt}/selection', [PostPromptController::class, 'updateSelection'])->name('post-prompts.updateSelection');
        Route::delete('post-prompts/{postPrompt}', [PostPromptController::class, 'destroy'])->name('post-prompts.destroy');
        
        // Brand Prompts API Routes
        Route::prefix('api')->group(function () {
            Route::post('brand-prompts', [\App\Http\Controllers\Api\BrandPromptController::class, 'store']);
            Route::get('brand-prompts', [\App\Http\Controllers\Api\BrandPromptController::class, 'index']);
            Route::delete('brand-prompts/{prompt}', [\App\Http\Controllers\Api\BrandPromptController::class, 'destroy']);
        });
        
        // Agency People Management Routes
        Route::prefix('agency')->name('agency.')->group(function () {
            Route::resource('people', \App\Http\Controllers\Agency\PeopleController::class)->only(['index', 'store', 'destroy']);
            Route::put('people/{member}/rights', [\App\Http\Controllers\Agency\PeopleController::class, 'updateRights'])->name('people.updateRights');
        });
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
