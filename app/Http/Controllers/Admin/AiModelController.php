<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiModel;
use App\Services\AIPromptService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AiModelController extends Controller
{
    public function __construct()
    {
        // This will be handled in routes with middleware
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $aiModels = AiModel::ordered()->get();

        return Inertia::render('admin/ai-models/index', [
            'aiModels' => $aiModels
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('admin/ai-models/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:ai_models,name',
            'display_name' => 'required|string',
            'icon' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
            'is_enabled' => 'boolean',
            'prompts_per_brand' => 'required|integer|min:0',
            'api_config.api_key' => 'nullable|string',
            'api_config.model' => 'nullable|string',
            'api_config.endpoint' => 'nullable|url',
            'order' => 'required|integer|min:1|max:10'
        ]);

        // Handle icon upload
        if ($request->hasFile('icon')) {
            $file = $request->file('icon');
            if ($file && $file->isValid()) {
                $iconPath = 'ai-model-icons/' . uniqid() . '_' . $file->getClientOriginalName();
                $file->move(public_path('storage/ai-model-icons'), basename($iconPath));
                $validated['icon'] = $iconPath;
            } else {
                return back()->withErrors(['icon' => 'Invalid icon file uploaded.']);
            }
        } else {
            unset($validated['icon']);
        }

        AiModel::create($validated);

        return redirect()->route('admin.ai-models.index')
            ->with('success', 'AI Model created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(AiModel $aiModel)
    {
        return Inertia::render('admin/ai-models/show', [
            'aiModel' => $aiModel
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(AiModel $aiModel)
    {
        return Inertia::render('admin/ai-models/edit', [
            'aiModel' => $aiModel
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AiModel $aiModel)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:ai_models,name,' . $aiModel->id,
            'display_name' => 'required|string',
            'icon' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
            'is_enabled' => 'boolean',
            'prompts_per_brand' => 'required|integer|min:0',
            'api_config.api_key' => 'nullable|string',
            'api_config.model' => 'nullable|string',
            'api_config.endpoint' => 'nullable|url',
            'order' => 'required|integer|min:1|max:10'
        ]);

        // Handle icon upload
        if ($request->hasFile('icon')) {
            $file = $request->file('icon');
            if ($file && $file->isValid()) {
                // Delete old icon if exists
                if ($aiModel->icon && !empty($aiModel->icon) && \Storage::disk('public')->exists($aiModel->icon)) {
                    \Storage::disk('public')->delete($aiModel->icon);
                }
                $iconPath = 'ai-model-icons/' . uniqid() . '_' . $file->getClientOriginalName();
                $file->move(public_path('storage/ai-model-icons'), basename($iconPath));
                $validated['icon'] = $iconPath;
            } else {
                return back()->withErrors(['icon' => 'Invalid icon file uploaded.']);
            }
        } else {
            unset($validated['icon']);
        }

        $aiModel->update($validated);

        return redirect()->route('admin.ai-models.index')
            ->with('success', 'AI Model updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AiModel $aiModel)
    {
        $aiModel->delete();

        return redirect()->route('admin.ai-models.index')
            ->with('success', 'AI Model deleted successfully.');
    }

    /**
     * Toggle the enabled status of an AI model.
     */
    public function toggle(AiModel $aiModel)
    {
        $aiModel->update([
            'is_enabled' => !$aiModel->is_enabled
        ]);

        return back()->with('success', 'AI Model status updated successfully.');
    }

    /**
     * Test the AI model connection and configuration.
     */
    public function test(Request $request, AiModel $aiModel)
    {
        $brandPromptAnalysisService = new \App\Services\BrandPromptAnalysisService(new AIPromptService());
        $result = $brandPromptAnalysisService->testAiModel($aiModel);
        
        // If it's an AJAX request, return JSON
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json($result);
        }
        
        // Otherwise, return redirect with flash message (for non-AJAX requests)
        if ($result['success']) {
            return back()->with('success', "Connection test successful for {$aiModel->display_name}");
        } else {
            return back()->with('error', "Connection test failed for {$aiModel->display_name}: {$result['message']}");
        }
    }
}
