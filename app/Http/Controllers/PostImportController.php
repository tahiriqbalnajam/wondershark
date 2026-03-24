<?php

namespace App\Http\Controllers;

use App\Jobs\GeneratePostPrompts;
use App\Models\Brand;
use App\Models\Post;
use App\Models\SystemSetting;
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
     * Show the CSV import form for agency users
     */
    public function index()
    {
        $user = Auth::user();

        if (! $user) {
            abort(403, 'Authentication required');
        }

        // Allow both agency and agency_member roles (matches route middleware)
        $isAgencyUser = $user->roles->contains(fn ($r) => in_array($r->name, ['agency', 'agency_member']));
        if (! $isAgencyUser) {
            abort(403, 'This feature is only available for agency users');
        }

        if (! $user->can_create_posts) {
            $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');

            return Inertia::render('posts/import', [
                'brands'          => [],
                'upgrade_message' => "You don't have permission to import posts. Please contact the administrator at {$adminEmail}. ".
                                     ($user->post_creation_note ? "Note: {$user->post_creation_note}" : ''),
            ]);
        }

        // For agency_member, look up the parent agency brands
        $agencyId = $user->roles->contains('name', 'agency') ? $user->id : $user->agency_id;

        $allUserBrands = Brand::where('agency_id', $agencyId)->orderBy('name')->get(['id', 'name', 'monthly_posts', 'can_create_posts']);
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
            'brands'          => $activeBrands->values(),
            'upgrade_message' => $upgradeMessage,
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
            'blog',
            '1',
            '',
        ]);

        $csv->insertOne([
            'https://example.com/sample-post-with-name',
            'Another Sample Post',
            'Another description',
            'draft',
            date('Y-m-d'),
            'news',
            '',
            'Sample Brand Name',
        ]);

        $filename = 'post-import-template-'.date('Y-m-d').'.csv';

        return Response::make($csv->toString(), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ]);
    }

    /**
     * Import posts from CSV
     */
    public function import(Request $request)
    {
        if ($request->default_brand_id === 'none') {
            $request->merge(['default_brand_id' => null]);
        }

        $request->validate([
            'csv_file'         => 'required|file|mimes:csv,txt|max:10240', // 10 MB
            'default_brand_id' => 'nullable|exists:brands,id',
            'default_status'   => 'required|in:published,draft,archived',
        ]);

        $user = Auth::user();

        if (! $user->can_create_posts) {
            $adminEmail = SystemSetting::get('admin_contact_email', 'admin@wondershark.com');

            return redirect()->route('posts.agency-import')->with('error',
                "You don't have permission to import posts. Please contact the administrator at {$adminEmail}. ".
                ($user->post_creation_note ? "Note: {$user->post_creation_note}" : '')
            );
        }

        // Resolve the agency this user belongs to
        $agencyId = $user->roles->contains('name', 'agency') ? $user->id : $user->agency_id;

        $file = $request->file('csv_file');

        try {
            $csv = Reader::createFromPath($file->getRealPath(), 'r');
            $csv->setHeaderOffset(0);
            $csv->skipInputBOM();

            // Validate required headers
            $headers = $csv->getHeader();
            $missingColumns = array_diff(self::REQUIRED_COLUMNS, $headers);
            if (! empty($missingColumns)) {
                return redirect()->route('posts.agency-import')->with(
                    'error',
                    'CSV is missing required columns: '.implode(', ', $missingColumns).'. Please download the template and try again.'
                );
            }

            $records = $csv->getRecords();
            $imported = 0;
            $errors = [];
            $sessionId = session()->getId() ?: 'import-'.uniqid();
            $seenUrls = [];

            foreach ($records as $offset => $record) {
                $lineNumber = $offset + 2;

                $url = trim($record['url'] ?? '');
                if (empty($url)) {
                    $errors[] = "Line $lineNumber: URL is required";
                    continue;
                }

                if (! filter_var($url, FILTER_VALIDATE_URL)) {
                    $errors[] = "Line $lineNumber: Invalid URL format — '$url'";
                    continue;
                }

                // Detect in-batch duplicates
                $normalizedUrl = rtrim(strtolower($url), '/');
                if (isset($seenUrls[$normalizedUrl])) {
                    $errors[] = "Line $lineNumber: Duplicate URL in CSV (already seen on line {$seenUrls[$normalizedUrl]})";
                    continue;
                }
                $seenUrls[$normalizedUrl] = $lineNumber;

                // Determine brand — must belong to this agency and have post creation enabled
                $brandId = null;
                $brand = null;

                if (! empty($record['brand_id'])) {
                    $brand = Brand::where('id', $record['brand_id'])
                        ->where('agency_id', $agencyId)
                        ->where('can_create_posts', true)
                        ->first();

                    if (! $brand) {
                        $errors[] = "Line $lineNumber: Invalid brand ID or brand cannot create posts";
                        continue;
                    }
                    $brandId = $brand->id;
                } elseif (! empty($record['brand_name'])) {
                    $brand = Brand::where('name', trim($record['brand_name']))
                        ->where('agency_id', $agencyId)
                        ->where('can_create_posts', true)
                        ->first();

                    if (! $brand) {
                        $errors[] = "Line $lineNumber: Brand name '{$record['brand_name']}' not found or cannot create posts";
                        continue;
                    }
                    $brandId = $brand->id;
                } elseif ($request->default_brand_id && $request->default_brand_id !== 'none') {
                    $brand = Brand::where('id', $request->default_brand_id)
                        ->where('agency_id', $agencyId)
                        ->where('can_create_posts', true)
                        ->first();

                    if (! $brand) {
                        $errors[] = "Line $lineNumber: Default brand is invalid or cannot create posts";
                        continue;
                    }
                    $brandId = $brand->id;
                } else {
                    $errors[] = "Line $lineNumber: Brand is required (provide brand_id, brand_name, or set a default brand)";
                    continue;
                }

                // Enforce monthly post limit
                $currentMonth = Carbon::now()->startOfMonth();
                $postsThisMonth = Post::where('brand_id', $brand->id)
                    ->where('created_at', '>=', $currentMonth)
                    ->count();

                if ($brand->monthly_posts && $postsThisMonth >= $brand->monthly_posts) {
                    $errors[] = "Line $lineNumber: Brand '{$brand->name}' has reached its monthly post limit of {$brand->monthly_posts} posts (current: {$postsThisMonth})";
                    continue;
                }

                // Resolve field values
                $title = ! empty($record['title']) ? trim($record['title']) : 'Post from '.parse_url($url, PHP_URL_HOST);
                $description = trim($record['description'] ?? '');
                $postType = trim($record['post_type'] ?? '') ?: null;

                $status = ! empty($record['status']) ? trim($record['status']) : $request->default_status;
                if (! in_array($status, ['published', 'draft', 'archived'])) {
                    $status = $request->default_status;
                }

                $postedAt = now();
                if (! empty($record['posted_at'])) {
                    try {
                        $postedAt = Carbon::parse(trim($record['posted_at']));
                    } catch (InvalidFormatException $e) {
                        $errors[] = "Line $lineNumber: Invalid posted_at date format '{$record['posted_at']}' — use YYYY-MM-DD";
                        continue;
                    }
                }

                try {
                    $post = Post::create([
                        'brand_id'    => $brandId,
                        'user_id'     => $user->id,
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

            return redirect()->route('posts.agency-import')->with([
                'success'        => $message,
                'import_errors'  => $errors,
                'imported_count' => $imported,
            ]);

        } catch (\Exception $e) {
            return redirect()->route('posts.agency-import')->with('error', 'Failed to process CSV file: '.$e->getMessage());
        }
    }
}
