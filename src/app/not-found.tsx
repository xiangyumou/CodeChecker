'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import { Home, MoveLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    const [mounted, setMounted] = useState(false);

    // Mouse position state for the spotlight effect
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth out the mouse movement
    const springConfig = { damping: 25, stiffness: 700 };
    const springX = useSpring(mouseX, springConfig);
    const springY = useSpring(mouseY, springConfig);

    useEffect(() => {
        setMounted(true);

        const handleMouseMove = ({ clientX, clientY }: MouseEvent) => {
            mouseX.set(clientX);
            mouseY.set(clientY);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    // Dynamic background spotlight - adjusted for both light/dark modes
    // We use a safe blue-ish tint that works reasonably well on both or relies on CSS blend modes if needed.
    // Ideally we'd use 'var(--primary)' but framer motion templates work best with hex/rgba.
    // We will use a subtle localized glow.
    const background = useMotionTemplate`radial-gradient(
    circle 350px at ${springX}px ${springY}px,
    var(--spotlight-color, rgba(59, 130, 246, 0.15)),
    transparent 80%
  )`;

    // Spotlight mask for the text reveal effect
    const maskImage = useMotionTemplate`radial-gradient(
    circle 200px at ${springX}px ${springY}px,
    black 45%,
    transparent
  )`;

    if (!mounted) return null;

    return (
        <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background text-foreground">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.1]"
                style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }}
            />

            {/* Ambient Spotlight */}
            <motion.div
                className="pointer-events-none absolute inset-0 z-10"
                style={{ background }}
            />

            {/* Content Container */}
            <div className="relative z-20 flex flex-col items-center text-center">

                {/* Glitchy 404 Text */}
                <div className="relative">
                    {/* Base Text - Faint but visible */}
                    <h1 className="select-none text-[12rem] font-bold leading-none tracking-tighter text-muted-foreground/20 sm:text-[18rem]">
                        404
                    </h1>

                    {/* Revealed Text Layer (Only visible under spotlight) */}
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center select-none"
                        style={{
                            WebkitMaskImage: maskImage,
                            maskImage: maskImage
                        }}
                    >
                        <h1 className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-[12rem] font-bold leading-none tracking-tighter text-transparent sm:text-[18rem]">
                            404
                        </h1>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="space-y-6"
                >
                    <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        Page not found
                    </h2>
                    <p className="max-w-md text-muted-foreground md:text-lg">
                        Sorry, the page you are looking for doesn't exist or has been moved.
                        Let's get you back on track.
                    </p>

                    <div className="flex flex-col gap-4 sm:flex-row sm:justify-center mt-8">
                        <Button
                            asChild
                            size="lg"
                            className="group"
                        >
                            <Link href="/">
                                <Home className="mr-2 h-4 w-4" />
                                Go Home
                            </Link>
                        </Button>

                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => window.history.back()}
                            className="group"
                        >
                            <MoveLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Go Back
                        </Button>
                    </div>
                </motion.div>
            </div>

            <div className="absolute bottom-8 text-xs text-muted-foreground">
                Error Code: 404 • Resource Not Found
            </div>
        </div>
    );
}
