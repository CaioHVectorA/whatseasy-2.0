import { useEffect, useState } from 'react';
import PageHead from '@/components/shared/page-head';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { getCookie } from '@/lib/cookies';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { withUser } from '@/hooks/use-user';
import {
  CheckCircle2,
  HelpCircle,
  Loader2,
  LogOut,
  QrCode as QrIcon,
  RefreshCw,
  Send,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface WppStatusResponse {
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';
  isConnected: boolean;
  qr?: string | null;
  phone?: string | null;
  name?: string | null;
  last_conn?: string | null;
  last_sync?: string | null;
}

export function Status() {
  const queryClient = useQueryClient();
  const [liveQr, setLiveQr] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Esta é uma mensagem de teste enviada pelo WhatsEasy 2.0.');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Consulta status inicial com polling inteligente
  const { data: statusData, isLoading, refetch } = useQuery<WppStatusResponse>({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const res = await api.get<{ data: WppStatusResponse }>('/whatsapp/status');
      return res.data.data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'CONNECTING' || status === 'QR_READY' || status === 'RECONNECTING') {
        return 2000;
      }
      return 10000;
    },
  });

  // Conexão WebSocket em tempo real para receber QR Code e status
  useEffect(() => {
    const token = getCookie('token') || localStorage.getItem('token');
    if (!token) return;

    const wsUrl = `ws://${window.location.hostname}:3333/ws?token=${token}`;
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('[WS] Conectado ao servidor de eventos em tempo real.');
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'QR' && payload.qr) {
            setLiveQr(payload.qr);
            setLiveStatus('QR_READY');
          } else if (payload.event === 'CONNECTED') {
            setLiveQr(null);
            setLiveStatus('CONNECTED');
            toast.success('WhatsApp conectado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
          } else if (payload.event === 'DISCONNECTED') {
            setLiveQr(null);
            setLiveStatus('DISCONNECTED');
            queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
          } else if (payload.event === 'RECONNECTING') {
            setLiveStatus('RECONNECTING');
          } else if (payload.status) {
            setLiveStatus(payload.status);
            if (payload.qr) setLiveQr(payload.qr);
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      socket.onerror = (err) => {
        console.warn('[WS] Erro na conexão WebSocket:', err);
      };
    } catch (e) {
      console.error('Failed to init WS:', e);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [queryClient]);

  const currentStatus = liveStatus || statusData?.status || 'DISCONNECTED';
  const currentQr = liveQr || statusData?.qr;
  const isConnected = currentStatus === 'CONNECTED';

  // Mutação para iniciar conexão
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/whatsapp/connect');
      return res.data;
    },
    onSuccess: (data) => {
      toast.info('Iniciando WhatsApp... O QR Code aparecerá em instantes.');
      if (data.data?.qr) setLiveQr(data.data.qr);
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao iniciar conexão.');
    },
  });

  // Mutação para desconectar
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/whatsapp/logout');
      return res.data;
    },
    onSuccess: () => {
      setLiveQr(null);
      setLiveStatus('DISCONNECTED');
      toast.success('Sessão encerrada com sucesso.');
      refetch();
    },
    onError: () => {
      toast.error('Erro ao desconectar WhatsApp.');
    },
  });

  // Mutação para envio de mensagem de teste
  const sendTestMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/whatsapp/send', {
        phone: testPhone,
        message: testMessage,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Mensagem de teste enviada com sucesso!');
      setIsTestModalOpen(false);
      setTestPhone('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao enviar mensagem de teste.');
    },
  });

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'CONNECTED':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30 px-3 py-1 gap-1.5 text-sm font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Conectado
          </Badge>
        );
      case 'CONNECTING':
      case 'QR_READY':
        return (
          <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/20 border-amber-500/30 px-3 py-1 gap-1.5 text-sm font-semibold">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            Aguardando Leitura do QR Code
          </Badge>
        );
      case 'RECONNECTING':
        return (
          <Badge className="bg-blue-500/15 text-blue-500 hover:bg-blue-500/20 border-blue-500/30 px-3 py-1 gap-1.5 text-sm font-semibold">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Reconectando...
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-400 border-slate-700 px-3 py-1 gap-1.5 text-sm font-semibold">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            Desconectado
          </Badge>
        );
    }
  };

  return (
    <>
      <PageHead title="Conexão WhatsApp | WhatsEasy" />
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-6xl mx-auto overflow-y-auto">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Conexão WhatsApp</h2>
            <p className="text-muted-foreground text-sm">
              Gerencie a integração do seu WhatsApp com o motor de automação.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
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
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          {/* Card Principal de Estado e Ações */}
          <Card className="md:col-span-7 border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="h-5 w-5 text-emerald-500" />
                Estado da Instância
              </CardTitle>
              <CardDescription>
                Conecte seu número escaneando o QR Code abaixo com seu aplicativo do WhatsApp.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {isConnected ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Sessão Ativa e Sincronizada</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {statusData?.phone ? `Número conectado: +${statusData.phone}` : 'Pronto para enviar e receber mensagens automáticas.'}
                    </p>
                    {statusData?.last_conn && (
                      <p className="text-xs text-muted-foreground/80 mt-1">
                        Última conexão em: {new Date(statusData.last_conn).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                          <Send className="h-4 w-4" />
                          Enviar Mensagem de Teste
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Enviar Mensagem de Teste</DialogTitle>
                          <DialogDescription>
                            Envie uma mensagem direta para validar se o envio está funcionando corretamente.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Telefone com DDD (apenas números)</label>
                            <Input
                              placeholder="Ex: 5521999999999"
                              value={testPhone}
                              onChange={(e) => setTestPhone(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Mensagem</label>
                            <Textarea
                              rows={3}
                              value={testMessage}
                              onChange={(e) => setTestMessage(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => sendTestMutation.mutate()}
                            disabled={sendTestMutation.isPending || !testPhone}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {sendTestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Agora
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="destructive"
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                      className="gap-2"
                    >
                      {logoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                      Desconectar WhatsApp
                    </Button>
                  </div>
                </div>
              ) : currentQr ? (
                <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-card space-y-4">
                  <div className="relative p-3 bg-white rounded-xl shadow-md border">
                    <img src={currentQr} alt="QR Code WhatsApp" className="w-64 h-64 object-contain" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-semibold text-sm">Escaneie o código com seu WhatsApp</p>
                    <p className="text-xs text-muted-foreground">
                      Abra o WhatsApp &gt; Dispositivos Conectados &gt; Conectar um Dispositivo
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => connectMutation.mutate()}
                    disabled={connectMutation.isPending}
                    className="gap-2 text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Gerar Novo QR Code
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 border rounded-xl bg-muted/20 text-center space-y-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <WifiOff className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-base">Nenhum WhatsApp Conectado</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Clique no botão abaixo para gerar um QR Code e vincular seu número de atendimento.
                    </p>
                  </div>
                  <Button
                    onClick={() => connectMutation.mutate()}
                    disabled={connectMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6"
                  >
                    {connectMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <QrIcon className="h-4 w-4" />
                    )}
                    Conectar WhatsApp
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instruções e Boas Práticas */}
          <Card className="md:col-span-5 border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <HelpCircle className="h-5 w-5 text-primary" />
                Como Conectar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <ol className="space-y-3 list-decimal list-inside text-foreground/90 leading-relaxed">
                <li>Abra o aplicativo do <strong>WhatsApp</strong> no seu celular.</li>
                <li>Toque nos <strong>três pontinhos</strong> (Android) ou em <strong>Configurações</strong> (iPhone).</li>
                <li>Selecione a opção <strong>Dispositivos Conectados</strong>.</li>
                <li>Toque em <strong>Conectar um dispositivo</strong>.</li>
                <li>Aponte a câmera do celular para o <strong>QR Code</strong> exibido nesta tela.</li>
              </ol>

              <div className="rounded-lg bg-secondary/50 p-4 border text-xs space-y-1.5 mt-4">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                  Reconexão Automática
                </p>
                <p className="text-muted-foreground">
                  O WhatsEasy 2.0 mantém sua sessão salva com segurança e se reconecta automaticamente caso haja oscilações de sinal.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

export default withUser(Status);