import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import InputError from '@/components/input-error';
import { StepProps } from './types';

export default function Step4MonthlyPosts({ data, setData, errors }: StepProps) {
    return (
        <div className="space-y-6">
            <div className="block">
                <h3 className="text-xl font-semibold">Monthly Posts Target</h3>
                <p className="text-muted-foreground">
                    Set how many posts you want to create per month for this brand.
                </p>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="monthly_posts">Number of posts per month <small className='text-xs font-normal text-muted-foreground'>( Recommended range: 5-50 posts per month for optimal engagement )</small></Label>
                <Input
                    id="monthly_posts"
                    type="number"
                    min="1"
                    max="1000"
                    value={data.monthly_posts}
                    onChange={(e) => setData('monthly_posts', parseInt(e.target.value) || 0)}
                    placeholder="e.g., 10"
                    className="form-control"
                />
                <InputError message={errors.monthly_posts} />
            </div>
        </div>
    );
}
