import { configureStore } from '@reduxjs/toolkit';
import { notificationsApi } from '@/store/api/notificationsApi';

export const store = configureStore({
  reducer: {
    [notificationsApi.reducerPath]: notificationsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(notificationsApi.middleware),
});

export type RootState  = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
