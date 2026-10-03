# 🚀 Sprints de Implementação & Release — WhatsEasy 2.0

> **Plano de Execução Sequencial focado em Alta Performance ("Blaze It Fast"), Arquitetura em Camadas, Canvas de Reativos Plug & Play, Identidade Visual Premium e Deploy Contínuo no Fly.io.**  
> *Cada sprint possui escopo fechado, critérios objetivos de aceite e procedimento de deploy/teste na VPS. Uma sprint só é concluída após o deploy, validação prática do usuário e feedback positivo.*

---

## 🧭 Visão Estratégica do Desenvolvimento

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FLUXO DE CADA SPRINT                              │
│                                                                             │
│  1. Implementação das Camadas ──► 2. Testes Automatizados (npm test)         │
│                                                   │                         │
│  4. Teste Prático & Feedback  ◄── 3. Deploy no Fly.io & Validação VPS        │
│               │                                                             │
│               ▼                                                             │
│     [Sprint Aprovada] ──► Avanço para a Próxima Sprint                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Resumo das Sprints

| Sprint | Foco Principal | Entregável Chave | Status |
|:---:|---|---|:---:|
| **Sprint 0** | **Fundação & Fly.io Setup** | Arquitetura limpa em camadas, persistência de sessões `/data/auths`, `fly.toml` 24/7, endpoint `/health` e Dockerfile de produção. | ✅ **Concluída & Validada E2E** |
| **Sprint 1** | **Identidade Visual "Superpower"** | Design System premium (estilo n8n/Linear/Raycast), nova paleta Deep Void + Emerald, nova tipografia, Redesign do Dashboard & Navegação. | ✅ **Concluída & Validada E2E** |
| **Sprint 2** | **WhatsApp Baileys & Observabilidade VPS** | Sessões blindadas, auto-reconexão com código 515, resolução de LIDs, heartbeat 45s, logs operacionais em tempo real e monitor de VPS. | ✅ **Concluída & Validada E2E** |
| **Sprint 3** | **Canvas Visual de Reativos (O Diferencial)** | Flow Builder interativo (arrasta-e-solta de nós, conexões bézier, painel de propriedades) + Modo Rápido Plug & Play (I/O instantâneo). | 🟡 **Atual (Iniciando)** |
| **Sprint 4** | **Ações Unificadas, Contatos & Clusters** | Telas de Contatos & Clusters com seleção múltipla, operações em massa, Banco de Dados Dinâmico (Custom Fields) e ActionEngine. | ⏳ Aguardando Sprint 3 |
| **Sprint 5** | **Gatilhos Temporais, Anti-Ban & Playground** | Motor de agendamento por horário/inatividade, proteção anti-ban (delays humanizados), simulador interativo de chat desacoplado. | ⏳ Aguardando Sprint 4 |
| **Sprint 6** | **Testes E2E, Hardening & Release MVP** | Suite completa de testes automatizados, verificação de carga na VPS, documentação de operação e deploy final do MVP em produção. | ⏳ Aguardando Sprint 5 |

---

## 🏗️ Sprint 0 — Arquitetura "Blaze It Fast" & Fundação Fly.io (Persistência & Deploy)

### 🎯 Objetivo
Estruturar a codebase em camadas desacopladas com alta velocidade de desenvolvimento, remover códigos legados obsoletos e resolver definitivamente o desafio de sessões persistentes do WhatsApp no Fly.io (garantindo que o container nunca durma e mantenha as credenciais seguras em volume montado).

### 📐 Separação em Camadas da Codebase
```text
src/
├── core/                         # REGRAS DE NEGÓCIO PURAS (Zero acoplamento com Fastify)
│   ├── engine/                   # ActionEngine unificado, formatador de variáveis
│   ├── state-machine/            # ConversationStateManager, validação de inputs e menus
│   ├── flows/                    # Interpretador e avaliador dos nós do Canvas
│   └── interfaces/               # IMessagingChannel, DTOs e contratos universais
│
├── infrastructure/               # ADAPTADORES & SERVIÇOS EXTERNOS
│   ├── whatsapp/                 # WhatsAppManager (Baileys v7), Signal Store e session paths
│   ├── database/                 # Prisma Client e consultas otimizadas
│   ├── websocket/                # Servidor WS nativo e broadcasting de eventos
│   ├── scheduler/                # SchedulerService (agendamentos por minuto)
│   ├── storage/                  # Gestor de caminhos de arquivos (AUTHS_DIR e Uploads)
│   └── logging/                  # LoggerService e Fastify/Pino structured logger
│
├── api/                          # CAMADA HTTP / FASTIFY
│   ├── controllers/              # Rotas REST limpas e enxutas
│   ├── middlewares/              # JWT verification, CORS, error handler centralizado
│   └── routes/                   # Registro e prefixos de rotas
│
└── config/                       # CONFIGURAÇÕES DE AMBIENTE
    ├── env.ts                    # Validação de variáveis de ambiente com fallback
    └── constants.ts              # Constantes operacionais
```

