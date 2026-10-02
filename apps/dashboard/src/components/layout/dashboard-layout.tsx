import { useState } from 'react';
import Sidebar from '../shared/sidebar';
import Header from '../shared/header';
import MobileSidebar from '../shared/mobile-sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <MobileSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <Sidebar />
      <div className="flex w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="relative flex-1 overflow-y-auto bg-background/50 p-4 sm:p-6 md:p-8 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
