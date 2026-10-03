# TODO.md — WhatsEasy 2.0

> **Mapa de Funcionalidades, Status do Projeto e Backlog de Desenvolvimento**  
> *Este documento rastreia tudo o que já foi implementado, o que está em execução e o roadmap de longo prazo para levar o WhatsEasy 2.0 a um produto SaaS pronto para escala.*

---

## 📊 Visão Geral do Status

| Módulo | Status Atual | Grau de Conclusão |
|---|---|:---:|
| **Autenticação & Contas** | ✅ Concluído | 95% |
| **Integração WhatsApp / Baileys** | ✅ Concluído (MVP) | 92% |
| **Arquitetura Desacoplada (Mensageria Universal)** | 🚀 Em Implementação | 85% |
| **Playground / Simulador de Chat** | 🚀 Em Implementação | 85% |
| **Construtor Visual de Fluxos estilo Canvas (Flow Builder)** | 🚀 Em Implementação (Prioridade MVP) | 80% |
| **Fluxos Conversacionais, Menus & Máquina de Estados** | 🚀 Em Implementação | 80% |
| **Contatos & Segmentação N:N** | ✅ Concluído | 90% |
| **Clusters (Segmentos)** | ✅ Concluído | 90% |
| **Banco de Dados Dinâmico (Custom Fields)** | ✅ Concluído | 95% |
| **Reativos (Inbound)** | ✅ Concluído | 90% |
| **Gatilhos (Outbound / Tempo)** | ✅ Concluído | 85% |
| **Motor de Execução Compartilhado (`ActionEngine`)** | ✅ Concluído | 90% |
| **Auditoria & Logs Operacionais** | ✅ Concluído | 95% |
| **Dashboard Consolidado** | ✅ Concluído | 90% |
| **Gestão de Arquivos & Mídias (Imagens, PDFs, Áudios PTT)** | ⏳ MVP / Próximo | 70% |
| **Logística de Disparos & Rate Limiting Anti-Ban** | ⏳ MVP / Próximo | 65% |
| **IA Conversacional (Nível 3 com LLM)** | ⏳ Backlog Futuro | 0% |
| **Infraestrutura Distribuída (Postgres + Redis/BullMQ)** | ⏳ Backlog Futuro | 10% |

---

## ✅ 1. O Que Já Foi Feito (Features Concluídas)

### 1.1. Autenticação & Gestão de Usuário
- [x] Registro de novos usuários com validação de senha criptografada (`bcrypt`).
- [x] Login com geração de token JWT seguro (`@fastify/jwt`).
- [x] Proteção global de rotas da API com middleware Fastify `onRequest`.
- [x] Tratamento centralizado de erros operacionais (`AppError`).
- [x] Interface frontend moderna de Login (`/login`) e Cadastro (`/register`) com shadcn/ui.
- [x] Validação client-side com React Hook Form + Zod.
- [x] Armazenamento de token JWT em cookies e localStorage com persistência de sessão.

### 1.2. Integração com WhatsApp / Baileys (v7)
- [x] Gerenciador multi-sessão isolado por usuário (`WhatsAppManager`).
- [x] Armazenamento seguro de credenciais multi-arquivo em `auths/<userId>/`.
- [x] Geração automática de QR Code em Base64 DataURL.
- [x] Servidor WebSocket nativo (`/ws?token=...`) com emissão de eventos em tempo real (`STATUS_UPDATE`, `QR`, `CONNECTED`, `DISCONNECTED`, `MSG_RECEIVED`).
- [x] Resolução automática de identificadores de privacidade do WhatsApp (`@lid`) para números de telefone reais (`@s.whatsapp.net`) via mapeamento reverso.
- [x] Tratamento de reconexão automática e tratamento cirúrgico do código `515 restartRequired` pós-leitura do QR Code.
- [x] Restauração automática de todas as sessões salvas na inicialização do servidor backend (`restoreSavedSessions`).
- [x] Encerramento e desconexão manual de sessão com limpeza de credenciais (`logoutSession`).
- [x] Tela de Status da Conexão (`/status`) com exibição do QR Code em tempo real, status animado, detalhes da sessão e envio de mensagem de teste.