### ⚙️ Detalhamento Técnico & Mudanças
1. **Configuração do Fly.io (`fly.toml`)**:
   - Mudar `auto_stop_machines = 'off'` (evitar que a máquina pare e derrube o WebSocket do WhatsApp).
   - Configurar `min_machines_running = 1`.
   - Garantir montagem do volume: `source = 'data'`, `destination = '/data'`.
   - Ajustar porta interna: `internal_port = 3000`.
2. **Persistência de Sessões (`AUTHS_DIR`)**:
   - No `WhatsAppManager`, utilizar `process.env.AUTHS_DIR || path.join(process.cwd(), "auths")`.
   - No Fly.io, definir `AUTHS_DIR=/data/auths` para que as credenciais do Baileys sobrevivam a deploys e reinicializações.
3. **Novo `Dockerfile` Multi-Stage de Produção**:
   - Build enxuto, instalando apenas dependências de produção na imagem final.
   - Gerar Prisma Client e migrar automaticamente na inicialização via entrypoint.
   - Iniciar via `npx tsx index.ts` (ou script otimizado) em vez de `npm run dev`.
4. **Endpoint de Liveness & Inspeção (`/health`)**:
   - Retornar: `{ status: "ok", uptime, memory, activeSessions, dbConnected: true }`.
5. **Limpeza de Arquivos Mortos**:
   - Excluir arquivos legados não utilizados (`Client.ts`, `connect.ts`, `handleConection.ts`, `handleContacts.ts`, `handleMessage.ts`, `decodeJid.ts`).

### 🧪 Critérios de Aceite da Sprint 0
- [ ] A aplicação compila e os testes unitários existentes continuam passando (`npm test`).
- [ ] O `fly.toml` e o `Dockerfile` estão prontos para deploy no Fly.io com volume persistente.
- [ ] O endpoint `GET /health` responde com status 200 e dados de diagnóstico da aplicação.
- [ ] O `AUTHS_DIR` aponta corretamente para `/data/auths` em produção e para `./auths` localmente.
- [ ] Execução com sucesso do deploy do backend no Fly.io.
- [ ] Logs da VPS visíveis via `fly logs` confirmando inicialização sem erros.

### 📝 Teste do Usuário (Como testar após o deploy)
1. Acessar `https://<seu-app>.fly.dev/health` no navegador e verificar status 200 com JSON de diagnóstico.
2. Executar `fly logs -a <seu-app>` no terminal e verificar a mensagem `[WhatsEasy Server] Rodando com sucesso`.
3. Executar `fly status -a <seu-app>` e verificar a máquina no estado `started` com volume `/data` montado.

---

## 🎨 Sprint 1 — Identidade Visual "Superpower" & Design System

### 🎯 Objetivo
Substituir a estética de template padrão por uma identidade visual moderna, elegante e imersiva inspirada nos maiores benchmarks de ferramentas de automação e produtividade (Linear, n8n, Supabase, Raycast e Resend). A ferramenta deve transmitir autoridade, velocidade e sensação de "superpoder" ao usuário.

### 🎨 Pilares do Novo Design System
- **Nova Tipografia**: Migração para `Plus Jakarta Sans` / `Inter` para leitura clara, com `JetBrains Mono` / `Geist Mono` para tags dinâmicas e variáveis.
- **Paleta de Cores Deep Dark**:
  - Background principal: Deep Void (`#08090D` / `#0D0F17`).
  - Cards & Painéis: Slate Profundo com bordas de precisão (`#121520` com `border-white/[0.08]`).
  - Cor Primária: Emerald Hyper-Vibrant (`#10B981` / `#059669`) — associada a WhatsApp, status online e velocidade.
  - Acentos Visuais: Cyber Purple/Indigo (`#6366F1`) para automações, Cyan (`#06B6D4`) para simulador e Amber (`#F59E0B`) para alertas.
