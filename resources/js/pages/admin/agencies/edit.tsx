import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import HeadingSmall from '@/components/heading-small';
import { ArrowLeft, Building2 } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

type Agency = {
    id: number;
    name: string;
    email: string;
};

type FormData = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
};

type Props = {
    agency: Agency;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Agencies', href: '/admin/agencies' },
    { title: 'Edit Agency', href: '#' },
];

export default function AgenciesEdit({ agency }: Props) {
    const { data, setData, patch, processing, errors } = useForm<FormData>({
        name: agency.name,
        email: agency.email,
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(`/admin/agencies/${agency.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Agency" />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/agencies">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Agencies
                        </Link>
                    </Button>

                    <HeadingSmall 
                        title="Edit Agency" 
                        description={`Update agency information for ${agency.name}`}
                    />
                </div>

                <div className="max-w-2xl">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Agency Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Name Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium">
                                        Agency Name *
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Enter agency name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={errors.name ? 'border-destructive' : ''}
                                        required
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-destructive">{errors.name}</p>
                                    )}
                                </div>

                                {/* Email Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium">
                                        Email Address *
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="agency@example.com"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className={errors.email ? 'border-destructive' : ''}
                                        required
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-destructive">{errors.email}</p>
                                    )}
                                </div>

                                {/* Password Section */}
                                <div className="pt-4 border-t">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Leave password fields empty to keep the current password
                                    </p>

                                    {/* Password Field */}
                                    <div className="space-y-2 mb-4">
                                        <Label htmlFor="password" className="text-sm font-medium">
                                            New Password
                                        </Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="Enter new password (optional)"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            className={errors.password ? 'border-destructive' : ''}
                                        />
                                        {errors.password && (
                                            <p className="text-sm text-destructive">{errors.password}</p>
                                        )}
                                    </div>

                                    {/* Password Confirmation Field */}
                                    <div className="space-y-2">
                                        <Label htmlFor="password_confirmation" className="text-sm font-medium">
                                            Confirm New Password
                                        </Label>
                                        <Input
                                            id="password_confirmation"
                                            type="password"
                                            placeholder="Confirm new password"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            className={errors.password_confirmation ? 'border-destructive' : ''}
                                        />
                                        {errors.password_confirmation && (
                                            <p className="text-sm text-destructive">{errors.password_confirmation}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex items-center gap-3 pt-4">
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Updating...' : 'Update Agency'}
                                    </Button>
                                    <Button variant="outline" asChild>
                                        <Link href="/admin/agencies">Cancel</Link>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
