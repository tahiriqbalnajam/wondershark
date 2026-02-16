import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Terminal, Play, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface CommandOption {
    name: string;
    type: 'text' | 'boolean';
    label: string;
    prefix: string;
    default?: boolean | string;
}

interface Command {
    signature: string;
    description: string;
    options?: CommandOption[];
}

interface Props {
    commands: Command[];
}

export default function ConsoleIndex({ commands }: Props) {
    const [runningCommand, setRunningCommand] = useState<string | null>(null);
    const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
    const [params, setParams] = useState<Record<string, any>>({});
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const initiateRun = (cmd: Command) => {
        if (cmd.options && cmd.options.length > 0) {
            // Initialize params with defaults
            const initialParams: Record<string, any> = {};
            cmd.options.forEach(opt => {
                if (opt.default !== undefined) {
                    initialParams[opt.prefix] = opt.default;
                }
            });
            setParams(initialParams);
            setSelectedCommand(cmd);
            setIsDialogOpen(true);
        } else {
            handleRun(cmd.signature);
        }
    };

    const handleRun = async (command: string, parameters: Record<string, any> = {}) => {
        if (!isDialogOpen && !confirm(`Are you sure you want to run execution for: ${command}?`)) return;

        setRunningCommand(command);
        setIsDialogOpen(false); // Close dialog if open

        try {
            // @ts-ignore
            router.post(route('admin.console.run'), { command, params: parameters }, {
                onSuccess: () => {
                    toast.success('Command executed successfully');
                },
                onError: () => {
                    toast.error('Failed to execute command');
                },
                preserveScroll: true,
                onFinish: () => setRunningCommand(null)
            });
        } catch (error) {
            console.error(error);
            toast.error('An unexpected error occurred');
            setRunningCommand(null);
        }
    };

    const handleParamChange = (prefix: string, value: any) => {
        setParams(prev => ({
            ...prev,
            [prefix]: value
        }));
    };

    return (
        <AppLayout>
            <Head title="Console Commands - Admin" />

            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Console Commands</h1>
                    <p className="text-muted-foreground">
                        Execute artisan commands directly from the dashboard
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Terminal className="h-5 w-5" />
                            Available Commands
                        </CardTitle>
                        <CardDescription>
                            List of safe-to-run artisan commands for maintenance and analysis
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Command Signature</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-[100px]">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {commands.map((cmd) => (
                                    <TableRow key={cmd.signature}>
                                        <TableCell className="font-mono text-sm">
                                            {cmd.signature}
                                            {cmd.options && cmd.options.length > 0 && (
                                                <div className="flex gap-1 mt-1">
                                                    {cmd.options.map(opt => (
                                                        <span key={opt.name} className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                                            {opt.prefix}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{cmd.description}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => initiateRun(cmd)}
                                                disabled={runningCommand !== null}
                                            >
                                                {runningCommand === cmd.signature ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Play className="w-4 h-4 mr-2" />
                                                        Run
                                                    </>
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configure Command Arguments</DialogTitle>
                        <DialogDescription>
                            Set parameters for <code className="text-primary">{selectedCommand?.signature}</code>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {selectedCommand?.options?.map((option) => (
                            <div key={option.name} className="space-y-2">
                                {option.type === 'boolean' ? (
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`opt-${option.name}`}
                                            checked={!!params[option.prefix]}
                                            onCheckedChange={(checked) => handleParamChange(option.prefix, checked)}
                                        />
                                        <Label htmlFor={`opt-${option.name}`}>{option.label}</Label>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <Label htmlFor={`opt-${option.name}`}>{option.label}</Label>
                                        <Input
                                            id={`opt-${option.name}`}
                                            value={params[option.prefix] || ''}
                                            onChange={(e) => handleParamChange(option.prefix, e.target.value)}
                                            placeholder={`Value for ${option.prefix}`}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => selectedCommand && handleRun(selectedCommand.signature, params)}>
                            Execute Command
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
