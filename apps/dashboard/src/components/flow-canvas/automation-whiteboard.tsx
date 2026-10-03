import React, { useState, useRef, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Smartphone,
  Zap,
  Clock,
  Sparkles,
  ArrowUpRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  StickyNote,
  Send,
  Trash2,
  Move,
  Users,
} from "lucide-react";

interface WhiteboardProps {
  reactives: any[];
  clusters: any[];
  triggers: any[];
  connectionStatus: string;
}

interface CanvasNode {
  id: string;
  title: string;
  type: "whatsapp" | "reactives" | "clusters" | "triggers" | "actions" | "note";
  x: number;
  y: number;
  width: number;
  color: string;
  noteText?: string;
}

interface CanvasEdge {
  from: string;
  to: string;
  label?: string;
  color?: string;
}

const INITIAL_NODES: CanvasNode[] = [
  {
    id: "whatsapp",
    title: "1. Sessão WhatsApp",
    type: "whatsapp",
    x: 50,
    y: 160,
    width: 250,
    color: "#10b981", // Emerald
  },
  {
    id: "reactives",
    title: "2. Motor de Reativos",
    type: "reactives",
    x: 360,
    y: 50,
    width: 260,
    color: "#3b82f6", // Blue
  },
  {
    id: "clusters",
    title: "3. Clusters de Contatos",
    type: "clusters",
    x: 360,
    y: 330,
    width: 260,
    color: "#a855f7", // Purple
  },
  {
    id: "triggers",
    title: "4. Gatilhos & Horários",
    type: "triggers",
    x: 690,
    y: 50,
    width: 260,
    color: "#f59e0b", // Amber
  },
  {
    id: "actions",
    title: "5. Motor de Disparos",
    type: "actions",
    x: 690,
    y: 330,
    width: 260,
    color: "#ec4899", // Pink
  },
];

const INITIAL_EDGES: CanvasEdge[] = [
  { from: "whatsapp", to: "reactives", label: "Msg Recebida", color: "#3b82f6" },
  { from: "whatsapp", to: "clusters", label: "Sincroniza", color: "#a855f7" },
  { from: "reactives", to: "clusters", label: "Atribui Cluster", color: "#a855f7" },
  { from: "clusters", to: "triggers", label: "Público Alvo", color: "#f59e0b" },
  { from: "triggers", to: "actions", label: "Agendamento", color: "#ec4899" },
  { from: "reactives", to: "actions", label: "Resposta Direta", color: "#10b981" },
];

