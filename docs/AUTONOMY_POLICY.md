# Política de Autonomia dos Agentes

Esta política define o que o Dev Agent pode fazer sozinho com
`--dangerously-skip-permissions` versus o que **exige revisão humana**
antes de executar. O modelo é "deploy direto na main", então o
mecanismo de governança é **prevenir** que o Dev pegue cards perigosos
em vez de **bloquear** após o fato.

## Regra principal

Cards no kanban podem ter o label `needs-human`. **O Dev Agent não
executa cards com esse label**; ele apenas os pula e segue para o
próximo. O dono decide quando e como executar.

O CEO Agent é instruído a marcar `needs-human` em cards que toquem
qualquer item da lista abaixo. Se o Dev Agent encontrar um card de
priority 3 sem label `needs-human` que, ao analisar, cai em uma
categoria sensível, ele deve adicionar o label antes de pular.

## ✅ O Dev Agent pode fazer sozinho

- Editar código React/JS/CSS em `src/`
- Adicionar/modificar testes em `src/lib/*.test.js`
- Escrever scripts em `scripts/` que NÃO mexam em secrets ou config global
- Commitar e dar push direto na `main` (deploy automático na Vercel)
- Criar arquivos novos em `src/`, `docs/`, `scripts/` (exceto os listados abaixo)
- Mexer em `package.json` apenas para registrar scripts npm novos
  (não para adicionar/atualizar dependências — ver abaixo)
- Atualizar `.claude/agent-dev.md` e `.claude/agent-ceo.md` para refletir
  decisões que ele próprio tomou e quer documentar

## ⚠️ Precisa de label `needs-human` (Dev pula)

### Banco de dados
- Qualquer migration nova em `supabase/migrations/`
- Mudança de schema (tabelas, colunas, índices, policies RLS)
- Apagar dados em produção
- Mexer em policies de RLS

### Dependências
- Adicionar nova dependência no `package.json` (`npm install <X>`)
- Atualizar versão major de qualquer dependência
- Remover dependência usada por código atual

### Configuração e secrets
- Modificar `.env`, `.env.example` (só estrutura — nunca valores reais)
- Modificar `vite.config.js` em formas que afetem build/deploy
- Modificar `vercel.json` ou `vercel.ts`
- Mexer em arquivos de credenciais (.json de service account, etc.)
- Adicionar/remover env vars no Vercel (precisa ser feito pelo dono direto na UI)

### Infra dos agentes
- Modificar `.claude/settings.local.json` (permissões automáticas)
- Modificar `scripts/setup-tasks.ps1` ou os `.bat` (mudaria como os agentes rodam)
- Adicionar/remover tasks no Windows Task Scheduler
- Mexer em `scripts/agent-watchdog.mjs`, `scripts/notify-failure.mjs`,
  `scripts/record-usage.mjs` (a infra de monitoramento dos agentes)

### Operações externas
- Contratar serviços pagos
- Subir release pública/anúncio
- Mandar email/mensagem em massa
- Comprar domínio
- Ativar AdSense, Stripe, ou qualquer plataforma de pagamento

## Como o Dev Agent processa um card `needs-human`

1. Pega o card via `get-today-card.mjs`
2. Se as `labels` contêm `needs-human`:
   - **NÃO mova o card para in_progress**
   - Logue: `node scripts/supabase-agent.mjs log dev_agent card_skipped_needs_human '{"card_id":"<id>"}'`
   - Pegue o próximo card
3. Se nenhum card "executável" disponível, encerre a sessão

## Como o CEO Agent decide aplicar `needs-human`

Ao criar um card, se a descrição menciona QUALQUER um destes verbos
sobre os itens da lista acima, adicione o label:

- "criar tabela", "alterar schema", "rodar migration"
- "instalar pacote", "adicionar dependência", "atualizar versão"
- "modificar `.env`", "ativar variável de ambiente"
- "configurar OAuth", "criar service account", "gerar API key"
- "comprar", "contratar", "ativar conta paga"
- "publicar post", "anunciar release"

Quando em dúvida, marque com `needs-human` — é mais seguro pedir
aprovação humana do que executar algo sensível por engano.

## Quando o dono executa um card `needs-human`

1. Abre o `/admin > Kanban`
2. Lê a descrição
3. Faz a ação manualmente (rodar SQL no Supabase, instalar pacote,
   configurar conta, etc.)
4. Edita o card removendo o label `needs-human`, OU move direto para
   `done` se a tarefa estiver completa
5. Se ainda faltar trabalho de código (ex: depois do dono criar a
   tabela, o Dev precisa escrever os queries), remove `needs-human`
   e deixa o card em `todo` para o Dev pegar na próxima sessão
