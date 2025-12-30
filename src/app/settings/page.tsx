'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Lock, Save, Trash, Calendar } from 'lucide-react';

const loginSchema = z.object({
    token: z.string().min(1, 'Token is required'),
});

const settingsSchema = z.object({
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_BASE_URL: z.string().optional(),
    OPENAI_MODEL: z.string().optional(),
    MODEL_SUPPORTS_VISION: z.string().optional(),
    MAX_CONCURRENT_ANALYSIS_TASKS: z.string().optional(),
    REQUEST_TIMEOUT_SECONDS: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
    const [token, setToken] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const storedToken = localStorage.getItem('settings_token');
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    if (!isClient) return null;

    if (!token) {
        return <LoginView onLogin={setToken} />;
    }

    return <SettingsView token={token} onLogout={() => {
        localStorage.removeItem('settings_token');
        setToken(null);
    }} />;
}

function LoginView({ onLogin }: { onLogin: (token: string) => void }) {
    const { register, handleSubmit, formState: { errors } } = useForm<{ token: string }>({
        resolver: zodResolver(loginSchema),
    });
    const [isLoading, setIsLoading] = useState(false);

    // We can't really "verify" the token without making a request, 
    // but the backend will reject requests if the token is wrong.
    // So we just save it and let the settings view handle the error/load.
    const onSubmit = (data: { token: string }) => {
        setIsLoading(true);
        // Simulate a small delay or check validation
        setTimeout(() => {
            localStorage.setItem('settings_token', data.token);
            onLogin(data.token);
            setIsLoading(false);
        }, 500);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Settings Access
                    </CardTitle>
                    <CardDescription>
                        Please enter the admin token to access system settings.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="token">Admin Token</Label>
                            <Input
                                id="token"
                                type="password"
                                placeholder="Enter secure token..."
                                {...register('token')}
                            />
                            {errors.token && (
                                <p className="text-sm text-destructive">{errors.token.message}</p>
                            )}
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Access Settings
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

function SettingsView({ token, onLogout }: { token: string, onLogout: () => void }) {
    const utils = trpc.useUtils();
    const { data: settings, isLoading: isLoadingSettings, error: loadError } = trpc.settings.getAll.useQuery(undefined, {
        retry: false,
    });

    useEffect(() => {
        if (loadError && loadError.data?.code === 'UNAUTHORIZED') {
            toast.error("Invalid Token. Please log in again.");
            onLogout();
        }
    }, [loadError, onLogout]);

    const updateMutation = trpc.settings.batchUpdate.useMutation({
        onSuccess: () => {
            toast.success("Settings saved successfully");
            utils.settings.getAll.invalidate();
        },
        onError: (err) => {
            toast.error(`Failed to save settings: ${err.message}`);
        }
    });

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            OPENAI_API_KEY: '',
            OPENAI_BASE_URL: '',
            OPENAI_MODEL: '',
            MODEL_SUPPORTS_VISION: '',
            MAX_CONCURRENT_ANALYSIS_TASKS: '',
            REQUEST_TIMEOUT_SECONDS: '',
        }
    });

    // Update form when data loads
    useEffect(() => {
        if (settings) {
            form.reset({
                OPENAI_API_KEY: settings.OPENAI_API_KEY || '',
                OPENAI_BASE_URL: settings.OPENAI_BASE_URL || '',
                OPENAI_MODEL: settings.OPENAI_MODEL || '',
                MODEL_SUPPORTS_VISION: settings.MODEL_SUPPORTS_VISION || '',
                MAX_CONCURRENT_ANALYSIS_TASKS: settings.MAX_CONCURRENT_ANALYSIS_TASKS || '',
                REQUEST_TIMEOUT_SECONDS: settings.REQUEST_TIMEOUT_SECONDS || '',
            });
        }
    }, [settings, form]);

    const onSubmit = (data: SettingsFormValues) => {
        const updates = Object.entries(data).map(([key, value]) => ({
            key,
            value: value || '',
        })).filter(item => item.value !== ''); // Only send non-empty values? Or send empty to unset?

        // Actually we want to allow clearing them, so send empty string if user cleared it.
        // But maybe we should filter out keys that haven't changed?
        // For now, let's just send all fields that are in the form.

        const payload = Object.entries(data).map(([key, value]) => ({
            key,
            value: value || '',
        }));

        updateMutation.mutate(payload);
    };

    if (isLoadingSettings) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (loadError) { // Handles case where token was rejected before query could complete effectively
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Alert variant="destructive" className="w-[400px]">
                    <AlertTitle>Error Loading Settings</AlertTitle>
                    <AlertDescription>{loadError.message}</AlertDescription>
                </Alert>
                <Button onClick={onLogout}>Go Back</Button>
            </div>
        )
    }

    return (
        <div className="container max-w-2xl py-10 mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">System Settings</h1>
                    <p className="text-muted-foreground">Configure global application settings.</p>
                </div>
                <Button variant="outline" onClick={onLogout}>Check Out</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>OpenAI Configuration</CardTitle>
                    <CardDescription>
                        Override environment variables for OpenAI connection.
                        Leave empty to use defaults from .env file.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <div className="space-y-2">
                            <Label htmlFor="OPENAI_API_KEY">API Key</Label>
                            <Input
                                id="OPENAI_API_KEY"
                                type="password"
                                placeholder="sk-..."
                                {...form.register('OPENAI_API_KEY')}
                            />
                            <p className="text-xs text-muted-foreground">Current: {settings?.OPENAI_API_KEY ? 'Set in DB' : 'Using .env'}</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="OPENAI_BASE_URL">Base URL</Label>
                            <Input
                                id="OPENAI_BASE_URL"
                                placeholder="https://api.openai.com/v1"
                                {...form.register('OPENAI_BASE_URL')}
                            />
                            <p className="text-xs text-muted-foreground">Current: {settings?.OPENAI_BASE_URL ? settings.OPENAI_BASE_URL : 'Using .env'}</p>
                        </div>


                        <div className="space-y-2">
                            <Label htmlFor="OPENAI_MODEL">Model Name</Label>
                            <Input
                                id="OPENAI_MODEL"
                                placeholder="gpt-4o"
                                {...form.register('OPENAI_MODEL')}
                            />
                            <p className="text-xs text-muted-foreground">Current: {settings?.OPENAI_MODEL ? settings.OPENAI_MODEL : 'Using .env'}</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="MODEL_SUPPORTS_VISION">Vision Support</Label>
                            <select
                                id="MODEL_SUPPORTS_VISION"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...form.register('MODEL_SUPPORTS_VISION')}
                            >
                                <option value="">Use .env default</option>
                                <option value="true">Enabled (Model supports images)</option>
                                <option value="false">Disabled (Text only)</option>
                            </select>
                            <p className="text-xs text-muted-foreground">
                                Current: {settings?.MODEL_SUPPORTS_VISION ? (settings.MODEL_SUPPORTS_VISION === 'true' ? 'Enabled' : 'Disabled') : 'Using .env'}
                            </p>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Task Queue Settings</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="MAX_CONCURRENT_ANALYSIS_TASKS">Max Concurrent Tasks</Label>
                                    <Input
                                        id="MAX_CONCURRENT_ANALYSIS_TASKS"
                                        type="number"
                                        placeholder="3"
                                        {...form.register('MAX_CONCURRENT_ANALYSIS_TASKS')}
                                    />
                                    <p className="text-xs text-muted-foreground">Default: 3 (Current: {settings?.MAX_CONCURRENT_ANALYSIS_TASKS || 'Env'})</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="REQUEST_TIMEOUT_SECONDS">Timeout (Seconds)</Label>
                                    <Input
                                        id="REQUEST_TIMEOUT_SECONDS"
                                        type="number"
                                        placeholder="180"
                                        {...form.register('REQUEST_TIMEOUT_SECONDS')}
                                    />
                                    <p className="text-xs text-muted-foreground">Default: 180 (Current: {settings?.REQUEST_TIMEOUT_SECONDS || 'Env'})</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex justify-end">
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="my-8" />

            <DataManagementView />
        </div>
    );
}

