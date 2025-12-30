'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type AnimatedCardProps = ComponentProps<typeof motion.div> & {
    children: React.ReactNode;
    delay?: number;
};

export function AnimatedCard({ children, delay = 0, className, ...props }: AnimatedCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{
                duration: 0.3,
                delay,
                ease: [0.4, 0, 0.2, 1],
            }}
            whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.98 }}
            className={cn(className)}
            {...props}
        >
            {children}
        </motion.div>
    );
}

export { AnimatePresence };
