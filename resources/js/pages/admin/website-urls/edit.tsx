import { Head, Link, useForm } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/layouts/app-layout";

interface WebsiteUrl {
  id: number;
  title: string;
  url: string;
  description: string | null;
  is_enabled: boolean;
  order: number;
}

interface Props {
  websiteUrl: WebsiteUrl;
}

export default function Edit({ websiteUrl }: Props) {
  const { data, setData, patch, processing, errors } = useForm({
    title: websiteUrl.title,
    url: websiteUrl.url,
    description: websiteUrl.description || '',
    is_enabled: websiteUrl.is_enabled,
    order: websiteUrl.order,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    patch(route('admin.website-urls.update', websiteUrl.id));
  };

  return (
    <AppLayout>
      <Head title={`Edit ${websiteUrl.title}`} />

      <div className="py-12">
        <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href={route('admin.website-urls.index')}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Gap URLs
              </Button>
            </Link>
            <h2 className="font-semibold text-xl text-gray-800 leading-tight">
              Edit {websiteUrl.title}
            </h2>
          </div>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>URL Details</CardTitle>
                <CardDescription>
                  Update the website URL settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={data.title}
                      onChange={(e) => setData('title', e.target.value)}
                      placeholder="e.g., Company Blog"
                      required
                    />
                    {errors.title && (
                      <p className="text-sm text-red-600">{errors.title}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url">URL *</Label>
                    <Input
                      id="url"
                      type="url"
                      value={data.url}
                      onChange={(e) => setData('url', e.target.value)}
                      placeholder="https://example.com"
                      required
                    />
                    {errors.url && (
                      <p className="text-sm text-red-600">{errors.url}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Optional description for this URL"
                    rows={3}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_enabled"
                      checked={data.is_enabled}
                      onCheckedChange={(checked: boolean) => setData('is_enabled', checked)}
                    />
                    <Label htmlFor="is_enabled">Enabled</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="order">Display Order</Label>
                    <Input
                      id="order"
                      type="number"
                      min="0"
                      max="100"
                      value={data.order}
                      onChange={(e) => setData('order', parseInt(e.target.value) || 0)}
                      required
                    />
                    <p className="text-xs text-gray-600">
                      Lower numbers appear first
                    </p>
                    {errors.order && (
                      <p className="text-sm text-red-600">{errors.order}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t">
                  <Link href={route('admin.website-urls.index')}>
                    <Button variant="outline">Cancel</Button>
                  </Link>
                  <Button type="submit" disabled={processing}>
                    {processing ? 'Updating...' : 'Update URL'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
