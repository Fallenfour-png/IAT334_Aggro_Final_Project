import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Toast } from './Toast';
import { Topbar, type Crumb } from './Topbar';

export function AppLayout({ crumbs, children }: { crumbs: Crumb[]; children: ReactNode }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar crumbs={crumbs} />
        {children}
      </div>
      <Toast />
    </div>
  );
}