- **Componentes & Microinterações**:
  - Badges com indicadores de status luminosos e pulsantes.
  - Skeletons refinados para todos os estados de carregamento.
  - Empty states com ícones bem trabalhados e botões de ação rápida.
  - Sidebar retrátil e moderna com navegação hierárquica e atalhos.
  - Header limpo com indicador global de conexão e perfil.
- **Redesign do Dashboard Principal (`/`)**:
  - Cockpit de controle com métricas em tempo real, gráfico suave de atividade, atalhos rápidos e status da instância.

### 🧪 Critérios de Aceite da Sprint 1
- [ ] Todas as páginas herdarem a nova paleta de cores e tipografia de forma harmoniosa.
- [ ] Layout (Sidebar, Header, Main Container) fluido, responsivo e sem quebras visuais.
- [ ] Dashboard apresentando métricas reais de contatos, reativos e status do WhatsApp.
- [ ] Modais, botões, inputs e switches com feedback de foco e hover refinados.
- [ ] Build do frontend gerado sem erros (`npm --prefix apps/dashboard run build`).

### 📝 Teste do Usuário
1. Acessar a aplicação no navegador e navegar por todas as rotas da sidebar.
2. Conferir se a nova identidade transmite profissionalismo e conforto visual.
3. Testar a responsividade e o comportamento da sidebar retrátil.

---

## 📱 Sprint 2 — Conexão WhatsApp Baileys & Observabilidade VPS

### 🎯 Objetivo
Transformar a integração do WhatsApp em uma camada ultra-estável, transparente e confiável. Resolver reconexões pós-leitura de QR Code (código 515), mapear LIDs para números reais, manter um heartbeat leve e prover logs em tempo real que permitam ao usuário e ao desenvolvedor saber exatamente o que a VPS está fazendo.

### ⚙️ Detalhamento Técnico
1. **Ciclo de Vida do Baileys v7**:
   - Tratamento cirúrgico de `DisconnectReason`: reconectar automaticamente em quedas transitórias; limpar credenciais apenas em caso de `loggedOut` explícito.
   - Interceptação instantânea do código `515 restartRequired` para reestabelecer o socket imediatamente sem exigir novo QR Code.
   - Normalização de JIDs e desvendamento de LIDs via SignalRepository e `lid-mapping` em disco.
2. **Heartbeat de Liveness (45s)**:
   - Verificação periódica suave de socket ativo para atualizar o frontend antes que o usuário tente disparar uma mensagem.
3. **Tela de Status da Conexão (`/status`)**:
   - Exibição de QR Code com streaming instantâneo via WebSocket.
   - Card de estado da instância com sinal visual de rede e dados da conta conectada.
   - Modal de envio de mensagem de teste para validação imediata da saída.
4. **Tela de Logs Operacionais (`/logs`)**:
   - Tabela em tempo real com filtros por evento (`MSG_RECEIVED`, `MSG_SENT`, `WPP_CONNECT`, `WPP_DISCONNECT`, `ERROR`).
   - Visualização de payload/metadata para diagnóstico facilitado de disparos na VPS.

### 🧪 Critérios de Aceite da Sprint 2
- [ ] Geração imediata de QR Code ao clicar em "Conectar WhatsApp".
- [ ] Leitura do QR Code com smartphone conectando em menos de 5 segundos.
- [ ] A sessão continua conectada e é restaurada após reiniciar o container no Fly.io.
- [ ] Mensagens de teste enviadas com sucesso para um número real.
- [ ] Eventos de conexão e mensagens registradas em `/logs`.

### 📝 Teste do Usuário
1. Acessar `/status`, clicar em "Conectar WhatsApp" e escanear o QR Code com o aplicativo WhatsApp.
2. Confirmar a mudança de status para "Conectado" em tempo real sem precisar dar F5.
3. Enviar uma mensagem de teste para o seu próprio número e verificar o recebimento no celular.
4. Reiniciar a máquina no Fly (`fly machine restart`) e validar que a sessão volta conectada sem novo QR Code.

---

## ⚡ Sprint 3 — O Canvas Visual de Reativos (Drag-and-Drop Plug & Play)

### 🎯 Objetivo
Implementar o **diferencial chave da plataforma**: um Flow Builder visual no estilo Canvas interativo (arrasta-e-solta de nós, conexões bézier, painel de configuração lateral) complementado por um **Modo Rápido** (I/O instantâneo de texto para texto), permitindo criar desde bots de FAQ de 1 minuto até árvores de triagem complexas.

