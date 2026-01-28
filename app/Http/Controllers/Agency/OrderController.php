<?php

namespace App\Http\Controllers\Agency;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class OrderController extends Controller
{
    /**
     * Display the orders page.
     */
    public function index()
    {
        return Inertia::render('agency/orders/index');
    }
}
