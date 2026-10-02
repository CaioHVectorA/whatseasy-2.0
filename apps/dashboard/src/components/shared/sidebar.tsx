'use client';
import DashboardNav from '@/components/shared/dashboard-nav';
import { navItems } from '@/constants/data';
import { useSidebar } from '@/hooks/use-sidebar';
import { cn } from '@/lib/utils';
import { ChevronsLeft, Zap, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

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
        `relative z-20 hidden h-screen flex-none px-3 md:flex flex-col justify-between border-r border-border/40 bg-card/40 backdrop-blur-xl`,
        status && 'duration-300',
        !isMinimized ? 'w-64' : 'w-[74px]',
        className
      )}
    >
      <div className="space-y-4">
        {/* Top Branding Section */}
        <div
          className={cn(
            'flex items-center px-1 py-4.5',
            isMinimized ? 'justify-center' : 'justify-between'
          )}
        >
          {!isMinimized && (
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Zap className="h-4.5 w-4.5 fill-white" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
                  WhatsEasy
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Pro
                  </span>
                </h1>
                <span className="text-[10px] text-muted-foreground font-medium block">
                  Automação Inteligente
                </span>
              </div>
            </Link>
          )}

          <button
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-all',
              isMinimized && 'rotate-180'
            )}
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="py-1">
          <DashboardNav items={navItems} />
        </div>
      </div>

      {/* Bottom Footer Info in Sidebar */}
      {!isMinimized && (
        <div className="p-2 mb-3 rounded-xl bg-muted/20 border border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-foreground block text-[11px] truncate">
                Superpower Mode
              </span>
              <span className="text-[10px] text-muted-foreground block truncate">
                Motor Baileys v7 Ativo
              </span>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
