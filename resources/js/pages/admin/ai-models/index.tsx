import { Head, Link, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, TestTube } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { toast } from "sonner";

interface AiModel {
  id: number;
  name: string;
  display_name: string;
  is_enabled: boolean;
  prompts_per_brand: number;
  api_config: {
    api_key: string;
    model: string;
    endpoint: string;
  };
  order: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  aiModels: AiModel[];
  flash?: {
    success?: string;
    error?: string;
  };
}

export default function Index({ aiModels, flash }: Props) {
  const [testingModel, setTestingModel] = useState<number | null>(null);
  
  // Show flash messages as toasts
  useEffect(() => {
    if (flash?.success) {
      toast.success(flash.success);
    }
    if (flash?.error) {
      toast.error(flash.error);
    }
  }, [flash]);

  const handleToggle = (aiModel: AiModel) => {
    router.post(route('admin.ai-models.toggle', aiModel.id), {}, {
      preserveScroll: true,
    });
  };

  const handleTest = async (aiModel: AiModel) => {
    setTestingModel(aiModel.id);
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      console.log('CSRF Token:', csrfToken); // Debug log
      
      const response = await fetch(route('admin.ai-models.test', aiModel.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken || '',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({})
      });

      console.log('Response status:', response.status); // Debug log
      console.log('Response headers:', response.headers); // Debug log

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Response data:', result); // Debug log

      if (result.success) {
        toast.success(`Test successful: ${result.message}`);
      } else {
        toast.error(`Test failed: ${result.message}`);
      }
    } catch (error) {
      console.error('AI model test error:', error);
      if (error instanceof Error) {
        toast.error(`Failed to test AI model: ${error.message}`);
      } else {
        toast.error('Failed to test AI model connection');
      }
    } finally {
      setTestingModel(null);
    }
  };

  const handleDelete = (aiModel: AiModel) => {
    if (confirm(`Are you sure you want to delete ${aiModel.display_name}?`)) {
      router.delete(route('admin.ai-models.destroy', aiModel.id));
    }
  };

  return (
    <AppLayout>
      <Head title="AI Models Management" />

      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-xl text-gray-800 leading-tight">
              AI Models Management
            </h2>
            <Link href={route('admin.ai-models.create')}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add AI Model
              </Button>
            </Link>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>AI Models</CardTitle>
              <CardDescription>
                Manage AI models used for automatic prompt generation during brand creation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prompts per Brand</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiModels.map((aiModel) => (
                    <TableRow key={aiModel.id}>
                      <TableCell className="font-medium">
                        {aiModel.order}
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {aiModel.name}
                        </code>
                      </TableCell>
                      <TableCell>{aiModel.display_name}</TableCell>
                      <TableCell>
                        <Badge variant={aiModel.is_enabled ? "default" : "secondary"}>
                          {aiModel.is_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {aiModel.prompts_per_brand}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {aiModel.api_config.model || "Not configured"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={aiModel.api_config.api_key ? "default" : "destructive"}>
                          {aiModel.api_config.api_key ? "Configured" : "Missing"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTest(aiModel)}
                            disabled={testingModel === aiModel.id || !aiModel.is_enabled || !aiModel.api_config?.api_key}
                            title={
                              !aiModel.is_enabled 
                                ? "Enable model to test" 
                                : !aiModel.api_config?.api_key 
                                ? "Configure API key to test" 
                                : "Test AI Model Connection"
                            }
                          >
                            {testingModel === aiModel.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900 mr-2"></div>
                                Testing...
                              </>
                            ) : (
                              <>
                                <TestTube className="w-4 h-4 mr-1" />
                                Test
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggle(aiModel)}
                          >
                            {aiModel.is_enabled ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </Button>
                          <Link href={route('admin.ai-models.edit', aiModel.id)}>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(aiModel)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {aiModels.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No AI models configured yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
