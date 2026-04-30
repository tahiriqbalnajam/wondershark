import { Head, Link, router, useForm } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { toast } from "sonner";

interface WebsiteUrl {
  id: number;
  title: string;
  url: string;
  description: string | null;
  is_enabled: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  websiteUrls: WebsiteUrl[];
  flash?: {
    success?: string;
    error?: string;
  };
}

export default function Index({ websiteUrls, flash }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (flash?.success) {
      toast.success(flash.success);
    }
    if (flash?.error) {
      toast.error(flash.error);
    }
  }, [flash]);

  const { data, setData, post, processing, errors, reset } = useForm({
    title: '',
    url: '',
    description: '',
    is_enabled: true as boolean,
    order: 0,
  });

  const handleOpenDrawer = () => {
    reset();
    setDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('admin.website-urls.store'), {
      onSuccess: () => {
        setDrawerOpen(false);
        reset();
      },
    });
  };

  const handleCancel = () => {
    setDrawerOpen(false);
    reset();
  };

  const handleToggle = (websiteUrl: WebsiteUrl) => {
    router.post(route('admin.website-urls.toggle', websiteUrl.id), {}, {
      preserveScroll: true,
    });
  };

  const handleDelete = (websiteUrl: WebsiteUrl) => {
    if (confirm(`Are you sure you want to delete "${websiteUrl.title}"?`)) {
      router.delete(route('admin.website-urls.destroy', websiteUrl.id));
    }
  };

  return (
    <AppLayout>
      <Head title="Gap URLs Management" />

      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-xl text-gray-800 leading-tight">
              Gap URLs Management
            </h2>
            <Button onClick={handleOpenDrawer}>
              <Plus className="w-4 h-4 mr-2" />
              Add URL
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Gap URLs</CardTitle>
              <CardDescription>
                Manage Gap URLs that appear on the site. Toggle status to show/hide.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {websiteUrls.map((websiteUrl) => (
                    <TableRow key={websiteUrl.id}>
                      <TableCell className="font-medium">{websiteUrl.order}</TableCell>
                      <TableCell>{websiteUrl.title}</TableCell>
                      <TableCell>
                        <a
                          href={websiteUrl.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {websiteUrl.url.length > 60
                            ? websiteUrl.url.substring(0, 60) + '...'
                            : websiteUrl.url}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                        {websiteUrl.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={websiteUrl.is_enabled ? "default" : "secondary"}>
                          {websiteUrl.is_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggle(websiteUrl)}
                          >
                            {websiteUrl.is_enabled ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </Button>
                          <Link href={route('admin.website-urls.edit', websiteUrl.id)}>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(websiteUrl)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {websiteUrls.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No Gap URLs configured yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto p-6">
          <SheetHeader className="p-0">
            <SheetTitle>Add Gap URL</SheetTitle>
            <SheetDescription>
              Enter the details for the new URL.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={data.title}
                onChange={(e) => setData('title', e.target.value)}
                placeholder="e.g., Company Blog"
                required
              />
              {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
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
              {errors.url && <p className="text-sm text-red-600">{errors.url}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={data.description}
                onChange={(e) => setData('description', e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
              {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_enabled"
                checked={data.is_enabled}
                onCheckedChange={(checked) => setData('is_enabled', checked as boolean)}
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
              <p className="text-xs text-gray-600">Lower numbers appear first</p>
              {errors.order && <p className="text-sm text-red-600">{errors.order}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? 'Creating...' : 'Create URL'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
