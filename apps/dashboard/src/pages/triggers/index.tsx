import { useState } from 'react';
import PageHead from '@/components/shared/page-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { withUser } from '@/hooks/use-user';
import { toast } from 'sonner';
import {
  Clock,
  Hourglass,
  Layers,
  Loader2,
  Plus,
  Trash2,
  Zap,
} from 'lucide-react';
import type { TriggerItem, Cluster } from '@/types/user';

export function TriggersPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State para Novo Gatilho
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<'RECURRING_DAILY' | 'INACTIVITY_DAYS'>('RECURRING_DAILY');
  const [targetTime, setTargetTime] = useState('09:00');
  const [inactivityDays, setInactivityDays] = useState(7);
  const [responseContent, setResponseContent] = useState('');
  const [selectedClusterId, setSelectedClusterId] = useState<string>('none');

  // Consulta Gatilhos
  const { data: triggers = [], isLoading } = useQuery<TriggerItem[]>({
    queryKey: ['triggers'],
    queryFn: async () => {
      const res = await api.get<{ data: TriggerItem[] }>('/triggers');
      return res.data.data;
    },
  });

  // Consulta Clusters
  const { data: contactsData } = useQuery<{ clusters: Cluster[] }>({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await api.get<{ data: { clusters: Cluster[] } }>('/contacts');
      return res.data.data;
    },
  });
  const clusters = contactsData?.clusters || [];

  // Mutação: Criar Gatilho
  const createTriggerMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/triggers', {
        name,
        active: true,
        type: triggerType,
        targetTime: triggerType === 'RECURRING_DAILY' ? targetTime : undefined,
        inactivityDays: triggerType === 'INACTIVITY_DAYS' ? Number(inactivityDays) : undefined,
        responses: [{ content: responseContent, type: 'TEXTO' }],
        clusterIds: selectedClusterId !== 'none' ? [Number(selectedClusterId)] : [],
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Gatilho programado com sucesso!');
      setIsCreateModalOpen(false);
      setName('');
      setResponseContent('');
      queryClient.invalidateQueries({ queryKey: ['triggers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao criar gatilho.');
    },
  });

  // Mutação: Alternar Estado Ativo
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await api.patch(`/triggers/${id}/active`, { active });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.toastMessage || 'Status do gatilho atualizado!');
      queryClient.invalidateQueries({ queryKey: ['triggers'] });
    },
  });

  // Mutação: Excluir Gatilho
  const deleteTriggerMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/triggers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Gatilho excluído!');
      queryClient.invalidateQueries({ queryKey: ['triggers'] });
    },
  });

  return (
    <>
      <PageHead title="Gatilhos (Disparos Automáticos) | WhatsEasy" />
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-6xl mx-auto overflow-y-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Gatilhos & Remarketing</h2>
            <p className="text-muted-foreground text-sm">
              Dispare mensagens automáticas em horários programados ou para contatos inativos.
            </p>
          </div>

          {/* Modal Criar Gatilho */}
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <Plus className="h-4 w-4" />
                Novo Gatilho
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Novo Gatilho Programado</DialogTitle>
                <DialogDescription>
                  Configure a condição de horário ou inatividade para disparo automático.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nome do Gatilho</label>
                  <Input
                    placeholder="Ex: Mensagem de Bom Dia / Remarketing 7 Dias"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tipo de Condição</label>
                  <Select value={triggerType} onValueChange={(val: any) => setTriggerType(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECURRING_DAILY">Horário Fixo Diário</SelectItem>
                      <SelectItem value="INACTIVITY_DAYS">Inatividade (Dias sem interação)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {triggerType === 'RECURRING_DAILY' ? (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Horário de Disparo (HH:mm)</label>
                    <Input
                      type="time"
                      value={targetTime}
                      onChange={(e) => setTargetTime(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Quantidade de Dias de Inatividade</label>
                    <Input
                      type="number"
                      min={1}
                      value={inactivityDays}
                      onChange={(e) => setInactivityDays(Number(e.target.value))}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Público / Cluster Alvo</label>
                  <Select value={selectedClusterId} onValueChange={setSelectedClusterId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os contatos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todos os contatos</SelectItem>
                      {clusters.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          Apenas {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Mensagem de Disparo</label>
                  <Textarea
                    rows={4}
                    placeholder="Ex: Olá {nome}! Passando para lembrar sobre..."
                    value={responseContent}
                    onChange={(e) => setResponseContent(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use <strong>{'{nome}'}</strong> para personalizar com o nome do cliente.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => createTriggerMutation.mutate()}
                  disabled={createTriggerMutation.isPending || !name || !responseContent}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {createTriggerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Programar Gatilho
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Listagem de Gatilhos */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : triggers.length === 0 ? (
          <Card className="border-dashed p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg">Nenhum gatilho programado</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
              Crie gatilhos para enviar mensagens automáticas em horários específicos ou fazer remarketing de clientes inativos.
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              Criar Primeiro Gatilho
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {triggers.map((trigger) => (
              <Card key={trigger.id} className="border-border/80 shadow-sm relative overflow-hidden">
                <div
                  className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                    trigger.active ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                <CardHeader className="pb-3 pl-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Zap className={`h-4 w-4 ${trigger.active ? 'text-emerald-500' : 'text-slate-400'}`} />
                      {trigger.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={trigger.active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: trigger.id, active: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTriggerMutation.mutate(trigger.id)}
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    Disparado {trigger.usageCount || 0} vez(es)
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pl-6 text-sm">
                  {/* Condição do Gatilho */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Condição de Disparo:
                    </span>
                    <div>
                      {trigger.condition?.type === 'INACTIVITY_DAYS' ? (
                        <Badge variant="outline" className="gap-1.5 text-xs bg-amber-500/10 border-amber-500/30 text-amber-500">
                          <Hourglass className="h-3 w-3" />
                          Após {trigger.condition.inactivityDays} dias sem interação
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1.5 text-xs bg-blue-500/10 border-blue-500/30 text-blue-500">
                          <Clock className="h-3 w-3" />
                          Diariamente às {trigger.condition?.targetTime || '09:00'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Mensagens de Resposta */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Mensagem Programada:
                    </span>
                    {trigger.responses.map((r, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground/90 border font-sans line-clamp-3"
                      >
                        {r.content}
                      </div>
                    ))}
                  </div>

                  {/* Público */}
                  <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground border-t">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-emerald-500" />
                      Público: {trigger.clusters.length > 0 ? trigger.clusters.map((c) => c.name).join(', ') : 'Todos os contatos'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default withUser(TriggersPage);
