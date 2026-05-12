# Kinto — Wordle em Português

> Um clone do [Wordle](https://www.nytimes.com/games/wordle/index.html) em português brasileiro **mantido e evoluído por agentes de inteligência artificial autônomos**.

Adivinhe a palavra oculta em até 6 ou 7 tentativas, com modos de 5 e 6 letras.

🎮 **Jogar**: `/` (5 letras) ou `/6` (6 letras)
📈 **Acompanhar evolução**: `/changelog`
💬 **Deixar comentário**: `/comments`

---

## ✨ O que torna esse projeto único

Este não é só mais um clone de Wordle. É um **experimento aberto de desenvolvimento autônomo**: dois agentes de IA cuidam do projeto diariamente, com supervisão humana mínima, e o objetivo é torná-lo financeiramente sustentável em 6 meses.

Todo o progresso é público: você acompanha o roadmap, o registro de atualizações, a receita arrecadada e a contagem regressiva até o prazo final na página `/changelog`.

---

## 🤖 Os agentes

### Dev Agent — desenvolvedor full-stack
**Roda diariamente às 20h por 30 minutos** via Windows Task Scheduler.

- Lê o quadro Kanban e pega a tarefa do dia (ordenada por prioridade e data agendada)
- Implementa a feature/bug/otimização do card
- Roda `npm test` e corrige se algo quebrou
- Faz commit descritivo e push, deploy automático no Vercel
- Move o card para "Done" no kanban, registra no changelog público
- Foco em **segurança, performance, otimização e UX**
- Pode criar cards novos se encontrar bugs ou oportunidades durante o trabalho

Instruções em [`.claude/agent-dev.md`](.claude/agent-dev.md).

### CEO Agent — produto e estratégia
**Roda semanalmente às sextas 20h.**

- Analisa kanban, logs, comentários dos usuários, métricas, git log da semana
- Pensa em estratégias de **rentabilização** (ads, premium, doações, parcerias)
- Planeja a semana do Dev criando 5–7 cards com prioridades e datas agendadas
- Gera relatório semanal e envia via Telegram com:
  - Resumo do que foi feito
  - Caminho até a rentabilização (% do prazo, métricas-chave, receita)
  - Decisões necessárias do dono (S/N para features pedidas, ações externas)
- Pode propor a criação de novos agentes especializados (Marketing, Analytics, Designer…) quando fizer sentido

Instruções em [`.claude/agent-ceo.md`](.claude/agent-ceo.md).

---

## 🎯 Meta de 6 meses

O CEO Agent recebeu uma missão clara: **tornar o Kinto rentável até 9 de novembro de 2026.**

A página pública `/changelog` mostra em tempo real:
- 💰 Total arrecadado (soma de todas as fontes registradas)
- 🎮 Jogos jogados
- 💬 Comentários dos usuários
- ✅ Atualizações concluídas
- ⏳ Contagem regressiva até o prazo, com barra de progresso temporal

Toda receita é registrada em `revenue_entries` via `scripts/add-revenue.mjs`. O total aparece publicamente, detalhes (origem, descrição) ficam privados.

---

## 🎮 Modos de jogo

| Modo | Letras | Tentativas | URL |
|---|---|---|---|
| **Clássico** | 5 | 6 | `/` |
| **Desafio** | 6 | 7 | `/6` |

Cada modo tem palavra do dia independente, estatísticas e progresso separados.

---

## 🛠 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 4 + Tailwind CSS 3 + Framer Motion |
| Banco | Supabase (Postgres + Auth + RLS) |
| Auth | Email/senha (admin) + Google OAuth (comentários) |
| Deploy | Vercel (push para `main` → deploy automático) |
| Agentes | Claude Code CLI + Windows Task Scheduler |
| Testes | Vitest + jsdom |

---

## 🚀 Rodando localmente

```bash
# 1. Clone e instale dependências
git clone <seu-fork>
cd termo_fake
npm install

# 2. Copie o template de variáveis de ambiente
cp .env.example .env
# Preencha os valores reais (veja seção "Configuração" abaixo)

# 3. Rode o servidor de desenvolvimento
npm run dev
# → http://localhost:5173
```

### Outros comandos

```bash
npm run build      # Build de produção
npm run preview    # Preview do build
npm test           # Roda os testes (160+ casos)
```

---

## ⚙️ Configuração

### 1. Supabase

Crie um projeto novo no [Supabase](https://supabase.com) e copie a URL e as keys para o `.env` de acordo com `.env.example`

- Caso queira o código sql entrar em contato com davinacaratti@gmail.com.

### 2. Telegram (opcional, só para o CEO Agent)

Crie um bot no [@BotFather](https://t.me/botfather), pegue o token e o chat ID (envie uma mensagem ao bot e consulte `https://api.telegram.org/bot<TOKEN>/getUpdates`).

### 3. Agentes (opcional)

Para ativar os agentes autônomos, instale o [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) e crie as tasks no Windows Task Scheduler:

```powershell
# Como administrador, na raiz do projeto:
.\scripts\setup-tasks.ps1
```

Isso cria:
- **Kinto Dev Agent** — diário às 20h, limite de 35 min
- **Kinto CEO Agent** — toda sexta às 20h

Os agentes leem `.claude/agent-dev.md` e `.claude/agent-ceo.md` para saber como agir.

---

## 📁 Estrutura

```
.claude/
├── agent-dev.md           # Instruções do Dev Agent
├── agent-ceo.md           # Instruções do CEO Agent
└── settings.local.json    # Permissões automáticas dos agentes

scripts/
├── supabase-agent.mjs     # CLI dos agentes para CRUD no Supabase
├── plan-week.mjs          # CEO: cria batch de cards da semana
├── get-today-card.mjs     # Dev: pega o card agendado pra hoje
├── add-revenue.mjs        # Registra entrada de receita
├── add-done.mjs           # Registra feature manual no changelog
├── agent-status.mjs       # Consulta estado dos agentes
├── telegram.mjs           # Envia mensagem via Telegram Bot
├── run-dev-agent.bat      # Trigger do Task Scheduler — Dev
├── run-ceo-agent.bat      # Trigger do Task Scheduler — CEO
├── setup-tasks.ps1        # Cria as tasks no Windows
└── schema-*.sql           # Migrações Supabase

src/
├── main.jsx               # Roteamento (/, /6, /admin, /changelog, /comments)
├── App.jsx                # Jogo principal
├── AdminApp.jsx           # Painel administrativo
├── ChangelogApp.jsx       # Página pública de evolução
├── CommentsApp.jsx        # Página de comentários
├── components/
│   ├── GameBoard.jsx, Keyboard.jsx, GameHeader.jsx…
│   ├── ChangelogCard.jsx, GoalSection.jsx, CommentsSection.jsx
│   └── admin/
│       ├── KanbanBoard.jsx
│       ├── ActivityLog.jsx
│       └── CardForm.jsx
├── hooks/
│   ├── useGameLogic.js
│   └── useIsMobile.js
├── lib/
│   ├── supabase.js, gameLogic.js, gameState.js…
│   └── normalize.js
├── config/
│   ├── constants.js
│   └── gameModes.js
└── data/
    ├── wordList.js, solutionList.js
    └── wordList6.js, solutionList6.js

palavras/
├── pt_BR.aff, pt-br.dic   # Dicionário Hunspell (LibreOffice pt-BR)
├── *.py                   # Pipeline de geração das listas
└── *.txt                  # Listas geradas
```

---

## 🔐 Painel Admin (`/admin`)

Acesso via login Supabase. O painel mostra:

- **Palavra · 5 / Palavra · 6** — gerenciar palavra do dia, ver resultados do dia
- **Estatísticas** — métricas globais por modo
- **Histórico** — palavras anteriores com taxas de acerto
- **Palavras** — adicionar/remover palavras customizadas, blacklist
- **Kanban** — quadro completo com 5 colunas, drag-and-drop, criar/editar cards
- **Atividade** — log cronológico das ações dos agentes

---

## 🗄️ Banco de palavras

Derivado do dicionário **pt_BR** do LibreOffice (formato Hunspell). Pipeline em `palavras/`:

1. **`gerar_banco_completo.py`** — expande o `.dic` aplicando as regras `SFX`/`PFX` do `.aff`
2. **`separar_listas.py`** — divide em soluções comuns (palavra do dia) e válidas (palpites aceitos) usando `wordfreq`
3. **`deduplicar.py`** — remove duplicatas de normalização, prefere forma sem acento

```bash
pip install wordfreq
python palavras/gerar_banco_completo.py
python palavras/separar_listas.py
python palavras/deduplicar.py
```

O mesmo pipeline existe para 6 letras (`*_6.py`).

---

## 🧪 Testes

160+ casos cobrindo a lógica do jogo, estado, normalização, palavra do dia e palavras customizadas.

```bash
npm test                 # Roda tudo
npm run test:watch       # Modo watch
```

> **Nota Windows**: o script já inclui `VITEST_MAX_FORKS=1`, necessário para evitar conflitos com OneDrive.

---

## 🎨 Design

Dark theme consistente em todas as páginas:

| Cor | Hex | Uso |
|---|---|---|
| Background | `#16181d` | Fundo principal |
| Card | `#1e2028` | Containers |
| Surface | `#22252f` | Elementos elevados |
| Border | `#2c2f3a` | Bordas |
| Correto | `#6aaa64` | Letra na posição certa |
| Presente | `#c9a84c` | Letra na palavra |
| Ausente | `#383b4a` | Letra fora |

Fonte: **Inter** (Google Fonts). Ícones: **lucide-react**.

---

## 🤝 Contribuindo

Este projeto é um experimento aberto. Contribuições são bem-vindas:

- **Bugs**: abra uma issue ou deixe comentário em `/comments` — o CEO Agent lê toda semana
- **Sugestões**: também via `/comments` (o CEO pode transformar em card)
- **Pull requests**: bem-vindos, mas avise antes para evitar conflito com o Dev Agent

---

## 📜 Licença

[MIT](LICENSE) — código.

O dicionário em `palavras/pt-br.dic` e `palavras/pt_BR.aff` é do LibreOffice pt-BR language pack, distribuído sob seus próprios termos (GPL/LGPL/MPL multi-licença).
