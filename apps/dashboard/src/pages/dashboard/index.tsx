import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import {
  Smartphone,
  Zap,
  Users,
  Clock,
  MessageSquare,
  TrendingUp,
  Activity,
  Tag,
  ArrowRight,
  Sparkles,
  ScrollText,
} from "lucide-react";
import { useDashboardData } from "@/hooks/use-api-queries";
import { AutomationWhiteboard } from "@/components/flow-canvas/automation-whiteboard";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: dashboard } = useDashboardData();

  const connection = dashboard?.connection;
  const metrics = dashboard?.metrics;
  const activityChart = dashboard?.activityChart || [];
  const clusterDistribution = dashboard?.clusterDistribution || [];
  const topReactives = dashboard?.topReactives || [];
  const recentLogs = dashboard?.recentLogs || [];

  const isConnected = connection?.isConnected;
  const status = connection?.status || "DISCONNECTED";

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      {/* Banner Principal com Status do WhatsApp */}
      <div className="relative p-6 md:p-8 rounded-3xl bg-gradient-to-r from-card/90 via-card/60 to-card/90 border border-border/60 shadow-lg overflow-hidden backdrop-blur-xl">
        <div
          className={`absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isConnected ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-0.5 font-semibold gap-1.5 ${
                  isConnected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                {isConnected ? "WhatsApp Conectado" : "WhatsApp Desconectado"}
              </Badge>
              {connection?.phone && (
                <span className="text-xs text-muted-foreground font-mono">
                  ({connection.phone})
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Painel de Automações
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Monitore respostas inteligentes, segmentação e disparos automáticos.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant={isConnected ? "outline" : "default"}
              onClick={() => navigate("/status")}
              className={`h-9 px-4 text-xs font-semibold gap-2 ${
                !isConnected
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
                  : "border-border/60 hover:bg-muted/40 text-foreground"
              }`}
            >
              <Smartphone className="h-4 w-4 text-emerald-400" />
              {isConnected ? "Gerenciar Conexão" : "Conectar WhatsApp"}
            </Button>

            <Button
              onClick={() => navigate("/reativos")}
              className="h-9 px-4 text-xs font-semibold gap-2 shadow-sm"
            >
              <Zap className="h-4 w-4 text-blue-400" /> Novo Reativo
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards em Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Contatos */}
        <Card
          onClick={() => navigate("/contatos")}
          className="bg-card/70 backdrop-blur-md border-border/60 hover:border-primary/40 transition-all cursor-pointer p-5 shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Contatos na Base</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-foreground">
              {metrics?.totalContacts || 0}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-1 flex items-center gap-1">
              <Tag className="h-3 w-3 text-purple-400" /> {metrics?.totalClusters || 0} clusters organizados
            </span>
          </div>
        </Card>

        {/* Reativos Ativos */}
        <Card
          onClick={() => navigate("/reativos")}
          className="bg-card/70 backdrop-blur-md border-border/60 hover:border-blue-500/40 transition-all cursor-pointer p-5 shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Reativos Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-blue-400">
              {metrics?.activeReactives || 0}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-1">
              de {metrics?.totalReactives || 0} configurados
            </span>
          </div>
        </Card>

        {/* Gatilhos Agendados */}
        <Card
          onClick={() => navigate("/gatilhos")}
          className="bg-card/70 backdrop-blur-md border-border/60 hover:border-amber-500/40 transition-all cursor-pointer p-5 shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Gatilhos Agendados</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-400">
              {metrics?.activeTriggers || 0}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-1">
              de {metrics?.totalTriggers || 0} criados
            </span>
          </div>
        </Card>

        {/* Mensagens Enviadas */}
        <Card
          onClick={() => navigate("/logs")}
          className="bg-card/70 backdrop-blur-md border-border/60 hover:border-emerald-500/40 transition-all cursor-pointer p-5 shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Mensagens Disparadas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-400">
              {metrics?.totalSentMessages || 0}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-400" /> Disparos automáticos
            </span>
          </div>
        </Card>
      </div>

      {/* Seções Organizadas em Abas para Respiração Visual */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <TabsList className="bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="overview" className="text-xs gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Visão Geral & Gráficos
            </TabsTrigger>
            <TabsTrigger value="whiteboard" className="text-xs gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Mapa Mental
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs gap-1.5">
              <ScrollText className="h-3.5 w-3.5 text-emerald-400" /> Atividades Recentes
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ABA 1: VISÃO GERAL & GRÁFICOS */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gráfico Temporal */}
            <Card className="lg:col-span-8 bg-card/60 backdrop-blur-md border-border/60 shadow-sm">
              <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between border-b border-border/30">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" /> Volume de Atividade por Horário
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Mensagens enviadas vs automações executadas ao longo do dia.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
                  Live
                </Badge>
              </CardHeader>
              <CardContent className="p-5 pt-6">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="msgGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="autoGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" stroke="#71717a" fontSize={11} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#09090b",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="messages"
                        name="Mensagens"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#msgGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="automations"
                        name="Automações"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#autoGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Distribuição por Cluster */}
            <Card className="lg:col-span-4 bg-card/60 backdrop-blur-md border-border/60 shadow-sm flex flex-col justify-between">
              <CardHeader className="p-5 pb-2 border-b border-border/30">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Tag className="h-4 w-4 text-purple-400" /> Distribuição por Cluster
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Proporção de contatos segmentados.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-6 flex-1 flex flex-col justify-center">
                {clusterDistribution.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-xs">
                    Nenhum cluster criado ainda.
                  </div>
                ) : (
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={clusterDistribution} layout="vertical" margin={{ left: 15, right: 15 }}>
                        <XAxis type="number" stroke="#71717a" fontSize={10} hide />
                        <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={11} width={80} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#09090b",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="contacts" fill="#a855f7" radius={[0, 6, 6, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Reativos */}
          <Card className="bg-card/60 backdrop-blur-md border-border/60 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-border/30 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" /> Top Reativos Mais Acionados
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Respostas inteligentes com maior volume de execução.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/reativos")}
                className="h-7 text-xs text-primary gap-1"
              >
                Gerenciar <ArrowRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {topReactives.length === 0 ? (
                <div className="col-span-full py-8 text-center text-muted-foreground text-xs">
                  Nenhum reativo configurado ainda.
                </div>
              ) : (
                topReactives.map((r: any, idx: number) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-xl bg-muted/25 border border-border/40 flex items-center justify-between hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-semibold text-foreground block">{r.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {r.active ? "Ativo no WhatsApp" : "Pausado"}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono text-blue-400 bg-blue-500/10 border-blue-500/20">
                      {r.usageCount || 0} disparos
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: MAPA MENTAL / WHITEBOARD */}
        <TabsContent value="whiteboard" className="mt-0">
          <AutomationWhiteboard
            reactives={topReactives}
            clusters={clusterDistribution}
            triggers={[]}
            connectionStatus={status}
          />
        </TabsContent>

        {/* ABA 3: ÚLTIMAS ATIVIDADES */}
        <TabsContent value="logs" className="mt-0">
          <Card className="bg-card/60 backdrop-blur-md border-border/60 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-border/30 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" /> Atividades Recentes
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Últimos eventos capturados pelo WhatsEasy em tempo real.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/logs")}
                className="h-7 text-xs text-primary gap-1"
              >
                Ver histórico completo <ArrowRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-5 space-y-2.5">
              {recentLogs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  Nenhum evento registrado recentemente.
                </div>
              ) : (
                recentLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-muted/20 border border-border/30 flex items-center justify-between text-xs hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 truncate max-w-[80%]">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-400"
                            : log.status === "ERROR"
                            ? "bg-rose-400"
                            : "bg-blue-400"
                        }`}
                      />
                      <span className="text-foreground font-medium truncate">{log.description}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
