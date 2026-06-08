

import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { AppProvider } from './context/AppContext';
import { UserProvider } from './context/UserContext';
import { router } from './routes';

export default function App() {
  return (
    <UserProvider>
      <AppProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </AppProvider>
    </UserProvider>
  );
}