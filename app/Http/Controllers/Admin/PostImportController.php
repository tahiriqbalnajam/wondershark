<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\GeneratePostPrompts;
use App\Models\Brand;
use App\Models\Post;
use App\Models\User;
use Carbon\Carbon;
use Carbon\Exceptions\InvalidFormatException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;
use League\Csv\Reader;
use League\Csv\Writer;

class PostImportController extends Controller
{
    /** Required CSV columns */
    private const REQUIRED_COLUMNS = ['url'];

    /** All recognized CSV columns */
    private const TEMPLATE_COLUMNS = [
        'url',
        'title',
        'description',
        'status',
        'posted_at',
        'post_type',
        'brand_id',
        'brand_name',
    ];

    /**
     * Show the CSV import form for admin
     */
    public function index()
    {
        $agencies = User::role('agency')->orderBy('name')->get(['id', 'name']);
        $brands = Brand::with('agency')->orderBy('name')->get(['id', 'name', 'agency_id', 'can_create_posts', 'monthly_posts']);

        return Inertia::render('admin/posts/import', [
            'agencies' => $agencies,
            'brands'   => $brands,
        ]);
    }

    /**
     * Download CSV template
     */
    public function downloadTemplate()
    {
        $csv = Writer::createFromString('');
        $csv->insertOne(self::TEMPLATE_COLUMNS);

        $csv->insertOne([
            'https://example.com/sample-post-with-id',
            'Sample Post Title (optional)',
            'Sample description (optional)',
            'published',
            date('Y-m-d'),
            'blog',       // post_type (optional)
            '1',
            '',
        ]);

        $csv->insertOne([
            'https://example.com/sample-post-with-name',
            'Another Sample Post',
            'Another description',
            'draft',
            date('Y-m-d'),
            'forum',       // post_type (optional)
            '',
            'Sample Brand Name',
        ]);

        $csv->insertOne([
            'https://example.com/sample-pr-replacement',
            'PR Placement Post',
            'Description for PR Placement',
            'published',
            date('Y-m-d'),
            'pr_replacement',       // post_type (optional)
            '1',
            '',
        ]);

        $csv->insertOne([
            'https://example.com/sample-ugc-post',
            'User Generated Content Post',
            'UGC description here',
            'published',
            date('Y-m-d'),
            'ugc',       // post_type (optional)
            '1',
            '',
        ]);

        $csv->insertOne([
            'https://example.com/sample-directory-listing',
            'Directory Listing Post',
            'Directory or listing description',
            'published',
            date('Y-m-d'),
            'directory_listings',       // post_type (optional)
            '1',
            '',
        ]);

        $csv->insertOne([
            'https://example.com/sample-website-content',
            'Website Content Post',
            'Website content description',
            'published',
            date('Y-m-d'),
            'website_content',       // post_type (optional)
            '1',
            '',
        ]);

        $filename = 'post-import-template-admin-'.date('Y-m-d').'.csv';

        return Response::make($csv->toString(), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ]);
    }

    /**
     * Sanitize a string to ensure valid UTF-8 for safe JSON encoding.
     */
    private function sanitizeUtf8(?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return mb_scrub(trim($value), 'UTF-8');
    }

    /**
     * Parse a date string, handling DD/MM/YYYY (Excel localization) in addition to YYYY-MM-DD.
     */
    private function parseDate(string $value): ?Carbon
    {
        // Explicitly handle DD/MM/YYYY — Carbon::parse() misreads slashes as MM/DD/YYYY
        if (preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}$/', $value)) {
            return Carbon::createFromFormat('d/m/Y', $value);
        }

        // Explicitly handle YYYY-MM-DD
        if (preg_match('/^\d{4}-\d{1,2}-\d{1,2}$/', $value)) {
            return Carbon::createFromFormat('Y-m-d', $value);
        }

        try {
            return Carbon::parse($value);
        } catch (InvalidFormatException $e) {
            return null;
        }
    }

    /**
     * Import posts from CSV for admin
     */
    public function import(Request $request)
    {
        if ($request->default_brand_id === 'none') {
            $request->merge(['default_brand_id' => null]);
        }

        $request->validate([
            'csv_file' => 'required|file|mimes:csv,txt|max:10240', // 10 MB
            'default_brand_id' => 'nullable|exists:brands,id',
            'default_status' => 'required|in:published,draft,archived',
        ]);

        $file = $request->file('csv_file');

        try {
            $csv = Reader::createFromPath($file->getRealPath(), 'r');
            $csv->setHeaderOffset(0);
            $csv->skipInputBOM(); // Strip BOM if present (common with Excel-generated CSVs)

            // Validate that required headers exist
            $headers = $csv->getHeader();
            $missingColumns = array_diff(self::REQUIRED_COLUMNS, $headers);
            if (! empty($missingColumns)) {
                return redirect()->route('posts.admin-import')->with(
                    'error',
                    'CSV is missing required columns: '.implode(', ', $missingColumns).'. Please download the template and try again.'
                );
            }

            $records = $csv->getRecords();
            $imported = 0;
            $errors = [];
            $warnings = [];
            $sessionId = session()->getId() ?: 'admin-import-'.uniqid();

            // Track URLs seen in this batch to detect in-CSV duplicates
            $seenUrls = [];

            foreach ($records as $offset => $record) {
                $lineNumber = $offset + 2;

                // Sanitize all CSV values to ensure valid UTF-8
                $record = array_map(fn ($v) => $this->sanitizeUtf8($v), $record);

                // Validate required URL
                $url = $record['url'];
                if (empty($url)) {
                    $errors[] = "Line $lineNumber: URL is required";
                    continue;
                }

                // Validate URL format
                if (! filter_var($url, FILTER_VALIDATE_URL)) {
                    $errors[] = "Line $lineNumber: Invalid URL format — '$url'";
                    continue;
                }

                // Detect duplicate URLs within this CSV batch
                $normalizedUrl = rtrim(strtolower($url), '/');
                if (isset($seenUrls[$normalizedUrl])) {
                    $errors[] = "Line $lineNumber: Duplicate URL in CSV (already seen on line {$seenUrls[$normalizedUrl]})";
                    continue;
                }
                $seenUrls[$normalizedUrl] = $lineNumber;

                // Determine brand
                $brandId = null;
                $brand = null;

                if (! empty($record['brand_id'])) {
                    $brand = Brand::find($record['brand_id']);
                    if (! $brand) {
                        $errors[] = "Line $lineNumber: Brand ID {$record['brand_id']} not found";
                        continue;
                    }
                    $brandId = $brand->id;
                } elseif (! empty($record['brand_name'])) {
                    $brand = Brand::where('name', $record['brand_name'])->first();
                    if (! $brand) {
                        $errors[] = "Line $lineNumber: Brand name '{$record['brand_name']}' not found";
                        continue;
                    }
                    $brandId = $brand->id;
                } elseif ($request->default_brand_id && $request->default_brand_id !== 'none') {
                    $brand = Brand::find($request->default_brand_id);
                    if (! $brand) {
                        $errors[] = "Line $lineNumber: Default brand not found";
                        continue;
                    }
                    $brandId = $brand->id;
                } else {
                    $errors[] = "Line $lineNumber: Brand is required (provide brand_id, brand_name, or set a default brand)";
                    continue;
                }

                // Admin: warn but still import if brand lacks permission or is over limit
                if (! $brand->can_create_posts) {
                    $warnings[] = "Line $lineNumber: Brand '{$brand->name}' doesn't have post creation permission (imported anyway)";
                }

                $currentMonth = Carbon::now()->startOfMonth();
                $postsThisMonth = Post::where('brand_id', $brand->id)
                    ->where('created_at', '>=', $currentMonth)
                    ->count();

                if ($brand->monthly_posts && $postsThisMonth >= $brand->monthly_posts) {
                    $warnings[] = "Line $lineNumber: Brand '{$brand->name}' has exceeded monthly limit (imported anyway)";
                }

                // Resolve field values
                $title = ! empty($record['title']) ? $record['title'] : 'Post from '.parse_url($url, PHP_URL_HOST);
                $description = $record['description'];
                $postType = $record['post_type'] ?: null;

                $status = ! empty($record['status']) ? $record['status'] : $request->default_status;
                if (! in_array($status, ['published', 'draft', 'archived'])) {
                    $status = $request->default_status;
                }

                $postedAt = now();
                if (! empty($record['posted_at'])) {
                     // try {
                      //        $postedAt = Carbon::parse($record['posted_at']);
                      //    } catch (InvalidFormatException $e) {
                       //       $errors[] = "Line $lineNumber: Invalid posted_at date format '{$record['posted_at']}' — use YYYY-MM-DD";
                //Parse a date string, handling DD/MM/YYYY (Excel localization) in addition to YYYY-MM-DD.
                    $postedAt = $this->parseDate($record['posted_at']);
                    if (! $postedAt) {
                        $errors[] = "Line $lineNumber: Invalid posted_at date format '{$record['posted_at']}' — use YYYY-MM-DD or DD/MM/YYYY";
                        continue;
                    }
                }

                try {
                    $post = Post::create([
                        'brand_id'    => $brandId,
                        'user_id'     => Auth::id(),
                        'title'       => $title,
                        'url'         => $url,
                        'description' => $description,
                        'status'      => $status,
                        'posted_at'   => $postedAt,
                        'post_type'   => $postType,
                    ]);

                    GeneratePostPrompts::dispatch($post, $sessionId, $description);
                    $imported++;
                } catch (\Exception $e) {
                    $errors[] = "Line $lineNumber: Failed to create post — ".$e->getMessage();
                }
            }

            $message = "Successfully imported $imported post".($imported !== 1 ? 's' : '').'.';
            if (! empty($errors)) {
                $message .= ' '.count($errors).' error'.( count($errors) !== 1 ? 's' : '').' occurred.';
            }

            return redirect()->route('posts.admin-import')->with([
                'success'        => $message,
                'import_errors'  => $errors,
                'import_warnings' => $warnings,
                'imported_count' => $imported,
            ]);

        } catch (\Exception $e) {
            return redirect()->route('posts.admin-import')->with('error', 'Failed to process CSV file: '.$e->getMessage());
        }
    }
}
