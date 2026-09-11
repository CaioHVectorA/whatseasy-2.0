# CONTEXT.md — WhatsEasy 2.0

> **Documento de Contexto do Projeto**  
> *Destinado a desenvolvedores e modelos de IA que forem atuar no WhatsEasy 2.0. Leia este documento com atenção antes de implementar qualquer funcionalidade ou realizar refatorações.*

---

## 1. Visão Geral & Proposta de Valor

O **WhatsEasy 2.0** é uma plataforma moderna de **CRM, segmentação e automação de conversas e relacionamento através do WhatsApp**.

### O Problema que Resolvemos
Muitas empresas, vendedores e infoprodutores realizam o atendimento comercial diretamente pelo WhatsApp Web ou celular de forma manual, desorganizada e lenta. Ferramentas corporativas existentes costumam ser caras, engessadas ou exigem a API Oficial da Meta (Cloud API), o que impõe custos por mensagem e limitações na agilidade comercial do dia a dia.

### A Nossa Solução
O WhatsEasy permite que o usuário conecte sua própria conta de WhatsApp (via QR Code com Baileys), organize seus contatos com enriquecimento dinâmico de dados (banco de dados customizado) e crie **automações inteligentes** sem complexidade técnica:
1. **Reagir instantaneamente** a mensagens recebidas (respostas fixas, menus interativos ou fluxos visuais em nós).
2. **Disparar comunicações programadas** (gatilhos por horário, inatividade de contatos ou eventos de segmentação).
3. **Segmentar contatos em clusters** e direcionar automações para públicos específicos.
4. **Construir fluxos visualmente** em um Canvas interativo estilo Typebot/n8n.
5. **Simular e testar tudo** em um Playground interativo antes de colocar no ar, sem precisar gastar mensagens nem ter WhatsApp conectado.
6. **Ter visibilidade total** de tudo o que acontece através de logs de atividade e dashboard em tempo real.

---

## 2. Conceito Central do Produto: O Core

O core do WhatsEasy é estruturado em torno de **dois grandes pilares de automação** que compartilham o mesmo cérebro de execução, desacoplado do transporte físico:

```
                          ┌───────────────────────────┐
                          │   Mensagem Recebida       │
                          │ (Baileys OU Playground)   │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                            ┌───────────────────────┐
                            │    1. REATIVOS        │
                            │  Condições de Texto   │
                            │  Filtro por Clusters  │
                            └───────────┬───────────┘
                                        │
┌──────────────────────────┐            │
│  Condição Temporal       │            │
│  - Horário específico    │            │
│  - Inatividade (X dias)  │            │
│  - Evento de Cluster     │            │
└────────────┬─────────────┘            │
             ▼                          │
 ┌───────────────────────┐              │
 │     2. GATILHOS       │              │
 │  (Outbound/Scheduler) │              │
 └───────────┬───────────┘              │
             │                          │
             └───────────┬──────────────┘
                         ▼
             ┌───────────────────────┐
             │     ActionEngine      │  <── MOTOR COMPARTILHADO
             │  - Interpolação tags  │      DE EXECUÇÃO &
             │  - Máquina de Estados │      MÁQUINA DE ESTADOS
             │  - Menus interativos  │
             │  - Passos e ramificação
             └───────────┬───────────┘
                         ▼
             ┌───────────────────────┐
             │   IMessagingChannel   │  <── CAMADA DESACOPLADA
             │  (Interface Universal)│
             └─────┬───────────┬─────┘
                   │           │
                   ▼           ▼
        ┌─────────────┐     ┌─────────────┐
        │ WhatsApp    │     │ Playground  │
        │ (Baileys v7)│     │ (Simulador) │
        └─────────────┘     └─────────────┘
```

---

### 2.1. Reativos (Inbound Automations)
Automações ativadas automaticamente quando um contato envia uma mensagem para o canal conectado.
- **Condições de Gatilho de Texto**:
  - `EQUALS`: mensagem exatamente igual ao texto configurado.
  - `CONTAINS`: mensagem contém a palavra-chave.
  - `STARTS_WITH`: mensagem inicia com o termo.
  - `ENDS_WITH`: mensagem termina com o termo.
  - `REGEX`: expressão regular para capturar padrões complexos.
