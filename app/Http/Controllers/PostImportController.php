<?php

namespace App\Http\Controllers;

use App\Jobs\GeneratePostPrompts;
use App\Models\Brand;
use App\Models\Post;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;
use League\Csv\Reader;
use League\Csv\Writer;

class PostImportController extends Controller
{
    /**
     * Show the CSV import form for agency users
     */
    public function index()
    {
        $user = Auth::user();

        // Check if user is authenticated and has agency role
        if (! $user) {
            abort(403, 'Authentication required');
        }

        if (! $user->roles->contains('name', 'agency')) {
            abort(403, 'This feature is only available for agency users');
        }

        // Check if user can create posts
        if (! $user->can_create_posts) {
            $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');

            return Inertia::render('posts/import', [
                'brands' => [],
                'error' => "You don't have permission to import posts. Please contact the administrator at {$adminEmail}. ".
                          ($user->post_creation_note ? "Note: {$user->post_creation_note}" : ''),
            ]);
        }

        // Get brands the user has access to
        $allUserBrands = Brand::where('agency_id', $user->id)->orderBy('name')->get(['id', 'name', 'monthly_posts', 'can_create_posts']);
        $activeBrands = $allUserBrands->where('can_create_posts', true);
        $inactiveBrands = $allUserBrands->where('can_create_posts', false);

        $upgradeMessage = null;
        if ($activeBrands->isEmpty() && $inactiveBrands->isNotEmpty()) {
            $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');
            $upgradeMessage = "None of your brands have permission to create posts. Please contact the administrator at {$adminEmail} to upgrade your brands.";
        } elseif ($activeBrands->isEmpty()) {
            $upgradeMessage = "You don't have any brands set up yet. Please create brands first or contact support.";
        }

        return Inertia::render('posts/import', [
            'brands' => $activeBrands->values(),
            'upgrade_message' => $upgradeMessage,
        ]);
    }

