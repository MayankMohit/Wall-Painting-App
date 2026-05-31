'use client';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useFCM } from '@/hooks/useFCM';

// Mounts FCM registration and foreground listener once at the app root.
function AppInit() {
  useFCM();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AppInit />
      {children}
    </Provider>
  );
}
