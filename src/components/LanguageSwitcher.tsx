'use client';

import { Languages } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useUIStore } from '@/store/useUIStore';
import clsx from 'clsx';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const languages = [
    { key: 'zh', label: '中文' },
    { key: 'en', label: 'English' },
    { key: 'de', label: 'Deutsch' },
];

export default function LanguageSwitcher() {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const { setLanguage } = useUIStore();

    const handleChange = (newLocale: string) => {
        // Update store
        setLanguage(newLocale);

        // Set cookie
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

        // Refresh to update server components
        router.refresh();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                    <Languages className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Switch language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[120px]">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.key}
                        onClick={() => handleChange(lang.key)}
                        className={clsx(
                            "rounded-xl cursor-pointer font-medium px-4 py-2",
                            locale === lang.key && "bg-primary/10 text-primary"
                        )}
                    >
                        {lang.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}


