'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Lock, Save, Trash, RotateCcw, FileText, Settings, Database } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

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

    const onSubmit = (data: { token: string }) => {
        setIsLoading(true);
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

    if (isLoadingSettings) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (loadError) {
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
        <div className="container max-w-4xl py-10 mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">System Settings</h1>
                    <p className="text-muted-foreground">Configure global application settings and prompts.</p>
                </div>
                <Button variant="outline" onClick={onLogout}>Log Out</Button>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general" className="flex gap-2">
                        <Settings className="w-4 h-4" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="prompts" className="flex gap-2">
                        <FileText className="w-4 h-4" />
                        Prompts
                    </TabsTrigger>
                    <TabsTrigger value="data" className="flex gap-2">
                        <Database className="w-4 h-4" />
                        Data Management
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <GeneralSettingsTab settings={settings || {}} />
                </TabsContent>

                <TabsContent value="prompts">
                    <PromptsTab />
                </TabsContent>

                <TabsContent value="data">
                    <DataManagementView />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function GeneralSettingsTab({ settings }: { settings: Record<string, string> }) {
    const utils = trpc.useUtils();
    const updateMutation = trpc.settings.upsert.useMutation({
        onSuccess: () => {
            toast.success("Setting saved");
            utils.settings.getAll.invalidate();
        },
        onError: (err) => toast.error(`Failed to save: ${err.message}`),
    });

    const deleteMutation = trpc.settings.delete.useMutation({
        onSuccess: () => {
            toast.success("Restored to default");
            utils.settings.getAll.invalidate();
        },
        onError: (err) => toast.error(`Failed to reset: ${err.message}`),
    });

    const handleSave = (key: string, value: string) => {
        updateMutation.mutate({ key, value });
    };

    const handleReset = (key: string) => {
        deleteMutation.mutate(key);
    };

    const SettingItem = ({
        id,
        label,
        currentValue,
        defaultValue,
        type = "text",
        description,
        options
    }: {
        id: string,
        label: string,
        currentValue?: string,
        defaultValue: string,
        type?: string,
        description?: string,
        options?: { label: string, value: string }[]
    }) => {
        const [value, setValue] = useState(currentValue || '');
        const isModified = currentValue !== undefined;

        useEffect(() => {
            setValue(currentValue || '');
        }, [currentValue]);

        return (
            <div className="grid grid-cols-12 gap-4 items-start p-4 border rounded-lg bg-card">
                <div className="col-span-12 md:col-span-4 space-y-1">
                    <Label htmlFor={id} className="text-base font-medium">{label}</Label>
                    {description && <p className="text-xs text-muted-foreground">{description}</p>}
                    {isModified ? (
                        <Badge variant="secondary" className="mt-2 text-xs">Customized</Badge>
                    ) : (
                        <Badge variant="outline" className="mt-2 text-xs text-muted-foreground font-normal">Using Default</Badge>
                    )}
                </div>
                <div className="col-span-12 md:col-span-8 flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                        {options ? (
                            <select
                                id={id}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                            >
                                <option value="" disabled>Select an option</option>
                                {options.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        ) : (
                            <Input
                                id={id}
                                type={type}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder={defaultValue}
                            />
                        )}
                        <p className="text-xs text-muted-foreground">Default: {defaultValue}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button
                            size="icon"
                            onClick={() => handleSave(id, value)}
                            disabled={updateMutation.isPending || (value === currentValue && isModified)}
                            title="Save Setting"
                        >
                            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </Button>

                        {isModified && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive/90" title="Reset to Default">
                                        <RotateCcw className="w-4 h-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Reset {label}?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will remove your custom setting and revert to the environment variable default.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleReset(id)}>Reset</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>OpenAI Configuration</CardTitle>
                    <CardDescription>Configure connection details for the LLM provider.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <SettingItem
                        id="OPENAI_API_KEY"
                        label="API Key"
                        type="password"
                        currentValue={settings['OPENAI_API_KEY']}
                        defaultValue="From .env"
                    />
                    <SettingItem
                        id="OPENAI_BASE_URL"
                        label="Base URL"
                        currentValue={settings['OPENAI_BASE_URL']}
                        defaultValue="https://api.openai.com/v1"
                    />
                    <SettingItem
                        id="OPENAI_MODEL"
                        label="Model"
                        currentValue={settings['OPENAI_MODEL']}
                        defaultValue="gpt-4o"
                    />
                    <SettingItem
                        id="MODEL_SUPPORTS_VISION"
                        label="Vision Support"
                        options={[
                            { label: 'Enabled', value: 'true' },
                            { label: 'Disabled', value: 'false' }
                        ]}
                        currentValue={settings['MODEL_SUPPORTS_VISION']}
                        defaultValue="Enabled"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Task Queue Settings</CardTitle>
                    <CardDescription>Control the concurrency and timeouts of analysis tasks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <SettingItem
                        id="MAX_CONCURRENT_ANALYSIS_TASKS"
                        label="Max Concurrent Tasks"
                        type="number"
                        currentValue={settings['MAX_CONCURRENT_ANALYSIS_TASKS']}
                        defaultValue="3"
                    />
                    <SettingItem
                        id="REQUEST_TIMEOUT_SECONDS"
                        label="Request Timeout"
                        type="number"
                        currentValue={settings['REQUEST_TIMEOUT_SECONDS']}
                        defaultValue="180"
                        description="Seconds to wait before timing out a request."
                    />
                </CardContent>
            </Card>
        </div>
    );
}

function PromptsTab() {
    const prompts = [
        { id: 'step1-problem', label: 'Step 1: Problem Extraction', description: 'System prompt for extracting problem details from user input.' },
        { id: 'step2-code', label: 'Step 2: Code Formatting', description: 'System prompt for cleaning and formatting user code.' },
        { id: 'step3-analysis', label: 'Step 3: Deep Analysis', description: 'System prompt for the main analysis and debugging logic.' },
    ];

    return (
        <div className="space-y-6">
            {prompts.map(prompt => (
                <PromptEditor key={prompt.id} {...prompt} />
            ))}
        </div>
    );
}

function PromptEditor({ id, label, description }: { id: string, label: string, description: string }) {
    const utils = trpc.useUtils();

    // Fetch custom value (from settings table)
    const { data: customValue } = trpc.settings.getByKey.useQuery(id);

    // Fetch default value (from file)
    const { data: defaultValue } = trpc.prompts.getDefault.useQuery({ name: id });

    // Effective value to show
    const [value, setValue] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (customValue) {
            setValue(customValue);
        } else if (defaultValue) {
            setValue(defaultValue);
        }
    }, [customValue, defaultValue]);

    const updateMutation = trpc.settings.upsert.useMutation({
        onSuccess: () => {
            toast.success("Prompt saved");
            utils.settings.getByKey.invalidate(id);
            setIsEditing(false);
        },
        onError: (err) => toast.error(`Failed to save: ${err.message}`),
    });

    const resetMutation = trpc.settings.delete.useMutation({
        onSuccess: () => {
            toast.success("Restored default prompt");
            utils.settings.getByKey.invalidate(id);
        },
        onError: (err) => toast.error(`Failed to reset: ${err.message}`),
    });

    const handleSave = () => {
        updateMutation.mutate({ key: id, value });
    };

    const handleReset = () => {
        resetMutation.mutate(id);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{label}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    {customValue && (
                        <Badge variant="secondary">Customized</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <Textarea
                    className="min-h-[200px] font-mono text-sm"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setIsEditing(true); // Naive change detection
                    }}
                />
            </CardContent>
            <CardFooter className="flex justify-between">
                <div className="text-xs text-muted-foreground">
                    {customValue ? "Using custom prompt from database." : "Using default prompt from file system."}
                </div>
                <div className="flex gap-2">
                    {customValue && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" className="text-destructive hover:text-destructive/90">
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Reset to Default
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Reset Prompt?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to delete your custom prompt? This will revert to the default prompt file from the codebase.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={updateMutation.isPending || (value === customValue) || (!customValue && value === defaultValue)}
                    >
                        {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Save className="w-4 h-4 mr-2" />
                        Save Prompt
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}

function DataManagementView() {
    const utils = trpc.useUtils();
    const [deleteId, setDeleteId] = useState('');
    const [olderThanValue, setOlderThanValue] = useState('1');
    const [olderThanUnit, setOlderThanUnit] = useState('hours');

    const deleteMutation = trpc.requests.delete.useMutation({
        onSuccess: () => {
            toast.success("Request deleted");
            setDeleteId('');
            utils.requests.list.invalidate();
        },
        onError: (err) => toast.error(`Failed to delete: ${err.message}`),
    });

    const pruneMutation = trpc.requests.prune.useMutation({
        onSuccess: (data) => {
            toast.success(`Pruned ${data.count} requests`);
            utils.requests.list.invalidate();
        },
        onError: (err) => toast.error(`Failed to prune: ${err.message}`),
    });

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
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    disabled={!deleteId || deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash className="w-4 h-4 mr-2" />}
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Request #{deleteId}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(parseInt(deleteId))}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
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
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                value={olderThanUnit}
                                onChange={(e) => setOlderThanUnit(e.target.value)}
                            >
                                <option value="hours">Hours ago</option>
                                <option value="days">Days ago</option>
                                <option value="months">Months ago</option>
                            </select>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    disabled={pruneMutation.isPending}
                                >
                                    {pruneMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash className="w-4 h-4 mr-2" />}
                                    Prune
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Prune requests?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to delete all requests older than {olderThanValue} {olderThanUnit}? This cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => {
                                        const val = parseInt(olderThanValue);
                                        const date = new Date();
                                        if (olderThanUnit === 'hours') date.setHours(date.getHours() - val);
                                        else if (olderThanUnit === 'days') date.setDate(date.getDate() - val);
                                        else if (olderThanUnit === 'months') date.setMonth(date.getMonth() - val);
                                        pruneMutation.mutate({ olderThan: date });
                                    }}>Prune</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
