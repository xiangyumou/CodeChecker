'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import { useTranslations } from 'next-intl';
import { Send, Trash2, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomableImage } from './ui/ZoomableImage';

interface SubmissionFormProps {
    onSubmissionSuccess?: () => void;
}

// Simple base64 conversion
const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });

// Helper function to get user-friendly error messages
const getErrorMessage = (error: { message?: string }, defaultMsg: string): string => {
    const msg = error.message?.toLowerCase() || '';

    // API key errors
    if (msg.includes('api key') || msg.includes('unauthorized') || msg.includes('401')) {
        return 'API 密钥无效或未配置，请检查设置';
    }

    // Rate limit errors
    if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) {
        return '请求过于频繁，请稍后再试';
    }

    // Network errors
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
        return '网络连接失败，请检查网络设置';
    }

    // Timeout errors
    if (msg.includes('timeout') || msg.includes('timed out')) {
        return '请求超时，请稍后重试';
    }

    // Model errors
    if (msg.includes('model') || msg.includes('openai')) {
        return 'AI 模型调用失败，请检查 API 配置';
    }

    // Database errors
    if (msg.includes('database') || msg.includes('prisma')) {
        return '数据库连接失败，请联系管理员';
    }

    // Default error message
    return error.message || defaultMsg;
};

