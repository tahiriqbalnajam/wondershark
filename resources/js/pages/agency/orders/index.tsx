import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

const breadcrumbs = [
    { name: 'Dashboard', href: '/', title: 'Dashboard' },
    { name: 'Orders', href: '', title: 'Orders' },
];

export default function OrdersIndex() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Orders" />

            <div className="space-y-6">
                <HeadingSmall 
                    title="Orders"
                    description="Manage your orders and purchases" 
                />

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Recent Orders
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <ShoppingCart className="h-16 w-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">No orders yet</p>
                            <p className="text-sm">Your orders will appear here once you make a purchase.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
