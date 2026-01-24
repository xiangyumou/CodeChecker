'use client';

import { getRequestPollingInterval, getRequestListPollingInterval } from '@/utils/polling';
import { useCallback } from 'react';

export function useRequestPolling() {
    return useCallback((query: { state: { data: any; error: any } }) => {
        if (query.state.error) return false;
        
        const data = query.state.data;
        if (!data) return 5000;

        return getRequestPollingInterval(data.status);
    }, []);
}

export function useRequestListPolling() {
    return useCallback((query: { state: { data: any } }) => {
        return getRequestListPollingInterval(query.state.data);
    }, []);
}
