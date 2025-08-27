import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { StepProps } from './types';

const countries = [
    'United States',
    'Canada',
    'United Kingdom',
    'Germany',
    'France',
    'Italy',
    'Spain',
    'Netherlands',
    'Sweden',
    'Norway',
    'Denmark',
    'Finland',
    'Belgium',
    'Austria',
    'Switzerland',
    'Australia',
    'New Zealand',
    'Japan',
    'South Korea',
    'Singapore',
    'India',
    'Brazil',
    'Mexico',
    'Argentina',
    'Chile',
    'South Africa',
    'Israel',
    'UAE',
    'Saudi Arabia',
    'Other'
];

export default function Step1BasicInfo({ data, setData, errors }: StepProps) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-4">Basic Brand Information</h3>
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Brand Name *</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Enter your brand name"
                            required
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                            id="website"
                            type="url"
                            value={data.website}
                            onChange={(e) => setData('website', e.target.value)}
                            placeholder="https://example.com"
                        />
                        <InputError message={errors.website} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="country">Country</Label>
                        <Select value={data.country} onValueChange={(value) => setData('country', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select your country" />
                            </SelectTrigger>
                            <SelectContent>
                                {countries.map((country) => (
                                    <SelectItem key={country} value={country}>
                                        {country}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.country} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Put description of the important aspects that you would like to promote in AI search."
                            rows={4}
                            className="resize-none"
                        />
                        <p className="text-sm text-muted-foreground">
                            Put description of the important aspects that you would like to promote in AI search.
                        </p>
                        <InputError message={errors.description} />
                    </div>
                </div>
            </div>
        </div>
    );
}
