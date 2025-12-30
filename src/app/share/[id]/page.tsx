import { prisma } from '@/lib/db';
import RequestDetailView from '@/components/RequestDetailView';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';

type Props = {
    params: Promise<{ id: string }>;
};

async function getRequest(id: number) {
    const request = await prisma.request.findUnique({
        where: { id },
    });

    if (!request) return null;

    return {
        ...request,
        imageReferences: request.imageReferences
            ? JSON.parse(request.imageReferences)
            : null,
        gptRawResponse: request.gptRawResponse
            ? JSON.parse(request.gptRawResponse)
            : null,
    };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const request = await getRequest(parseInt(id));

    if (!request) {
        return {
            title: 'Request Not Found',
        };
    }

    return {
        title: `Analysis Report #${id}`,
        description: 'AI Code Analysis Report',
    };
}

export default async function SharePage({ params }: Props) {
    const { id } = await params;
    const requestId = parseInt(id);

    if (isNaN(requestId)) {
        notFound();
    }

    const request = await getRequest(requestId);

    if (!request) {
        notFound();
    }

    const messages = await getMessages();

    return (
        <NextIntlClientProvider messages={messages}>
            {/* 
                We need to wrap this in a ThemeProvider to ensure dark mode works.
                However, ThemeProvider (next-themes) is a client component wrapper.
                Usually it's in layout.tsx. 
                Since this is a new route group or root page, it inherits from root layout?
                Yes, src/app/layout.tsx typically wraps children.
                Let's check if src/app/share/[id]/layout.tsx is needed or if root layout is sufficient.
                Root layout likely has the sidebar and logic we might NOT want.
                The requirement said "open is a ... report", implying a standalone page?
                "Align with main page" suggests same theme, but maybe not the sidebar/interactive dashboard.
                If I put this in `src/app/share/[id]/page.tsx`, it will use `src/app/layout.tsx`.
                Let's double check `src/app/layout.tsx`.
            */}
            <div className="min-h-screen bg-surface p-4 md:p-8 flex justify-center">
                <div className="w-full max-w-5xl h-[calc(100vh-4rem)]">
                    <RequestDetailView
                        request={request}
                        isPublicView={true}
                    />
                </div>
            </div>
        </NextIntlClientProvider>
    );
}
