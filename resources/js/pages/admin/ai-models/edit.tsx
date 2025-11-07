import { Head, Link, useForm } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, X } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { useState } from "react";

interface AiModel {
  id: number;
  name: string;
  display_name: string;
  icon?: string;
  is_enabled: boolean;
  prompts_per_brand: number;
  api_config: {
    api_key: string;
    model: string;
    endpoint: string;
  };
  order: number;
}

interface Props {
  aiModel: AiModel;
}

export default function Edit({ aiModel }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    _method: 'PUT',
    name: aiModel.name,
    display_name: aiModel.display_name,
    icon: null as File | null,
    is_enabled: aiModel.is_enabled,
    prompts_per_brand: aiModel.prompts_per_brand,
    api_config: {
      api_key: aiModel.api_config.api_key || '',
      model: aiModel.api_config.model || '',
      endpoint: aiModel.api_config.endpoint || '',
    },
    order: aiModel.order,
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepExisting, setKeepExisting] = useState(true);

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setData('icon', file);
      setKeepExisting(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveNewIcon = () => {
    setData('icon', null);
    setPreviewUrl(null);
    setKeepExisting(true);
    // Reset file input
    const fileInput = document.getElementById('icon') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('admin.ai-models.update', aiModel.id));
  };

  return (
    <AppLayout>
      <Head title={`Edit ${aiModel.display_name}`} />

      <div className="py-12">
        <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href={route('admin.ai-models.index')}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to AI Models
              </Button>
            </Link>
            <h2 className="font-semibold text-xl text-gray-800 leading-tight">
              Edit {aiModel.display_name}
            </h2>
          </div>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>AI Model Settings</CardTitle>
                <CardDescription>
                  Configure the AI model settings and API integration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name (Identifier)</Label>
                    <Input
                      id="name"
                      value={data.name}
                      onChange={(e) => setData('name', e.target.value)}
                      disabled
                      className="bg-gray-50"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={data.display_name}
                      onChange={(e) => setData('display_name', e.target.value)}
                      required
                    />
                    {errors.display_name && (
                      <p className="text-sm text-red-600">{errors.display_name}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icon">Icon Image</Label>
                  <div className="space-y-4">
                    {/* Show existing icon if available and no new one selected */}
                    {keepExisting && aiModel.icon && (
                      <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                        <img
                          src={`/storage/${aiModel.icon}`}
                          alt="Current icon"
                          className="w-16 h-16 object-contain rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Current icon</p>
                          <p className="text-xs text-gray-500 mt-1">Upload a new image to replace</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <Input
                        id="icon"
                        type="file"
                        accept="image/*"
                        onChange={handleIconChange}
                        className="flex-1"
                      />
                      {previewUrl && (
                        <div className="flex items-center gap-2">
                          <img
                            src={previewUrl}
                            alt="Icon preview"
                            className="w-16 h-16 object-contain rounded border"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveNewIcon}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Upload an image (JPG, PNG, GIF, SVG, WebP - max 2MB)
                    </p>
                  </div>
                  {errors.icon && (
                    <p className="text-sm text-red-600">{errors.icon}</p>
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
                    <Label htmlFor="order" className="flex items-center gap-2">
                      Order / Weight / Priority
                      <span className="text-xs text-gray-500">(1-10)</span>
                    </Label>
                    <Input
                      id="order"
                      type="number"
                      min="1"
                      max="10"
                      value={data.order}
                      onChange={(e) => setData('order', parseInt(e.target.value))}
                      required
                    />
                    <p className="text-xs text-gray-600">
                      Higher value = more prompts analyzed by this model.
                      <br />
                      Example: Order 5 gets 50%, Order 3 gets 30%, Order 2 gets 20%
                    </p>
                    {errors.order && (
                      <p className="text-sm text-red-600">{errors.order}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompts_per_brand">Prompts per Brand</Label>
                  <Input
                    id="prompts_per_brand"
                    type="number"
                    min="0"
                    value={data.prompts_per_brand}
                    onChange={(e) => setData('prompts_per_brand', parseInt(e.target.value))}
                    required
                  />
                  <p className="text-sm text-gray-600">
                    Number of prompts to generate for each brand creation
                  </p>
                  {errors.prompts_per_brand && (
                    <p className="text-sm text-red-600">{errors.prompts_per_brand}</p>
                  )}
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">API Configuration</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="api_key">API Key</Label>
                      <Input
                        id="api_key"
                        type="password"
                        value={data.api_config.api_key}
                        onChange={(e) => setData('api_config', {
                          ...data.api_config,
                          api_key: e.target.value
                        })}
                        placeholder="Enter API key"
                      />
                      {errors['api_config.api_key'] && (
                        <p className="text-sm text-red-600">{errors['api_config.api_key']}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={data.api_config.model}
                        onChange={(e) => setData('api_config', {
                          ...data.api_config,
                          model: e.target.value
                        })}
                        placeholder="e.g., gpt-4, gemini-pro"
                      />
                      {errors['api_config.model'] && (
                        <p className="text-sm text-red-600">{errors['api_config.model']}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endpoint">API Endpoint</Label>
                      <Input
                        id="endpoint"
                        type="url"
                        value={data.api_config.endpoint}
                        onChange={(e) => setData('api_config', {
                          ...data.api_config,
                          endpoint: e.target.value
                        })}
                        placeholder="https://api.example.com/v1/..."
                      />
                      {errors['api_config.endpoint'] && (
                        <p className="text-sm text-red-600">{errors['api_config.endpoint']}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t">
                  <Link href={route('admin.ai-models.index')}>
                    <Button variant="outline">Cancel</Button>
                  </Link>
                  <Button type="submit" disabled={processing}>
                    {processing ? 'Updating...' : 'Update AI Model'}
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
