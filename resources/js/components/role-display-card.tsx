import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/use-permissions';
import { Shield } from 'lucide-react';

export function RoleDisplayCard() {
    const { roles, permissions } = usePermissions();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Your Account Permissions
                </CardTitle>
                <CardDescription>
                    Your current roles and permissions in the system
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h4 className="text-sm font-medium mb-2">Roles</h4>
                    <div className="flex flex-wrap gap-2">
                        {roles.length > 0 ? (
                            roles.map((role) => (
                                <Badge key={role} variant="secondary">
                                    {role}
                                </Badge>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No roles assigned</p>
                        )}
                    </div>
                </div>
                
                <div>
                    <h4 className="text-sm font-medium mb-2">Permissions</h4>
                    <div className="flex flex-wrap gap-2">
                        {permissions.length > 0 ? (
                            permissions.map((permission) => (
                                <Badge key={permission} variant="outline" className="text-xs">
                                    {permission}
                                </Badge>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No permissions assigned</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