### ⚙️ Detalhamento Técnico
1. **O Canvas Interativo (`/fluxos` e `/reativos`)**:
   - Viewport com pan infinito, zoom pelo mouse/touch e fundo quadriculado blueprint.
   - Nós arrastáveis com handles de entrada e saída:
     - **Nó Gatilho**: Palavra-chave, Contém termo, Regex, Entrada em Cluster.
     - **Nó Mensagem**: Editor rico com inserção de tags clicáveis (`{primeiro_nome}`, `{empresa}`).
     - **Nó Menu / Pergunta**: Múltiplas saídas numéricas ou por botão.
     - **Nó Delay**: Pausa configurável em segundos com envio de presença ("digitando...").
     - **Nó Ação de CRM**: Adicionar a cluster, remover de cluster, atualizar campo customizado.
     - **Nó Condição IF/ELSE**: Bifurcação lógica baseada no valor de variáveis.
   - Conexões (edges) direcionadas com suporte a curvas interativas.
   - Drawer lateral contextual para editar propriedades de qualquer nó selecionado.
2. **Modo Rápido Plug & Play**:
   - Interface rápida tipo "Gatilho ➔ Resposta Direta" para usuários que não querem desenhar fluxos.
3. **Integração com o `ActionEngine`**:
   - O interpretador do canvas converte nós e conexões na estrutura de execução universal.
   - Botão direto **"Testar no Playground"** para rodar a lógica sem gastar mensagens reais.

### 🧪 Critérios de Aceite da Sprint 3
- [ ] Criação, arraste e conexão de nós no Canvas salvos no banco de dados via API.
- [ ] Modo Rápido e Modo Canvas sincronizados.
- [ ] Inserção de tags dinâmicas nos nós de mensagem funcionando com interpolação correta.
- [ ] Menus com saídas condicionais respeitando a escolha do usuário na máquina de estados.
- [ ] Reativo visualmente testável no Playground com um clique.

### 📝 Teste do Usuário
1. Criar um fluxo visual no Canvas com: Nó Gatilho ("oi") ➔ Nó Mensagem ("Olá {primeiro_nome}!") ➔ Nó Menu (1. Preços, 2. Falar com Atendente).
2. Clicar em "Testar no Playground", enviar "oi" e verificar a resposta do bot.
3. Digitar "1" e verificar se o bot segue para o próximo passo.
4. Enviar mensagem de outro WhatsApp real para o número conectado e validar a resposta idêntica.

---

## 👥 Sprint 4 — Ações Unificadas, Contatos & Clusters Inteligentes

### 🎯 Objetivo
Aprimorar a gestão de contatos e segmentação por clusters em uma experiência de CRM poderosa, rápida e responsiva. Permitir operações em massa, filtros dinâmicos e enriquecimento de dados com Custom Fields dinâmicos.

### ⚙️ Detalhamento Técnico
1. **Tela de Contatos (`/contatos`)**:
   - Tabela de alto desempenho com seleção múltipla por checkboxes.
   - Drawer lateral de detalhes do contato exibindo histórico de mensagens, clusters associados e campos customizados preenchidos.
   - Ações em lote: Atribuir ou remover clusters de 50 contatos de uma vez, atualizar campos em massa.
   - Disparo de mensagem em lote com variáveis personalizadas.
2. **Gestão de Clusters (`/contatos` e `/clusters`)**:
   - Criação rápida de clusters com contagem dinâmica em tempo real.
   - Visualização dos membros de cada cluster.
3. **Banco de Dados Dinâmico (`/banco-dados`)**:
   - Interface para gerenciar Custom Fields (`TEXT`, `NUMBER`, `CURRENCY`, `DATE`, `SELECT`).
   - Disponibilização automática das novas chaves como tags clicáveis no editor de mensagens.

### 🧪 Critérios de Aceite da Sprint 4
- [ ] Novos contatos que enviam mensagem no WhatsApp cadastrados automaticamente sem duplicação.
- [ ] Atribuição em lote de contatos para clusters funcionando de forma atômica no banco.
- [ ] Campos customizados criados aparecendo instantaneamente como tags `{chave}` nos editores de mensagem.
- [ ] Drawer lateral abrindo com dados atualizados do contato ao clicar em uma linha.

