import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface ImageFile {
    id: string;
    file: File;
    preview: string;
}

// Simple base64 conversion
const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });

export interface ImageUploadMessages {
    processing?: string;
    tooLarge?: (name: string, size: string, maxSize: number) => string;
    processingFailed?: (name: string) => string;
    onlyImages?: (name: string) => string;
    added?: (count: number) => string;
}

const defaultMessages: ImageUploadMessages = {
    processing: 'Processing images...',
    tooLarge: (name, size, maxSize) => `Image "${name}" too large (${size}MB), please select an image smaller than ${maxSize}MB`,
    processingFailed: (name) => `Failed to process image "${name}", please try again`,
    onlyImages: (name) => `Only image files are supported, "${name}" skipped`,
    added: (count) => `Added ${count} image(s)`,
};

export function useImageUpload(maxFiles = 5, maxSizeMB = 2, messages?: ImageUploadMessages) {
    const [files, setFiles] = useState<ImageFile[]>([]);

    const processFiles = useCallback(async (newFiles: FileList | File[]) => {
        const msgs = { ...defaultMessages, ...messages };
        const validFiles: ImageFile[] = [];
        const fileArray = newFiles instanceof FileList ? Array.from(newFiles) : newFiles;

        // Show processing feedback
        if (fileArray.length > 0 && msgs.processing) {
            toast.info(msgs.processing, { duration: 2000 });
        }

        for (const file of fileArray) {
            if (file.type.startsWith('image/')) {
                // Check file size before processing
                const sizeInMB = file.size / 1024 / 1024;
                if (sizeInMB > maxSizeMB) {
                    if (msgs.tooLarge) {
                        toast.error(msgs.tooLarge(file.name, sizeInMB.toFixed(1), maxSizeMB));
                    }
                    continue;
                }
                try {
                    const preview = await getBase64(file);
                    validFiles.push({ id: Math.random().toString(36).substr(2, 9), file, preview });
                } catch {
                    if (msgs.processingFailed) {
                        toast.error(msgs.processingFailed(file.name));
                    }
                }
            } else {
                if (msgs.onlyImages) {
                    toast.warning(msgs.onlyImages(file.name));
                }
            }
        }

        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles].slice(0, maxFiles));
            if (msgs.added) {
                toast.success(msgs.added(validFiles.length));
            }
        }
    }, [maxFiles, maxSizeMB, messages]);

    const removeFile = useCallback((id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    }, []);

    const clearFiles = useCallback(() => {
        setFiles([]);
    }, []);

    return {
        files,
        setFiles,
        processFiles,
        removeFile,
        clearFiles
    };
}
