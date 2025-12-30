'use client';

import { motion } from 'framer-motion';
import { ComponentProps } from 'react';

type AnimatedListProps = ComponentProps<typeof motion.div> & {
    children: React.ReactNode;
    staggerDelay?: number;
};

export function AnimatedList({ children, staggerDelay = 0.05, ...props }: AnimatedListProps) {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                visible: {
                    transition: {
                        staggerChildren: staggerDelay,
                    },
                },
            }}
            {...props}
        >
            {children}
        </motion.div>
    );
}

type AnimatedListItemProps = ComponentProps<typeof motion.div>;

export function AnimatedListItem({ children, ...props }: AnimatedListItemProps) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
            }}
            transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
            }}
            {...props}
        >
            {children}
        </motion.div>
    );
}
