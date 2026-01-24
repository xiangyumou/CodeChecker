'use client';

import { ZoomableImage } from './ui/ZoomableImage';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export interface ImageItem {
    id: string;
    preview: string;
    alt?: string;
}

interface ImageGalleryProps {
    images: string[] | ImageItem[];
    onRemove?: (id: string) => void;
    layout?: 'grid' | 'horizontal';
    className?: string;
    readonly?: boolean;
}

export default function ImageGallery({
    images,
    onRemove,
    layout = 'grid',
    className,
    readonly = false
}: ImageGalleryProps) {
    const t = useTranslations('requestDetails');

    if (!images || images.length === 0) return null;

    const items: ImageItem[] = images.map((img, idx) => {
        if (typeof img === 'string') {
            return { id: `img-${idx}`, preview: img };
        }
        return img;
    });

    const isGrid = layout === 'grid';

    return (
        <div className={cn("space-y-2", className)}>
            {!readonly && (
                <span className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    {t('submittedImages', { count: items.length })}
                </span>
            )}
            
            <div className={cn(
                isGrid 
                    ? "grid grid-cols-2 md:grid-cols-3 gap-4" 
                    : "flex gap-2 overflow-x-auto pb-2"
            )}>
                <AnimatePresence mode="popLayout">
                    {items.map((item, idx) => (
                        <motion.div
                            key={item.id}
                            className={cn(
                                "group relative overflow-hidden border border-border bg-surface",
                                isGrid 
                                    ? "aspect-video rounded-lg" 
                                    : "w-24 h-24 flex-none rounded-lg"
                            )}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ZoomableImage
                                src={item.preview}
                                alt={item.alt || t('submittedImageAlt', { index: idx + 1 })}
                                className={cn(
                                    "w-full h-full",
                                    isGrid ? "object-contain" : "object-cover cursor-pointer"
                                )}
                            />
                            
                            {!readonly && onRemove && (
                                <>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <motion.button
                                            type="button"
                                            onClick={(e: React.MouseEvent) => { 
                                                e.stopPropagation(); 
                                                onRemove(item.id); 
                                            }}
                                            className="bg-black/50 hover:bg-destructive text-white rounded-full p-1 transition-colors backdrop-blur-sm"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <X className="w-3 h-3" />
                                        </motion.button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
