'use client';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { NavItem } from '@/types';
import { Dispatch, SetStateAction } from 'react';
import { useSidebar } from '@/hooks/use-sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { usePathname } from '@/routes/hooks';
import { Link } from 'react-router-dom';

interface DashboardNavProps {
  items: NavItem[];
  setOpen?: Dispatch<SetStateAction<boolean>>;
  isMobileNav?: boolean;
}

export default function DashboardNav({
  items,
  setOpen,
  isMobileNav = false
}: DashboardNavProps) {
  const path = usePathname();
  const { isMinimized } = useSidebar();

  if (!items?.length) {
    return null;
  }

  return (
    <nav className="grid items-start gap-1">
      <TooltipProvider delayDuration={150}>
        {items.map((item, index) => {
          const Icon = Icons[item.icon || 'arrowRight'];
          const isActive = path === item.href;

          return (
            item.href && (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.disabled ? '/' : item.href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 outline-none select-none',
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 font-semibold shadow-sm border border-emerald-500/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent',
                      item.disabled && 'cursor-not-allowed opacity-50'
                    )}
                    onClick={() => {
                      if (setOpen) setOpen(false);
                    }}
                  >
                    {/* Indicador de barra ativa lateral */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full bg-emerald-500" />
                    )}

                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform duration-200',
                        isActive
                          ? 'text-emerald-400 scale-105'
                          : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />

                    {isMobileNav || (!isMinimized && !isMobileNav) ? (
                      <span className="truncate tracking-tight">{item.title}</span>
                    ) : null}

                    {/* Badge ou etiqueta de destaque */}
                    {!isMinimized && item.href === '/fluxos' && (
                      <span className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        Canvas
                      </span>
                    )}

                    {!isMinimized && item.href === '/status' && (
                      <span className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Live
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  align="center"
                  side="right"
                  sideOffset={8}
                  className={!isMinimized ? 'hidden' : 'inline-block bg-slate-900 border-slate-800 text-xs text-foreground'}
                >
                  {item.title}
                </TooltipContent>
              </Tooltip>
            )
          );
        })}
      </TooltipProvider>
    </nav>
  );
}
