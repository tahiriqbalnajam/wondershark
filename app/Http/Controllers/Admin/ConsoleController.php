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
            ],
            [
                'signature' => 'brand:analyze-prompts --all --force',
                'description' => 'Brand Prompt Analysis Scheduling - Runs daily at 2 AM UTC',
            ],
            [
                'signature' => 'posts:fetch-prompts-stats',
                'description' => 'Post Prompt Stats Fetching - Runs daily at 3 AM UTC',
            ],
            [
                'signature' => 'brand:recalculate-visibility --regenerate',
                'description' => 'Recalculate Brand Visibility - Runs daily at 5 AM UTC',
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
        ]);

        $command = $request->input('command');

        // Whitelist commands for security
        $allowedCommands = [
            'brands:analyze-competitive-stats',
            'brand:analyze-prompts --all --force',
            'posts:fetch-prompts-stats',
            'brand:recalculate-visibility --regenerate',
        ];

        if (!in_array($command, $allowedCommands)) {
            return back()->with('error', 'Command not allowed');
        }

        try {
            Artisan::call($command);
            $output = Artisan::output();
            
            return back()->with('success', "Command executed successfully: $output");
        } catch (\Exception $e) {
            return back()->with('error', 'Error executing command: ' . $e->getMessage());
        }
    }
}
