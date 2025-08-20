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
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/layouts/app-layout";

export default function Create() {
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    display_name: '',
    is_enabled: true as boolean,
    prompts_per_brand: 25,
    api_config: {
      api_key: '',
      model: '',
      endpoint: '',
    },
    order: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('admin.ai-models.store'));
  };

  return (
    <AppLayout>
      <Head title="Create AI Model" />

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
              Create AI Model
            </h2>
          </div>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>AI Model Settings</CardTitle>
                <CardDescription>
                  Configure a new AI model for automatic prompt generation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name (Identifier) *</Label>
                    <Input
                      id="name"
                      value={data.name}
                      onChange={(e) => setData('name', e.target.value)}
                      placeholder="e.g., openai, gemini"
                      required
                    />
                    <p className="text-sm text-gray-600">
                      Unique identifier for this AI model
                    </p>
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name *</Label>
                    <Input
                      id="display_name"
                      value={data.display_name}
                      onChange={(e) => setData('display_name', e.target.value)}
                      placeholder="e.g., OpenAI (ChatGPT)"
                      required
                    />
                    {errors.display_name && (
                      <p className="text-sm text-red-600">{errors.display_name}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_enabled"
                      checked={data.is_enabled}
                      onCheckedChange={(checked) => setData('is_enabled', checked as boolean)}
                    />
                    <Label htmlFor="is_enabled">Enabled</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="order">Order *</Label>
                    <Input
                      id="order"
                      type="number"
                      min="1"
                      value={data.order}
                      onChange={(e) => setData('order', parseInt(e.target.value))}
                      required
                    />
                    {errors.order && (
                      <p className="text-sm text-red-600">{errors.order}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompts_per_brand">Prompts per Brand *</Label>
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
                    {processing ? 'Creating...' : 'Create AI Model'}
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
