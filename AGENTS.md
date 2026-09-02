# Refatoração completa do app — preparação para MVP/produção

## Contexto

Este projeto já possui uma base funcional, porém é um app antigo que precisa passar por uma **refatoração ampla de arquitetura, interface e funcionalidades**, aproximando-o de um estado adequado para um MVP real e posterior uso em produção.

Não quero reconstruir o projeto do zero sem necessidade. **Analise primeiro a arquitetura, código e funcionalidades existentes e reaproveite o que estiver bem estruturado.** Refatore ou substitua aquilo que estiver defasado, frágil ou incompatível com a versão atual das tecnologias utilizadas.

O objetivo não é criar um sistema gigantesco ou excessivamente abstrato. O objetivo é chegar rapidamente a um **MVP funcional, consistente, estável e com boa UX**.

---

# 1. Conceito central do produto

O core do produto são **Reativos e Gatilhos**, ambos voltados para automação de conversas e relacionamento através do WhatsApp.

O sistema deve permitir que um usuário conecte seu WhatsApp e configure automações capazes de:

- responder mensagens automaticamente;
- iniciar fluxos de conversa;
- enviar mensagens em horários específicos;
- executar ações sobre contatos;
- organizar contatos em clusters;
- realizar remarketing;
- executar ações após determinados eventos;
- futuramente utilizar IA para respostas mais complexas.

A arquitetura deve ser pensada de forma que **Reativos e Gatilhos possam compartilhar o mesmo motor de execução de ações**, evitando implementar dois sistemas completamente separados.

---

# 2. Autenticação

Manter e refatorar o sistema de autenticação existente.

O MVP deve possuir:

- registro com e-mail e senha;
- login com e-mail e senha;
- logout;
- persistência correta da sessão;
- tratamento adequado de erros;
- estados de loading;
- validação dos formulários;
- proteção das páginas que exigem autenticação.

Priorizar uma experiência simples e confiável.

---

# 3. Interface e UX

Fazer uma **refatoração completa da interface** utilizando **shadcn/ui** como base dos componentes.

A interface deve parecer um produto moderno, consistente e pronto para ser apresentado a usuários reais.

Prioridades:

- layout consistente;
- navegação clara;
- componentes reutilizáveis;
- formulários bem estruturados;
- feedback visual para ações;
- loading states;
- empty states;
- mensagens de erro claras;
- modais/dialogs adequados;
- tabelas e listas interativas;
- responsividade;
- hierarquia visual clara.

Não gastar tempo fazendo microajustes puramente estéticos enquanto funcionalidades importantes ainda estiverem incompletas.

Criar uma linguagem visual consistente utilizando os componentes do shadcn em vez de implementar componentes visualmente diferentes para cada tela.

---

# 4. Integração com WhatsApp / Baileys

Esta é uma parte crítica do sistema.

A integração existente deve ser analisada e **atualizada/refatorada para funcionar corretamente com a versão atual do Baileys e das dependências relacionadas**.

Não assumir que a implementação antiga continua válida.

Verificar principalmente:

- criação da sessão;
- autenticação;
- QR Code;
- conexão;
- desconexão;
- reconexão;
- expiração/perda da sessão;
- atualização do estado da conexão;
- recebimento de mensagens;
- envio de mensagens;
- eventos relevantes do WhatsApp;
- encerramento correto de sessões;
- tratamento de erros.

## Estado da conexão

O estado da conexão precisa ser **robusto e confiável**.

Evitar situações em que a interface mostra "conectado" enquanto a sessão já caiu ou o contrário.

O frontend deve conseguir distinguir estados relevantes, por exemplo:

- desconectado;
- conectando;
- conectado;
- reconectando;
- sessão expirada/necessitando autenticação;
- erro.

Se fizer sentido para a arquitetura atual, implementar um **heartbeat/ping periódico** para verificar a saúde da conexão.

Porém, não criar um heartbeat excessivamente agressivo ou que gere carga desnecessária. A prioridade é confiabilidade sem prejudicar a performance da API.

Também implementar corretamente reconexões e atualização do estado no frontend.

---

# 5. Logs

Criar/refatorar uma tela de **logs dos eventos relacionados ao WhatsApp e às automações**.

O objetivo é permitir que o usuário entenda o que está acontecendo no sistema.

Exemplos de eventos:

- WhatsApp conectado;
- WhatsApp desconectado;
- tentativa de reconexão;
- mensagem recebida;
- mensagem enviada;
- novo contato identificado;
- contato atualizado;
- contato adicionado a um cluster;
- contato removido de um cluster;
- reativo acionado;
- gatilho executado;
- fluxo iniciado;
- fluxo concluído;
- ação executada;
- erro durante execução.

A interface deve ser legível e permitir identificar rapidamente:

- quando ocorreu;
- qual evento ocorreu;
- qual contato estava envolvido, quando aplicável;
- qual automação estava envolvida;
- se foi sucesso ou erro.

Não precisa criar um sistema de observabilidade gigantesco para o MVP. O objetivo é ter **logs úteis para o usuário e para debugging**.