export function AutomationWhiteboard({
  reactives,
  clusters,
  triggers,
  connectionStatus,
}: WhiteboardProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Estados de Pan e Zoom estilo Obsidian Canvas
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Nós e Conexões
  const [nodes, setNodes] = useState<CanvasNode[]>(INITIAL_NODES);
  const [edges] = useState<CanvasEdge[]>(INITIAL_EDGES);

  // Arraste de Nó Individual
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Adicionar Nota Adesiva
  const handleAddStickyNote = () => {
    const newNoteId = `note-${Date.now()}`;
    const newNote: CanvasNode = {
      id: newNoteId,
      title: "Nota Estratégica",
      type: "note",
      x: 360 + Math.floor(Math.random() * 80) - 40,
      y: 190 + Math.floor(Math.random() * 60) - 30,
      width: 230,
      color: "#eab308", // Yellow
      noteText: "Ex: Enviar cupom VIP para clientes inativos após 7 dias.",
    };
    setNodes((prev) => [...prev, newNote]);
  };

  const handleUpdateNoteText = (id: string, text: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, noteText: text } : n))
    );
  };

  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleResetLayout = () => {
    setNodes(INITIAL_NODES);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.45, Number((z - 0.15).toFixed(2))));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Panning do Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (draggingNodeId) return;
    // Se clicou no fundo do canvas, inicia pan
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === "svg") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Drag de Nó
  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation();
    setDraggingNodeId(node.id);
    setDragOffset({
      x: e.clientX / zoom - node.x,
      y: e.clientY / zoom - node.y,
    });
  };

  // Mouse Move Global
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      } else if (draggingNodeId) {
        const nextX = Math.round(e.clientX / zoom - dragOffset.x);
        const nextY = Math.round(e.clientY / zoom - dragOffset.y);
        setNodes((prev) =>
          prev.map((n) => (n.id === draggingNodeId ? { ...n, x: nextX, y: nextY } : n))
        );
      }
    },
    [isPanning, panStart, draggingNodeId, zoom, dragOffset]
  );

  // Mouse Up Global
  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((z) => Math.min(1.8, Math.max(0.45, Number((z + delta).toFixed(2)))));
  };

  // Map de nós para cálculo rápido de coordenadas dos conectores
  const nodeMap = useMemo(() => {
    const map = new Map<string, CanvasNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  return (
    <div className="space-y-3">
      {/* Barra de Ferramentas Estilo Obsidian Canvas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-card/70 border border-border/60 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              Obsidian Canvas Automations
              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono">
                Interativo
              </Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Arraste cartões para reposicionar ou navegue livremente pelo canvas infinito.
            </p>
          </div>
        </div>

        {/* Toolbar de Controles */}
        <div className="flex items-center gap-1.5 bg-background/60 p-1 rounded-xl border border-border/50 shadow-inner">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomOut}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Diminuir Zoom (-)"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11px] font-mono px-1.5 text-foreground font-semibold min-w-[42px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomIn}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Aumentar Zoom (+)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <div className="w-[1px] h-4 bg-border/60 mx-0.5" />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetZoom}
            className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
            title="Centralizar Visualização"
          >
            <RotateCcw className="h-3 w-3" /> 100%
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAddStickyNote}
            className="h-7 px-2 text-[11px] gap-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            title="Adicionar Nota Adesiva"
          >
            <StickyNote className="h-3.5 w-3.5" /> + Nota
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetLayout}
            className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
            title="Organizar Nós"
          >
            Resetar
          </Button>
        </div>
      </div>

      {/* ÁREA DO CANVAS INFINITO */}
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-[520px] rounded-2xl border border-border/70 relative overflow-hidden select-none transition-colors ${
          isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          backgroundColor: "#07090e",
          backgroundImage:
            "radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Camada Transformável com Zoom e Pan */}
        <div
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG para Conectores / Setas Estilo Obsidian Canvas */}
          <svg className="absolute inset-0 w-[2400px] h-[1800px] overflow-visible pointer-events-none">
            <defs>
              <marker
                id="arrowhead-blue"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
              </marker>
              <marker
                id="arrowhead-purple"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#a855f7" />
              </marker>
              <marker
                id="arrowhead-amber"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
              </marker>
              <marker
                id="arrowhead-pink"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#ec4899" />
              </marker>
              <marker
                id="arrowhead-emerald"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
              </marker>
            </defs>

            {/* Linhas Bézier Dinâmicas */}
            {edges.map((edge) => {
              const fromNode = nodeMap.get(edge.from);
              const toNode = nodeMap.get(edge.to);
              if (!fromNode || !toNode) return null;

              // Coordenadas das âncoras (saída à direita do nó 'from', entrada à esquerda do nó 'to')
              const startX = fromNode.x + fromNode.width;
              const startY = fromNode.y + 70; // Meio do card
              const endX = toNode.x;
              const endY = toNode.y + 70;

              const dx = Math.abs(endX - startX) * 0.45;
              const pathD = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

              const markerId =
                edge.color === "#3b82f6"
                  ? "arrowhead-blue"
                  : edge.color === "#a855f7"
                  ? "arrowhead-purple"
                  : edge.color === "#f59e0b"
                  ? "arrowhead-amber"
                  : edge.color === "#ec4899"
                  ? "arrowhead-pink"
                  : "arrowhead-emerald";

              return (
                <g key={`${edge.from}-${edge.to}`}>
                  {/* Linha de brilho suave */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={edge.color || "#64748b"}
                    strokeWidth="4"
                    strokeOpacity="0.2"
                  />
                  {/* Linha principal com ponta de seta */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={edge.color || "#64748b"}
                    strokeWidth="1.8"
                    strokeDasharray="4 3"
                    markerEnd={`url(#${markerId})`}
                  />
                  {/* Tag com rótulo no meio do conector */}
                  {edge.label && (
                    <text
                      x={(startX + endX) / 2}
                      y={(startY + endY) / 2 - 8}
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="select-none"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Nós Flutuantes (Cartões 2D) */}
          {nodes.map((node) => {
            const isDragging = draggingNodeId === node.id;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                className={`absolute pointer-events-auto transition-shadow ${
                  isDragging ? "shadow-2xl z-50 cursor-grabbing" : "shadow-lg z-10 cursor-grab"
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                }}
              >
                {/* NOTA ADESIVA ESTILO OBSIDIAN */}
                {node.type === "note" ? (
                  <Card className="p-3 bg-amber-500/10 border-amber-500/30 backdrop-blur-md rounded-xl space-y-2 relative group hover:border-amber-500/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                        <StickyNote className="h-3.5 w-3.5" /> {node.title}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteNode(node.id)}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <textarea
                      value={node.noteText || ""}
                      onChange={(e) => handleUpdateNoteText(node.id, e.target.value)}
                      placeholder="Escreva sua anotação estratégica..."
                      className="w-full text-[11px] bg-transparent border-0 focus:ring-0 resize-none text-foreground leading-relaxed p-0 outline-none"
                      rows={3}
                    />
                  </Card>
                ) : (
                  /* CARTÕES PRINCIPAIS DO ECOSSISTEMA */
                  <Card
                    className="bg-card/90 backdrop-blur-xl border border-border/80 rounded-2xl overflow-hidden shadow-xl hover:border-primary/50 transition-all"
                    style={{
                      borderTop: `3px solid ${node.color}`,
                    }}
                  >
                    {/* Cabeçalho do Card */}
                    <div className="p-3 px-3.5 flex items-center justify-between border-b border-border/40 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Move className="h-3 w-3 text-muted-foreground opacity-60" />
                        <span className="text-xs font-bold text-foreground">{node.title}</span>
                      </div>
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: node.color }}
                      />
                    </div>

                    {/* Conteúdo Dinâmico por Tipo */}
                    <div className="p-3.5 space-y-3 text-xs">
                      {node.type === "whatsapp" && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Smartphone className="h-3.5 w-3.5 text-emerald-400" /> Conexão
                            </span>
                            <Badge
                              variant={connectionStatus === "CONNECTED" ? "default" : "secondary"}
                              className="text-[10px] h-5"
                            >
                              {connectionStatus === "CONNECTED" ? "Online" : "Desconectado"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Sessão ativa com Baileys recebendo eventos em tempo real.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate("/status")}
                            className="w-full h-7 text-[11px] gap-1 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
                          >
                            Ver Sessão <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {node.type === "reactives" && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Zap className="h-3.5 w-3.5 text-blue-400" /> Ativos
                            </span>
                            <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                              {reactives.filter((r) => r.active).length} de {reactives.length}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {reactives.slice(0, 2).map((r) => (
                              <div
                                key={r.id}
                                className="p-1.5 rounded bg-muted/40 text-[10px] flex items-center justify-between"
                              >
                                <span className="font-medium truncate max-w-[140px]">{r.name}</span>
                                <span className="text-blue-400 font-mono">{r.usageCount || 0}x</span>
                              </div>
                            ))}
                            {reactives.length === 0 && (
                              <span className="text-[10px] text-muted-foreground italic">Nenhum reativo criado.</span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate("/reactives")}
                            className="w-full h-7 text-[11px] gap-1 text-blue-400 border-blue-500/20 hover:bg-blue-500/10"
                          >
                            Gerenciar Reativos <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {node.type === "clusters" && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-purple-400" /> Segmentações
                            </span>
                            <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/30">
                              {clusters.length} grupos
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {clusters.slice(0, 2).map((c) => (
                              <div
                                key={c.id}
                                className="p-1.5 rounded bg-muted/40 text-[10px] flex items-center justify-between"
                              >
                                <span className="font-medium truncate max-w-[140px]">{c.name}</span>
                                <span className="text-purple-400 font-mono">{c.totalContacts || 0} contatos</span>
                              </div>
                            ))}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate("/contacts")}
                            className="w-full h-7 text-[11px] gap-1 text-purple-400 border-purple-500/20 hover:bg-purple-500/10"
                          >
                            Ver Contatos & Clusters <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {node.type === "triggers" && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-amber-400" /> Agendados
                            </span>
                            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                              {triggers.filter((t) => t.active).length} ativos
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Disparos por tempo, inatividade ou público segmentado.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate("/triggers")}
                            className="w-full h-7 text-[11px] gap-1 text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
                          >
                            Gerenciar Gatilhos <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {node.type === "actions" && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Send className="h-3.5 w-3.5 text-pink-400" /> Disparador
                            </span>
                            <Badge variant="outline" className="text-[10px] text-pink-400 border-pink-500/30">
                              ActionEngine
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Motor unificado com interpolação de tags dinâmicas do banco.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate("/banco-dados")}
                            className="w-full h-7 text-[11px] gap-1 text-pink-400 border-pink-500/20 hover:bg-pink-500/10"
                          >
                            Banco Dinâmico <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            );
          })}
        </div>

        {/* Rodapé Flutuante com Dica de Navegação */}
        <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2 shadow-sm pointer-events-none">
          <Sparkles className="h-3 w-3 text-purple-400" />
          <span>Segure e arraste o fundo para mover o canvas • Use o scroll para dar zoom</span>
        </div>
      </div>
    </div>
  );
}
