import React, { useState, useRef, useEffect } from "react";
import PageHead from "@/components/shared/page-head";
import {
  usePlaygroundSession,
  useSimulateMessage,
  useUpdatePlaygroundContact,
  useResetPlaygroundSession,
} from "@/hooks/use-api-queries";
import {
  Smartphone,
  Send,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  CheckCheck,
  Tag,
  FolderTree,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PlaygroundPage() {
  const { data: session, isLoading } = usePlaygroundSession();
  const simulateMutation = useSimulateMessage();
  const updateContactMutation = useUpdatePlaygroundContact();
  const resetMutation = useResetPlaygroundSession();

  const [inputMessage, setInputMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.contact) {
      setContactName(session.contact.name || "");
      setContactPhone(session.contact.phone || "");
    }
  }, [session?.contact]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text || simulateMutation.isPending) return;

    setInputMessage("");
    simulateMutation.mutate({ text });
  };

  const handleQuickSend = (text: string) => {
    if (simulateMutation.isPending) return;
    simulateMutation.mutate({ text });
  };

  const handleSaveContact = () => {
    updateContactMutation.mutate({
      name: contactName,
      phone: contactPhone,
    });
  };

  const handleAddCustomField = () => {
    if (!newFieldKey.trim()) return;
    const updated = {
      ...(session?.contact?.customFields || {}),
      [newFieldKey.trim().toLowerCase()]: newFieldValue.trim(),
    };
    updateContactMutation.mutate({
      customFields: updated,
    });
    setNewFieldKey("");
    setNewFieldValue("");
  };

  const messages = session?.messages || [];
  const contact = session?.contact || {
    name: "Lead de Teste",
    phone: "5511999998888",
    customFields: {},
    clusterIds: [],
  };
  const conversationState = session?.conversationState;
  const executedActions = session?.executedActions || [];

  return (
    <>
      <PageHead title="Playground de Simulação | WhatsEasy 2.0" />

      <div className="flex flex-col gap-6 p-6 md:p-8 max-w-[1600px] mx-auto h-[calc(100vh-5rem)]">
        {/* Header Superior */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Playground do Agente</h1>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
                100% Desacoplado do WhatsApp
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Simule mensagens de leads, teste menus interativos, verifique tags dinâmicas e valide a máquina de estados sem celular conectado.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reiniciar Conversa
            </Button>
          </div>
        </div>

        {/* Grid Principal: Chat Simulator na esquerda, Inspetor na direita */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          {/* ================= COLUNA ESQUERDA: SIMULADOR WHATSAPP ================= */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Top Bar do Chat WhatsApp */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-white shadow-md">
                    {contact.name?.slice(0, 2).toUpperCase() || "LD"}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    {contact.name}
                    <span className="text-xs font-normal text-slate-400 font-mono">({contact.phone})</span>
                  </h2>
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online no Simulador
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-slate-800 text-xs gap-1">
                  <Smartphone className="h-3 w-3 text-emerald-400" />
                  Mock WhatsApp
                </Badge>
              </div>
            </div>

            {/* Área de Mensagens com Papel de Parede Sutil */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
              {/* Aviso inicial */}
              <div className="flex justify-center my-2">
                <div className="bg-slate-900/80 border border-slate-800 text-slate-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>As mensagens acionam os Reativos e a Máquina de Estados em tempo real.</span>
                </div>
              </div>

              {messages.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 gap-2">
                  <Bot className="h-10 w-10 text-slate-600 animate-bounce" />
                  <p className="text-sm font-medium">Nenhuma mensagem ainda.</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Envie uma mensagem abaixo ou use os atalhos rápidos para iniciar o teste da automação.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isContact = msg.sender === "contact";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isContact ? "items-end" : "items-start"} transition-all`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-md text-sm whitespace-pre-wrap ${
                          isContact
                            ? "bg-emerald-600 text-white rounded-tr-none"
                            : "bg-slate-800 border border-slate-700/70 text-slate-100 rounded-tl-none"
                        }`}
                      >
                        {msg.media && (
                          <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                            {msg.media.type === "image" && (
                              <img
                                src={msg.media.url}
                                alt="Mídia enviada"
                                className="max-h-48 w-full object-cover"
                              />
                            )}
                          </div>
                        )}
                        <p className="leading-relaxed">{msg.text}</p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isContact ? "text-emerald-200" : "text-slate-400"
                          }`}
                        >
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isContact && <CheckCheck className="h-3 w-3 text-emerald-300" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Sugestões de Mensagens Rápidas */}
            <div className="bg-slate-900/90 border-t border-slate-800/80 px-4 py-2 flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-slate-500 shrink-0 font-medium">Testes rápidos:</span>
              {["olá", "menu", "preço", "1", "2", "suporte"].map((quick) => (
                <button
                  key={quick}
                  onClick={() => handleQuickSend(quick)}
                  disabled={simulateMutation.isPending}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md transition-colors shrink-0 border border-slate-700/50"
                >
                  "{quick}"
                </button>
              ))}
            </div>

            {/* Input de Envio de Mensagem */}
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Digite a mensagem como se fosse o cliente..."
                className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-emerald-500/50"
                disabled={simulateMutation.isPending}
              />
              <Button
                type="submit"
                disabled={!inputMessage.trim() || simulateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* ================= COLUNA DIREITA: INSPETOR DE ESTADO & VARIÁVEIS ================= */}
          <div className="lg:col-span-5 xl:col-span-5 flex flex-col h-full bg-card border rounded-2xl overflow-hidden shadow-md">
            <div className="p-4 border-b bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Activity className="h-4 w-4 text-emerald-500" />
                Inspetor de Automação & Variáveis
              </div>
              <Badge variant="outline" className="text-xs">
                {conversationState?.waitingInput ? "Aguardando Resposta" : "Pronto / Ocioso"}
              </Badge>
            </div>

            <Tabs defaultValue="state" className="flex-1 flex flex-col min-h-0">
              <div className="px-4 pt-3 border-b bg-muted/20">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="state" className="text-xs gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Estado
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="text-xs gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Contato
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="text-xs gap-1.5">
                    <Terminal className="h-3.5 w-3.5" />
                    Ações ({executedActions.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: ESTADO DA CONVERSAÇÃO (STATE MACHINE) */}
              <TabsContent value="state" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
                {conversationState && conversationState.waitingInput ? (
                  <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Sessão Ativa no Motor
                        </CardTitle>
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          Passo #{conversationState.stepNumber}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        O contato está em um fluxo aguardando resposta para avançar.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Tipo de Validação:</span>
                        <div className="font-mono text-xs font-semibold text-slate-200 mt-0.5">
                          {conversationState.validationType}
                        </div>
                      </div>

                      {conversationState.validOptions && conversationState.validOptions.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground">Opções de Menu Detectadas:</span>
                          <div className="mt-1 space-y-1">
                            {conversationState.validOptions.map((opt, i) => (
                              <div
                                key={i}
                                className="text-xs bg-slate-900/80 border border-slate-800 p-2 rounded flex items-center justify-between"
                              >
                                <span className="font-mono text-emerald-400 font-bold">
                                  {opt.key || i + 1}
                                </span>
                                <span className="text-slate-300">{opt.label}</span>
                                {opt.targetClusterId && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Cluster #{opt.targetClusterId}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {conversationState.targetFieldKey && (
                        <div>
                          <span className="text-xs text-muted-foreground">Salvando resposta no campo:</span>
                          <Badge variant="secondary" className="font-mono ml-2 text-xs">
                            {conversationState.targetFieldKey}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="p-6 border border-dashed rounded-xl text-center text-muted-foreground space-y-2">
                    <Info className="h-8 w-8 mx-auto text-slate-500" />
                    <p className="text-sm font-medium">Nenhum fluxo em espera no momento.</p>
                    <p className="text-xs">
                      Envie uma mensagem que acione um Reativo com Menu ou Pergunta para ver o estado conversacional mudar dinamicamente.
                    </p>
                  </div>
                )}

                {/* Variáveis Injetadas */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Tag className="h-4 w-4 text-emerald-500" />
                      Variáveis Disponíveis para Templates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted p-2 rounded">
                        <span className="text-muted-foreground font-mono">{"{nome}"}:</span>
                        <div className="font-medium truncate">{contact.name}</div>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <span className="text-muted-foreground font-mono">{"{primeiro_nome}"}:</span>
                        <div className="font-medium truncate">{contact.name?.split(" ")[0]}</div>
                      </div>
                      <div className="bg-muted p-2 rounded col-span-2">
                        <span className="text-muted-foreground font-mono">{"{telefone}"}:</span>
                        <div className="font-medium">{contact.phone}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 2: CONTATO SIMULADO & CAMPOS CUSTOMIZADOS */}
              <TabsContent value="contact" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Nome do Lead:</label>
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Telefone:</label>
                    <Input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleSaveContact}
                    disabled={updateContactMutation.isPending}
                    className="w-full text-xs h-8"
                  >
                    Salvar Dados Básicos
                  </Button>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Campos Customizados Dinâmicos
                    </h3>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {Object.entries(contact.customFields || {}).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nenhum campo preenchido.</p>
                    ) : (
                      Object.entries(contact.customFields).map(([k, v]) => (
                        <div
                          key={k}
                          className="bg-muted/60 p-2 rounded-md flex items-center justify-between text-xs"
                        >
                          <span className="font-mono font-medium text-emerald-500">{`{${k}}`}</span>
                          <span className="font-semibold text-slate-200">{String(v)}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Adicionar campo customizado manualmente */}
                  <div className="bg-muted/30 p-3 rounded-lg border space-y-2">
                    <span className="text-xs font-medium">Injetar Novo Campo:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Chave (ex: empresa)"
                        value={newFieldKey}
                        onChange={(e) => setNewFieldKey(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="Valor"
                        value={newFieldValue}
                        onChange={(e) => setNewFieldValue(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAddCustomField}
                      className="w-full h-8 text-xs"
                    >
                      Adicionar ao Lead
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: AÇÕES EXECUTADAS & AUDITORIA */}
              <TabsContent value="actions" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
                {executedActions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Nenhuma ação disparada ainda.
                  </div>
                ) : (
                  executedActions.map((act, i) => (
                    <div key={i} className="p-2.5 bg-muted/40 border rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {act.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(act.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="font-medium text-slate-200">{act.description}</p>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}
