// Global styles load first so page styles can build on them.
import './styles/tokens.css';
import './styles/global.css';
import './components/ui/ui.css';
import './components/shell/shell.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { StoreProvider } from './state/store';

const router = createBrowserRouter([{ path: '*', element: <App /> }], { basename: import.meta.env.BASE_URL });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  </StrictMode>,
);