---

# 6. Contatos

Refatorar significativamente a tela de contatos.

Ela não deve ser apenas uma tabela simples.

O usuário deve conseguir visualizar informações relevantes do contato de maneira clara e interativa.

Considerar:

- nome;
- telefone;
- data/horário da última interação;
- clusters associados;
- informações disponíveis sobre o contato;
- estado/relação com automações;
- histórico relevante, quando disponível.

A interface deve facilitar operações em um ou vários contatos.

Exemplos:

- adicionar a cluster;
- remover de cluster;
- selecionar múltiplos contatos;
- organizar contatos;
- visualizar detalhes;
- pesquisar;
- filtrar.

Não adicionar dezenas de filtros desnecessários no MVP. Priorizar os filtros e ações que realmente ajudam na utilização do produto.

---

# 7. Clusters

Clusters são uma parte importante da segmentação do sistema.

O usuário deve conseguir:

- criar cluster;
- editar cluster;
- excluir cluster;
- visualizar contatos de um cluster;
- adicionar contatos;
- remover contatos;
- adicionar vários contatos de uma vez;
- visualizar quantos contatos pertencem ao cluster.

A UX para organização dos contatos e clusters precisa ser simples e intuitiva.

O usuário deve conseguir entender facilmente:

```text
Cluster
 ├── informações do cluster
 ├── quantidade de contatos
 └── contatos pertencentes
```

Clusters também serão utilizados posteriormente como público-alvo dos gatilhos e reativos.

Portanto, a implementação deve permitir que uma automação seja direcionada a:

- um cluster;
- múltiplos clusters;
- um contato específico, quando fizer sentido.

---

# 8. Reativos

**Reativos são um dos dois componentes centrais do produto.**

A ideia é responder automaticamente às mensagens recebidas de usuários.

O sistema deve permitir diferentes níveis de complexidade.

## Nível 1 — Resposta fixa

Exemplo:

```text
Quando receber uma mensagem contendo "preço"

→ Enviar:
"Olá! O produto custa R$ 99."
```

Isso deve permitir criar um bot simples sem necessidade de fluxo complexo.

## Nível 2 — Fluxo de mensagens

Um reativo pode iniciar uma sequência de mensagens/interações.

Exemplo:

```text
Usuário: Quero comprar

→ Enviar: "Qual produto você deseja?"

→ Aguardar resposta

→ Enviar: "Qual é seu nome?"

→ Aguardar resposta

→ Executar ação

→ Finalizar fluxo
```

Isso pode ser utilizado para:

- formulários;
- coleta de dados;
- atendimento automatizado;
- fluxo de compra;
- pré-venda;
- onboarding;
- outros processos conversacionais.

## Nível 3 — IA

A arquitetura deve permitir que futuramente um reativo utilize IA para responder mensagens e conduzir conversas de maneira mais dinâmica.

**Não implementar a IA agora se isso aumentar significativamente o escopo do MVP.**

Apenas evitar uma arquitetura que torne impossível adicionar IA posteriormente.

---

# 9. Gatilhos

O segundo componente central do produto são os **Gatilhos**.

Gatilhos são automações iniciadas por eventos, condições ou horários, e não necessariamente por uma mensagem recebida naquele momento.

Exemplos:

### Horário específico

```text
Todos os dias às 09:00

→ Enviar mensagem
```

### Público específico

```text
Às 10:00

→ Para contatos do cluster "Clientes"

→ Enviar mensagem
```

### Inatividade

```text
Se o contato ficar 7 dias sem enviar mensagem

→ Enviar mensagem de remarketing
```

### Evento

```text
Quando o contato entrar no cluster "Interessados"

→ Aguardar 2 horas

→ Enviar mensagem
```

Os gatilhos devem ser construídos de forma suficientemente genérica para suportar diferentes casos, mas **sem tentar criar um sistema completo de automação empresarial no MVP**.

---

# 10. Ações

Reativos e Gatilhos devem compartilhar uma estrutura de ações.

Para o MVP, priorizar ações como:

- enviar mensagem;
- aguardar determinado período;
- adicionar contato a um cluster;
- remover contato de um cluster;
- iniciar um fluxo;
- iniciar outro gatilho, quando necessário;
- encerrar fluxo/automação.

A estrutura deve ser extensível para futuramente adicionar:

- IA;
- webhooks;
- integrações externas;
- ações adicionais sobre contatos;
- outras automações.

Porém, **não implementar essas funcionalidades agora sem necessidade**.

---

# 11. Editor de fluxos

Não é necessário construir inicialmente um editor visual extremamente sofisticado.

O MVP pode utilizar uma estrutura simples e intuitiva de etapas.

Conceitualmente:

```text
Evento
  ↓
Condição
  ↓
Ação
  ↓
Aguardar
  ↓
Ação
  ↓
Finalizar
```

O importante é que o usuário consiga compreender e configurar o fluxo sem precisar entender a implementação interna.

