// redux/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { userReducer } from './reducer/userReducer';
import { sidebarReducer } from './reducer/sidebarReducer';
import { projectReducer } from './reducer/projectReducer';
import { teamSlice } from './reducer/teamReducer';
import campaignReducer from "./reducer/campaignReducer";
import { backlinkReducer } from './reducer/backlinkReducer';

export const store = configureStore({
  reducer: {
    [userReducer.name]: userReducer.reducer,
    [sidebarReducer.name]: sidebarReducer.reducer,
    [projectReducer.name]: projectReducer.reducer,
    [teamSlice.name]: teamSlice.reducer,
    campaign: campaignReducer,
    [backlinkReducer.name]: backlinkReducer.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat([]),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