### 1.3. Contatos & Segmentação
- [x] Identificação e cadastro automático de novos contatos ao receber qualquer mensagem no WhatsApp.
- [x] Sincronização e cadastro de contatos via evento Baileys `contacts.upsert`.
- [x] Atualização automática de `lastInteraction` em tempo real a cada mensagem enviada ou recebida.
- [x] Cadastro manual de contatos (`POST /contact`).
- [x] Edição de dados do contato e exclusão individual/em massa.
- [x] Relação Muitos-para-Muitos (N:N) entre Contatos e Clusters (`ContactClusterRelation`).
- [x] Ações em lote: Atribuir ou remover múltiplos contatos de clusters de uma só vez (`/contacts/batch-clusters`).
- [x] Ações em lote: Atualizar valor de campos customizados para vários contatos selecionados (`/contacts/batch-field`).
- [x] Disparo de mensagem em massa para contatos selecionados com substituição dinâmica de tags (`/contacts/send-bulk`).
- [x] Disparo de mensagem individual diretamente para o contato.
- [x] Tela de Contatos (`/contatos`) interativa com seleção múltipla (checkboxes), visualização lateral de detalhes, busca textual e filtros de clusters.

### 1.4. Clusters (Segmentos)
- [x] CRUD completo de clusters (`/clusters`).
- [x] Contagem dinâmica de contatos pertencentes ao cluster.
- [x] Visualização detalhada dos contatos de um cluster específico (`/clusters/:id/contacts`).
- [x] Disparo de mensagem em massa para todos os membros de um cluster (`/clusters/:id/send-message`).
- [x] Utilização de clusters como filtros de público em Reativos e alvos de Gatilhos.

### 1.5. Banco de Dados Dinâmico (Custom Fields)
- [x] Criação de campos dinâmicos customizados por usuário (`CustomFieldDefinition`).
- [x] Suporte a tipos de dados: `TEXT`, `NUMBER`, `CURRENCY`, `DATE`, `SELECT`.
- [x] Configurações ricas: opções para selects, máscaras visuais, validação regex, valores mínimos e máximos, placeholders, descrição de ajuda e valor padrão.
- [x] Armazenamento de valores em JSON estruturado no contato (`contacts.customFields`).
- [x] Interpolação dinâmica de qualquer campo customizado em mensagens através de tags `{chave}`.
- [x] Construtor visual de campos customizados na tela de Banco de Dados (`/banco-dados`).

### 1.6. Reativos (Inbound Automations)
- [x] Criação, edição, exclusão e toggle ativo/pausado de reativos.
- [x] Múltiplas condições de texto por reativo:
  - `EQUALS` (exatamente igual).
  - `CONTAINS` (contém texto).
  - `STARTS_WITH` (começa com).
  - `ENDS_WITH` (termina com).
  - `REGEX` (expressão regular).
- [x] Restrição de acionamento por clusters (contato deve pertencer ou não a clusters selecionados).
- [x] Resposta com atraso configurável em segundos (`delaySeconds`).
- [x] Suporte a blocos de ação multi-step em `actionConfig`:
  - Enviar mensagem de resposta.
  - Adicionar contato a cluster.
  - Remover contato de cluster.
  - Atualizar valor de campo customizado do contato.
- [x] Contador de acionamentos (`usageCount`) e histórico de logs de disparos.
- [x] Tela visual completa de gestão e criação de Reativos (`/reativos`).

### 1.7. Gatilhos (Outbound / Temporal Automations)
- [x] Criação, edição, exclusão e toggle ativo/pausado de gatilhos.
- [x] Condições temporais implementadas:
  - `RECURRING_DAILY` / `SPECIFIC_TIME`: Disparo programado em horário específico do dia (ex: 10:00).
  - `INACTIVITY_DAYS`: Disparo para contatos inativos há mais de X dias (remarketing).
- [x] Motor de agendamento em background (`SchedulerService`) com ciclo contínuo de checagem a cada minuto.
- [x] Direcionamento de gatilho para clusters específicos ou toda a base de contatos.
- [x] Tela visual completa de gestão e criação de Gatilhos (`/gatilhos`).

### 1.8. Motor de Execução Unificado (`ActionEngine`)
- [x] Centralização de execução entre Reativos e Gatilhos evitando duplicação de lógica.
- [x] Formatador e interpolador de variáveis universais: `{nome}`, `{primeiro_nome}`, `{telefone}` e `{qualquer_campo_customizado}`.
- [x] Registro automático de mensagens enviadas no histórico (`sent_messages`).

### 1.9. Auditoria & Logs de Atividade
- [x] Serviço centralizado `LoggerService` com gravação assíncrona no SQLite.
- [x] Categorização por tipos de eventos (`WPP_CONNECT`, `WPP_DISCONNECT`, `WPP_QR`, `MSG_RECEIVED`, `MSG_SENT`, `CONTACT_CREATED`, `CONTACT_UPDATED`, `CLUSTER_CREATED`, `REACTIVE_TRIGGERED`, `TRIGGER_EXECUTED`, `ERROR`).
- [x] Status de log (`SUCCESS`, `ERROR`, `INFO`, `WARNING`).
- [x] Filtros por evento, status, busca textual e paginação server-side (`GET /logs`).
- [x] Limpeza completa de histórico de logs (`DELETE /logs`).
- [x] Tela visual de Logs (`/logs`) com visualização de metadados, badges de status e atualização automática.

