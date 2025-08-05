# Laravel Roles and Permissions Implementation

This application now includes a comprehensive roles and permissions system using Spatie's Laravel Permission package. Here's how everything works:

## Features Implemented

### Backend (Laravel)

1. **Spatie Laravel Permission Package**: Installed and configured for role and permission management
2. **User Model**: Updated with `HasRoles` trait
3. **Roles & Permissions**: Seeded with default roles (admin, manager, user) and permissions
4. **Middleware**: Custom `RolePermissionMiddleware` for route protection
5. **Controllers**: New controllers for user management and admin panel

### Frontend (React/TypeScript)

1. **Type Definitions**: Updated TypeScript interfaces to include roles and permissions
2. **Permission Hook**: Custom `usePermissions()` hook for checking user permissions
3. **Permission Wrapper**: Component for conditional rendering based on permissions
4. **Role-based Navigation**: Sidebar menu items show/hide based on user permissions
5. **Protected Pages**: Users and Admin pages with permission-based access

## Default Roles and Permissions

### Roles:
- **admin**: Full system access
- **manager**: User management and dashboard access
- **user**: Basic dashboard and settings access

### Permissions:
- `view-dashboard` - View the dashboard
- `manage-dashboard` - Manage dashboard content
- `view-users` - View user list
- `create-users` - Create new users
- `edit-users` - Edit existing users
- `delete-users` - Delete users
- `view-settings` - View settings
- `manage-settings` - Manage system settings
- `view-admin-panel` - Access admin panel
- `manage-system` - System administration

## Usage Examples

### Backend Route Protection

```php
// Protect route with permission
Route::get('users', [UserController::class, 'index'])
    ->middleware('role.permission:view-users');

// Protect route with role
Route::get('admin', [AdminController::class, 'index'])
    ->middleware('role.permission:,admin');
```

### Frontend Permission Checking

```typescript
// Using the usePermissions hook
const { hasPermission, hasRole, can } = usePermissions();

// Check specific permission
if (hasPermission('view-users')) {
    // Show users menu
}

// Check specific role
if (hasRole('admin')) {
    // Show admin features
}

// Use helper method
if (can('viewUsers')) {
    // Show user management
}
```

### Conditional Rendering

```tsx
// Using PermissionWrapper component
<PermissionWrapper permission="view-users">
    <UserManagementButton />
</PermissionWrapper>

// Multiple permissions
<PermissionWrapper permissions={['edit-users', 'delete-users']}>
    <UserActions />
</PermissionWrapper>

// Role-based rendering
<PermissionWrapper role="admin">
    <AdminPanel />
</PermissionWrapper>
```

## How to Assign Roles

### Programmatically
```php
$user = User::find(1);
$user->assignRole('admin');
$user->givePermissionTo('manage-system');
```

### Using Database Seeder
The `RolePermissionSeeder` assigns the 'admin' role to the test user (test@example.com).

## Available Pages

1. **Dashboard** (`/dashboard`) - Shows role-based quick actions
2. **Users** (`/users`) - User management (requires `view-users` permission)
3. **Admin Panel** (`/admin`) - Admin tools (requires `view-admin-panel` permission)
4. **Profile Settings** (`/settings/profile`) - Now shows user roles and permissions

## Navigation

The sidebar automatically shows/hides menu items based on user permissions:
- Dashboard (visible to all authenticated users with `view-dashboard`)
- My Page (visible to all authenticated users)
- User Management (visible to users with `view-users`)
- Admin Panel (visible to users with `view-admin-panel`)

## Testing

1. Login as test@example.com (password: password) - This user has admin role
2. The dashboard will show all available quick actions
3. Navigate to Users page to see user management
4. Visit Admin Panel to see admin tools
5. Check Profile Settings to see your roles and permissions

## Adding New Permissions

1. Add permission to `RolePermissionSeeder.php`
2. Run `php artisan db:seed --class=RolePermissionSeeder`
3. Update TypeScript interfaces if needed
4. Add permission checks in frontend components

## Adding New Roles

1. Create role in `RolePermissionSeeder.php`
2. Assign appropriate permissions
3. Update frontend logic if needed
4. Assign role to users as needed

This implementation provides a solid foundation for role-based access control in your Laravel + React application!
