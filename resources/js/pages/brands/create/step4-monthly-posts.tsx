import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import InputError from '@/components/input-error';
import { StepProps } from './types';

export default function Step4MonthlyPosts({ data, setData, errors }: StepProps) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">Monthly Posts Target</h3>
            <p className="text-muted-foreground">
                Set how many posts you want to create per month for this brand.
            </p>
            
            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-2">
                        <Label htmlFor="monthly_posts">Number of posts per month</Label>
                        <Input
                            id="monthly_posts"
                            type="number"
                            min="1"
                            max="1000"
                            value={data.monthly_posts}
                            onChange={(e) => setData('monthly_posts', parseInt(e.target.value) || 0)}
                            placeholder="e.g., 10"
                        />
                        <p className="text-sm text-muted-foreground">
                            Recommended range: 5-50 posts per month for optimal engagement
                        </p>
                        <InputError message={errors.monthly_posts} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
