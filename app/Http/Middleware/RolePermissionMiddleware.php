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
    public function handle(Request $request, Closure $next, ?string $permission = null, ?string $role = null): Response
    {
        if (! $request->user()) {
            return redirect()->route('login');
        }

        $user = $request->user();

        // Check for specific permission (skip if permission is 'null' string)
        if ($permission && $permission !== 'null' && ! $user->hasPermissionTo($permission)) {
            abort(403, 'Access denied. You do not have the required permission.');
        }

        // Check for specific role (skip if role is 'null' string)
        if ($role && $role !== 'null') {
            // Support multiple roles separated by pipe |
            $roles = explode('|', $role);


           // if ($user->hasRole('agency_member')  && ! in_array('agency_admin', $user->agencyMembership?->rights ?? [] )  ) {
           //     abort(403, 'Access deniedvgg. You do not have the required role.');
           // }
            // Admin users have access to all roles
           // if (! $user->hasRole('admin') && ! $user->hasAnyRole($roles) && ! $user->hasRole('agency_member')) {
           //     abort(403, 'Access denied. You do not have the required role.');
           // }
            // Admin users have access to all roles
            if (! $user->hasRole('admin') && ! $user->hasAnyRole($roles)) {
                abort(403, 'Access denied. You do not have the required role.');
            }
        }

        return $next($request);
    }
}
