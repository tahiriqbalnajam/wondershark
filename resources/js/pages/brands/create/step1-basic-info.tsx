import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { StepProps } from './types';
import { Button } from '@/components/ui/button';

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
    const handleWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let url = e.target.value.trim();
        
        // Auto-add https:// if no protocol is provided and it's not empty
        if (url && !url.match(/^https?:\/\//)) {
            // Remove www. if present to avoid duplication
            url = url.replace(/^www\./, '');
            // Remove any leading slashes
            url = url.replace(/^\/+/, '');
            // Add https:// only if there's actual content
            if (url.length > 0) {
                url = 'https://' + url;
            }
        }
        
        setData('website', url);
    };
    const addAllyField = () => {
        setData('allies', [...data.allies, '']);
        };

        // Remove ally by index
        const removeAllyField = (index: number) => {
        const updated = data.allies.filter((_, i) => i !== index);
        setData('allies', updated.length ? updated : ['']);
        };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold mb-6 mt-10">Basic Brand Information</h3>
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Brand Name *</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Enter your brand name"
                            required
                            className="form-control"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="website">Website *</Label>
                        <Input
                            id="website"
                            type="url"
                            value={data.website}
                            onChange={handleWebsiteChange}
                            placeholder="example.com (https:// will be added automatically)"
                            className="form-control"
                        />
                        <InputError message={errors.website} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="country">Country</Label>
                        <Select  value={data.country} onValueChange={(value) => setData('country', value)}>
                            <SelectTrigger className="form-control cursor-pointer">
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
                        <Label htmlFor="description">Keywords <small className='text-xs font-normal text-muted-foreground'>( Optional )</small></Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Use 3-4 targeted keywords to help AI generate content closely aligned with your strategy and objectives"
                            rows={4}
                            className="resize-none form-control"
                        />
                        <InputError message={errors.description} />
                    </div>
                    <CardContent className="space-y-4 allies-card">
                        <div className="grid gap-2">
                            <Label htmlFor="trackedName">Tracked Name  <small className='text-xs font-normal text-muted-foreground'>( Optional )</small></Label>
                            <Input id ="trackedName" value={data.trackedName} onChange={(e) => setData('trackedName', e.target.value)}/>
                        </div>
                        <div className='grid'>
                        <div className="flex gap-2">
                            <Label htmlFor='allies'>Alias  <small className='text-xs font-normal text-muted-foreground'>( Optional )</small></Label>
                            <Button id ="allies" type="button" variant="outline" size="sm" onClick={addAllyField}>+ Add Alias </Button>
                            {data.allies.map((ally, index) => (
                                <div key={index} className="grid items-center gap-2">
                                <Input
                                    type="text"
                                    placeholder="Alia name"
                                    value={ally}
                                    onChange={(e) => {
                                    const updated = [...data.allies];
                                    updated[index] = e.target.value;
                                    setData('allies', updated);
                                    }}
                                    className="form-control"
                                />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeAllyField(index)}
                                >
                                    ✕
                                </Button>
                                </div>
                            ))}
                        </div>

                        </div>
                    </CardContent>
                </div>
            </div>
        </div>
    );
}
