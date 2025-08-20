import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import InputError from '@/components/input-error';
import { StepProps } from './types';

export default function Step6AccountSetup({ data, setData, errors }: StepProps) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">Brand Account Setup</h3>
            <p className="text-muted-foreground">
                Optionally create a login account for this brand to access their dashboard.
            </p>
            
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="create_account"
                                checked={data.create_account}
                                onCheckedChange={(checked) => setData('create_account', checked as boolean)}
                            />
                            <Label htmlFor="create_account" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Create a brand account (recommended)
                            </Label>
                        </div>
                        
                        {data.create_account && (
                            <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                                <div className="grid gap-2">
                                    <Label htmlFor="brand_email">Brand Email *</Label>
                                    <Input
                                        id="brand_email"
                                        type="email"
                                        value={data.brand_email}
                                        onChange={(e) => setData('brand_email', e.target.value)}
                                        placeholder="brand@example.com"
                                        required={data.create_account}
                                    />
                                    <InputError message={errors.brand_email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="brand_password">Password *</Label>
                                    <Input
                                        id="brand_password"
                                        type="password"
                                        value={data.brand_password}
                                        onChange={(e) => setData('brand_password', e.target.value)}
                                        placeholder="Enter a secure password"
                                        required={data.create_account}
                                    />
                                    <InputError message={errors.brand_password} />
                                </div>
                            </div>
                        )}
                        
                        {!data.create_account && (
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                    No account will be created. You can add brand users later from the brand management panel.
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
