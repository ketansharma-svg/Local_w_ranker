// redux/slices/sidebarReducer.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SidebarState {
    activeSection: string | null;
    activeSubmenu: string | null;
}

const initialState: SidebarState = {
    activeSection: null,
    activeSubmenu: null,
};

export const sidebarReducer = createSlice({
    name: 'sidebar',
    initialState,
    reducers: {
        setActiveSidebar: (
            state,
            action: PayloadAction<{ section: string; submenu?: string }>
        ) => {
            state.activeSection = action.payload.section;
            state.activeSubmenu = action.payload.submenu || null;
        },
        resetSidebar: (state) => {
            state.activeSection = null;
            state.activeSubmenu = null;
        },
    },
});

export const { setActiveSidebar, resetSidebar } = sidebarReducer.actions;
export default sidebarReducer.reducer;
