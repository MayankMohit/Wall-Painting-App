'use client';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useFCM } from '@/hooks/useFCM';
import { NotificationToastContainer } from '@/components/common/NotificationToast';

function AppInit() {
  useFCM();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AppInit />
      {children}
      <NotificationToastContainer />
    </Provider>
  );
}