### 📝 Teste do Usuário
1. Criar um cluster chamado "Leads Quentes" e um campo customizado "empresa".
2. Selecionar múltiplos contatos na tabela e atribuí-los ao cluster "Leads Quentes".
3. Enviar uma mensagem manual para um contato usando a tag `{primeiro_nome}` e verificar a substituição correta.

---

## ⏰ Sprint 5 — Gatilhos Temporais, Anti-Ban & Playground Simulator

### 🎯 Objetivo
Concluir o segundo grande pilar de automação (Gatilhos Outbound acionados por tempo, inatividade ou eventos de cluster), blindar os envios em massa com delays humanizados anti-banimento e consolidar o Playground como o laboratório definitivo de testes sem custos.

### ⚙️ Detalhamento Técnico
1. **Gatilhos Temporais (`SchedulerService` & `/gatilhos`)**:
   - Condição `SPECIFIC_TIME` / `RECURRING_DAILY` (ex: disparar todos os dias às 09:30 para o cluster "Clientes").
   - Condição `INACTIVITY_DAYS` (ex: disparar remarketing se o contato não interagir há mais de 5 dias).
   - Condição `ON_CLUSTER_ENTER` (disparar fluxo no momento em que o lead é categorizado).
2. **Logística Anti-Ban & Humanização**:
   - Fila de disparo com intervalo aleatório humanizado configurável (ex: entre 4 e 9 segundos entre cada contato).
   - Envio de presença `"composing"` (digitando...) por 1,5s antes de cada mensagem enviada.
3. **Playground de Simulação (`/playground`)**:
   - Mock visual completo de conversa de WhatsApp com balões de mensagem estilizados.
   - Painel lateral com árvore de execução de nós, variáveis capturadas e histórico de ações.
   - Botão para resetar sessão de teste a qualquer momento.

### 🧪 Critérios de Aceite da Sprint 5
- [ ] Gatilho agendado dispara na hora correta sem travar a thread do servidor.
- [ ] Envios em massa para clusters respeitam o intervalo aleatório entre contatos.
- [ ] Simulação de presença "digitando..." visível no celular do destinatário antes da entrega do texto.
- [ ] Fluxos completos do Canvas testáveis e validados de ponta a ponta no Playground.

### 📝 Teste do Usuário
1. Criar um gatilho para disparar daqui a 2 minutos para um cluster de teste.
2. Aguardar o horário e verificar a execução do disparo no celular e nos logs.
3. Testar o envio para 3 contatos e conferir o espaçamento de segundos entre as mensagens.

---

## 🛡️ Sprint 6 — Testes E2E, Hardening & Release MVP

### 🎯 Objetivo
Garantir que todo o produto funcione com solidez, alta estabilidade e sem vazamentos de memória ou falhas silenciosas na VPS, preparando o aplicativo para apresentação comercial e uso contínuo em produção.

### ⚙️ Detalhamento Técnico
1. **Testes Automatizados**:
   - Testes unitários para todas as regras de negócio (`ActionEngine`, `ConversationState`, `Matching`).
   - Teste de integração do ciclo completo de fluxo e persistência.
2. **Hardening de Produção na VPS**:
   - Tratamento de exceções não capturadas (`unhandledRejection`, `uncaughtException`).
   - Limpeza automática de arquivos temporários e logs antigos.
   - Otimização de queries Prisma com índices adequados no SQLite.
3. **Documentação & Checklist de Lançamento**:
   - Manual de operação rápida para o usuário.
   - Validação completa do fluxo ponta a ponta definido no Critério de Sucesso do MVP.

### 🧪 Critérios de Aceite da Sprint 6
- [ ] Suite de testes automatizados com 100% de aprovação (`npm test`).
- [ ] Fluxo ponta a ponta completo validado em produção: Cadastro ➔ Conexão WhatsApp ➔ Automação Canvas ➔ Mensagem Recebida ➔ Resposta Entregue ➔ Gatilho Agendado ➔ Logs Registrados.
- [ ] Nenhuma queda de processo ou reinicialização inesperada na VPS durante 24h contínuas de teste.

---

## 🔄 Protocolo de Feedback & Transição entre Sprints

A cada final de Sprint:
1. **Deploy Automatizado**: A versão é enviada para a VPS no Fly.io.
2. **Roteiro de Teste**: O agente fornece o passo a passo exato para o usuário testar.
3. **Validação do Usuário**: O usuário testa, avalia a experiência e responde com dúvidas ou aprovação.
4. **Desbloqueio**: Com a sprint aprovada, inicia-se imediatamente o desenvolvimento da sprint subsequente.
