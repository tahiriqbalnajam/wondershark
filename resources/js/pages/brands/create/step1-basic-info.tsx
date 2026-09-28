import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { StepProps } from './types';
import { Button } from '@/components/ui/button';
import { usStatesCities } from '@/data/us-states-cities';
import { canadaProvincesCities } from '@/data/canada-provinces-cities';
import { useState, useEffect } from 'react';
import RegionRowList from '@/components/region-row-list';

/*
 * PHASE-6 — Multi-state on brand creation is intentionally DISABLED here.
 * This single-select UI matches the pre-Phase-6 UX.
 *
 * The handlers below write to `data.region` as a single-element array
 * `[{ state, city }]` so the backend (which now expects `region: array`)
 * accepts it. The user still sees one state dropdown + one city dropdown
 * exactly as before.
 *
 * To re-enable multi-state on creation later, see `PHASE-6-PLAN.md` at the
 * project root — the swap is a frontend-only change to this file. The shared
 * `<RegionRowList>` component already exists at
 * `resources/js/components/region-row-list.tsx` and is already in use on the
 * brand edit page.
 */

const countries = [
    'United States',
    'Canada',
    'United Kingdom',
    'Ireland',
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
    const [selectedState, setSelectedState] = useState<string>('');
    const [selectedProvince, setSelectedProvince] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedCACity, setSelectedCACity] = useState<string>('');
    const isUS = data.country === 'United States';
    const isCanada = data.country === 'Canada';
    const usCities = isUS && selectedState ? usStatesCities[selectedState] || [] : [];
    const caCities = isCanada && selectedProvince ? canadaProvincesCities[selectedProvince] || [] : [];

    const handleCountryChange = (value: string) => {
        setData('country', value);
        setSelectedState('');
        setSelectedProvince('');
        setSelectedCity('');
        setSelectedCACity('');
        setData('region', []);
    };

    const handleStateChange = (value: string) => {
        setSelectedState(value);
        setSelectedCity('');
        setData('region', [{ state: value, cities: [] }]);
    };

    const handleProvinceChange = (value: string) => {
        setSelectedProvince(value);
        setSelectedCACity('');
        setData('region', [{ state: value, cities: [] }]);
    };

    const handleUSCityChange = (value: string) => {
        setSelectedCity(value);
        setData('region', [{ state: selectedState, cities: [value] }]);
    };

    const handleCACityChange = (value: string) => {
        setSelectedCACity(value);
        setData('region', [{ state: selectedProvince, cities: [value] }]);
    };

    // Parse saved region into dropdown selections on mount
    useEffect(() => {
        const row = Array.isArray(data.region) ? data.region[0] : null;
        if (!row) return;

        const firstCity = Array.isArray(row.cities) ? row.cities[0] ?? '' : (row.city ?? '');

        if (isUS && row.state && usStatesCities[row.state]) {
            setSelectedState(row.state);
            if (firstCity) setSelectedCity(firstCity);
        } else if (isCanada && row.state && canadaProvincesCities[row.state]) {
            setSelectedProvince(row.state);
            if (firstCity) setSelectedCACity(firstCity);
        }
    }, []);

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
                <h3 className="text-xl font-semibold mb-6 mt-10">Basic Campaign Information</h3>
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Campaign Name *</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Enter your campaign name"
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
                        <Label htmlFor="campaign_indicator">Campaign indicator</Label>
                        <Input
                            id="campaign_indicator"
                            value={data.campaign_indicator}
                            onChange={(e) => setData('campaign_indicator', e.target.value)}
                            placeholder="give unique name to your campaign for record keeping purpose"
                            className="form-control"
                        />
                        <InputError message={errors.campaign_indicator} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="country">Country</Label>
                        <Select  value={data.country} onValueChange={handleCountryChange}>
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

                    {
                    /*
                    
                    isUS ? (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="state">State</Label>
                                <Select value={selectedState} onValueChange={handleStateChange}>
                                    <SelectTrigger className="form-control cursor-pointer">
                                        <SelectValue placeholder="Select a state" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(usStatesCities).map((state) => (
                                            <SelectItem key={state} value={state}>
                                                {state}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedState && (
                                <div className="grid gap-2">
                                    <Label htmlFor="city">City</Label>
                                    <Select value={selectedCity} onValueChange={handleUSCityChange}>
                                        <SelectTrigger className="form-control cursor-pointer">
                                            <SelectValue placeholder="Select a city" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {usCities.map((city) => (
                                                <SelectItem key={city} value={city}>
                                                    {city}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </>
                    ) : isCanada ? (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="province">Province / Territory</Label>
                                <Select value={selectedProvince} onValueChange={handleProvinceChange}>
                                    <SelectTrigger className="form-control cursor-pointer">
                                        <SelectValue placeholder="Select a province or territory" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(canadaProvincesCities).map((prov) => (
                                            <SelectItem key={prov} value={prov}>
                                                {prov}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedProvince && (
                                <div className="grid gap-2">
                                    <Label htmlFor="city">City</Label>
                                    <Select value={selectedCACity} onValueChange={handleCACityChange}>
                                        <SelectTrigger className="form-control cursor-pointer">
                                            <SelectValue placeholder="Select a city" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {caCities.map((city) => (
                                                <SelectItem key={city} value={city}>
                                                    {city}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="grid gap-2">
                            <Label htmlFor="region">Region</Label>
                            <Input
                                id="region"
                                value={Array.isArray(data.region) ? (data.region[0]?.state ?? '') : ''}
                                onChange={(e) => setData('region', [{ state: e.target.value, cities: [] }])}
                                placeholder="Specify States, Provinces, cities, custom areas within the country )"
                                className="form-control"
                            />
                            <InputError message={errors.region} />
                        </div>
                    )
                     */
                    }

                    
                    <RegionRowList
                        value={data.region}
                        onChange={(rows) => setData('region', rows)}
                        country={data.country}
                        error={errors.region as string | undefined}
                    />
                    

                    <div className="grid gap-2">
                        <Label htmlFor="procedure">Procedure <small className='text-xs font-normal text-muted-foreground'>( Optional )</small></Label>
                        <Input
                            id="procedure"
                            value={data.procedure}
                            onChange={(e) => setData('procedure', e.target.value)}
                            placeholder="e.g. Rhinoplasty, Knee Replacement, Dental Implants"
                            className="form-control"
                        />
                        <InputError message={errors.procedure} />
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
                    <CardContent className="space-y-6 allies-card border">
                        <div className="grid gap-2">
                            <Label htmlFor="trackedName">Tracked Name  <small className='text-xs font-normal text-muted-foreground'>( Optional )</small></Label>
                            <Input id ="trackedName" value={data.trackedName} onChange={(e) => setData('trackedName', e.target.value)}/>
                        </div>
                        <div className='grid'>
                            <div className="">
                                <Label htmlFor='allies'>Alias  <small className='text-xs font-normal text-muted-foreground'>( Optional )</small></Label>
                                <Button id ="allies" type="button" variant="outline" size="sm" onClick={addAllyField}>+ Add Alias </Button>
                                {data.allies.map((ally, index) => (
                                    <div key={index} className="flex items-center gap-2 mt-3">
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