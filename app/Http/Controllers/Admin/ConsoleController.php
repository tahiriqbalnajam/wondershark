<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;

class ConsoleController extends Controller
{
    public function index()
    {
        $commands = [
            [
                'signature' => 'brands:analyze-competitive-stats',
                'description' => 'Competitive Analysis Scheduling - Runs at 2 AM and 2 PM UTC',
                'options' => [
                    ['name' => 'brand', 'type' => 'text', 'label' => 'Brand ID (Optional)', 'prefix' => '--brand='],
                    ['name' => 'force', 'type' => 'boolean', 'label' => 'Force Analysis', 'prefix' => '--force', 'default' => false],
                    ['name' => 'hours', 'type' => 'text', 'label' => 'Hours Threshold', 'prefix' => '--hours=', 'default' => '24'],
                ]
            ],
            [
                'signature' => 'brand:analyze-prompts',
                'description' => 'Brand Prompt Analysis Scheduling - Runs daily at 2 AM UTC',
                'options' => [
                    ['name' => 'brand', 'type' => 'text', 'label' => 'Brand ID(s) (Optional)', 'prefix' => '--brand='],
                    ['name' => 'all', 'type' => 'boolean', 'label' => 'Process All', 'prefix' => '--all', 'default' => true],
                    ['name' => 'force', 'type' => 'boolean', 'label' => 'Force Regenerate', 'prefix' => '--force', 'default' => false],
                ]
            ],
            [
                'signature' => 'posts:fetch-prompts-stats',
                'description' => 'Post Prompt Stats Fetching - Runs daily at 3 AM UTC',
                'options' => [
                    ['name' => 'post', 'type' => 'text', 'label' => 'Post ID (Optional)', 'prefix' => '--post='],
                    ['name' => 'brand', 'type' => 'text', 'label' => 'Brand ID (Optional)', 'prefix' => '--brand='],
                    ['name' => 'all', 'type' => 'boolean', 'label' => 'All Brands', 'prefix' => '--all', 'default' => false],
                    ['name' => 'days', 'type' => 'text', 'label' => 'Days Lookback', 'prefix' => '--days=', 'default' => '7'],
                    ['name' => 'limit', 'type' => 'text', 'label' => 'Limit (Optional)', 'prefix' => '--limit='],
                ]
            ],
            [
                'signature' => 'brand:recalculate-visibility',
                'description' => 'Recalculate Brand Visibility - Runs daily at 5 AM UTC',
                'options' => [
                    ['name' => 'brand', 'type' => 'text', 'label' => 'Brand ID (Optional)', 'prefix' => '--brand='],
                    ['name' => 'days', 'type' => 'text', 'label' => 'Days Lookback', 'prefix' => '--days=', 'default' => '30'],
                    ['name' => 'regenerate', 'type' => 'boolean', 'label' => 'Regenerate Mentions', 'prefix' => '--regenerate', 'default' => true],
                ]
            ],
            [
                'signature' => 'citations:check-daily',
                'description' => 'Check Post Citations - Runs daily at 6 AM UTC',
                'options' => [
                    ['name' => 'post', 'type' => 'text', 'label' => 'Specific Post ID (Optional)', 'prefix' => '--post='],
                    ['name' => 'brand', 'type' => 'text', 'label' => 'Specific Brand ID (Optional)', 'prefix' => '--brand='],
                ]
            ],
            [
                'signature' => 'posts:check-urls',
                'description' => 'Check Post URLs - Runs daily at 7 AM UTC',
                'options' => [
                    // ['name' => 'post', 'type' => 'text', 'label' => 'Specific Post ID (Optional)', 'prefix' => '--post='],
                    ['name' => 'all-brands', 'type' => 'boolean', 'label' => 'All Brands', 'prefix' => '--all-brands', 'default' => false],
                    ['name' => 'brand', 'type' => 'text', 'label' => 'Specific Brand ID (Optional)', 'prefix' => '--brand='],
                ]
            ],
            [
                'signature' => 'posts:generate-additional-prompts',
                'description' => 'Generate additional prompts for posts below target count (default target: 5)',
                'options' => [
                    ['name' => 'post', 'type' => 'text', 'label' => 'Specific Post ID (Optional)', 'prefix' => '--post='],
                    ['name' => 'brand', 'type' => 'text', 'label' => 'Specific Brand ID (Optional)', 'prefix' => '--brand='],
                    ['name' => 'target', 'type' => 'text', 'label' => 'Target Prompt Count', 'prefix' => '--target=', 'default' => '5'],
                ]
            ],
            [
                'signature' => 'posts:remove-additional-prompts',
                'description' => 'Trim post prompts to keep only the first N prompts, deleting the rest',
                'options' => [
                    ['name' => 'post', 'type' => 'text', 'label' => 'Specific Post ID (Optional)', 'prefix' => '--post='],
                    ['name' => 'brand', 'type' => 'text', 'label' => 'Specific Brand ID (Optional)', 'prefix' => '--brand='],
                    ['name' => 'keep', 'type' => 'text', 'label' => 'Prompts to Keep', 'prefix' => '--keep=', 'default' => '5'],
                    ['name' => 'dry-run', 'type' => 'boolean', 'label' => 'Dry Run (no deletion)', 'prefix' => '--dry-run', 'default' => false],
                ]
            ],
        ];

        return Inertia::render('admin/console/index', [
            'commands' => $commands,
        ]);
    }

    public function run(Request $request)
    {
        $request->validate([
            'command' => 'required|string',
            'params' => 'nullable|array',
        ]);

        $command = $request->input('command');
        $params = $request->input('params', []);

        // Whitelist commands for security
        $allowedCommands = [
            'brands:analyze-competitive-stats',
            'brand:analyze-prompts',
            'posts:fetch-prompts-stats',
            'brand:recalculate-visibility',
            'citations:check-daily',
            'posts:check-urls',
            'posts:generate-additional-prompts',
            'posts:remove-additional-prompts',
        ];

        if (!in_array($command, $allowedCommands)) {
            return back()->with('error', 'Command not allowed');
        }

        try {
            // Construct command with parameters
            $artisanParams = [];
            foreach ($params as $key => $value) {
                // key is like "--brand="
                // clean key
                $cleanKey = str_replace('=', '', $key);
                
                if ($value === true) {
                    $artisanParams[$cleanKey] = true;
                } elseif ($value !== false && $value !== null && $value !== '') {
                    // Handle comma-separated values (e.g. "1,2,3") by converting to array
                    // This is useful for flags that accept multiple values like --brand=*
                    if (is_string($value) && str_contains($value, ',')) {
                        $artisanParams[$cleanKey] = array_map('trim', explode(',', $value));
                    } else {
                        $artisanParams[$cleanKey] = $value;
                    }
                }
            }

            Artisan::call($command, $artisanParams);
            $output = Artisan::output();
            
            return back()->with('success', "Command executed successfully: $output");
        } catch (\Exception $e) {
            return back()->with('error', 'Error executing command: ' . $e->getMessage());
        }
    }
}