### 1.10. Dashboard
- [x] Métricas consolidadas em tempo real: total de contatos, clusters, reativos ativos, gatilhos ativos e mensagens enviadas.
- [x] Status atual e indicador visual de conexão do WhatsApp.
- [x] Gráficos interativos (Recharts) com distribuição de contatos por cluster e linha do tempo de atividade.
- [x] Ranking dos Reativos mais utilizados.
- [x] Feed dos últimos eventos registrados no sistema.
- [x] Tela de Dashboard moderna (`/`).

---

## 🚀 2. Prioridade Máxima do MVP (Em Implementação Ativa)

### 2.1. Arquitetura Desacoplada & Mensageria Universal
- [x] Interface `IMessagingChannel` desacoplando o motor de execução do WhatsApp direto (`Baileys`).
- [x] Adaptador de Produção: `WhatsAppBaileysAdapter` com tratamento de JIDs reais e status de entrega.
- [x] Adaptador de Teste: `PlaygroundSimulatorAdapter` permitindo executar e auditar fluxos em tempo real sem celular conectado.
- [x] `ActionEngine` refatorado para operar sobre qualquer `IMessagingChannel`.

### 2.2. Playground / Simulador de WhatsApp Interativo
- [x] Endpoint `POST /playground/simulate` para injetar mensagens simuladas.
- [x] Endpoint `GET /playground/session` para obter a conversa simulada, variáveis acumuladas e nós executados.
- [x] Endpoint `DELETE /playground/session` para resetar o simulador.
- [x] Interface `/playground`: Mock interativo de tela de celular / chat WhatsApp com balões estilizados, seletor de contato de teste e inspetor lateral com árvore de execução de nós, variáveis capturadas e clusters atualizados.

### 2.3. Fluxos Conversacionais Robustos, Menus & Máquina de Estados
- [x] Gerenciador de estado de conversas (`ConversationStateManager`).
- [x] Menus Interativos estruturados com opções numéricas ou termos-chave (ex: `1. Planos`, `2. Suporte`).
- [x] Estado "Aguardar Resposta" com validação de formato (`TEXT`, `NUMBER`, `EMAIL`, `PHONE`, `OPTION`).
- [x] Captura automática de respostas do usuário direto para os campos customizados (`customFields`).
- [x] Tratamento de fallback: reenvio amigável do menu e aviso claro quando o usuário digita uma opção inválida.
- [x] Timeout de expiração de sessão inativa para liberar o contato.

### 2.4. Construtor Visual de Fluxos estilo Canvas (Flow Builder)
- [x] Tela `/fluxos` dedicada com layout visual tipo Canvas (estilo React Flow / Typebot).
- [x] Nós interativos arrastáveis:
  1. **Nó Gatilho** (Texto, Palavra-chave, Entrada em Cluster).
  2. **Nó Mensagem** (Texto com inserção intuitiva de tags dinâmicas clicáveis).
  3. **Nó Menu / Pergunta** (Definição de opções de menu 1, 2, 3 com saídas de conexão independentes).
  4. **Nó Delay / Pausa** (Espera configurável de segundos/minutos).
  5. **Nó Ação de Contato** (Adicionar/remover de cluster, salvar campo customizado).
  6. **Nó Condição IF/ELSE** (Bifurcação de caminho baseada no valor de campos dinâmicos).
- [x] Conexões visuais curvas (edges) entre portas de saída e entrada.
- [x] Drawer lateral de configuração de cada nó ao ser selecionado.
- [x] Botão "Testar no Playground" direto da tela do fluxo para validação imediata.

---

## 📦 3. Logística de Mensageria & Envio em Escala

- [ ] **Rate Limiting & Delays Anti-Banimento nos Disparos em Massa**:
  - *Problema:* Disparos simultâneos para dezenas de contatos causam bloqueio instantâneo do chip pelo algoritmo da Meta.
  - *Solução:* Intervalo aleatório humanizado configurável (ex: 4s a 9s) entre mensagens sucessivas no envio em massa e disparos para clusters.
- [ ] **Simulação de Presença do WhatsApp**:
  - Enviar sinal de presença `"composing"` (digitando...) por 1 a 3 segundos antes do envio de cada mensagem de texto.
  - Enviar sinal de presença `"recording"` (gravando áudio...) antes do envio de notas de voz.
