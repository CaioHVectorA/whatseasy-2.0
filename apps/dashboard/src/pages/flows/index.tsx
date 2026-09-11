import React, { useState, useEffect } from "react";
import PageHead from "@/components/shared/page-head";
import { useNavigate } from "react-router-dom";
import {
  useFlows,
  useSaveFlow,
  useDeleteFlow,
} from "@/hooks/use-api-queries";
import {
  GitFork,
  Plus,
  Save,
  Play,
  Trash2,
  MessageSquare,
  ListTree,
  Clock,
  Tag,
  UserCheck,
  ArrowRight,
  Move,
  Settings2,
  Sparkles,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface NodeData {
  id: string;
  type: "trigger" | "message" | "menu" | "delay" | "action";
  title: string;
  x: number;
  y: number;
  config: Record<string, any>;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
}

const DEFAULT_NODES: NodeData[] = [
  {
    id: "node_1",
    type: "trigger",
    title: "Gatilho de Início",
    x: 80,
    y: 120,
    config: {
      keywords: "olá, menu, ajuda, iniciar",
      matchType: "CONTAINS",
    },
  },
  {
    id: "node_2",
    type: "message",
    title: "Mensagem de Boas-Vindas",
    x: 380,
    y: 120,
    config: {
      content: "Olá {primeiro_nome}! Seja muito bem-vindo à nossa empresa.",
    },
  },
  {
    id: "node_3",
    type: "menu",
    title: "Menu de Opções",
    x: 680,
    y: 120,
    config: {
      title: "Como posso te ajudar hoje?",
      options: [
        { key: "1", label: "Preços e Planos" },
        { key: "2", label: "Falar com Suporte" },
        { key: "3", label: "Outros Assuntos" },
      ],
      footer: "Digite o número da opção desejada:",
    },
  },
];

const DEFAULT_EDGES: EdgeData[] = [
  { id: "edge_1_2", source: "node_1", target: "node_2" },
  { id: "edge_2_3", source: "node_2", target: "node_3" },
];

export default function FlowsPage() {
  const navigate = useNavigate();
  const { data: flows = [], isLoading } = useFlows();
  const saveFlowMutation = useSaveFlow();
  const deleteFlowMutation = useDeleteFlow();

  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  const [flowName, setFlowName] = useState("Fluxo de Atendimento Principal");
  const [isActive, setIsActive] = useState(true);
  const [nodes, setNodes] = useState<NodeData[]>(DEFAULT_NODES);
  const [edges, setEdges] = useState<EdgeData[]>(DEFAULT_EDGES);

  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Carrega o primeiro fluxo se disponível
  useEffect(() => {
    if (flows.length > 0 && selectedFlowId === null) {
      const f = flows[0];
      setSelectedFlowId(f.id);
      setFlowName(f.name);
      setIsActive(f.active);
      if (Array.isArray(f.nodes) && f.nodes.length > 0) {
        setNodes(f.nodes);
      }
      if (Array.isArray(f.edges)) {
        setEdges(f.edges);
      }
    }
  }, [flows]);

  const handleSelectFlow = (f: any) => {
    setSelectedFlowId(f.id);
    setFlowName(f.name);
    setIsActive(f.active);
    setNodes(f.nodes?.length > 0 ? f.nodes : DEFAULT_NODES);
    setEdges(f.edges || []);
  };

  const handleCreateNewFlow = () => {
    setSelectedFlowId(null);
    setFlowName("Novo Fluxo de Conversa");
    setIsActive(true);
    setNodes(DEFAULT_NODES);
    setEdges(DEFAULT_EDGES);
    toast.info("Criando novo fluxo no Canvas");
  };

  const handleAddNode = (type: NodeData["type"]) => {
    const newId = `node_${Date.now()}`;
    const xPos = 120 + nodes.length * 80;
    const yPos = 160 + (nodes.length % 3) * 60;

    let title = "Nova Etapa";
    let config: Record<string, any> = {};

    if (type === "message") {
      title = "Enviar Mensagem";
      config = { content: "Olá {primeiro_nome}, aqui está a informação solicitada." };
    } else if (type === "menu") {
      title = "Menu com Opções";
      config = {
        title: "Selecione uma opção:",
        options: [
          { key: "1", label: "Opção 1" },
          { key: "2", label: "Opção 2" },
        ],
        footer: "Digite o número desejado:",
      };
    } else if (type === "delay") {
      title = "Aguardar Tempo";
      config = { seconds: 5 };
    } else if (type === "action") {
      title = "Ação sobre Contato";
      config = { actionType: "ADD_CLUSTER", clusterId: 1 };
    }

    const newNode: NodeData = {
      id: newId,
      type,
      title,
      x: xPos,
      y: yPos,
      config,
    };

    setNodes([...nodes, newNode]);

    // Conecta automaticamente com o nó anterior se houver
    if (nodes.length > 0) {
      const prevNode = nodes[nodes.length - 1];
      setEdges([...edges, { id: `edge_${prevNode.id}_${newId}`, source: prevNode.id, target: newId }]);
    }

    toast.success(`Nó "${title}" adicionado ao Canvas!`);
  };

  const handleOpenEditNode = (node: NodeData) => {
    setSelectedNode({ ...node });
    setEditDialogOpen(true);
  };

  const handleSaveNodeConfig = () => {
    if (!selectedNode) return;
    setNodes(nodes.map((n) => (n.id === selectedNode.id ? selectedNode : n)));
    setEditDialogOpen(false);
    toast.success("Configuração do nó atualizada!");
  };

  const handleDeleteNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
    setEdges(edges.filter((e) => e.source !== id && e.target !== id));
    setEditDialogOpen(false);
    toast.success("Nó removido do Canvas.");
  };

  const handleSaveFlow = () => {
    const triggerNode = nodes.find((n) => n.type === "trigger");
    const keywords = triggerNode?.config?.keywords
      ? triggerNode.config.keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
      : ["olá", "menu"];

    saveFlowMutation.mutate({
      id: selectedFlowId || undefined,
      name: flowName,
      active: isActive,
      nodes,
      edges,
      triggerKeywords: keywords,
      triggerType: triggerNode?.config?.matchType || "CONTAINS",
    });
  };

  return (
    <>
      <PageHead title="Construtor Visual Canvas | WhatsEasy 2.0" />

      <div className="flex flex-col h-[calc(100vh-5rem)] max-w-[1700px] mx-auto p-4 md:p-6 gap-4">
        {/* Top Control Bar */}
        <div className="bg-card border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <GitFork className="h-5 w-5" />
            </div>
            <div className="flex-1 md:w-80">
              <Input
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="font-bold text-base h-9 bg-muted/40 border-muted"
                placeholder="Nome do Fluxo"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-xs font-medium text-muted-foreground">
                {isActive ? "Ativo" : "Pausado"}
              </span>
            </div>
          </div>

          {/* Ações e Dropdown de Nós */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            <Select onValueChange={(val) => handleAddNode(val as any)}>
              <SelectTrigger className="w-40 h-9 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                <SelectValue placeholder="Adicionar Nó" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="message">Mensagem de Texto</SelectItem>
                <SelectItem value="menu">Menu de Opções</SelectItem>
                <SelectItem value="delay">Pausa / Delay</SelectItem>
                <SelectItem value="action">Ação sobre Contato</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNewFlow}
              className="h-9 text-xs"
            >
              Novo Fluxo
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/playground")}
              className="h-9 text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            >
              <Play className="h-3.5 w-3.5 fill-emerald-400" />
              Testar no Playground
            </Button>

            <Button
              size="sm"
              onClick={handleSaveFlow}
              disabled={saveFlowMutation.isPending}
              className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md"
            >
              <Save className="h-3.5 w-3.5" />
              {saveFlowMutation.isPending ? "Salvando..." : "Salvar Fluxo"}
            </Button>
          </div>
        </div>

        {/* Layout do Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
          {/* Menu Lateral de Fluxos Existentes */}
          <div className="lg:col-span-3 bg-card border rounded-xl p-3 flex flex-col gap-2 overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Meus Fluxos ({flows.length})
              </span>
            </div>

            <div className="space-y-1.5">
              {flows.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Nenhum fluxo cadastrado ainda.
                </div>
              ) : (
                flows.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleSelectFlow(f)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                      selectedFlowId === f.id
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-semibold"
                        : "bg-muted/30 border-transparent hover:bg-muted/60 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <GitFork className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Área Interativa do Canvas */}
          <div className="lg:col-span-9 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative shadow-inner flex flex-col">
            {/* Grid Pattern estilo Blueprint */}
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />

            {/* Canvas Viewport com os nós e conexões */}
            <div className="flex-1 p-8 overflow-auto relative z-10">
              {/* Barra Informativa superior do Canvas */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <Badge variant="outline" className="bg-slate-900/90 text-slate-300 border-slate-800 text-xs">
                  Canvas Interativo ({nodes.length} nós)
                </Badge>
                <span className="text-[11px] text-slate-500">Clique em qualquer nó para editar propriedades</span>
              </div>

              {/* Conexões (Edges) Visuais */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {edges.map((edge) => {
                  const sourceNode = nodes.find((n) => n.id === edge.source);
                  const targetNode = nodes.find((n) => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;

                  const x1 = sourceNode.x + 240;
                  const y1 = sourceNode.y + 70;
                  const x2 = targetNode.x;
                  const y2 = targetNode.y + 70;
                  const dx = (x2 - x1) / 2;

                  return (
                    <g key={edge.id}>
                      <path
                        d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                        className="animate-pulse"
                      />
                      <circle cx={x2} cy={y2} r="4" fill="#10b981" />
                    </g>
                  );
                })}
              </svg>

              {/* Nós do Canvas */}
              <div className="relative min-w-[1000px] min-h-[500px]">
                {nodes.map((node) => {
                  let badgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                  let Icon = MessageSquare;

                  if (node.type === "trigger") {
                    badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                    Icon = Sparkles;
                  } else if (node.type === "menu") {
                    badgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                    Icon = ListTree;
                  } else if (node.type === "delay") {
                    badgeColor = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
                    Icon = Clock;
                  } else if (node.type === "action") {
                    badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                    Icon = UserCheck;
                  }

                  return (
                    <div
                      key={node.id}
                      style={{
                        position: "absolute",
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                        width: "260px",
                      }}
                      onClick={() => handleOpenEditNode(node)}
                      className="cursor-pointer group select-none transition-transform hover:-translate-y-1 z-10"
                    >
                      <Card className="bg-slate-900/95 border-slate-800 hover:border-emerald-500/60 shadow-xl backdrop-blur-md rounded-xl overflow-hidden">
                        <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md border ${badgeColor}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-xs text-slate-100 truncate">
                              {node.title}
                            </span>
                          </div>
                          <Settings2 className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                        </div>

                        <CardContent className="p-3 text-xs text-slate-300 space-y-2">
                          {node.type === "trigger" && (
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase">Palavras-chave:</span>
                              <div className="font-mono text-emerald-400 text-xs mt-0.5 truncate">
                                {node.config?.keywords || "olá, menu"}
                              </div>
                            </div>
                          )}

                          {node.type === "message" && (
                            <div>
                              <p className="line-clamp-2 text-slate-400 italic">
                                "{node.config?.content || "Sem texto configurado."}"
                              </p>
                            </div>
                          )}

                          {node.type === "menu" && (
                            <div className="space-y-1">
                              <span className="text-[10px] text-purple-400 font-semibold">
                                {node.config?.title || "Menu:"}
                              </span>
                              {(node.config?.options || []).map((opt: any, i: number) => (
                                <div
                                  key={i}
                                  className="bg-slate-950/80 px-2 py-1 rounded text-[11px] flex items-center justify-between border border-slate-800"
                                >
                                  <span className="font-bold text-emerald-400">{opt.key || i + 1}</span>
                                  <span className="truncate max-w-[160px]">{opt.label}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {node.type === "delay" && (
                            <div className="flex items-center gap-2 text-cyan-400 font-medium">
                              <Clock className="h-3.5 w-3.5" />
                              <span>Aguardar {node.config?.seconds || 5} segundos</span>
                            </div>
                          )}

                          {node.type === "action" && (
                            <div className="flex items-center gap-2 text-emerald-400 font-medium">
                              <Tag className="h-3.5 w-3.5" />
                              <span>
                                {node.config?.actionType === "ADD_CLUSTER"
                                  ? `Adicionar ao Cluster #${node.config?.clusterId}`
                                  : "Atualizar Campo"}
                              </span>
                            </div>
                          )}
                        </CardContent>

                        {/* Ponto de saída visual */}
                        <div className="absolute right-[-6px] top-[50%] w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full shadow" />
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Dialog de Edição de Nó */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-emerald-500" />
              Editar {selectedNode?.title}
            </DialogTitle>
            <DialogDescription>
              Configure o comportamento, conteúdo e variáveis desta etapa do fluxo.
            </DialogDescription>
          </DialogHeader>

          {selectedNode && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Título do Nó:</label>
                <Input
                  value={selectedNode.title}
                  onChange={(e) => setSelectedNode({ ...selectedNode, title: e.target.value })}
                  className="mt-1"
                />
              </div>

              {selectedNode.type === "trigger" && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Palavras-chave (separadas por vírgula):
                  </label>
                  <Input
                    value={selectedNode.config?.keywords || ""}
                    onChange={(e) =>
                      setSelectedNode({
                        ...selectedNode,
                        config: { ...selectedNode.config, keywords: e.target.value },
                      })
                    }
                    className="mt-1"
                    placeholder="olá, menu, ajuda, preço"
                  />
                </div>
              )}

              {selectedNode.type === "message" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Texto da Mensagem:
                  </label>
                  <Textarea
                    rows={4}
                    value={selectedNode.config?.content || ""}
                    onChange={(e) =>
                      setSelectedNode({
                        ...selectedNode,
                        config: { ...selectedNode.config, content: e.target.value },
                      })
                    }
                    placeholder="Ex: Olá {nome}! Como posso ajudar?"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">Tags rápidas:</span>
                    {["{nome}", "{primeiro_nome}", "{telefone}", "{empresa}"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setSelectedNode({
                            ...selectedNode,
                            config: {
                              ...selectedNode.config,
                              content: (selectedNode.config?.content || "") + " " + tag,
                            },
                          })
                        }
                        className="text-[11px] bg-muted hover:bg-muted/80 px-1.5 py-0.5 rounded text-emerald-400 font-mono"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.type === "menu" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Título do Menu:</label>
                    <Input
                      value={selectedNode.config?.title || ""}
                      onChange={(e) =>
                        setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, title: e.target.value },
                        })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Opções do Menu:</label>
                    <div className="space-y-2 mt-1">
                      {(selectedNode.config?.options || []).map((opt: any, idx: number) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Input
                            value={opt.key}
                            onChange={(e) => {
                              const newOpts = [...selectedNode.config.options];
                              newOpts[idx].key = e.target.value;
                              setSelectedNode({
                                ...selectedNode,
                                config: { ...selectedNode.config, options: newOpts },
                              });
                            }}
                            className="w-16 font-mono text-center"
                          />
                          <Input
                            value={opt.label}
                            onChange={(e) => {
                              const newOpts = [...selectedNode.config.options];
                              newOpts[idx].label = e.target.value;
                              setSelectedNode({
                                ...selectedNode,
                                config: { ...selectedNode.config, options: newOpts },
                              });
                            }}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedNode.type === "delay" && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Tempo de Pausa (segundos):</label>
                  <Input
                    type="number"
                    value={selectedNode.config?.seconds || 5}
                    onChange={(e) =>
                      setSelectedNode({
                        ...selectedNode,
                        config: { ...selectedNode.config, seconds: Number(e.target.value) },
                      })
                    }
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => selectedNode && handleDeleteNode(selectedNode.id)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir Nó
            </Button>
            <Button type="button" onClick={handleSaveNodeConfig}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
