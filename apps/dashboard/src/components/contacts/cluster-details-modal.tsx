import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tag,
  Users,
  Send,
  Trash2,
  TrendingUp,
  Sparkles,
  MessageSquare,
  AlertCircle,
  BarChart2,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useSendClusterMessage, useDeleteCluster, useClusterContacts, useCustomFields } from "@/hooks/use-api-queries";
import { formatPhoneNumber } from "@/lib/utils";
import { toast } from "sonner";

interface ClusterDetailsModalProps {
  cluster: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allClusters: any[];
  totalContactsCount: number;
  contactsInCluster?: any[];
}

export function ClusterDetailsModal({
  cluster,
  open,
  onOpenChange,
  allClusters,
  totalContactsCount,
  contactsInCluster: initialContacts = [],
}: ClusterDetailsModalProps) {
  const sendClusterMessageMutation = useSendClusterMessage();
  const deleteClusterMutation = useDeleteCluster();
  const { data: clusterDetails } = useClusterContacts(cluster?.id);
  const { data: dynamicFields = [] } = useCustomFields();

  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");

  if (!cluster) return null;

  const contactsInCluster = clusterDetails?.contacts || initialContacts;
  const clusterContactsCount = clusterDetails?.totalContacts ?? contactsInCluster.length ?? cluster.totalContacts ?? 0;
  
  // Cálculo percentual sobre a base total real do WhatsApp
  const realTotal = Math.max(totalContactsCount, clusterContactsCount);
  const percentageOfTotal = realTotal > 0
    ? Number(((clusterContactsCount / realTotal) * 100).toFixed(1))
    : 0;

  // Dados para o gráfico de proporção
  const pieData = [
    { name: cluster.name, value: clusterContactsCount },
    {
      name: "Outros Contatos",
      value: Math.max(0, realTotal - clusterContactsCount),
    },
  ];

  const handleInsertTag = (tag: string) => {
    setBroadcastMessage((prev) => `${prev} {${tag}} `);
  };

  const handleSendBroadcast = () => {
    if (!broadcastMessage.trim()) {
      toast.error("Digite a mensagem antes de disparar!");
      return;
    }

    sendClusterMessageMutation.mutate(
      {
        clusterId: cluster.id,
        message: broadcastMessage.trim(),
      },
      {
        onSuccess: () => {
          setIsSendMessageOpen(false);
          setBroadcastMessage("");
        },
      }
    );
  };

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir o cluster "${cluster.name}"?`)) {
      deleteClusterMutation.mutate(cluster.id, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <>
      <Dialog open={open && !isSendMessageOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto bg-card border-border/80 shadow-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    {cluster.name}
                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                      ID #{cluster.id}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {cluster.description || "Segmento de contatos para automações e disparos."}
                  </DialogDescription>
                </div>
              </div>

              <Button
                size="sm"
                variant="default"
                onClick={() => setIsSendMessageOpen(true)}
                className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30"
              >
                <Send className="h-3.5 w-3.5" /> Enviar Mensagem
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* KPIs do Cluster */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-muted/20 border-border/50 p-3.5">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" /> Total no Cluster
                </span>
                <span className="text-xl font-black text-foreground block mt-1">
                  {clusterContactsCount}
                </span>
                <span className="text-[10px] text-muted-foreground">contatos associados</span>
              </Card>

              <Card className="bg-muted/20 border-border/50 p-3.5">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-purple-400" /> % da Base Total
                </span>
                <span className="text-xl font-black text-purple-400 block mt-1">
                  {percentageOfTotal}%
                </span>
                <span className="text-[10px] text-muted-foreground">de {totalContactsCount} contatos</span>
              </Card>

              <Card className="bg-muted/20 border-border/50 p-3.5">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5 text-blue-400" /> Posição no Ranking
                </span>
                <span className="text-xl font-black text-blue-400 block mt-1">
                  #{allClusters.findIndex((c) => c.id === cluster.id) + 1}
                </span>
                <span className="text-[10px] text-muted-foreground">entre {allClusters.length} clusters</span>
              </Card>
            </div>

            {/* Gráfico Comparativo & Distribuição */}
            <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xs">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Distribuição da Base
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Este cluster representa <strong>{percentageOfTotal}%</strong> de todos os contatos cadastrados no seu WhatsApp.
                </p>
              </div>

              <div className="h-[140px] w-[140px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill="#a855f7" />
                      <Cell fill="rgba(255,255,255,0.1)" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#09090b",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Lista dos Contatos Pertencentes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Contatos neste Cluster ({contactsInCluster.length})
                </Label>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-border/40 divide-y divide-border/30 bg-background/50">
                {contactsInCluster.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs">
                    Nenhum contato adicionado a este cluster ainda.
                  </div>
                ) : (
                  contactsInCluster.slice(0, 30).map((c: any) => (
                    <div
                      key={c.id}
                      className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                          {c.name ? c.name.charAt(0).toUpperCase() : "C"}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground block">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{formatPhoneNumber(c.phone)}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {c.lastInteraction
                          ? new Date(c.lastInteraction).toLocaleDateString("pt-BR")
                          : "Sem interação"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between items-center pt-2 border-t border-border/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir Cluster
            </Button>

            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Específico para Enviar Mensagem para o Cluster */}
      <Dialog open={isSendMessageOpen} onOpenChange={setIsSendMessageOpen}>
        <DialogContent className="sm:max-w-[540px] bg-card border-border/80 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Disparo em Lote para o Cluster
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Envie uma mensagem personalizada para todos os contatos do cluster{" "}
                  <strong className="text-purple-400">"{cluster.name}"</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl bg-muted/20 border border-border/50 flex items-center justify-between">
              <span className="text-muted-foreground">Destinatários estimados:</span>
              <Badge className="bg-primary/10 text-primary border-primary/30 font-bold">
                {clusterContactsCount} contatos
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-semibold">Texto da Mensagem</Label>

              {/* Seletor de Tags do DB Dinâmico */}
              <div className="flex items-center gap-1 flex-wrap text-[10px] p-2 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-muted-foreground font-medium mr-1">Tags disponíveis:</span>
                <button
                  type="button"
                  onClick={() => handleInsertTag("primeiro_nome")}
                  className="px-1.5 py-0.5 rounded bg-muted hover:bg-primary/20 text-primary font-mono transition-colors border border-border/50"
                  title="Primeiro nome do contato"
                >
                  {"{primeiro_nome}"}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag("nome")}
                  className="px-1.5 py-0.5 rounded bg-muted hover:bg-primary/20 text-primary font-mono transition-colors border border-border/50"
                  title="Nome completo do contato"
                >
                  {"{nome}"}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag("telefone")}
                  className="px-1.5 py-0.5 rounded bg-muted hover:bg-primary/20 text-primary font-mono transition-colors border border-border/50"
                  title="Telefone formatado do contato"
                >
                  {"{telefone}"}
                </button>

                {/* Tags do Banco Dinâmico */}
                {dynamicFields.map((df: any) => (
                  <button
                    key={df.id}
                    type="button"
                    onClick={() => handleInsertTag(df.key)}
                    className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono transition-colors border border-emerald-500/30"
                    title={`Atributo: ${df.label}`}
                  >
                    {`{${df.key}}`}
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="Olá {primeiro_nome}, temos uma novidade especial para você..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={5}
                className="text-xs bg-background leading-relaxed resize-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                As variáveis serão substituídas pelos dados de cada contato no momento do envio
                através do motor de automação do WhatsEasy.
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSendMessageOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSendBroadcast}
              disabled={sendClusterMessageMutation.isPending || !broadcastMessage.trim()}
              className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-md shadow-emerald-900/30"
            >
              <Send className="h-3.5 w-3.5" />
              {sendClusterMessageMutation.isPending ? "Disparando..." : "Confirmar e Disparar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
