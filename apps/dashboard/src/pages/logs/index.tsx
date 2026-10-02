import { useState } from 'react';
import PageHead from '@/components/shared/page-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { withUser } from '@/hooks/use-user';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  ScrollText,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { ActivityLog } from '@/types/user';

export function LogsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page] = useState(1);

  // Consulta Logs
  const { data, isLoading, refetch } = useQuery<{
    logs: ActivityLog[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ['logs', selectedEventType, selectedStatus, search, page],
    queryFn: async () => {
      const params: any = { page, limit: 50 };
      if (selectedEventType !== 'ALL') params.eventType = selectedEventType;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (search) params.search = search;

      const res = await api.get<{ data: { logs: ActivityLog[]; total: number; page: number; totalPages: number } }>('/logs', { params });
      return res.data.data;
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;

  // Mutação: Limpar Logs
  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete('/logs');
      return res.data;
    },
    onSuccess: () => {
      toast.success('Logs limpos com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30 gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" />
            Sucesso
          </Badge>
        );
      case 'ERROR':
        return (
          <Badge variant="destructive" className="gap-1 text-[11px]">
            <XCircle className="h-3 w-3" />
            Erro
          </Badge>
        );
      case 'WARNING':
        return (
          <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/20 border-amber-500/30 gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3" />
            Alerta
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1 text-[11px]">
            <Info className="h-3 w-3" />
            Info
          </Badge>
        );
    }
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'WPP_CONNECT':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Conexão WhatsApp</Badge>;
      case 'WPP_DISCONNECT':
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20">Desconexão</Badge>;
      case 'WPP_RECONNECTING':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Reconexão</Badge>;
      case 'MSG_RECEIVED':
        return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">Mensagem Recebida</Badge>;
      case 'MSG_SENT':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Mensagem Enviada</Badge>;
      case 'REACTIVE_TRIGGERED':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Reativo Disparado</Badge>;
      case 'TRIGGER_EXECUTED':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Gatilho Executado</Badge>;
      case 'CONTACT_CREATED':
        return <Badge variant="outline" className="bg-teal-500/10 text-teal-500 border-teal-500/20">Novo Contato</Badge>;
      default:
        return <Badge variant="outline">{eventType}</Badge>;
    }
  };

  return (
    <>
      <PageHead title="Logs do Sistema | WhatsEasy" />
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto overflow-y-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Logs & Histórico</h2>
            <p className="text-muted-foreground text-sm">
              Acompanhe em tempo real todos os eventos do WhatsApp e execuções de automações.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => clearLogsMutation.mutate()}
              disabled={clearLogsMutation.isPending || total === 0}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Limpar Logs
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="border-border/80">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por mensagem ou contato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue placeholder="Tipo de Evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Eventos</SelectItem>
                  <SelectItem value="MSG_RECEIVED">Mensagens Recebidas</SelectItem>
                  <SelectItem value="MSG_SENT">Mensagens Enviadas</SelectItem>
                  <SelectItem value="REACTIVE_TRIGGERED">Reativos</SelectItem>
                  <SelectItem value="TRIGGER_EXECUTED">Gatilhos</SelectItem>
                  <SelectItem value="WPP_CONNECT">Conexão WhatsApp</SelectItem>
                  <SelectItem value="WPP_DISCONNECT">Desconexão</SelectItem>
                  <SelectItem value="ERROR">Erros</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Status</SelectItem>
                  <SelectItem value="SUCCESS">Sucesso</SelectItem>
                  <SelectItem value="ERROR">Erro</SelectItem>
                  <SelectItem value="WARNING">Alerta</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Logs */}
        <Card className="border-border/80 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-40">Data / Horário</TableHead>
                <TableHead className="w-44">Evento</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-48">Contato Envolvido</TableHead>
                <TableHead>Descrição do Evento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
                    <p className="text-sm text-muted-foreground mt-2">Carregando histórico...</p>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ScrollText className="h-8 w-8 text-muted-foreground/60" />
                      <p className="font-semibold text-foreground">Nenhum registro de log encontrado</p>
                      <p className="text-xs text-muted-foreground">
                        Eventos de conexão, mensagens e automações aparecerão aqui em tempo real.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>{getEventBadge(log.eventType)}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      {log.contactPhone || log.contactName ? (
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold text-foreground">{log.contactName || 'Contato'}</span>
                          {log.contactPhone && (
                            <span className="text-muted-foreground font-mono">+{log.contactPhone}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-foreground/90 font-sans leading-relaxed">
                      {log.description}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}

export default withUser(LogsPage);