- **Filtro de Público**: Pode ser restrito a contatos pertencentes (ou não pertencentes) a determinados clusters.
- **Níveis de Reativos**:
  - **Nível 1 (Resposta Rápida)**: Envio direto de mensagens com tempo de espera opcional (`delaySeconds`).
  - **Nível 2 (Fluxo Conversacional em Blocos/Nós)**: Menus interativos, perguntas sequenciais, captura de dados do lead para campos customizados e ramificações.
  - **Nível 3 (IA Conversacional - Futuro)**: Interação conversacional dinâmica via LLM orientada ao contexto do contato.

### 2.2. Gatilhos (Outbound / Temporal Automations)
Automações que ocorrem independentemente de uma mensagem recebida naquele momento, gerenciadas pelo `SchedulerService`.
- **Tipos de Condição Temporal**:
  - `SPECIFIC_TIME` / `RECURRING_DAILY`: Executa todos os dias em um horário pré-definido (ex: às 09:00).
  - `INACTIVITY_DAYS`: Dispara para contatos que não interagem há mais de X dias (ex: 7 dias sem mensagens → ação de remarketing).
  - `ON_CLUSTER_ENTER`: Disparado quando um contato entra em determinado cluster.
- **Público-Alvo**: Todos os contatos ou contatos de clusters específicos.

### 2.3. Ações Compartilhadas (`ActionEngine`)
**Regra Inegociável:** Reativos e Gatilhos não duplicam a lógica de envio ou manipulação de contatos. Ambos utilizam o `ActionEngine` localizado em `src/lib/engine/action-engine.ts`.
- **Ações disponíveis**:
  - `SEND_MESSAGE`: Envio de mensagem com suporte a tags dinâmicas e mídias.
  - `SEND_MENU`: Envio de menu de opções estruturado com botões/números e registro na máquina de estados.
  - `ADD_CLUSTER`: Adiciona o contato a um cluster.
  - `REMOVE_CLUSTER`: Remove o contato de um cluster.
  - `UPDATE_FIELD`: Atualiza um valor dinâmico no cadastro do contato.
  - `WAIT_INPUT`: Coloca o contato em modo de espera por resposta para validação.
- **Interpolação de Variáveis**:
  - Tags nativas: `{nome}`, `{primeiro_nome}`, `{telefone}`.
  - Tags dinâmicas: Qualquer chave cadastrada no banco de campos customizados (ex: `{empresa}`, `{cargo}`, `{plano}`, `{valor_proposta}`).

### 2.4. Arquitetura Desacoplada & Playground Simulator
Para permitir desenvolvimento ágil, testes unitários e visualização imediata por parte do usuário:
- **`IMessagingChannel`**: Interface universal que abstrai o envio de mensagens, mídias e presença ("digitando...").
- **`WhatsAppBaileysAdapter`**: Implementação para produção conectada ao Baileys.
- **`PlaygroundSimulatorAdapter`**: Implementação em memória/sessão para a tela de Playground (`/playground`). Permite testar reativos, fluxos do canvas, validação de menus e enriquecimento de campos customizados em um mock realista do WhatsApp sem celular conectado.

### 2.5. Máquina de Estados Conversacional (`ConversationStateManager`)
- Gerencia o estado de interação de cada contato em tempo real:
  - Nó/passo atual em que o contato se encontra.
  - Se está aguardando resposta (`waitingInput`).
  - Tipo de validação esperada (`TEXT`, `NUMBER`, `EMAIL`, `PHONE`, `OPTION`).
  - Opções válidas do menu.
  - Fallback automático com reenvio do menu em caso de escolha inválida.
  - Expiração de sessão inativa para não travar contatos.

### 2.6. Construtor Visual estilo Canvas (Flow Builder)
- Tela `/fluxos` dedicada para criar automações visuais em nós:
  - Nós de **Gatilho**, **Mensagem**, **Menu com Opções**, **Delay**, **Ação de Cluster**, **Campo Customizado** e **Condição IF/ELSE**.
  - Conexões (edges) direcionadas com múltiplos caminhos.
  - Edição visual rápida de propriedades com drawer lateral.
  - Botão direto para **Testar no Playground**.

