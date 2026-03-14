'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { translate } from '@/lib/i18n';
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
        processing: translate('submissionForm.imageProcessing'),
        tooLarge: (name, size, maxSize) => translate('submissionForm.imageTooLarge', { name, size: String(size), maxSize: String(maxSize) }),
        processingFailed: (name) => translate('submissionForm.imageProcessFailed', { name }),
        onlyImages: (name) => translate('submissionForm.imageSkipped', { name }),
        added: (count) => translate('submissionForm.imagesAdded', { count: String(count) }),
    }), []);

    const { files, setFiles, processFiles, removeFile: hookRemoveFile, clearFiles } = useImageUpload(5, 2, imageMessages);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const removeFile = (id: string) => {
        hookRemoveFile(id);
        toast.info(translate('submissionForm.imageRemoved'));
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
            toast.error(translate('submissionForm.validation.emptySubmissionError'));
            return;
        }

        setIsSubmitting(true);
        const imageBase64List = files.map(f => f.preview);

        try {
            const data = await createRequest({
                userPrompt: prompt || '',
                imageReferences: imageBase64List.length > 0 ? imageBase64List : undefined,
            });

            toast.success(translate('submissionForm.successMessageWithId', { id: String(data.id) }));
            setUserPrompt('');
            setFiles([]);
            onSubmissionSuccess?.();
            router.push(`/request/${data.id}`);
        } catch (error) {
            const friendlyMessage = getErrorMessage(error as Error, translate('submissionForm.errorMessage'));
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
        toast.info(translate('submissionForm.formCleared'));
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
                        placeholder={translate('submissionForm.unifiedInputPlaceholder')}
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
                                <p className="text-sm font-medium">{isDragOver ? "Drop!" : translate('submissionForm.uploadText')}</p>
                                <p className="text-xs text-muted-foreground">{translate('submissionForm.uploadHint')}</p>
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
                    {translate('submissionForm.submitButton')}
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
                    <span className="sr-only">{translate('submissionForm.clearButton')}</span>
                </Button>
            </div>

        </form>
    );
}
