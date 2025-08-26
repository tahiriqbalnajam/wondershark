<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Brand;
use App\Models\User;
use App\Jobs\GeneratePostPrompts;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Carbon\Carbon;
use League\Csv\Writer;
use League\Csv\Reader;
use Inertia\Inertia;

class PostImportController extends Controller
{
    /**
     * Show the CSV import form for admin
     */
    public function index()
    {
        // Get all agencies and brands for admin
        $agencies = User::role('agency')->orderBy('name')->get(['id', 'name']);
        $brands = Brand::with('agency')->orderBy('name')->get(['id', 'name', 'agency_id', 'can_create_posts', 'monthly_posts']);

        return Inertia::render('admin/posts/import', [
            'agencies' => $agencies,
            'brands' => $brands,
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
            'brand_name'
        ]);
        
        // Add example rows
        $csv->insertOne([
            'https://example.com/sample-post-with-id',
            'Sample Post Title (optional)',
            'Sample description (optional)',
            'published',
            '2025-01-01',
            '1',
            '' // Empty brand_name when using brand_id
        ]);
        
        $csv->insertOne([
            'https://example.com/sample-post-with-name',
            'Another Sample Post',
            'Another description',
            'draft',
            '2025-01-02',
            '', // Empty brand_id when using brand_name
            'Sample Brand Name'
        ]);

        $filename = 'post-import-template-admin-' . date('Y-m-d') . '.csv';
        
        return Response::make($csv->toString(), 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ]);
    }

    /**
     * Import posts from CSV for admin
     */
    public function import(Request $request)
    {
        $request->validate([
            'csv_file' => 'required|file|mimes:csv,txt|max:2048',
            'default_brand_id' => 'nullable|exists:brands,id',
            'default_status' => 'required|in:published,draft,archived',
        ]);

        $file = $request->file('csv_file');
        
        try {
            $csv = Reader::createFromPath($file->getRealPath(), 'r');
            $csv->setHeaderOffset(0);
            
            $records = $csv->getRecords();
            $imported = 0;
            $errors = [];
            $sessionId = session()->getId() ?: 'admin-import-' . uniqid();

            foreach ($records as $offset => $record) {
                $lineNumber = $offset + 2; // +2 because offset starts at 0 and we have header
                
                // Validate required URL
                if (empty($record['url'])) {
                    $errors[] = "Line $lineNumber: URL is required";
                    continue;
                }

                // Validate URL format
                if (!filter_var($record['url'], FILTER_VALIDATE_URL)) {
                    $errors[] = "Line $lineNumber: Invalid URL format";
                    continue;
                }

                // Determine brand ID - try brand_id first, then brand_name, then default
                $brandId = null;
                $brand = null;
                
                if (!empty($record['brand_id'])) {
                    // Use brand_id if provided
                    $brandId = $record['brand_id'];
                    $brand = Brand::find($brandId);
                        
                    if (!$brand) {
                        $errors[] = "Line $lineNumber: Brand ID {$brandId} not found";
                        continue;
                    }
                } elseif (!empty($record['brand_name'])) {
                    // Use brand_name if provided
                    $brand = Brand::where('name', $record['brand_name'])->first();
                        
                    if (!$brand) {
                        $errors[] = "Line $lineNumber: Brand name '{$record['brand_name']}' not found";
                        continue;
                    }
                    $brandId = $brand->id;
                } elseif ($request->default_brand_id && $request->default_brand_id !== 'none') {
                    // Use default brand if provided
                    $brandId = $request->default_brand_id;
                    $brand = Brand::find($brandId);
                        
                    if (!$brand) {
                        $errors[] = "Line $lineNumber: Default brand not found";
                        continue;
                    }
                } else {
                    $errors[] = "Line $lineNumber: Brand is required (provide brand_id, brand_name, or set a default brand)";
                    continue;
                }

                // Check if brand can create posts (admin can override this with warning)
                if (!$brand->can_create_posts) {
                    $errors[] = "Line $lineNumber: Warning - Brand '{$brand->name}' doesn't have post creation permission (imported anyway)";
                }

                // Check brand post limit (admin can override)
                $currentMonth = Carbon::now()->startOfMonth();
                $postsThisMonth = Post::where('brand_id', $brand->id)
                    ->where('created_at', '>=', $currentMonth)
                    ->count();

                if ($brand->monthly_posts && $postsThisMonth >= $brand->monthly_posts) {
                    $errors[] = "Line $lineNumber: Warning - Brand '{$brand->name}' has exceeded monthly limit (imported anyway)";
                }

                // Set defaults
                $title = !empty($record['title']) ? $record['title'] : 'Post from ' . parse_url($record['url'], PHP_URL_HOST);
                $description = $record['description'] ?? '';
                $status = !empty($record['status']) ? $record['status'] : $request->default_status;
                $postedAt = !empty($record['posted_at']) ? Carbon::parse($record['posted_at']) : now();

                // Validate status
                if (!in_array($status, ['published', 'draft', 'archived'])) {
                    $status = $request->default_status;
                }

                try {
                    $post = Post::create([
                        'brand_id' => $brandId,
                        'user_id' => Auth::id(), // Admin user creating the post
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
                    $errors[] = "Line $lineNumber: Failed to create post - " . $e->getMessage();
                }
            }

            $message = "Successfully imported $imported posts.";
            if (!empty($errors)) {
                $message .= " " . count($errors) . " errors/warnings occurred.";
            }

            return redirect()->route('posts.admin-import')->with([
                'success' => $message,
                'import_errors' => $errors,
                'imported_count' => $imported,
            ]);

        } catch (\Exception $e) {
            return redirect()->route('posts.admin-import')->with('error', 'Failed to process CSV file: ' . $e->getMessage());
        }
    }
}
