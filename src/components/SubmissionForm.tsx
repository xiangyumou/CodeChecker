'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Trash2, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ImageGallery from './ImageGallery';
import { createRequest } from '@/app/actions/requests';
import { useImageUpload, ImageUploadMessages } from '@/hooks/useImageUpload';
import { getErrorMessage } from '@/utils/error-mapping';

interface SubmissionFormProps {
    onSubmissionSuccess?: () => void;
}

export default function SubmissionForm({ onSubmissionSuccess }: SubmissionFormProps) {
    const router = useRouter();
    const [userPrompt, setUserPrompt] = useState('');

    // Create i18n messages for the image upload hook
    const imageMessages: ImageUploadMessages = useMemo(() => ({
        processing: '正在处理图片...',
        tooLarge: (name, size, maxSize) => `图片 "${name}" 太大 (${size}MB)，请选择小于 ${maxSize}MB 的图片`,
        processingFailed: (name) => `处理图片 "${name}" 失败，请重试`,
        onlyImages: (name) => `仅支持图片文件，"${name}" 被跳过`,
        added: (count) => `已添加 ${count} 张图片`,
    }), []);

    const { files, setFiles, processFiles, removeFile: hookRemoveFile, clearFiles } = useImageUpload(5, 2, imageMessages);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const removeFile = (id: string) => {
        hookRemoveFile(id);
        toast.info('图片已移除');
    };

    // Vision support is always enabled
    const supportsVision = true;

    const handleFileChange = (newFiles: FileList | null) => {
        if (!newFiles) return;
        processFiles(newFiles);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const prompt = userPrompt.trim();

        if (!prompt && files.length === 0) {
            toast.error('请输入描述/代码或添加图片！');
            return;
        }

        setIsSubmitting(true);
        const imageBase64List = files.map(f => f.preview);

        try {
            const data = await createRequest({
                userPrompt: prompt || '',
                imageReferences: imageBase64List.length > 0 ? imageBase64List : undefined,
            });

            toast.success(`请求 #${data.id} 提交成功！`);
            setUserPrompt('');
            setFiles([]);
            onSubmissionSuccess?.();
            router.push(`/request/${data.id}`);
        } catch (error) {
            const friendlyMessage = getErrorMessage(error as Error, '请求提交失败。');
            toast.error(friendlyMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
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
        clearFiles();
        toast.info('表单已清空');
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
        <form onSubmit={handleSubmit} onPaste={handlePaste} className="h-full flex flex-col p-6 space-y-4" data-testid="submission-form">

            <div className="flex-1 min-h-0 flex flex-col gap-4">
                {/* Text Input */}
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                    <Textarea
                        id="prompt"
                        data-testid="submission-prompt"
                        placeholder="请在此处输入问题描述、粘贴代码..."
                        className="flex-1 resize-none rounded-lg border-border p-4 text-base bg-surface focus-visible:ring-ring"
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>


                {supportsVision && (
                    <div className="flex-none flex flex-col gap-2">

                        {/* Image Preview List */}
                        <ImageGallery
                            images={files}
                            onRemove={removeFile}
                            layout="horizontal"
                            readonly={false}
                            className="space-y-0"
                        />

                        {/* Drop Zone */}
                        <div
                            className={cn(
                                "flex-none relative border border-dashed rounded-lg p-4 transition-all cursor-pointer flex items-center justify-center gap-4 bg-surface2 h-20",
                                isDragOver ? "border-primary bg-primary-a10" : "border-border hover:border-primary",
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
                                <p className="text-sm font-medium">{isDragOver ? "Drop!" : "点击或拖拽图片到此区域上传"}</p>
                                <p className="text-xs text-muted-foreground">或直接粘贴截图。支持多张 JPG/PNG 图片，单张不超过 2MB，最多 5 张。</p>
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
                    data-testid="submission-submit"
                    className="flex-1 rounded-lg h-12 text-base font-semibold transition-all gap-2 bg-primary text-primary-foreground hover:brightness-110 active:scale-99 shadow-none"
                    disabled={isSubmitting || (!userPrompt && files.length === 0)}
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    提交分析
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
                    <span className="sr-only">清空</span>
                </Button>
            </div>

        </form>
    );
}
