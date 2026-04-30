<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WebsiteUrl;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WebsiteUrlController extends Controller
{
    public function index()
    {
        $websiteUrls = WebsiteUrl::ordered()->get();

        return Inertia::render('admin/website-urls/index', [
            'websiteUrls' => $websiteUrls,
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/website-urls/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'url' => 'required|url|max:2048',
            'description' => 'nullable|string|max:1000',
            'is_enabled' => 'boolean',
            'order' => 'required|integer|min:0|max:100',
        ]);

        WebsiteUrl::create($validated);

        return redirect()->route('admin.website-urls.index')
            ->with('success', 'Website URL created successfully.');
    }

    public function edit(WebsiteUrl $websiteUrl)
    {
        return Inertia::render('admin/website-urls/edit', [
            'websiteUrl' => $websiteUrl,
        ]);
    }

    public function update(Request $request, WebsiteUrl $websiteUrl)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'url' => 'required|url|max:2048',
            'description' => 'nullable|string|max:1000',
            'is_enabled' => 'boolean',
            'order' => 'required|integer|min:0|max:100',
        ]);

        $websiteUrl->update($validated);

        return redirect()->route('admin.website-urls.index')
            ->with('success', 'Website URL updated successfully.');
    }

    public function destroy(WebsiteUrl $websiteUrl)
    {
        $websiteUrl->delete();

        return redirect()->route('admin.website-urls.index')
            ->with('success', 'Website URL deleted successfully.');
    }

    public function toggle(WebsiteUrl $websiteUrl)
    {
        $websiteUrl->update([
            'is_enabled' => ! $websiteUrl->is_enabled,
        ]);

        return back()->with('success', 'Website URL status updated successfully.');
    }
}
