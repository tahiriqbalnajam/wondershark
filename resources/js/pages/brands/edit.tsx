// Full BrandEdit with 7 ON/OFF toggles (styled like the provided image)

import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, FormEventHandler } from 'react';
import { usStatesCities } from '@/data/us-states-cities';
import { canadaProvincesCities } from '@/data/canada-provinces-cities';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import AppLayout from '@/layouts/app-layout';
import { usePermissions } from '@/hooks/use-permissions';
import { AddPromptDialog } from '@/components/brand/add-prompt-dialog';
import {
  Plus,
  ArrowLeft,
  Building2,
  MessageSquare,
  Users,
  Edit,
  Trash2,
  Save,
} from 'lucide-react';

// --- Types ---

type Brand = {
  id: number;
  name: string;
  website?: string;
  description: string;
  monthly_posts: number;
  status: 'active' | 'inactive' | 'pending';
  logo?: string | null;
  trackedName?: string;
  allies?: string[];
  campaign_indicator?: string;
  country?: string;
  region?: string;
};

type Props = { brand: Brand; userEmail?: string };

type BrandForm = {
  name: string;
  website: string;
  description: string;
  monthly_posts: number;
  status: 'active' | 'inactive' | 'pending';
  logo: File | null;
  country: string;
  region: string;
  trackedName: string;
  allies: string[];
  campaign_indicator: string;
  // prompts: string[];
  // subreddits: string[];

  // toggles
  Verified: boolean;
  'GPT-4o Search': boolean;
  'OpenAI (GPT-4)': boolean;
  'AI Overview': boolean;
  'AI Mode': boolean;
  Perplexity: boolean;
};

const breadcrumbs = (brand: Brand): BreadcrumbItem[] => [
  { title: 'Brands', href: '/brands' },
  { title: brand.name, href: `/brands/${brand.id}` },
  { title: 'Edit', href: `/brands/${brand.id}/edit` },
];

