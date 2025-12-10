<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DocsFileController extends Controller
{
    /**
     * Display the docs and files page.
     */
    public function index(): Response
    {
        return Inertia::render('docs-files/index', [
            'title' => 'Docs & Files',
        ]);
    }
}
