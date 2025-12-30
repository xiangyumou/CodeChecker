import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { cookies } from 'next/headers';

export default getRequestConfig(async ({ requestLocale }) => {
    // This typically corresponds to the `[locale]` segment
    let locale = await requestLocale;

    // Fallback to cookie if dynamic route segment is missing (for localePrefix: 'never')
    if (!locale) {
        const cookieStore = await cookies();
        locale = cookieStore.get('NEXT_LOCALE')?.value;
    }

    // Ensure that a valid locale is used
    if (!locale || !routing.locales.includes(locale as any)) {
        locale = routing.defaultLocale;
    }

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
        timeZone: 'Asia/Shanghai'
    };
});