    /**
     * Download CSV template
     */
    public function downloadTemplate()
    {
        $csv = Writer::createFromString('');

        // Set the header
        $csv->insertOne([
            'url',
            'title',
            'description',
            'status',
            'posted_at',
            'brand_id',
            'brand_name',
        ]);

        // Add example rows
        $csv->insertOne([
            'https://example.com/sample-post-with-id',
            'Sample Post Title (optional)',
            'Sample description (optional)',
            'published',
            '2025-01-01',
            '1',
            '', // Empty brand_name when using brand_id
        ]);

        $csv->insertOne([
            'https://example.com/sample-post-with-name',
            'Another Sample Post',
            'Another description',
            'draft',
            '2025-01-02',
            '', // Empty brand_id when using brand_name
            'Sample Brand Name',
        ]);

        $filename = 'post-import-template-'.date('Y-m-d').'.csv';

        return Response::make($csv->toString(), 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ]);
    }

    /**
     * Import posts from CSV
     */
    public function import(Request $request)
    {
        $request->validate([
            'csv_file' => 'required|file|mimes:csv,txt|max:2048',
            'default_brand_id' => 'nullable|exists:brands,id',
            'default_status' => 'required|in:published,draft,archived',
        ]);

        $user = Auth::user();

        // Check if user can create posts
        if (! $user->can_create_posts) {
            $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');

            return redirect()->route('posts.agency-import')->with('error',
                "You don't have permission to import posts. Please contact the administrator at {$adminEmail}. ".
                ($user->post_creation_note ? "Note: {$user->post_creation_note}" : '')
            );
        }

        $file = $request->file('csv_file');

        try {
            $csv = Reader::createFromPath($file->getRealPath(), 'r');
            $csv->setHeaderOffset(0);

            $records = $csv->getRecords();
            $imported = 0;
            $errors = [];
            $sessionId = session()->getId() ?: 'import-'.uniqid();

            foreach ($records as $offset => $record) {
                $lineNumber = $offset + 2; // +2 because offset starts at 0 and we have header

                // Validate required URL
                if (empty($record['url'])) {
                    $errors[] = "Line $lineNumber: URL is required";

                    continue;
                }

                // Validate URL format
                if (! filter_var($record['url'], FILTER_VALIDATE_URL)) {
                    $errors[] = "Line $lineNumber: Invalid URL format";

                    continue;
                }

                // Determine brand ID - try brand_id first, then brand_name, then default
                $brandId = null;
                $brand = null;

                if (! empty($record['brand_id'])) {
                    // Use brand_id if provided
                    $brandId = $record['brand_id'];
                    $brand = Brand::where('id', $brandId)
                        ->where('agency_id', $user->id)
                        ->where('can_create_posts', true)
                        ->first();

                    if (! $brand) {
                        $errors[] = "Line $lineNumber: Invalid brand ID or brand cannot create posts";

                        continue;
                    }
                } elseif (! empty($record['brand_name'])) {
                    // Use brand_name if provided
                    $brand = Brand::where('name', $record['brand_name'])
                        ->where('agency_id', $user->id)
                        ->where('can_create_posts', true)
                        ->first();

                    if (! $brand) {
                        $errors[] = "Line $lineNumber: Brand name '{$record['brand_name']}' not found or cannot create posts";

                        continue;
                    }
                    $brandId = $brand->id;
                } elseif ($request->default_brand_id && $request->default_brand_id !== 'none') {
                    // Use default brand if provided
                    $brandId = $request->default_brand_id;
                    $brand = Brand::where('id', $brandId)
                        ->where('agency_id', $user->id)
                        ->where('can_create_posts', true)
                        ->first();

                    if (! $brand) {
                        $errors[] = "Line $lineNumber: Default brand is invalid or cannot create posts";

                        continue;
                    }
                } else {
                    $errors[] = "Line $lineNumber: Brand is required (provide brand_id, brand_name, or set a default brand)";

                    continue;
                }

                // Check brand post limit
                $currentMonth = Carbon::now()->startOfMonth();
                $postsThisMonth = Post::where('brand_id', $brand->id)
                    ->where('created_at', '>=', $currentMonth)
                    ->count();

                if ($brand->monthly_posts && $postsThisMonth >= $brand->monthly_posts) {
                    $errors[] = "Line $lineNumber: Brand '{$brand->name}' has reached its monthly post limit of {$brand->monthly_posts} posts. Current count: {$postsThisMonth}";

                    continue;
                }

                // Set defaults
                $title = ! empty($record['title']) ? $record['title'] : 'Post from '.parse_url($record['url'], PHP_URL_HOST);
                $description = $record['description'] ?? '';
                $status = ! empty($record['status']) ? $record['status'] : $request->default_status;
                $postedAt = ! empty($record['posted_at']) ? Carbon::parse($record['posted_at']) : now();

                // Validate status
                if (! in_array($status, ['published', 'draft', 'archived'])) {
                    $status = $request->default_status;
                }

                try {
                    $post = Post::create([
                        'brand_id' => $brandId,
                        'user_id' => $user->id,
                        'title' => $title,
                        'url' => $record['url'],
                        'description' => $description,
                        'status' => $status,
                        'posted_at' => $postedAt,
                    ]);

                    // Generate prompts in background
                    GeneratePostPrompts::dispatch($post, $sessionId, $description);

                    $imported++;
                } catch (\Exception $e) {
                    $errors[] = "Line $lineNumber: Failed to create post - ".$e->getMessage();
                }
            }

            $message = "Successfully imported $imported posts.";
            if (! empty($errors)) {
                $message .= ' '.count($errors).' errors occurred.';
            }

            return redirect()->route('posts.agency-import')->with([
                'success' => $message,
                'import_errors' => $errors,
                'imported_count' => $imported,
            ]);

        } catch (\Exception $e) {
            return redirect()->route('posts.agency-import')->with('error', 'Failed to process CSV file: '.$e->getMessage());
        }
    }
}
