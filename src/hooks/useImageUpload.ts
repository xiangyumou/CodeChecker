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

export function useImageUpload(maxFiles = 5, maxSizeMB = 2) {
    const [files, setFiles] = useState<ImageFile[]>([]);

    const processFiles = useCallback(async (newFiles: FileList | File[]) => {
        const validFiles: ImageFile[] = [];
        const fileArray = newFiles instanceof FileList ? Array.from(newFiles) : newFiles;

        // Show processing feedback
        if (fileArray.length > 0) {
            toast.info('正在处理图片...', { duration: 2000 });
        }

        for (const file of fileArray) {
            if (file.type.startsWith('image/')) {
                // Check file size before processing
                const sizeInMB = file.size / 1024 / 1024;
                if (sizeInMB > maxSizeMB) {
                    toast.error(`图片 "${file.name}" 太大 (${sizeInMB.toFixed(1)}MB)，请选择小于 ${maxSizeMB}MB 的图片`);
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
            setFiles(prev => [...prev, ...validFiles].slice(0, maxFiles));
            toast.success(`已添加 ${validFiles.length} 张图片`);
        }
    }, [maxFiles, maxSizeMB]);

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
