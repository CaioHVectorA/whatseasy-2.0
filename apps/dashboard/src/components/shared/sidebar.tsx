'use client';
import DashboardNav from '@/components/shared/dashboard-nav';
import { navItems } from '@/constants/data';
import { useSidebar } from '@/hooks/use-sidebar';
import { cn } from '@/lib/utils';
import { ChevronsLeft, MessageSquareCode } from 'lucide-react';
import { useState } from 'react';

type SidebarProps = {
  className?: string;
};

export default function Sidebar({ className }: SidebarProps) {
  const { isMinimized, toggle } = useSidebar();
  const [status, setStatus] = useState(false);

  const handleToggle = () => {
    setStatus(true);
    toggle();
    setTimeout(() => setStatus(false), 500);
  };

  return (
    <nav
      className={cn(
        `relative z-10 hidden h-screen flex-none px-3 md:block border-r bg-card/60 backdrop-blur-sm`,
        status && 'duration-500',
        !isMinimized ? 'w-72' : 'w-[80px]',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center px-0 py-5 md:px-2',
          isMinimized ? 'justify-center' : 'justify-between'
        )}
      >
        {!isMinimized && (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow">
              <MessageSquareCode className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">WhatsEasy</h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">v2.0 MVP</span>
            </div>
          </div>
        )}
        <ChevronsLeft
          className={cn(
            'size-8 cursor-pointer rounded-full border bg-background text-foreground hover:bg-accent transition-transform',
            isMinimized && 'rotate-180'
          )}
          onClick={handleToggle}
        />
      </div>
      <div className="space-y-4 py-4">
        <div className="px-2 py-2">
          <div className="mt-3 space-y-1">
            <DashboardNav items={navItems} />
          </div>
        </div>
      </div>
    </nav>
  );
}
