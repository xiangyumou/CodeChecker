import { prisma } from '@/lib/db';
import RequestDetailPanel from '@/components/RequestDetailPanel';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import PageHeader from '@/components/PageHeader';

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
            <div className="min-h-screen bg-surface">
                <PageHeader showHomeLink={true} />
                <div className="p-4 md:p-8 flex justify-center">
                    <div className="w-full max-w-5xl h-[calc(100vh-8rem)]">
                        <RequestDetailPanel
                            request={request}
                            isPublicView={true}
                        />
                    </div>
                </div>
            </div>
        </NextIntlClientProvider>
    );
}
