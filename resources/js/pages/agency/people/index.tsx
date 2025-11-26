import { useState, FormEventHandler } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Settings, Trash2, Mail, User, Clock, RefreshCw, X } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import InputError from '@/components/input-error';

interface AgencyMember {
    id: number;
    user_id: number;
    agency_id: number;
    role: string;
    rights: string[];
    created_at: string;
    user: {
        id: number;
        name: string;
        email: string;
        email_verified_at: string | null;
    };
}

interface PendingInvitation {
    id: number;
    agency_id: number;
    name: string;
    email: string;
    token: string;
    role: string;
    rights: string[];
    expires_at: string;
    created_at: string;
}

interface Props {
    members: AgencyMember[];
    pendingInvitations: PendingInvitation[];
}

const availableRights = [
    { id: 'view-brands', label: 'View Brands' },
    { id: 'manage-brands', label: 'Manage Brands' },
    { id: 'view-analytics', label: 'View Analytics' },
    { id: 'manage-content', label: 'Manage Content' },
    { id: 'invite-members', label: 'Invite Members' },
];

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'People', href: '/agency/people' },
];

export default function PeopleIndex({ members, pendingInvitations }: Props) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isRightsDialogOpen, setIsRightsDialogOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<AgencyMember | null>(null);

    const { data, setData, post, errors, processing, reset } = useForm({
        name: '',
        email: '',
        role: 'agency_member',
        rights: [] as string[],
    });

    const { data: rightsData, setData: setRightsData, put: updateRights, processing: updatingRights } = useForm({
        rights: [] as string[],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('agency.people.store'), {
            onSuccess: () => {
                reset();
                setIsAddDialogOpen(false);
            },
        });
    };

    const handleRightsUpdate: FormEventHandler = (e) => {
        e.preventDefault();
        if (selectedMember) {
            updateRights(route('agency.people.updateRights', selectedMember.id), {
                onSuccess: () => {
                    setIsRightsDialogOpen(false);
                    setSelectedMember(null);
                },
            });
        }
    };

    const openRightsDialog = (member: AgencyMember) => {
        setSelectedMember(member);
        setRightsData('rights', member.rights || []);
        setIsRightsDialogOpen(true);
    };

    const handleRightChange = (rightId: string, checked: boolean) => {
        if (checked) {
            setRightsData('rights', [...rightsData.rights, rightId]);
        } else {
            setRightsData('rights', rightsData.rights.filter(r => r !== rightId));
        }
    };

    const deleteMember = (memberId: number) => {
        if (confirm('Are you sure you want to remove this team member? This action cannot be undone.')) {
            router.delete(route('agency.people.destroy', memberId));
        }
    };

    const resendInvitation = (invitationId: number) => {
        router.post(route('agency.invitations.resend', invitationId), {}, {
            preserveScroll: true,
        });
    };

    const cancelInvitation = (invitationId: number) => {
        if (confirm('Are you sure you want to cancel this invitation?')) {
            router.delete(route('agency.invitations.destroy', invitationId), {
                preserveScroll: true,
            });
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Agency People" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">People</h2>
                        <p className="text-muted-foreground">Manage team members and their permissions</p>
                    </div>
                    
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Team Member</DialogTitle>
                                <DialogDescription>
                                    Invite a new member to your agency team.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={submit}>
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="Enter full name"
                                            required
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="Enter email address"
                                            required
                                        />
                                        <InputError message={errors.email} />
                                        <p className="text-xs text-muted-foreground">
                                            An invitation email will be sent to this address
                                        </p>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Permissions</Label>
                                        <div className="space-y-2">
                                            {availableRights.map((right) => (
                                                <div key={right.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={right.id}
                                                        checked={data.rights.includes(right.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setData('rights', [...data.rights, right.id]);
                                                            } else {
                                                                setData('rights', data.rights.filter(r => r !== right.id));
                                                            }
                                                        }}
                                                    />
                                                    <Label htmlFor={right.id} className="text-sm font-normal">
                                                        {right.label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                        <InputError message={errors.rights} />
                                    </div>
                                </div>

                                <DialogFooter className="mt-6">
                                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Sending Invitation...' : 'Send Invitation'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Pending Invitations Section */}
                {pendingInvitations && pendingInvitations.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Pending Invitations ({pendingInvitations.length})
                        </h3>
                        <div className="grid gap-4">
                            {pendingInvitations.map((invitation) => (
                                <Card key={invitation.id}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                                    <Mail className="h-5 w-5 text-amber-600" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">{invitation.name}</CardTitle>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Mail className="h-3 w-3" />
                                                        {invitation.email}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    Pending
                                                </Badge>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => resendInvitation(invitation.id)}
                                                >
                                                    <RefreshCw className="h-4 w-4 mr-1" />
                                                    Resend
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => cancelInvitation(invitation.id)}
                                                >
                                                    <X className="h-4 w-4 mr-1" />
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <div className="text-sm text-muted-foreground">
                                                <strong>Sent:</strong> {formatDate(invitation.created_at)}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                <strong>Expires:</strong> {formatDate(invitation.expires_at)}
                                            </div>
                                            {invitation.rights && invitation.rights.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-medium mb-2">Assigned Permissions:</h4>
                                                    <div className="flex flex-wrap gap-1">
                                                        {invitation.rights.map((right) => (
                                                            <Badge key={right} variant="outline" className="text-xs">
                                                                {availableRights.find(r => r.id === right)?.label || right}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active Members Section */}
                {members.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Active Members ({members.length})
                        </h3>
                        <div className="grid gap-4">
                            {members.map((member) => (
                            <Card key={member.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <User className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{member.user.name}</CardTitle>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    {member.user.email}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">
                                                {member.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </Badge>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openRightsDialog(member)}
                                            >
                                                <Settings className="h-4 w-4 mr-1" />
                                                Permissions
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => deleteMember(member.id)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div>
                                        <h4 className="text-sm font-medium mb-2">Permissions:</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {member.rights && member.rights.length > 0 ? (
                                                member.rights.map((right) => (
                                                    <Badge key={right} variant="outline" className="text-xs">
                                                        {availableRights.find(r => r.id === right)?.label || right}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-sm text-muted-foreground">No permissions assigned</span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State - Show only if no members AND no pending invitations */}
            {members.length === 0 && (!pendingInvitations || pendingInvitations.length === 0) && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Start building your team by inviting your first member.
                        </p>
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Invite Your First Member
                        </Button>
                    </CardContent>
                </Card>
            )}

                {/* Rights Management Dialog */}
                <Dialog open={isRightsDialogOpen} onOpenChange={setIsRightsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Manage Permissions</DialogTitle>
                            <DialogDescription>
                                Update permissions for {selectedMember?.user.name}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleRightsUpdate}>
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Permissions</Label>
                                    <div className="space-y-2">
                                        {availableRights.map((right) => (
                                            <div key={right.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`rights-${right.id}`}
                                                    checked={rightsData.rights.includes(right.id)}
                                                    onCheckedChange={(checked) => handleRightChange(right.id, !!checked)}
                                                />
                                                <Label htmlFor={`rights-${right.id}`} className="text-sm font-normal">
                                                    {right.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-6">
                                <Button type="button" variant="outline" onClick={() => setIsRightsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updatingRights}>
                                    {updatingRights ? 'Updating...' : 'Update Permissions'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
