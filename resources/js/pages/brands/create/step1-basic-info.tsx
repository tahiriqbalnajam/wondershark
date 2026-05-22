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
        setData('region', '');
    };

    const handleStateChange = (value: string) => {
        setSelectedState(value);
        setSelectedCity('');
        setData('region', value);
    };

    const handleProvinceChange = (value: string) => {
        setSelectedProvince(value);
        setSelectedCACity('');
        setData('region', value);
    };

    const handleUSCityChange = (value: string) => {
        setSelectedCity(value);
        setData('region', selectedState + ', ' + value);
    };

    const handleCACityChange = (value: string) => {
        setSelectedCACity(value);
        setData('region', selectedProvince + ', ' + value);
    };

    // Parse saved region into dropdown selections on mount
    useEffect(() => {
        const region = data.region || '';
        if (!region) return;

        const parts = region.split(', ');
        if (data.country === 'United States' && parts.length >= 1 && usStatesCities[parts[0]]) {
            setSelectedState(parts[0]);
            if (parts.length >= 2) setSelectedCity(parts[1]);
        } else if (data.country === 'Canada' && parts.length >= 1 && canadaProvincesCities[parts[0]]) {
            setSelectedProvince(parts[0]);
            if (parts.length >= 2) setSelectedCACity(parts[1]);
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

                    {isUS ? (
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
                                value={data.region}
                                onChange={(e) => setData('region', e.target.value)}
                                placeholder="Specify States, Provinces, cities, custom areas within the country )"
                                className="form-control"
                            />
                            <InputError message={errors.region} />
                        </div>
                    )}

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
