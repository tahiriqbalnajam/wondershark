import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Building2, Calendar } from 'lucide-react';

interface InvitationData {
    token: string;
    name: string;
    email: string;
    agency_name: string;
    expires_at: string;
}

interface Props {
    invitation: InvitationData;
}

export default function AcceptInvitation({ invitation }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        token: invitation.token,
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('agency.invitation.store'));
    };

    return (
        <>
            <Head title="Accept Invitation" />

            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center space-y-2">
                        <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl mb-4">
                            🦈
                        </div>
                        <CardTitle className="text-2xl">You're Invited!</CardTitle>
                        <CardDescription>
                            Join <strong>{invitation.agency_name}</strong> on WonderShark
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Building2 className="h-5 w-5 text-gray-600" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{invitation.agency_name}</p>
                                    <p className="text-xs text-gray-500">Agency</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Mail className="h-5 w-5 text-gray-600" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                                    <p className="text-xs text-gray-500">Your email</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <Calendar className="h-5 w-5 text-amber-600" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">Expires {invitation.expires_at}</p>
                                    <p className="text-xs text-amber-600">Accept soon to avoid expiration</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Create Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="pl-10"
                                        placeholder="Enter your password"
                                        required
                                        autoFocus
                                    />
                                </div>
                                {errors.password && (
                                    <p className="text-sm text-red-600">{errors.password}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        className="pl-10"
                                        placeholder="Confirm your password"
                                        required
                                    />
                                </div>
                                {errors.password_confirmation && (
                                    <p className="text-sm text-red-600">{errors.password_confirmation}</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={processing}
                            >
                                {processing ? 'Creating Account...' : 'Accept Invitation & Create Account'}
                            </Button>
                        </form>

                        <p className="text-xs text-center text-gray-500 mt-6">
                            By accepting this invitation, you agree to WonderShark's Terms of Service and Privacy Policy.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
