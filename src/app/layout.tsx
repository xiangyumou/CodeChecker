import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { Providers } from '@/providers/Providers';

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Code Checker",
    description: "Deep code analysis and optimization with AI-driven insights.",
};

import { cookies } from 'next/headers';

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value || 'zh';

    // Ensure that the incoming `locale` is valid
    if (!((routing.locales as unknown) as string[]).includes(locale)) {
        notFound();
    }

    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <body
                className={`${inter.variable} ${jetbrainsMono.variable} antialiased font-sans`}
                suppressHydrationWarning
            >
                <Providers locale={locale} messages={messages}>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
