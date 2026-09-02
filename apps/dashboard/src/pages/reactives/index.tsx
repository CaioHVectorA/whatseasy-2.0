import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  Plus,
  Search,
  MessageSquare,
  Tag,
  ArrowRight,
  Layers,
  Trash2,
  Edit,
  CheckCircle2,
  Bot,
  LayoutGrid,
  GitBranch,
} from "lucide-react";
import {
  useReactives,
  useSaveReactive,
  useToggleReactive,
  useDeleteReactive,
  useContacts,
  useCustomFields,
} from "@/hooks/use-api-queries";
import { BlockBuilder, FlowStep } from "@/components/flow-canvas/block-builder";
import { toast } from "sonner";

export default function ReactivesPage() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"DIRECT" | "FLOW">("DIRECT");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formMode, setFormMode] = useState<"SIMPLE" | "BLOCKS">("SIMPLE");
  const [name, setName] = useState("");
  const [textTriggerType, setTextTriggerType] = useState("CONTAINS");
  const [triggerText, setTriggerText] = useState("");
  const [responseContent, setResponseContent] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [selectedClusterIds, setSelectedClusterIds] = useState<number[]>([]);
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);

  const { data: reactives = [] } = useReactives();
  const { data: contactsData } = useContacts();
  const { data: customFields = [] } = useCustomFields();

  const clusters = contactsData?.clusters || [];

  const saveReactiveMutation = useSaveReactive();
  const toggleReactiveMutation = useToggleReactive();
  const deleteReactiveMutation = useDeleteReactive();

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setTextTriggerType("CONTAINS");
    setTriggerText("");
    setResponseContent("");
    setDelaySeconds(0);
    setSelectedClusterIds([]);
    setFlowSteps([
      {
        id: "step-1",
        type: "SEND_MESSAGE",
        content: "Olá {primeiro_nome}! Como posso te ajudar hoje?",
      },
    ]);
    setFormMode("SIMPLE");
    setModalOpen(true);
  };

  const handleOpenEdit = (r: any) => {
    setEditingId(r.id);
    setName(r.name || "");
    const firstTrigger = r.textTriggers?.[0];
    setTextTriggerType(firstTrigger?.type || "CONTAINS");
    setTriggerText(firstTrigger?.text || "");
    const firstResp = r.responses?.[0];
    setResponseContent(firstResp?.content || "");
    setDelaySeconds(r.delaySeconds || 0);
    setSelectedClusterIds(r.clusters ? r.clusters.map((c: any) => c.id) : []);

    if (r.actionConfig?.steps && Array.isArray(r.actionConfig.steps)) {
      setFlowSteps(r.actionConfig.steps);
      setFormMode("BLOCKS");
    } else {
      setFlowSteps([
        {
          id: "step-1",
          type: "SEND_MESSAGE",
          content: firstResp?.content || "",
        },
      ]);
      setFormMode("SIMPLE");
    }

    setModalOpen(true);
  };

  const handleSave = () => {
    if (!name || !triggerText) {
      toast.error("Preencha o nome e a palavra-chave de disparo.");
      return;
    }

    let finalResponses = [{ content: responseContent || "Olá!", type: "TEXTO" }];
    let finalActionConfig: any = null;

    if (formMode === "BLOCKS" && flowSteps.length > 0) {
      finalActionConfig = { steps: flowSteps };
      const messageStep = flowSteps.find((s) => s.type === "SEND_MESSAGE" && s.content);
      if (messageStep) {
        finalResponses = [{ content: messageStep.content || "", type: "TEXTO" }];
      }
    }

    saveReactiveMutation.mutate(
      {
        id: editingId || undefined,
        name,
        delaySeconds: Number(delaySeconds) || 0,
        textTriggers: [{ text: triggerText, type: textTriggerType }],
        responses: finalResponses,
        clusterIds: selectedClusterIds,
        actionConfig: finalActionConfig,
      },
      {
        onSuccess: () => {
          setModalOpen(false);
        },
      }
    );
  };

  const filteredReactives = reactives.filter((r) => {
    if (!search) return true;
    const matchName = r.name.toLowerCase().includes(search.toLowerCase());
    const matchTrigger = r.textTriggers?.some((t: any) =>
      t.text.toLowerCase().includes(search.toLowerCase())
    );
    return matchName || matchTrigger;
  });

  const totalUsages = reactives.reduce((acc, r) => acc + (r.usageCount || 0), 0);
  const activeCount = reactives.filter((r) => r.active).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header com Estatísticas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Zap className="h-6 w-6 text-blue-400" /> Reativos & Respostas Inteligentes
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure respostas automáticas instantâneas e fluxos conversacionais em blocos para WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternador de Modo de Visualização */}
          <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/40">
            <Button
              size="sm"
              variant={viewMode === "DIRECT" ? "secondary" : "ghost"}
              onClick={() => setViewMode("DIRECT")}
              className="h-7 text-xs rounded-lg px-2.5 gap-1.5 font-medium"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Painel Direto (I/O)
            </Button>
            <Button
              size="sm"
              variant={viewMode === "FLOW" ? "secondary" : "ghost"}
              onClick={() => setViewMode("FLOW")}
              className="h-7 text-xs rounded-lg px-2.5 gap-1.5 font-medium"
            >
              <GitBranch className="h-3.5 w-3.5" /> Visão em Fluxos
            </Button>
          </div>

          <Button size="sm" onClick={handleOpenCreate} className="h-8 text-xs gap-1.5 font-medium shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Criar Reativo
          </Button>
        </div>
      </div>

      {/* KPI Cards Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/60 backdrop-blur-md border-border/60 p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Reativos Criados</span>
            <span className="text-xl font-bold text-foreground block">{reactives.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
        </Card>

        <Card className="bg-card/60 backdrop-blur-md border-border/60 p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Ativos Agora</span>
            <span className="text-xl font-bold text-emerald-400 block">{activeCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </Card>

        <Card className="bg-card/60 backdrop-blur-md border-border/60 p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Total de Respostas Enviadas</span>
            <span className="text-xl font-bold text-foreground block">{totalUsages}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Filtrar por nome ou gatilho de texto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-8 text-xs bg-card/60 border-border/50"
        />
      </div>

      {/* LISTAGEM DE REATIVOS: MODO PAINEL DIRETO (INPUT ➔ OUTPUT) */}
      {viewMode === "DIRECT" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReactives.length === 0 ? (
            <div className="col-span-2 py-16 text-center border border-dashed border-border/60 rounded-2xl bg-muted/10 space-y-2">
              <Zap className="h-8 w-8 mx-auto opacity-30 text-blue-400" />
              <p className="text-sm font-medium text-foreground">Nenhum reativo encontrado</p>
              <p className="text-xs text-muted-foreground">Clique em "Criar Reativo" para configurar sua primeira resposta automática.</p>
            </div>
          ) : (
            filteredReactives.map((r) => {
              const firstTrigger = r.textTriggers?.[0];
              const firstResp = r.responses?.[0];
              const isBlockFlow = r.actionConfig?.steps && Array.isArray(r.actionConfig.steps);

              return (
                <Card
                  key={r.id}
                  className={`bg-card/60 backdrop-blur-md border-border/60 hover:border-blue-500/40 transition-all shadow-sm overflow-hidden flex flex-col justify-between ${
                    !r.active ? "opacity-60" : ""
                  }`}
                >
                  <CardHeader className="p-4 pb-3 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground">{r.name}</CardTitle>
                        <CardDescription className="text-[11px] text-muted-foreground">
                          {r.usageCount || 0} execuções registradas
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={r.active}
                        onCheckedChange={() => toggleReactiveMutation.mutate(r.id)}
                        disabled={toggleReactiveMutation.isPending}
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3.5 flex-1">
                    {/* Visualização Direta Input ➔ Output */}
                    <div className="space-y-2">
                      {/* INPUT */}
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-start gap-2.5">
                        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 shrink-0 font-medium">
                          QUANDO RECEBER
                        </Badge>
                        <div className="text-xs text-foreground font-mono truncate">
                          "{firstTrigger?.text || "qualquer mensagem"}"
                          <span className="text-[10px] text-muted-foreground ml-1.5 font-sans">
                            ({firstTrigger?.type || "CONTAINS"})
                          </span>
                        </div>
                      </div>

                      {/* OUTPUT */}
                      <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-2.5">
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0 font-medium">
                          RESPONDER COM
                        </Badge>
                        <div className="text-xs text-foreground line-clamp-2 leading-relaxed">
                          {isBlockFlow ? (
                            <span className="flex items-center gap-1.5 text-primary font-medium">
                              <Layers className="h-3.5 w-3.5" /> Sequência de {r.actionConfig.steps.length} blocos configurada
                            </span>
                          ) : (
                            firstResp?.content || "Sem mensagem configurada"
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Clusters Alvos */}
                    {r.clusters && r.clusters.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Tag className="h-3 w-3 text-purple-400" /> Segmentação:
                        </span>
                        {r.clusters.map((c: any) => (
                          <Badge key={c.id} variant="secondary" className="text-[10px] h-4 px-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>

                  <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {r.delaySeconds > 0 ? `Espera de ${r.delaySeconds}s antes de enviar` : "Disparo instantâneo"}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(r)}
                        className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                      >
                        <Edit className="h-3 w-3" /> Editar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteReactiveMutation.mutate(r.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* LISTAGEM DE REATIVOS: MODO CANVAS / FLUXOS DE BLOCOS */
        <div className="space-y-4">
          {filteredReactives.map((r) => (
            <Card key={r.id} className="bg-card/60 backdrop-blur-md border-border/60 p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{r.name}</h3>
                    <p className="text-xs text-muted-foreground">{r.usageCount || 0} execuções</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={r.active}
                    onCheckedChange={() => toggleReactiveMutation.mutate(r.id)}
                  />
                  <Button size="sm" variant="outline" onClick={() => handleOpenEdit(r)} className="h-8 text-xs gap-1.5">
                    <Edit className="h-3.5 w-3.5" /> Configurar Blocos
                  </Button>
                </div>
              </div>

              {/* Fluxo Visual em Blocos Horizontal */}
              <div className="pt-4 flex flex-wrap items-center gap-3 overflow-x-auto">
                {/* BLOCO 1: GATILHO */}
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1 min-w-[160px]">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">1. Gatilho</span>
                  <p className="font-mono text-foreground font-semibold">"{r.textTriggers?.[0]?.text || "qualquer"}"</p>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />

                {/* BLOCO 2: CONDIÇÃO / SEGMENTAÇÃO */}
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1 min-w-[160px]">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">2. Segmentação</span>
                  <p className="text-foreground">
                    {r.clusters && r.clusters.length > 0 ? `${r.clusters.length} cluster(s)` : "Todos os contatos"}
                  </p>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />

                {/* BLOCO 3: RESPOSTA / AÇÃO */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1 min-w-[200px] flex-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">3. Ação Final</span>
                  <p className="text-foreground line-clamp-1">
                    {r.actionConfig?.steps ? `${r.actionConfig.steps.length} blocos configurados` : r.responses?.[0]?.content}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal / Drawer do Construtor de Reativos e Blocos */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto bg-card border-border/80 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-400" />
              {editingId ? "Editar Reativo & Sequência" : "Novo Reativo Inteligente"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure o gatilho de entrada e a sequência de respostas ou ações em blocos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Dados Principais do Reativo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Nome da Automação</Label>
                <Input
                  placeholder="ex: FAQ Preço & Planos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>

              {/* Gatilho de Texto */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Regra de Correspondência</Label>
                <Select value={textTriggerType} onValueChange={setTextTriggerType}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTAINS" className="text-xs">Contém a palavra (Recomendado)</SelectItem>
                    <SelectItem value="EQUALS" className="text-xs">Exatamente igual</SelectItem>
                    <SelectItem value="STARTS_WITH" className="text-xs">Começa com</SelectItem>
                    <SelectItem value="ENDS_WITH" className="text-xs">Termina com</SelectItem>
                    <SelectItem value="REGEX" className="text-xs">Expressão Regular (Regex)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Palavra-chave / Frase de Entrada</Label>
                <Input
                  placeholder="ex: preco, valor, quanto custa"
                  value={triggerText}
                  onChange={(e) => setTriggerText(e.target.value)}
                  className="h-8 text-xs bg-background font-mono"
                />
              </div>
            </div>

            {/* Alternância entre Modo Simples e Modo Programação em Blocos */}
            <Tabs value={formMode} onValueChange={(v) => setFormMode(v as any)} className="w-full">
              <div className="flex items-center justify-between pb-2">
                <Label className="text-xs font-semibold text-foreground">Modo de Resposta</Label>
                <TabsList className="bg-muted/50 p-1">
                  <TabsTrigger value="SIMPLE" className="text-xs gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Resposta Direta
                  </TabsTrigger>
                  <TabsTrigger value="BLOCKS" className="text-xs gap-1.5 text-primary">
                    <Layers className="h-3.5 w-3.5" /> Programação em Blocos
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* MODO SIMPLES: RESPOSTA DIRETA */}
              <TabsContent value="SIMPLE" className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Texto da Mensagem</Label>
                  <Textarea
                    placeholder="Olá {primeiro_nome}! Nosso produto custa R$ 99."
                    value={responseContent}
                    onChange={(e) => setResponseContent(e.target.value)}
                    rows={4}
                    className="text-xs bg-background resize-none"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground">Tags rápidas:</span>
                    {["primeiro_nome", "nome", "telefone", ...customFields.map((f: any) => f.key)].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setResponseContent((prev) => `${prev} {${tag}}`)}
                        className="px-2 py-0.5 rounded-md bg-secondary/80 hover:bg-primary/10 text-[11px] font-mono text-secondary-foreground border border-border/40"
                      >
                        &#123;{tag}&#125;
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* MODO AVANÇADO: PROGRAMAÇÃO EM BLOCOS */}
              <TabsContent value="BLOCKS" className="pt-2">
                <BlockBuilder
                  steps={flowSteps}
                  onChange={setFlowSteps}
                  clusters={clusters}
                  customFields={customFields}
                />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="pt-3 border-t border-border/40 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveReactiveMutation.isPending || !name || !triggerText}
              className="h-8 text-xs font-medium shadow-sm"
            >
              Salvar Reativo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}