### 2.7. Contatos, Segmentação e Banco de Dados Dinâmico
- **Contatos**:
  - Cadastro automático na primeira mensagem recebida ou sincronização de contatos do WhatsApp.
  - Associação N:N (muitos-para-muitos) com Clusters via `ContactClusterRelation`.
  - Operações em lote (atribuir/remover clusters em massa, atualizar campos em massa, disparo em lote com templates dinâmicos).
- **Clusters**:
  - Grupos e segmentos organizados com contagem automática de membros.
  - Utilizados como filtros de entrada para Reativos e públicos-alvo para Gatilhos e campanhas.
- **Custom Fields (Banco de Dados Dinâmico)**:
  - Permite criar campos dinâmicos customizados por usuário (`CustomFieldDefinition`), com tipos como `TEXT`, `NUMBER`, `CURRENCY`, `DATE`, `SELECT`, máscaras, validações regex e valores padrão.
  - Salvos em JSON no contato (`contacts.customFields`), permitindo máxima flexibilidade sem migrations manuais.

### 2.8. Logs de Atividade Operacional
- Todos os eventos vitais são gravados em `activity_logs` via `LoggerService`:
  - Conexão e desconexão do WhatsApp.
  - Emissão de novos QR Codes.
  - Mensagens recebidas e enviadas.
  - Novos contatos cadastrados ou alterados.
  - Reativos acionados e Gatilhos executados.
  - Erros operacionais.
- O usuário tem uma tela dedicada de auditoria e debugging para acompanhar em tempo real o que está acontecendo.

---

## 3. Arquitetura Técnica & Stack de Tecnologias

### 3.1. Estrutura do Monorepo
```text
whatseasy-2.0/
├── index.ts                      # Ponto de entrada do Backend Fastify + WebSocket + Workers
├── package.json                  # Dependências raiz e scripts concorrentes
├── tsconfig.json                 # Configurações TypeScript backend
├── Dockerfile & fly.toml         # Configurações para containerização e deploy
├── AGENTS.md                     # Diretrizes de refatoração e escopo do MVP
├── CONTEXT.md                    # ESTE ARQUIVO: Contexto arquitetural e visão do app
├── TODO.md                       # Status detalhado e backlog priorizado
│
├── prisma/
│   ├── schema.prisma             # Modelos de dados completos (User, Client, Contacts, etc.)
│   ├── dev.db                    # Banco de dados SQLite local
│   └── migrations/               # Histórico de migrações Prisma
│
├── auths/
│   └── <userId>/                 # Armazenamento de credenciais e tokens da sessão Baileys
│
├── src/                          # Código-fonte do Backend (Fastify)
│   ├── controllers/              # Rotas HTTP REST
│   │   ├── auth.controller.ts        # Registro, login e validação JWT
│   │   ├── user.controller.ts        # Dashboard metrics e dados do usuário
│   │   ├── whatsapp.controller.ts    # Conexão, status, QR Code, logout e envio manual
│   │   ├── contacts.controller.ts    # CRUD contatos, clusters, batch e custom-fields
│   │   ├── reactives.controller.ts   # CRUD e toggle de reativos
│   │   ├── triggers.controller.ts    # CRUD e toggle de gatilhos
│   │   ├── flows.controller.ts       # CRUD e persistência de fluxos do Canvas
│   │   ├── playground.controller.ts  # Simulação de mensagens e sessão de teste
│   │   └── logs.controller.ts        # Consulta paginada de logs de atividade
│   ├── lib/
│   │   ├── appError.ts               # Classe padrão para erros operacionais
│   │   ├── prisma.client.ts          # Singleton Prisma Client
│   │   ├── engine/
│   │   │   ├── messaging.channel.ts  # Interface universal IMessagingChannel
│   │   │   ├── playground.adapter.ts # Adaptador do simulador em memória
│   │   │   ├── conversation-state.ts # Máquina de estados conversacionais e menus
│   │   │   ├── action-engine.ts      # Motor unificado de execução de ações e interpolação
│   │   │   └── scheduler.ts          # Cron/timer de gatilhos programados e inatividade
│   │   ├── services/
│   │   │   └── logger.service.ts     # Serviço centralizado de auditoria de eventos
│   │   ├── wpp/
│   │   │   └── whatsapp.manager.ts   # Gerenciador do ciclo de vida Baileys v7 + WebSockets
│   │   └── types/
│   │       ├── dtos.ts               # Contratos e tipos de requisição/resposta
│   │       └── utils.ts              # Tipos utilitários para Fastify
│
└── apps/
    └── dashboard/                # Frontend SPA moderno
        ├── index.html
        ├── package.json
        ├── vite.config.ts        # Vite 5 (porta 5455 por padrão)
        ├── tailwind.config.js    # Design system Tailwind
        └── src/
            ├── App.tsx & main.tsx
            ├── routes/           # Rotas públicas e protegidas (React Router v6)
            ├── providers/        # QueryClientProvider, ThemeProvider, Toaster (Sonner)
            ├── hooks/
            │   └── use-api-queries.ts # Todas as mutations e queries TanStack React Query v5
            ├── components/
            │   ├── ui/           # Componentes atômicos shadcn/ui (Radix)
            │   └── layout/       # Sidebar, Header, UserNav e DashboardLayout
            └── pages/
                ├── auth/         # Telas de Login e Cadastro
                ├── dashboard/    # Visão geral de métricas, gráficos e status
                ├── status/       # Gestão de conexão do WhatsApp (QR Code e reconexão)
                ├── contacts/     # Gestão rica de contatos, clusters e ações em lote
                ├── custom-fields/# Construtor visual de campos dinâmicos customizados
                ├── reactives/    # Listagem e editor de Reativos (inbound)
                ├── triggers/     # Listagem e editor de Gatilhos (outbound/horário)
                ├── flows/        # Construtor Visual estilo Canvas (Flow Builder)
                ├── playground/   # Simulador de WhatsApp para testes sem conexão
                └── logs/         # Tela de auditoria e logs operacionais
```

