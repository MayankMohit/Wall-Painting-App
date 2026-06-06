import { configureStore } from '@reduxjs/toolkit';
import { api } from '@/store/api/api';
import { notificationsApi } from '@/store/api/notificationsApi';
import uiReducer from '@/store/slices/uiSlice';

// Import endpoint files to register their injected endpoints
import '@/store/api/endpoints/jobs';
import '@/store/api/endpoints/submissions';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    [api.reducerPath]: api.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(api.middleware)
      .concat(notificationsApi.middleware),
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
