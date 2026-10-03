import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageSquare,
  Clock,
  Tag,
  Plus,
  Trash2,
  Sparkles,
  Play,
  Database,
  Layers,
  SendHorizontal,
  Bot,
} from "lucide-react";

export interface FlowStep {
  id: string;
  type: "SEND_MESSAGE" | "WAIT" | "ADD_CLUSTER" | "REMOVE_CLUSTER" | "UPDATE_FIELD";
  content?: string;
  delaySeconds?: number;
  clusterId?: number;
  fieldKey?: string;
  fieldValue?: string;
}

interface BlockBuilderProps {
  steps: FlowStep[];
  onChange: (steps: FlowStep[]) => void;
  clusters: Array<{ id: number; name: string }>;
  customFields?: Array<{ id: number; key: string; label: string }>;
}

export function BlockBuilder({ steps, onChange, clusters, customFields = [] }: BlockBuilderProps) {
  const [, setSimulating] = useState(false);
  const [simMessages, setSimMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([]);
  const [testInput, setTestInput] = useState("olá");

  const addStep = (type: FlowStep["type"]) => {
    const newStep: FlowStep = {
      id: Math.random().toString(36).substring(7),
      type,
      content: type === "SEND_MESSAGE" ? "Olá {primeiro_nome}! Como posso te ajudar?" : "",
      delaySeconds: type === "WAIT" ? 3 : 0,
      clusterId: clusters[0]?.id,
      fieldKey: customFields[0]?.key || "status",
      fieldValue: "ativo",
    };
    onChange([...steps, newStep]);
  };

  const updateStep = (index: number, patch: Partial<FlowStep>) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...patch };
    onChange(updated);
  };

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  const insertVariable = (index: number, tag: string) => {
    const current = steps[index].content || "";
    updateStep(index, { content: `${current} {${tag}}` });
  };

  const runSimulation = () => {
    setSimulating(true);
    setSimMessages([{ sender: "user", text: testInput }]);

    let delayAcc = 600;
    steps.forEach((st) => {
      if (st.type === "WAIT") {
        delayAcc += (st.delaySeconds || 1) * 800;
      } else if (st.type === "SEND_MESSAGE" && st.content) {
        const text = st.content
          .replace(/{nome}/gi, "Caio Silva")
          .replace(/{primeiro_nome}/gi, "Caio")
          .replace(/{telefone}/gi, "5521999998888")
          .replace(/{empresa}/gi, "Tech Corp");

        setTimeout(() => {
          setSimMessages((prev) => [...prev, { sender: "bot", text }]);
        }, delayAcc);
        delayAcc += 800;
      }
    });
  };

  const availableVariables = [
    { key: "primeiro_nome", label: "Primeiro Nome" },
    { key: "nome", label: "Nome Completo" },
    { key: "telefone", label: "Telefone" },
    ...customFields.map((f) => ({ key: f.key, label: f.label })),
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Coluna Principal: Construtor em Blocos */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Sequência de Ações em Blocos
            </h4>
            <p className="text-xs text-muted-foreground">
              Configure o que acontece passo a passo após o disparo do reativo.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => addStep("SEND_MESSAGE")} className="h-8 text-xs gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-blue-500" /> Mensagem
            </Button>
            <Button size="sm" variant="outline" onClick={() => addStep("WAIT")} className="h-8 text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" /> Aguardar
            </Button>
            <Button size="sm" variant="outline" onClick={() => addStep("ADD_CLUSTER")} className="h-8 text-xs gap-1.5">
              <Tag className="h-3.5 w-3.5 text-emerald-500" /> Cluster
            </Button>
            <Button size="sm" variant="outline" onClick={() => addStep("UPDATE_FIELD")} className="h-8 text-xs gap-1.5">
              <Database className="h-3.5 w-3.5 text-purple-500" /> Dado
            </Button>
          </div>
        </div>

        {steps.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border/60 bg-muted/20 space-y-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Nenhum bloco de ação configurado</p>
              <p className="text-xs text-muted-foreground">Adicione uma mensagem ou ação acima para criar o fluxo.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-border/60">
            {steps.map((step, idx) => (
              <div key={step.id || idx} className="relative flex items-start gap-4">
                {/* Indicador do Nó Conector */}
                <div className="w-8 h-8 rounded-full bg-background border-2 border-primary/60 flex items-center justify-center text-xs font-bold text-primary shadow-sm z-10 shrink-0">
                  {idx + 1}
                </div>

                {/* Card do Bloco */}
                <Card className="flex-1 bg-card/60 backdrop-blur-sm border-border/60 hover:border-primary/40 transition-colors shadow-sm">
                  <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between border-b border-border/30 bg-muted/10">
                    <div className="flex items-center gap-2">
                      {step.type === "SEND_MESSAGE" && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 gap-1 font-medium text-xs">
                          <MessageSquare className="h-3 w-3" /> Enviar Mensagem
                        </Badge>
                      )}
                      {step.type === "WAIT" && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1 font-medium text-xs">
                          <Clock className="h-3 w-3" /> Aguardar Intervalo
                        </Badge>
                      )}
                      {step.type === "ADD_CLUSTER" && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 font-medium text-xs">
                          <Tag className="h-3 w-3" /> Adicionar ao Cluster
                        </Badge>
                      )}
                      {step.type === "REMOVE_CLUSTER" && (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/30 gap-1 font-medium text-xs">
                          <Tag className="h-3 w-3" /> Remover do Cluster
                        </Badge>
                      )}
                      {step.type === "UPDATE_FIELD" && (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30 gap-1 font-medium text-xs">
                          <Database className="h-3 w-3" /> Salvar Dado Dinâmico
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeStep(idx)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3">
                    {step.type === "SEND_MESSAGE" && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Digite o texto da mensagem..."
                          value={step.content || ""}
                          onChange={(e) => updateStep(idx, { content: e.target.value })}
                          rows={3}
                          className="text-xs resize-none bg-background/50 font-normal leading-relaxed"
                        />
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-amber-400" /> Variáveis dinâmicas:
                          </span>
                          {availableVariables.map((v) => (
                            <button
                              key={v.key}
                              type="button"
                              onClick={() => insertVariable(idx, v.key)}
                              className="px-2 py-0.5 rounded-md bg-secondary/80 hover:bg-primary/10 text-[11px] text-secondary-foreground border border-border/40 hover:border-primary/30 transition-all font-mono"
                            >
                              &#123;{v.key}&#125;
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {step.type === "WAIT" && (
                      <div className="flex items-center gap-3">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Tempo de espera:</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={3600}
                            value={step.delaySeconds || 3}
                            onChange={(e) => updateStep(idx, { delaySeconds: Number(e.target.value) })}
                            className="w-24 h-8 text-xs bg-background/50"
                          />
                          <span className="text-xs text-muted-foreground">segundos</span>
                        </div>
                      </div>
                    )}

                    {(step.type === "ADD_CLUSTER" || step.type === "REMOVE_CLUSTER") && (
                      <div className="flex items-center gap-3">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Selecionar Cluster:</Label>
                        <Select
                          value={String(step.clusterId || "")}
                          onValueChange={(val) => updateStep(idx, { clusterId: Number(val) })}
                        >
                          <SelectTrigger className="w-full h-8 text-xs bg-background/50">
                            <SelectValue placeholder="Escolha um cluster..." />
                          </SelectTrigger>
                          <SelectContent>
                            {clusters.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {step.type === "UPDATE_FIELD" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Chave do Atributo</Label>
                          <Input
                            placeholder="ex: empresa, status, plano"
                            value={step.fieldKey || ""}
                            onChange={(e) => updateStep(idx, { fieldKey: e.target.value })}
                            className="h-8 text-xs bg-background/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Valor a Atribuir</Label>
                          <Input
                            placeholder="ex: Premium, Sim, {cidade}"
                            value={step.fieldValue || ""}
                            onChange={(e) => updateStep(idx, { fieldValue: e.target.value })}
                            className="h-8 text-xs bg-background/50"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coluna Direita: Simulador de WhatsApp ao Vivo */}
      <div className="lg:col-span-5">
        <Card className="bg-slate-950 border-border/60 overflow-hidden shadow-lg h-full flex flex-col">
          <CardHeader className="py-3 px-4 bg-emerald-950/40 border-b border-emerald-900/30 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-semibold text-emerald-100">Simulador de Fluxo</CardTitle>
                <CardDescription className="text-[10px] text-emerald-300/70">Prévia interativa de WhatsApp</CardDescription>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={runSimulation} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1">
              <Play className="h-3 w-3" /> Testar
            </Button>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4 min-h-[300px]">
            {/* Mensagens do Chat */}
            <div className="space-y-2.5 overflow-y-auto max-h-[260px] pr-1">
              {simMessages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <Bot className="h-8 w-8 mx-auto opacity-30 text-emerald-400" />
                  <p className="text-xs">Clique em "Testar" para disparar a simulação do fluxo acima.</p>
                </div>
              ) : (
                simMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                        msg.sender === "user"
                          ? "bg-emerald-700 text-white rounded-tr-none"
                          : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/50"
                      }`}
                    >
                      {msg.text}
                      <span className="block text-[9px] text-right mt-1 opacity-60">11:45</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input de Teste */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <Input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Simular mensagem do cliente..."
                className="h-8 text-xs bg-slate-900 border-slate-700 text-white"
                onKeyDown={(e) => e.key === "Enter" && runSimulation()}
              />
              <Button size="icon" onClick={runSimulation} className="h-8 w-8 bg-emerald-600 hover:bg-emerald-500 text-white shrink-0">
                <SendHorizontal className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
