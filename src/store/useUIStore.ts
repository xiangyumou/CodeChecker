import { create } from 'zustand';

interface UIState {
    // Request Detail Dialog
    selectedRequestId: number | null;
    isDetailDialogOpen: boolean;

    // Actions
    selectRequest: (id: number) => void;
    clearSelection: () => void;
    closeDetailDialog: () => void;

    // Master-Detail State
    rightPanelMode: 'create' | 'detail';
    createNewRequest: () => void;

    // Language State
    language: string;
    setLanguage: (lang: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
    // Initial state
    selectedRequestId: null,
    isDetailDialogOpen: false,
    rightPanelMode: 'create',
    language: 'zh', // Default, will be hydrated or effectively overridden by next-intl

    // Actions
    selectRequest: (id) => set({ selectedRequestId: id, isDetailDialogOpen: true, rightPanelMode: 'detail' }),
    clearSelection: () => set({ selectedRequestId: null, isDetailDialogOpen: false, rightPanelMode: 'create' }),
    closeDetailDialog: () => set({ isDetailDialogOpen: false, rightPanelMode: 'create' }),
    createNewRequest: () => set({ selectedRequestId: null, isDetailDialogOpen: false, rightPanelMode: 'create' }),
    setLanguage: (lang) => set({ language: lang }),
}));