- [ ] **Janelas de Horário de Atendimento & Pausa Noturna**:
  - Configuração de dias e horários operacionais para automações (ex: não disparar gatilhos entre 22:00 e 08:00).
  - Enfileiramento das mensagens geradas fora do horário para o primeiro horário do próximo dia útil.
- [ ] **Heartbeat e Detecção de Queda Silenciosa do WhatsApp**:
  - Ping suave de verificação de liveness da conexão a cada 30 segundos, detectando desconexões silenciosas com atualização imediata no frontend.
- [ ] **Condição `ON_CLUSTER_ENTER` para Gatilhos**:
  - Acionamento automático de fluxos de boas-vindas no momento exato em que um contato entra em determinado cluster (com delay opcional, ex: 5 minutos após o cadastro).

---

## 📁 4. Gestão de Arquivos & Mídias

- [ ] **Envio e Recepção de Imagens**:
  - Suporte a envio de imagens com legenda formatada nos reativos, gatilhos e mensagens manuais.
  - Preview de imagens recebidas e enviadas no chat do contato.
- [ ] **Notas de Voz (Áudio Gravado / PTT)**:
  - Envio de áudios no formato nativo Push-to-Talk (`audio/ogg; codecs=opus`) para parecerem 100% gravados na hora pelo atendente humano.
- [ ] **Documentos & PDFs**:
  - Envio de propostas comerciais, contratos e catálogos em PDF com nome de arquivo customizado.
- [ ] **Armazenamento de Mídias**:
  - Upload local seguro em `uploads/<userId>/` com validação de extensão e limite de tamanho.
  - Suporte futuro a armazenamento externo em buckets S3 / Supabase Storage.

---

## 🖥️ 5. Experiência de Usuário & Componentes de UI (shadcn/ui)

- [ ] **Importação e Exportação de Contatos (CSV / Excel)**:
  - Modal com drag-and-drop de arquivo `.csv`, pré-visualização de linhas e mapeamento de colunas para campos customizados.
  - Exportação de listas com filtros aplicados em arquivo `.csv`.
- [ ] **Linha do Tempo Completa de Conversas (Chat View)**:
  - Drawer lateral ao clicar em qualquer contato exibindo o histórico de mensagens recebidas e enviadas, estilo WhatsApp Web.
- [ ] **Feedback de Progresso em Disparos Massivos**:
  - Barra de progresso visual em tempo real para envios em lote (ex: "Enviando 34 de 120...").
- [ ] **Paginação Server-Side na Tela de Contatos**:
  - Suporte a paginação com `take` e `skip` para manter a performance fluida em bases com mais de 5.000 contatos.

---

## 🔮 6. Backlog Pós-MVP (Escala, IA & Integrações)

- [ ] **Nível 3 de Reativos — Inteligência Artificial Conversacional (LLM)**:
  - Conexão com OpenAI (GPT-4o), Anthropic (Claude 3.5) ou Google Gemini.
  - Injeção de System Prompt (Persona da empresa) e base de conhecimento (FAQ, catálogo de produtos).
  - Acesso do modelo aos campos dinâmicos do lead e histórico da conversa.
- [ ] **Webhooks de Entrada & Saída**:
  - *Entrada:* Criar contato, atualizar campos ou disparar fluxos a partir de plataformas externas (Hotmart, Kiwify, Eduzz, Stripe, Typeform).
  - *Saída:* Notificar CRMs externos (HubSpot, RD Station) quando um lead avançar em um fluxo ou entrar em um cluster.
- [ ] **Migração para PostgreSQL**:
  - Ajuste do schema Prisma para PostgreSQL para suportar concorrência extrema em produção.
- [ ] **Filas Assíncronas Distribuídas (Redis + BullMQ)**:
  - Gerenciamento de campanhas com milhões de mensagens em workers desacoplados com retries automáticos.
- [ ] **Multi-instância / Múltiplos Números de WhatsApp**:
  - Permitir conectar e gerenciar vários números de WhatsApp na mesma conta (ex: Vendas 1, Vendas 2, Pós-Venda).

---

## 🧪 7. Bateria de Testes Automatizados

- [x] Teste unitário de interpolação de variáveis dinâmicas universais (`ActionEngine.formatVariables`).
- [x] Teste unitário das regras de correspondência de texto (`EQUALS`, `CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, `REGEX`).
- [ ] Teste unitário do adaptador do simulador (`PlaygroundSimulatorAdapter`).
- [ ] Teste unitário da máquina de estados conversacional (`ConversationStateManager`):
  - Início de fluxo e envio do menu de opções.
  - Resposta válida e transição de nó com gravação de variáveis.
  - Resposta inválida com fallback e reenvio do menu.
  - Expiração de timeout de sessão.
- [ ] Teste unitário da execução de fluxos estruturados em nós do Canvas.
