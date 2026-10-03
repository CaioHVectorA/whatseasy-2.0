import { navItems } from '@/constants/data';
import { usePathname } from '@/routes/hooks';
import UserNav from './user-nav';
import { ModeToggle } from './theme-toggle';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Smartphone, Bot, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const useMatchedPath = (pathname: string) => {
  const matchedPath =
    navItems.find((item) => item.href === pathname) ||
    navItems.find(
      (item) => pathname.startsWith(item.href + '/') && item.href !== '/'
    );
  return matchedPath?.title || 'WhatsEasy';
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const headingText = useMatchedPath(pathname);

  // Polling leve para status global no header
  const { data: statusData } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/status');
      return res.data.data;
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const status = statusData?.status || 'DISCONNECTED';
  const isConnected = status === 'CONNECTED';

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-border/40 bg-background/80 px-4 md:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        )}
        <div>
          <h2 className="text-sm md:text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            {headingText}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Status Chip Global do WhatsApp */}
        <Link
          to="/status"
          className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : status === 'QR_READY'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              : status === 'CONNECTING' || status === 'RECONNECTING'
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground'
          }`}
        >
          {isConnected ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">WhatsApp Online</span>
            </>
          ) : status === 'QR_READY' ? (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              <span>Ler QR Code</span>
            </>
          ) : status === 'CONNECTING' || status === 'RECONNECTING' ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Reconectando...</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              <span className="hidden sm:inline">WhatsApp Offline</span>
            </>
          )}
        </Link>

        {/* Atalho Rápido para Playground */}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="hidden md:flex h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
        >
          <Link to="/playground">
            <Bot className="h-3.5 w-3.5 text-cyan-400" />
            <span>Playground</span>
          </Link>
        </Button>

        <div className="h-4 w-[1px] bg-border/60 mx-1" />

        <UserNav />
        <ModeToggle />
      </div>
    </header>
  );
}
