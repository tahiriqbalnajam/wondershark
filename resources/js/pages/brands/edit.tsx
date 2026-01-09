// Full BrandEdit with 7 ON/OFF toggles (styled like the provided image)

import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState, FormEventHandler } from 'react';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
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
  // prompts: Array<{ id: number; prompt: string; order: number; is_active: boolean }>;
  // subreddits: Array<{ id: number; subreddit_name: string; description?: string; status: string }>;
};

type Props = { brand: Brand };

type BrandForm = {
  name: string;
  website: string;
  description: string;
  monthly_posts: number;
  status: 'active' | 'inactive' | 'pending';
  logo: File | null;
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

export default function BrandEdit({ brand }: Props) {
  const [newPrompt, setNewPrompt] = useState('');
  const [newSubreddit, setNewSubreddit] = useState('');

  const { data, setData, post, processing, errors } = useForm<BrandForm & { _method: string }>({
    _method: 'PUT',
    name: brand.name,
    website: brand.website || '',
    description: brand.description,
    monthly_posts: brand.monthly_posts,
    status: brand.status,
    logo: null,
    Verified: false,
    'GPT-4o Search': false,
    'OpenAI (GPT-4)': false,
    'AI Overview': false,
    'AI Mode': false,
    Perplexity: false,
  });

  
    // prompts: brand.prompts.map((p) => p.prompt),
    // subreddits: brand.subreddits.map((s) => s.subreddit_name), /////// this data will be in above array 

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

      <div className="lg:mx-15 mx-0 space-y-6">
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
              </div>
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

            <div className="lg:flex block gap-2">
              <Button type="button" variant="outline" asChild className='lg:w-auto w-full lg:m-0 mb-3'>
                <a href={`/brands/${brand.id}`}>Cancel</a>
              </Button>

              <Button type="submit" disabled={processing} className='lg:w-auto w-full'>
                <Save className="h-4 w-4 mr-2" /> {processing ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

          </div>
        </form>
      </div>
    </AppLayout>
  );
}