function DataManagementView() {
    const utils = trpc.useUtils();
    const [deleteId, setDeleteId] = useState('');
    const [olderThanValue, setOlderThanValue] = useState('1');
    const [olderThanUnit, setOlderThanUnit] = useState('hours'); // hours, days, months

    const deleteMutation = trpc.requests.delete.useMutation({
        onSuccess: () => {
            toast.success("Request deleted successfully");
            setDeleteId('');
            utils.requests.list.invalidate();
        },
        onError: (err) => {
            toast.error(`Failed to delete request: ${err.message}`);
        }
    });

    const pruneMutation = trpc.requests.prune.useMutation({
        onSuccess: (data) => {
            toast.success(`Pruned ${data.count} requests`);
            utils.requests.list.invalidate();
        },
        onError: (err) => {
            toast.error(`Failed to prune requests: ${err.message}`);
        }
    });

    const handleDelete = (e: React.FormEvent) => {
        e.preventDefault();
        const id = parseInt(deleteId);
        if (isNaN(id)) {
            toast.error("Please enter a valid numeric ID");
            return;
        }
        if (confirm(`Are you sure you want to delete request #${id}?`)) {
            deleteMutation.mutate(id);
        }
    };

    const handlePrune = () => {
        const val = parseInt(olderThanValue);
        if (isNaN(val) || val <= 0) {
            toast.error("Please enter a valid positive number");
            return;
        }

        const date = new Date();
        if (olderThanUnit === 'hours') {
            date.setHours(date.getHours() - val);
        } else if (olderThanUnit === 'days') {
            date.setDate(date.getDate() - val);
        } else if (olderThanUnit === 'months') {
            date.setMonth(date.getMonth() - val);
        }

        if (confirm(`Are you sure you want to delete all requests older than ${val} ${olderThanUnit}? This cannot be undone.`)) {
            pruneMutation.mutate({ olderThan: date });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trash className="w-5 h-5" />
                    Data Management
                </CardTitle>
                <CardDescription>
                    Manage stored analysis requests and clean up old data.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Delete Single Request</h3>
                    <div className="flex items-end gap-4">
                        <div className="space-y-2 flex-1">
                            <Label htmlFor="delete-id">Request ID</Label>
                            <Input
                                id="delete-id"
                                placeholder="e.g. 123"
                                value={deleteId}
                                onChange={(e) => setDeleteId(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={!deleteId || deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash className="w-4 h-4 mr-2" />}
                            Delete
                        </Button>
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Prune Old Requests</h3>
                    <div className="flex items-end gap-4">
                        <div className="space-y-2 w-32">
                            <Label>Value</Label>
                            <Input
                                type="number"
                                min="1"
                                value={olderThanValue}
                                onChange={(e) => setOlderThanValue(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 flex-1">
                            <Label>Unit</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={olderThanUnit}
                                onChange={(e) => setOlderThanUnit(e.target.value)}
                            >
                                <option value="hours">Hours ago</option>
                                <option value="days">Days ago</option>
                                <option value="months">Months ago</option>
                            </select>
                        </div>
                        <Button
                            variant="destructive"
                            onClick={handlePrune}
                            disabled={pruneMutation.isPending}
                        >
                            {pruneMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash className="w-4 h-4 mr-2" />}
                            Prune
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        This will permanently delete create requests created before the specified time. Processing tasks that are pruned will stop retrying.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