---

## 4. Particularidades Críticas da Integração Baileys

A integração do WhatsApp é o componente mais sensível do sistema. Algumas decisões arquiteturais foram tomadas para garantir estabilidade:

1. **Tratamento de LIDs vs JIDs Reais (`WhatsAppManager.resolvePhoneNumber`)**:
   - Em contas recentes e na versão v7 do Baileys, o WhatsApp utiliza com frequência identificadores privados `@lid` (ex: `123456789@lid`) ao invés do número de telefone real.
   - O `WhatsAppManager` resolve o número de telefone real consultando o mapeamento reverso (`SignalRepository.lidMapping` em memória ou arquivos locais `lid-mapping-*_reverse.json`).
   - Contatos cadastrados sempre utilizam números de telefone reais higienizados (sem caracteres especiais) para evitar cadastros fantasmas.

2. **Código 515 (`restartRequired`)**:
   - Logo após o usuário escanear o QR Code no celular, o Baileys costuma fechar a conexão temporária com código 515. Isso **não é um erro**, e sim o sinal de conclusão do pareamento.
   - O `WhatsAppManager` intercepta o 515 e reinicia a conexão imediatamente, conectando com sucesso na sequência.

3. **Multi-File Auth State**:
   - Cada usuário do sistema tem sua pasta isolada de credenciais em `auths/<userId>/`.
   - Ao iniciar o servidor, o método `WhatsAppManager.restoreSavedSessions()` restaura automaticamente todas as sessões que já possuem login salvo, sem exigir que o usuário reescaneie o QR Code.

4. **Transmissão de Estados via WebSocket**:
   - Estados suportados: `DISCONNECTED`, `CONNECTING`, `QR_READY`, `CONNECTED`, `RECONNECTING`, `ERROR`.
   - O frontend sincroniza seu estado tanto via polling adaptativo quanto via eventos WebSocket emitidos pela API.

---

