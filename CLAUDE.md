# Kinto — Wordle em Português

## Stack
- React 18 + Vite + Tailwind CSS + Framer Motion
- Supabase (backend, auth, database)
- Deploy: Vercel (auto-deploy on push to main)
- Testes: Vitest (jsdom)

## Estrutura
```
src/
  main.jsx            — roteamento: /, /6, /admin, /changelog
  App.jsx             — jogo principal
  AdminApp.jsx        — painel admin
  ChangelogApp.jsx    — página pública de evolução
  components/         — componentes React
  components/admin/   — KanbanBoard, ActivityLog, CardForm
  hooks/              — useGameLogic, useIsMobile
  lib/                — supabase, stats, gameState, wordOfDay, customWords
  config/             — constants, gameModes
  data/               — wordList, solutionList (5 e 6 letras)
scripts/
  supabase-agent.mjs  — CLI para interagir com Supabase (cards, logs, changelog)
  telegram.mjs        — enviar mensagens via Telegram Bot API
  agent-status.mjs    — status atual dos agentes
```

## Convenções
- Dark theme: bg=#16181d, card=#1e2028, surface=#22252f, border=#2c2f3a
- Cores: correct=#6aaa64, present=#c9a84c, absent=#383b4a
- Font: Inter (Google Fonts)
- Ícones: lucide-react
- Componentes UI primitivos definidos em AdminApp.jsx (Card, Input, BtnPrimary, BtnGhost)

## Regras para Agentes
- Sempre rodar `npm test` antes de commitar
- Mensagens de commit descritivas em português, referenciando o card_id quando aplicável
- Logar toda ação via: `node scripts/supabase-agent.mjs log <agent> <action> '<details_json>'`
- Nunca commitar .env, secrets, ou service role keys
- Manter compatibilidade com o dark theme existente
- Preferir editar arquivos existentes a criar novos
- Testes em `src/lib/*.test.js` usando Vitest

## Registrar mudanças manuais no changelog
Quando o admin (ou um colaborador via Claude Code) implementa uma feature manualmente **fora do fluxo do kanban** (ou seja, sem um card existente no quadro), e quiser que apareça na página pública `/changelog`, use:

```
node scripts/add-done.mjs "Titulo" "Descricao opcional" [label]
```

- Labels válidos: `feature`, `bug`, `improvement`, `optimization`, `refactor`, `docs`, `test`
- Use `internal` para mudanças que NÃO devem aparecer publicamente (configurações, refatorações internas, etc.)
- Se Claude Code está fazendo a mudança a pedido do admin e **não há card no kanban**, deve rodar esse comando ao final de uma feature significativa, sem perguntar.

**NUNCA rode `add-done.mjs` para uma tarefa que já existe como card no kanban** — isso cria duplicata em `/changelog`. Se a tarefa veio de um card, basta mover para `done` com `node scripts/supabase-agent.mjs move <card_id> done`. Se o título do card está muito técnico para o público, edite o título do próprio card ao invés de criar um novo.
