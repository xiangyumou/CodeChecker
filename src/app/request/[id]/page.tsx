import Dashboard from '@/components/Dashboard';
import { use } from 'react';

type Props = {
    params: Promise<{ id: string }>;
};

export default function RequestPage({ params }: Props) {
    const { id } = use(params);
    return <Dashboard initialRequestId={id} />;
}