## 5. Critérios de Sucesso do MVP (Onde Queremos Chegar)

Para validar o WhatsEasy como um produto pronto para uso real e posterior lançamento comercial, o sistema deve executar perfeitamente o seguinte **fluxo ponta a ponta**:

```text
1. Criar Conta (/register)
       ↓
2. Fazer Login (/login)
       ↓
3. Testar no Playground (/playground) o fluxo de boas-vindas com menus interativos
       ↓
4. Criar ou customizar o fluxo no Construtor Canvas (/fluxos)
       ↓
5. Ir para Conexão WhatsApp (/status) e clicar em "Conectar WhatsApp"
       ↓
6. Escanear o QR Code com o aplicativo WhatsApp no smartphone
       ↓
7. Confirmar transição de status para "Conectado" em tempo real
       ↓
8. Um contato real envia mensagem de teste para o WhatsApp conectado
       ↓
9. O contato é cadastrado automaticamente em /contatos e a mensagem é salva
       ↓
10. O evento aparece na tela de /logs (MSG_RECEIVED e CONTACT_CREATED)
       ↓
11. O Reativo/Fluxo responde automaticamente com menu ou resposta configurada
       ↓
12. O contato digita uma opção, o sistema valida, salva no campo customizado e avança
       ↓
13. O Gatilho dispara automaticamente no momento estipulado
```

---

## 6. Próximos Passos & Evoluções Pós-MVP

1. **Nível 3 de Reativos — Inteligência Artificial (LLM)**:
   - Integrar provedores de IA (OpenAI / Anthropic / Gemini) diretamente no `ActionEngine`.
   - Permitir que o reativo aja como um atendente virtual autônomo baseado em instruções (System Prompt) e base de conhecimento da empresa, com acesso aos campos dinâmicos do contato.

2. **Migração para PostgreSQL & Filas Assíncronas**:
   - O SQLite atual atende com excelência o MVP local e de validação rápida.
   - Para produção em escala com dezenas de sessões simultâneas, migrar o Prisma datasource para PostgreSQL.
   - Adicionar Redis + BullMQ para gerenciar disparos massivos em fila com delay humanizado e prevenção de banimento de chips.

3. **Webhooks de Entrada & Saída**:
   - Permitir que eventos externos (ex: venda aprovada na Hotmart, lead cadastrado no formulário do site) disparem ações no WhatsEasy através de webhooks.

---

## 7. Regras e Boas Práticas para Novos Desenvolvedores / Modelos de IA

Ao mexer neste projeto, siga impreterivelmente estas diretrizes:

1. **Não reinvente a roda**:
   - Aproveite a estrutura existente. A base já possui controllers, schemas do Prisma, rotas de WebSocket, gerenciamento Baileys e componentes shadcn/ui.
2. **Mantenha o Motor Unificado**:
   - Nunca implemente um mecanismo paralelo de disparo de mensagens ou de ações para Reativos ou Gatilhos. Se precisar de uma nova ação (ex: webhook externo), adicione-a no `ActionEngine` (`src/lib/engine/action-engine.ts`).
3. **Consistência Visual com shadcn/ui**:
   - No frontend (`apps/dashboard`), utilize apenas os componentes do shadcn/ui e do Tailwind CSS. Não crie componentes despadronizados. Mantenha os estados de loading, empty states e toasts informativos em todas as telas.
4. **Cuidado com Identificadores WhatsApp**:
   - Nunca presuma que um JID recebido pelo Baileys é um número de telefone direto. Sempre passe por `WhatsAppManager.resolvePhoneNumber` para desvendar LIDs.
5. **Comandos para Rodar Localmente**:
   - Para rodar o ambiente completo (backend + frontend simultaneamente):
     ```bash
     npm run dev
     ```
   - Para rodar apenas a API:
     ```bash
     npm run dev:server
     ```
   - Para rodar apenas o Frontend:
     ```bash
     npm run dev:web
     ```
   - Para atualizar o banco ou gerar tipos Prisma:
     ```bash
     npx prisma generate
     npx prisma db push
     ```
   - Para rodar a suite de testes unitários:
     ```bash
     npm test
     ```