export default function BrandEdit({ brand, userEmail }: Props) {
  const permissions = usePermissions();
  const [newPrompt, setNewPrompt] = useState('');
  const [newSubreddit, setNewSubreddit] = useState('');
  const [selectedState, setSelectedState] = useState<string>(() => {
    if ((brand.country === 'United States' || brand.country === 'US') && brand.region) {
      const parts = brand.region.split(', ');
      return parts[0] || '';
    }
    return '';
  });
  const [selectedProvince, setSelectedProvince] = useState<string>(() => {
    if ((brand.country === 'Canada' || brand.country === 'CA') && brand.region) {
      const parts = brand.region.split(', ');
      return parts[0] || '';
    }
    return '';
  });
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    if ((brand.country === 'United States' || brand.country === 'US') && brand.region) {
      const parts = brand.region.split(', ');
      return parts[1] || '';
    }
    return '';
  });
  const [selectedCACity, setSelectedCACity] = useState<string>(() => {
    if ((brand.country === 'Canada' || brand.country === 'CA') && brand.region) {
      const parts = brand.region.split(', ');
      return parts[1] || '';
    }
    return '';
  });

  const { data, setData, post, processing, errors } = useForm<BrandForm & { _method: string }>({
    _method: 'PUT',
    name: brand.name,
    website: brand.website || '',
    description: brand.description,
    monthly_posts: brand.monthly_posts,
    status: brand.status,
    logo: null,
    country: brand.country === 'US' ? 'United States' : brand.country === 'CA' ? 'Canada' : brand.country || '',
    region: brand.region || '',
    trackedName: brand.trackedName || '',
    allies: brand.allies || [],
    campaign_indicator: brand.campaign_indicator || '',
    Verified: false,
    'GPT-4o Search': false,
    'OpenAI (GPT-4)': false,
    'AI Overview': false,
    'AI Mode': false,
    Perplexity: false,
  });

  const isUS = data.country === 'United States' || data.country === 'US';
  const isCanada = data.country === 'Canada' || data.country === 'CA';
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

  // Sync dropdown state if data.region/country change after mount
  useEffect(() => {
    const region = data.region || '';
    if (!region) return;

    const parts = region.split(', ');
    if ((data.country === 'United States' || data.country === 'US') && parts.length >= 1 && usStatesCities[parts[0]]) {
      setSelectedState(parts[0]);
      if (parts.length >= 2) setSelectedCity(parts[1]);
    } else if ((data.country === 'Canada' || data.country === 'CA') && parts.length >= 1 && canadaProvincesCities[parts[0]]) {
      setSelectedProvince(parts[0]);
      if (parts.length >= 2) setSelectedCACity(parts[1]);
    }
  }, [data.country, data.region]);

  // const addPrompt = () => {
  //   if (newPrompt.trim() && data.prompts.length < 25) {
  //     setData('prompts', [...data.prompts, newPrompt.trim()]);
  //     setNewPrompt('');
  //   }
  // };

  // const removePrompt = (index: number) => setData('prompts', data.prompts.filter((_, i) => i !== index));

  // const editPrompt = (index: number, val: string) => {
  //   const copy = [...data.prompts];
  //   copy[index] = val;
  //   setData('prompts', copy);
  // };

  // const addSubreddit = () => {
  //   if (newSubreddit.trim() && data.subreddits.length < 20) {
  //     const name = newSubreddit.trim().replace(/^r\//, '');
  //     setData('subreddits', [...data.subreddits, name]);
  //     setNewSubreddit('');
  //   }
  // };

  // const removeSubreddit = (index: number) => setData('subreddits', data.subreddits.filter((_, i) => i !== index));
  const { delete: destroy } = useForm();

  // Email form
  const {
    data: emailData,
    setData: setEmailData,
    put: putEmail,
    errors: emailErrors,
    processing: emailProcessing,
    recentlySuccessful: emailRecentlySuccessful,
  } = useForm<{ current_email: string; new_email: string; new_email_confirmation: string }>({
    current_email: userEmail || '',
    new_email: '',
    new_email_confirmation: '',
  });

  const submitEmail: FormEventHandler = (e) => {
    e.preventDefault();
    putEmail(route('brand.settings.update-email'), {
      preserveScroll: true,
      onSuccess: () => setEmailData((prev) => ({ current_email: prev.new_email, new_email: '', new_email_confirmation: '' })),
    });
  };

    const handleSubmit: FormEventHandler = (e) => {
      e.preventDefault();
      post(route('brands.update', brand.id), {
        forceFormData: true,
      });
    };

  
  const toggles: {
      img: string | undefined; key: keyof BrandForm; label: string; iconUrl?: string 
}[] = [
    { key: 'OpenAI (GPT-4)' as keyof BrandForm, label: 'OpenAI (GPT-4)', img:'/images/b1.png' },
    { key: 'GPT-4o Search' as keyof BrandForm, label: 'GPT 4o Search', img:'/images/b2.png' },
    { key: 'AI Overview' as keyof BrandForm, label: 'AI Overview', img:'/images/b3.png' },
    { key: 'AI Mode' as keyof BrandForm, label: 'AI Mode', img:'/images/b4.png' },
    { key: 'Perplexity' as keyof BrandForm, label: 'Perplexity', img:'/images/b5.png' },
    { key: 'Verified' as keyof BrandForm, label: 'Verified', img:'/images/b6.png' },
  ];

  return (
    <AppLayout title={`Edit ${brand.name}`}>
      <Head title={`Edit ${brand.name}`} />

      <div className="lg:mx-15 mx-0 space-y-0">
        <div className="flex items-center justify-between">
          {/* <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <a href={`/brands/${brand.id}`}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Details
              </a>
            </Button>

            <HeadingSmall title={`Edit ${brand.name}`} description="Update brand information and content strategy" />
          </div> */}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-[45px] h-[45px] bg-gray-200 flex items-center justify-center rounded">
                  <Building2 />
                </span>
                Basic Information
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Brand Name *</Label>
                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Enter your brand name" className="form-control" required />
                <InputError message={errors.name} />
              </div>

              <div className="grid gap-2">

                <Label htmlFor="website">Website</Label>
                <Input id="website" type="url" value={data.website} onChange={(e) => setData('website', e.target.value)} placeholder="https://example.com" className="form-control" />
                <InputError message={errors.website} />
              </div>

              {permissions.hasRole('agency') && (
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
              )}

              {/* Country and Region fields */}
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <Select value={data.country || ''} onValueChange={handleCountryChange}>
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
                    placeholder="Specify States, Provinces, cities, custom areas within the country"
                    className="form-control"
                  />
                  <InputError message={errors.region} />
                </div>
              )}



              

              <div className="grid gap-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder="Put description..." rows={4} className="resize-none form-control" required />
                <InputError message={errors.description} />
              </div>

              {/* <div className="grid gap-2">
                <Label htmlFor="monthly_posts">Monthly Posts Target</Label>
                <Input id="monthly_posts" type="number" min={1} max={1000} value={data.monthly_posts} onChange={(e) => setData('monthly_posts', parseInt(e.target.value) || 0)} className="form-control" />
                <InputError message={errors.monthly_posts} />
              </div> */}

              <div className="space-y-4 border allies-card rounded-lg p-4">
                <div className="grid gap-2">
                  <Label htmlFor="trackedName">Tracked Name <small className="text-xs font-normal text-muted-foreground">( Optional )</small></Label>
                  <Input id="trackedName" value={data.trackedName} onChange={(e) => setData('trackedName', e.target.value)} placeholder="How this brand appears in mentions" className="form-control" />
                  <InputError message={errors.trackedName} />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label>Alias <small className="text-xs font-normal text-muted-foreground">( Optional )</small></Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setData('allies', [...data.allies, ''])}>+ Add Alias</Button>
                  </div>
                  {data.allies.map((ally, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Alias name"
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
                        onClick={() => setData('allies', data.allies.filter((_, i) => i !== index))}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <InputError message={errors.allies} />
                </div>
              </div>

              {/* Brand status dropdown */}
              <div className="grid gap-2">
                <Label htmlFor="status">Brand Status</Label>
                <Select value={data.status} onValueChange={(v: 'active' | 'inactive' | 'pending') => setData('status', v)}>
                  <SelectTrigger className="form-control">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" /> Active
                      </div>
                    </SelectItem>
                    <SelectItem value="pending">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" /> Pending
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" /> Inactive
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <InputError message={errors.status} />
              </div>
              <div className="grid gap-2">
                <Label>Brand Logo</Label>

                <div className="flex items-center gap-4">
                  {/* Logo preview */}
                  <div className="w-16 h-16 rounded-lg border flex items-center justify-center bg-gray-50 overflow-hidden">
                    {/* 1️⃣ New selected logo */}
                    {data.logo ? (
                      <img
                        src={URL.createObjectURL(data.logo)}
                        alt="Brand logo preview"
                        className="w-full h-full object-contain"
                      />
                    ) : brand.logo ? (
                      /* 2️⃣ Logo from DB */
                      <img
                        src={`/storage/${brand.logo}`}
                        alt={brand.logo}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      /* 3️⃣ Fallback from logo.dev API */
                      <img
                        src={`https://img.logo.dev/${data.website?.replace(/^https?:\/\//, '').replace(/^www\./, '')
                        }?format=png&token=pk_AVQ085F0QcOVwbX7HOMcUA`}
                        alt={brand.website}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src =
                            `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>`;
                        }}
                      />
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    id="brand-logo-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setData('logo', e.target.files[0]);
                      }
                    }}
                  />

                  {/* Upload button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      document.getElementById('brand-logo-upload')?.click()
                    }
                  >
                    Change Logo
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP or SVG. Max 2MB.
                </p>

                <InputError message={errors.logo} />
              </div>


{/*

              <div className="grid">
                <div className="bg-white border rounded-lg px-4 py-7">
                  <div className="space-y-3">
                    {toggles.map((t) => (
                        <div key={String(t.key)} className="">
                            <label className="relative inline-flex items-center cursor-pointer gap-2">
                                <input type="checkbox" className="sr-only" checked={!!data[t.key]} onChange={(e) => setData(t.key, e.target.checked)} />
                                <span className={`w-11 h-6 flex items-center rounded-full p-1 transition ${data[t.key] ? 'bg-orange-600' : 'bg-gray-200'}`}>
                                    <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${data[t.key] ? 'translate-x-5' : 'translate-x-0'}`} />
                                </span>
                                <img src={t.img} alt="" className='w-5' />
                                <div className="text-sm">{t.label}</div>
                            </label>
                        </div>
                    ))}
                  </div>
                </div>
              </div> */}
            </CardContent>
          </Card>

          {/* Content Prompts */}
          {/* <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" /> Content Prompts ({data.prompts.length}/25)
                </div>
                <AddPromptDialog brandId={brand.id} className="shadow-sm" />
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} placeholder="Enter a new content prompt..." rows={2} className="resize-none" />
                <Button type="button" onClick={addPrompt} disabled={!newPrompt.trim() || data.prompts.length >= 25}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {data.prompts.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {data.prompts.map((prompt, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2">Prompt {index + 1}</Badge>
                        <p className="text-sm">{prompt}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => {
                          const newValue = window.prompt('Edit prompt:', prompt);
                          if (newValue) editPrompt(index, newValue);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removePrompt(index)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <InputError message={errors.prompts} />
            </CardContent>
          </Card> */}

          {/* Target Subreddits */}
          {/* <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Target Subreddits ({data.subreddits.length}/20)
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={newSubreddit} onChange={(e) => setNewSubreddit(e.target.value)} placeholder="e.g., technology, marketing, startups" />
                <Button type="button" onClick={addSubreddit} disabled={!newSubreddit.trim() || data.subreddits.length >= 20}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {data.subreddits.length > 0 && (
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {data.subreddits.map((subreddit, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">r/{subreddit}</Badge>
                        <span className="text-sm text-green-600">Approved</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeSubreddit(index)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <InputError message={errors.subreddits} />
            </CardContent>
          </Card> */}

          {/* Actions */}
          <div className="lg:flex block justify-between items-center w-full mt-6">

            <div className="lg:flex block gap-2">

              <Button type="submit" disabled={processing} className='lg:w-auto w-full'>
                <Save className="h-4 w-4 mr-2" /> {processing ? 'Saving...' : 'Save Changes'}
              </Button>


              <Button type="button" variant="outline" asChild className='lg:w-auto w-full lg:m-0 mb-3'>
                <a href={`/brands/${brand.id}`}>Cancel</a>
              </Button>
            </div>

              <Button
                className='lg:w-auto w-full lg:m-0 mb-3'
                type="button"
                variant="destructive"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this brand? This action cannot be undone.")) {
                    destroy(route('brands.destroy', brand.id));
                    }
                }}
              >
                Delete Brand
              </Button>
          </div>
        </form>

        {/* Email Update Section - only for brand users */}
        {permissions.hasRole('brand') && (
        <Card className="mt-10">
          <CardHeader>
            <CardTitle>Email Address</CardTitle>
            <CardDescription>Update your email address for account notifications and billing</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitEmail} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="current_email">Current Email</Label>
                  <Input
                    id="current_email"
                    type="email"
                    className="form-control"
                    value={emailData.current_email}
                    onChange={(e) => setEmailData('current_email', e.target.value)}
                    autoComplete="email"
                    placeholder="Enter current email address"
                  />
                  <InputError className="mt-2" message={emailErrors.current_email} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="new_email">New Email</Label>
                  <Input
                    id="new_email"
                    type="email"
                    className="form-control"
                    value={emailData.new_email}
                    onChange={(e) => setEmailData('new_email', e.target.value)}
                    autoComplete="new-email"
                    placeholder="Enter new email address"
                  />
                  <InputError className="mt-2" message={emailErrors.new_email} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="new_email_confirmation">Confirm New Email</Label>
                  <Input
                    id="new_email_confirmation"
                    type="email"
                    className="form-control"
                    value={emailData.new_email_confirmation}
                    onChange={(e) => setEmailData('new_email_confirmation', e.target.value)}
                    autoComplete="new-email"
                    placeholder="Confirm new email address"
                  />
                  <InputError className="mt-2" />
                </div>
              </div>

              <div className="flex items-center">
                <div className="flex items-center gap-4">
                  <Button className="primary-btn" disabled={emailProcessing}>
                    {emailProcessing ? 'Updating...' : 'Update Email'}
                  </Button>

                  <Transition
                    show={emailRecentlySuccessful}
                    enter="transition ease-in-out"
                    enterFrom="opacity-0"
                    leave="transition ease-in-out"
                    leaveTo="opacity-0"
                  >
                    <p className="text-sm text-green-600">Email updated successfully!</p>
                  </Transition>

                  <Transition
                    show={!emailRecentlySuccessful && !!emailErrors.new_email_confirmation}
                    enter="transition ease-in-out"
                    enterFrom="opacity-0"
                    leave="transition ease-in-out"
                    leaveTo="opacity-0"
                  >
                    <p className="text-sm text-red-600">{emailErrors.new_email_confirmation}</p>
                  </Transition>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        )}
      </div>
    </AppLayout>
  );
}
