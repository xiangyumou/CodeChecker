'use client';

import { TRPCProvider } from '@/providers/TRPCProvider';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';

export function Providers({
    children,
    locale,
    messages,
}: {
    children: React.ReactNode;
    locale: string;
    messages: any;
}) {
    return (
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Shanghai">
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                <TRPCProvider>
                    {children}
                    <Toaster />
                </TRPCProvider>
            </ThemeProvider>
        </NextIntlClientProvider>
    );
}