Se a arquitetura permitir, posteriormente isso poderá evoluir para um editor visual baseado em nós.

---

# 12. Motor de execução

Este é um ponto importante da arquitetura.

Reativos e Gatilhos devem, sempre que possível, utilizar o mesmo mecanismo para executar ações.

Exemplo:

```text
Evento
  ↓
Verificação de condições
  ↓
Execução do fluxo
  ↓
Ação
  ↓
Próxima etapa
```

Isso deve evitar duplicação de lógica entre:

- reativos;
- gatilhos;
- fluxos.

O sistema também precisa considerar execução assíncrona e tarefas que possuem espera, como:

```text
Enviar mensagem
↓
Esperar 2 horas
↓
Enviar mensagem
```

Não bloquear uma requisição HTTP durante esse período.

Para o MVP, utilizar a solução de scheduler/queue/job mais simples e confiável que seja compatível com a arquitetura existente.

**Não criar uma infraestrutura distribuída complexa sem necessidade.**

---

# 13. Dashboard

Criar/refatorar um dashboard simples que ajude o usuário a entender o estado do sistema.

Informações úteis:

- estado da conexão do WhatsApp;
- quantidade de contatos;
- quantidade de clusters;
- reativos ativos;
- gatilhos ativos;
- atividades recentes;
- últimos eventos/logs.

Não transformar o dashboard em um sistema completo de analytics neste momento.

---

# 14. Regras de implementação

Durante toda a refatoração:

### Priorizar

1. Estabilidade.
2. Funcionalidade.
3. UX.
4. Código organizado.
5. Manutenibilidade.
6. Performance adequada.
7. Segurança básica.

### Evitar

- overengineering;
- abstrações sem necessidade;
- refatorações puramente acadêmicas;
- criar sistemas complexos antes das funcionalidades básicas;
- alterar tecnologias sem necessidade;
- apagar funcionalidades existentes sem verificar seu propósito;
- duplicar lógica;
- implementar funcionalidades futuras antes do MVP.

---

# 15. Compatibilidade com a base existente

Antes de modificar grandes partes do projeto:

1. Analise a estrutura atual.
2. Identifique frontend, backend, banco, autenticação e integração com Baileys.
3. Identifique os fluxos já existentes.
4. Identifique o que pode ser reaproveitado.
5. Identifique código legado/problemático.
6. Identifique dependências desatualizadas.
7. Só então comece a refatoração.

**Não assuma que algo está errado apenas por ser código antigo.**

Preserve o que estiver funcionando adequadamente e substitua apenas quando houver benefício claro.

---

# 16. Critério de sucesso do MVP

Ao final, quero conseguir executar o fluxo principal de um usuário real:

```text
Cadastrar
  ↓
Fazer login
  ↓
Conectar WhatsApp
  ↓
Ver conexão funcionando
  ↓
Receber mensagens
  ↓
Ver eventos nos logs
  ↓
Visualizar contatos
  ↓
Criar/organizar clusters
  ↓
Criar um reativo
  ↓
Receber mensagem no WhatsApp
  ↓
Reativo ser executado
  ↓
Enviar resposta
  ↓
Criar um gatilho
  ↓
Gatilho ser executado na condição/horário configurado
  ↓
Executar ações sobre o contato
```

Esse fluxo deve ser **realmente funcional**, não apenas uma interface simulando as funcionalidades.

---

# 17. Prioridade de desenvolvimento

Use esta ordem como referência:

### P0 — Fundação

- analisar/refatorar arquitetura existente;
- autenticação;
- integração atualizada com Baileys;
- conexão/reconexão;
- estado confiável da conexão;
- recebimento/envio de mensagens.

### P1 — Core do produto

- contatos;
- clusters;
- logs;
- reativos;
- ações;
- fluxos básicos;
- gatilhos.

### P2 — UX

- refatoração completa da interface;
- shadcn/ui;
- estados de loading;
- estados vazios;
- erros;
- feedback das ações;
- dashboard.

### P3 — Refinamento

- estabilidade;
- tratamento de edge cases;
- performance;
- segurança;
- limpeza de código;
- testes dos fluxos críticos;
- build e configuração de produção.

---

# 18. Escopo do MVP

O objetivo é um **MVP rápido**.

Se houver conflito entre:

> "fazer uma arquitetura extremamente completa"

e

> "entregar uma versão funcional, estável e extensível"

priorize a segunda opção.

A arquitetura deve ser suficientemente boa para crescer, mas não precisa resolver hoje problemas que ainda não existem.

Funcionalidades como **IA, analytics avançado, integrações externas, editor visual extremamente sofisticado e automações altamente complexas** devem ficar preparadas conceitualmente, mas podem ser deixadas para uma segunda etapa.

O resultado final deve ser um app que **pareça e funcione como um produto**, e não simplesmente uma coleção de telas novas sobre o código antigo.

Antes de implementar cada grande parte, verifique como ela se encaixa na arquitetura existente e evite criar soluções paralelas quando for possível evoluir o que já existe.