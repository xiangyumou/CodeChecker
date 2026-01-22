import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../useUIStore';

describe('useUIStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useUIStore.setState({
            selectedRequestId: null,
            isDetailDialogOpen: false,
            rightPanelMode: 'create',
            language: 'zh',
        });
    });

    describe('Initial state', () => {
        it('should have correct initial state', () => {
            const state = useUIStore.getState();
            expect(state.selectedRequestId).toBeNull();
            expect(state.isDetailDialogOpen).toBe(false);
            expect(state.rightPanelMode).toBe('create');
            expect(state.language).toBe('zh');
        });
    });

    describe('selectRequest', () => {
        it('should set selectedRequestId and open detail dialog', () => {
            useUIStore.getState().selectRequest(123);

            const state = useUIStore.getState();
            expect(state.selectedRequestId).toBe(123);
            expect(state.isDetailDialogOpen).toBe(true);
            expect(state.rightPanelMode).toBe('detail');
        });

        it('should update existing selection when called again', () => {
            useUIStore.getState().selectRequest(123);
            useUIStore.getState().selectRequest(456);

            const state = useUIStore.getState();
            expect(state.selectedRequestId).toBe(456);
        });
    });

    describe('clearSelection', () => {
        it('should reset all selection-related state', () => {
            // First set a selection
            useUIStore.getState().selectRequest(123);

            // Then clear it
            useUIStore.getState().clearSelection();

            const state = useUIStore.getState();
            expect(state.selectedRequestId).toBeNull();
            expect(state.isDetailDialogOpen).toBe(false);
            expect(state.rightPanelMode).toBe('create');
        });
    });

    describe('closeDetailDialog', () => {
        it('should close dialog and reset to create mode', () => {
            // Set up state with open dialog
            useUIStore.getState().selectRequest(123);

            // Close dialog
            useUIStore.getState().closeDetailDialog();

            const state = useUIStore.getState();
            expect(state.isDetailDialogOpen).toBe(false);
            expect(state.rightPanelMode).toBe('create');
        });

        it('should preserve selectedRequestId when closing dialog', () => {
            useUIStore.getState().selectRequest(123);
            useUIStore.getState().closeDetailDialog();

            const state = useUIStore.getState();
            expect(state.selectedRequestId).toBe(123);
        });
    });

    describe('createNewRequest', () => {
        it('should reset to create mode and clear selection', () => {
            // Set up state with a selection
            useUIStore.getState().selectRequest(123);

            // Create new request
            useUIStore.getState().createNewRequest();

            const state = useUIStore.getState();
            expect(state.selectedRequestId).toBeNull();
            expect(state.isDetailDialogOpen).toBe(false);
            expect(state.rightPanelMode).toBe('create');
        });
    });

    describe('setLanguage', () => {
        it('should update language state', () => {
            useUIStore.getState().setLanguage('en');

            const state = useUIStore.getState();
            expect(state.language).toBe('en');
        });

        it('should support multiple languages', () => {
            useUIStore.getState().setLanguage('zh');
            expect(useUIStore.getState().language).toBe('zh');

            useUIStore.getState().setLanguage('en');
            expect(useUIStore.getState().language).toBe('en');

            useUIStore.getState().setLanguage('ja');
            expect(useUIStore.getState().language).toBe('ja');
        });
    });

    describe('State integration', () => {
        it('should handle complex state transitions correctly', () => {
            const state = useUIStore.getState();

            // Start: create mode
            expect(state.rightPanelMode).toBe('create');

            // Select a request
            state.selectRequest(100);
            expect(useUIStore.getState().rightPanelMode).toBe('detail');
            expect(useUIStore.getState().selectedRequestId).toBe(100);

            // Close dialog (should stay in detail mode but close dialog)
            state.closeDetailDialog();
            const afterClose = useUIStore.getState();
            expect(afterClose.isDetailDialogOpen).toBe(false);
            expect(afterClose.rightPanelMode).toBe('create');

            // Create new request
            state.createNewRequest();
            const afterCreate = useUIStore.getState();
            expect(afterCreate.selectedRequestId).toBeNull();
            expect(afterCreate.rightPanelMode).toBe('create');
        });
    });
});
