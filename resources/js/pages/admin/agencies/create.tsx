import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import HeadingSmall from '@/components/heading-small';
import { ArrowLeft, Building2 } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

type FormData = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Agencies', href: '/admin/agencies' },
    { title: 'Create Agency', href: '/admin/agencies/create' },
];

export default function AgenciesCreate() {
    const { data, setData, post, processing, errors } = useForm<FormData>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/agencies');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Agency" />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/agencies">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Agencies
                        </Link>
                    </Button>

                    <HeadingSmall 
                        title="Create New Agency" 
                        description="Add a new agency account to the system"
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
                                        className={`form-control ${errors.name ? 'border-destructive' : ''}`}
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
                                        className={`form-control ${errors.email ? 'border-destructive' : ''}`}
                                        required
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-destructive">{errors.email}</p>
                                    )}
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-sm font-medium">
                                        Password *
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Enter password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className={`form-control ${errors.password ? 'border-destructive' : ''}`}
                                        required
                                    />
                                    {errors.password && (
                                        <p className="text-sm text-destructive">{errors.password}</p>
                                    )}
                                </div>

                                {/* Password Confirmation Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation" className="text-sm font-medium">
                                        Confirm Password *
                                    </Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        placeholder="Confirm password"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        className={`form-control ${errors.password_confirmation ? 'border-destructive' : ''}`}
                                        required
                                    />
                                    {errors.password_confirmation && (
                                        <p className="text-sm text-destructive">{errors.password_confirmation}</p>
                                    )}
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex items-center gap-3 pt-4">
                                    <Button type="submit" disabled={processing} style={{ backgroundColor: 'var(--orange-1)' }} className="hover:opacity-90">
                                        {processing ? 'Creating...' : 'Create Agency'}
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
