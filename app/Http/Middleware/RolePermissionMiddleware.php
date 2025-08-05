<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RolePermissionMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission = null, string $role = null): Response
    {
        if (!$request->user()) {
            return redirect()->route('login');
        }

        // Check for specific permission
        if ($permission && !$request->user()->can($permission)) {
            abort(403, 'Access denied. You do not have the required permission.');
        }

        // Check for specific role
        if ($role && !$request->user()->hasRole($role)) {
            abort(403, 'Access denied. You do not have the required role.');
        }

        return $next($request);
    }
}
