import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Terminal, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Command {
    signature: string;
    description: string;
}

interface Props {
    commands: Command[];
}

export default function ConsoleIndex({ commands }: Props) {
    const [runningCommand, setRunningCommand] = useState<string | null>(null);

    const handleRun = async (command: string) => {
        if (!confirm(`Are you sure you want to run execution for: ${command}?`)) return;

        setRunningCommand(command);
        try {
            // @ts-ignore
            router.post('/admin/console/run', { command }, {
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
                                        <TableCell className="font-mono text-sm">{cmd.signature}</TableCell>
                                        <TableCell>{cmd.description}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRun(cmd.signature)}
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
        </AppLayout>
    );
}
