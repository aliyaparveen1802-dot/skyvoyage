import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { MobileBottomNav, Sidebar } from './Sidebar';

export function DashboardShell() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex w-full max-w-[1600px]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