export default function SubmissionForm({ onSubmissionSuccess }: SubmissionFormProps) {
    const t = useTranslations('submissionForm');
    const router = useRouter();
    const utils = trpc.useUtils();
    const [userPrompt, setUserPrompt] = useState('');
    const [files, setFiles] = useState<{ id: string, file: File, preview: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch vision support setting
    const { data: visionSetting } = trpc.settings.getByKey.useQuery('MODEL_SUPPORTS_VISION');
    const supportsVision = visionSetting !== 'false'; // Default to true if not set

    const createMutation = trpc.requests.create.useMutation({
        onSuccess: (data) => {
            toast.success(t('successMessageWithId', { id: data.id }));
            setUserPrompt('');
            setFiles([]);
            utils.requests.list.invalidate();
            onSubmissionSuccess?.();
            router.push(`/request/${data.id}`);
            setIsSubmitting(false);
        },
        onError: (error) => {
            const friendlyMessage = getErrorMessage(error, t('errorMessage'));
            toast.error(friendlyMessage);
            setIsSubmitting(false);
        },
    });

    const processFiles = useCallback(async (newFiles: FileList | File[]) => {
        const validFiles: { id: string, file: File, preview: string }[] = [];
        const fileArray = newFiles instanceof FileList ? Array.from(newFiles) : newFiles;

        // Show processing feedback
        if (fileArray.length > 0) {
            toast.info('正在处理图片...', { duration: 2000 });
        }

        for (const file of fileArray) {
            if (file.type.startsWith('image/')) {
                // Check file size before processing
                const sizeInMB = file.size / 1024 / 1024;
                if (sizeInMB > 2) {
                    toast.error(`图片 "${file.name}" 太大 (${sizeInMB.toFixed(1)}MB)，请选择小于 2MB 的图片`);
                    continue;
                }
                try {
                    const preview = await getBase64(file);
                    validFiles.push({ id: Math.random().toString(36).substr(2, 9), file, preview });
                } catch {
                    toast.error(`处理图片 "${file.name}" 失败，请重试`);
                }
            } else {
                toast.warning(`仅支持图片文件，"${file.name}" 被跳过`);
            }
        }

        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles].slice(0, 5));
            toast.success(`已添加 ${validFiles.length} 张图片`);
        }
    }, []);

    const handleFileChange = (newFiles: FileList | null) => {
        if (!newFiles) return;
        processFiles(newFiles);
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
        toast.info(t('imageRemoved'));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const prompt = userPrompt.trim();

        if (!prompt && files.length === 0) {
            toast.error(t('validation.emptySubmissionError'));
            return;
        }

        setIsSubmitting(true);
        const imageBase64List = files.map(f => f.preview);

        try {
            await createMutation.mutateAsync({
                userPrompt: prompt || '',
                imageReferences: imageBase64List.length > 0 ? imageBase64List : undefined,
            });
        } catch { // Error handled by mutation
            // No explicit action needed here as onError in createMutation handles it
        }
    };

    const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
        // Skip image processing if vision is not supported
        if (!supportsVision) return;

        const items = event.clipboardData?.items;
        if (!items) return;

        const pastedFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type });
                    pastedFiles.push(file);
                }
            }
        }

        if (pastedFiles.length > 0) {
            event.preventDefault();
            await processFiles(pastedFiles);
        }
    }, [supportsVision, processFiles]);

    const handleClear = () => {
        if (!userPrompt && files.length === 0) return;
        setUserPrompt('');
        setFiles([]);
        toast.info(t('formCleared'));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!isDragOver) setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await processFiles(e.dataTransfer.files);
        }
    };

    return (
        <form onSubmit={handleSubmit} onPaste={handlePaste} className="h-full flex flex-col p-6 space-y-4">
            {/* Header removed for simplicity */}

            <div className="flex-1 min-h-0 flex flex-col gap-4">
                {/* Text Input */}
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                    {/* Labels removed for simplicity */}
                    <Textarea
                        id="prompt"
                        placeholder={t('unifiedInputPlaceholder')}
                        className="flex-1 resize-none rounded-lg border-border p-4 text-base bg-surface focus-visible:ring-ring"
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>


                {/* Image Upload Section - Only show if vision is supported */}
                {supportsVision && (
                    <div className="flex-none flex flex-col gap-2">
                        {/* Labels removed for simplicity */}

                        {/* Image Preview List */}
                        <AnimatePresence mode="popLayout">
                            {files.length > 0 && (
                                <motion.div
                                    className="flex gap-2 overflow-x-auto pb-2"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {files.map((file) => (
                                        <motion.div
                                            key={file.id}
                                            className="group relative w-24 h-24 flex-none rounded-lg overflow-hidden border border-border bg-surface"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <ZoomableImage
                                                src={file.preview}
                                                alt="preview"
                                                className="w-full h-full object-cover cursor-pointer"
                                            />
                                            {/* Hover overlay for dimming - pointer-events-none to allow click-to-zoom on underlying image */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                            {/* Delete button - top right */}
                                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <motion.button
                                                    type="button"
                                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); removeFile(file.id); }}
                                                    className="bg-black/50 hover:bg-destructive text-white rounded-full p-1 transition-colors backdrop-blur-sm"
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    <X className="w-3 h-3" />
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Drop Zone */}
                        <div
                            className={cn(
                                "flex-none relative border border-dashed rounded-lg p-4 transition-all cursor-pointer flex items-center justify-center gap-4 bg-surface2 h-20",
                                isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary",
                            )}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={(e) => handleFileChange(e.target.files)}
                            />
                            <div className={cn(
                                "bg-surface rounded-full p-2 border border-border transition-transform duration-200",
                                (isDragOver) ? "scale-105" : "group-hover:scale-105"
                            )}>
                                <Upload className="w-4 h-4 text-primary" />
                            </div>
                            <div className="space-y-0.5 text-left">
                                <p className="text-sm font-medium">{isDragOver ? "Drop!" : t('uploadText')}</p>
                                <p className="text-xs text-muted-foreground">{t('uploadHint')}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer: Actions */}
            <div className="flex-none flex items-center gap-3 pt-2">
                <Button
                    type="submit"
                    size="lg"
                    className="flex-1 rounded-lg h-12 text-base font-semibold transition-all gap-2 bg-primary text-primary-foreground hover:brightness-110 active:scale-99 shadow-none"
                    disabled={isSubmitting || (!userPrompt && files.length === 0)}
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {t('submitButton')}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="rounded-lg h-12 px-6 border-border hover:bg-surface2 font-medium transition-all active:scale-99"
                    onClick={handleClear}
                    disabled={isSubmitting}
                >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                    <span className="sr-only">{t('clearButton')}</span>
                </Button>
            </div>

            {/* Tip removed for simplicity */}
        </form>
    );
}
