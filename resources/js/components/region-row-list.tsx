import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { usStatesCities } from '@/data/us-states-cities';
import { canadaProvincesCities } from '@/data/canada-provinces-cities';
import { Plus, X } from 'lucide-react';
import { useEffect } from 'react';

export type RegionRow = {
    state: string;
    cities: string[];
};

type Props = {
    value: RegionRow[];
    onChange: (rows: RegionRow[]) => void;
    country: string;
    error?: string;
};

export default function RegionRowList({ value, onChange, country, error }: Props) {
    const isUS = country === 'United States' || country === 'US';
    const isCanada = country === 'Canada' || country === 'CA';
    const isDropdown = isUS || isCanada;

    // Auto-add one empty row when switching to a US/CA country with no rows,
    // so the state dropdown is visible without clicking "Add State" first.
    useEffect(() => {
        if (isDropdown && value.length === 0) {
            onChange([{ state: '', cities: [] }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDropdown, value.length]);

    const places = isUS ? Object.keys(usStatesCities) : isCanada ? Object.keys(canadaProvincesCities) : [];
    const citiesFor = (state: string): string[] => {
        if (isUS && state && usStatesCities[state]) return usStatesCities[state];
        if (isCanada && state && canadaProvincesCities[state]) return canadaProvincesCities[state];
        return [];
    };

    const placeLabel = isUS ? 'State' : isCanada ? 'Province / Territory' : 'Region';

    const rows = value.length > 0 ? value : [];

    const updateState = (index: number, state: string) => {
        const next = value.map((row, i) => (i === index ? { ...row, state, cities: [] } : row));
        onChange(next);
    };

    const addCity = (index: number) => {
        const next = value.map((row, i) => (i === index ? { ...row, cities: [...row.cities, ''] } : row));
        onChange(next);
    };

    const updateCity = (index: number, cityIndex: number, city: string) => {
        const next = value.map((row, i) =>
            i === index
                ? { ...row, cities: row.cities.map((c, ci) => (ci === cityIndex ? city : c)) }
                : row
        );
        onChange(next);
    };

    const removeCity = (index: number, cityIndex: number) => {
        const next = value.map((row, i) =>
            i === index
                ? { ...row, cities: row.cities.filter((_, ci) => ci !== cityIndex) }
                : row
        );
        onChange(next);
    };

    const updateFreeText = (index: number, text: string) => {
        const next = value.map((row, i) => (i === index ? { ...row, state: text, cities: [] } : row));
        onChange(next);
    };

    const addRow = () => onChange([...value, { state: '', cities: [] }]);
    const removeRow = (index: number) => onChange(value.filter((_, i) => i !== index));

    return (
        <div className="space-y-3">
            {isDropdown && (
                <Label>{placeLabel}{rows.length > 1 ? 's' : ''}</Label>
            )}
            {rows.map((row, index) => (
                <div key={index} className="space-y-2 border rounded-md p-3">
                    <div className="flex items-start gap-2">
                        <div className="flex-1">
                            {isDropdown ? (
                                <Select value={row.state} onValueChange={(v) => updateState(index, v)}>
                                    <SelectTrigger className="form-control cursor-pointer">
                                        <SelectValue placeholder={`Select a ${placeLabel.toLowerCase()}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {places.map((p) => (
                                            <SelectItem key={p} value={p}>
                                                {p}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    value={row.state}
                                    onChange={(e) => updateFreeText(index, e.target.value)}
                                    placeholder="Specify state, province, city, or custom area"
                                    className="form-control"
                                />
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeRow(index)}
                            disabled={rows.length <= 1}
                            className='mt-2'
                            title={rows.length <= 1 ? 'At least one row required' : 'Remove'}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {isDropdown && row.state && citiesFor(row.state).length > 0 && (
                        <div className="pl-1 space-y-2">
                            <Label className="text-xs text-muted-foreground">Cities</Label>
                            {row.cities.length === 0 && (
                                <p className="text-xs text-muted-foreground pl-1">
                                    No city selected — forecast will use the whole {placeLabel.toLowerCase()}.
                                </p>
                            )}
                            {row.cities.map((city, cityIndex) => (
                                <div key={cityIndex} className="flex items-center gap-2">
                                    <Select
                                        value={city}
                                        onValueChange={(v) => updateCity(index, cityIndex, v)}
                                    >
                                        <SelectTrigger className="form-control cursor-pointer ">
                                            <SelectValue placeholder="Select a city" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {citiesFor(row.state)
                                                .filter((c) => !row.cities.includes(c) || c === city)
                                                .map((c) => (
                                                    <SelectItem key={c} value={c}>
                                                        {c}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeCity(index, cityIndex)}
                                        title="Remove city"
                                        className='mb-7'
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => addCity(index)}
                                disabled={row.cities.length >= citiesFor(row.state).length}
                            >
                                <Plus className="h-3 w-3 mr-1" /> Add city
                            </Button>
                        </div>
                    )}
                </div>
            ))}
            {rows.length === 0 && (
                <p className="text-sm text-muted-foreground">No {placeLabel.toLowerCase()} added yet.</p>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-4 w-4 mr-1" /> Add {placeLabel}
            </Button>
            <InputError message={error} />
        </div>
    );
}