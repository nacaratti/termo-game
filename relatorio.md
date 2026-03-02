# Relatório Técnico — Pentada (Termo Fake)
**Data:** 2026-03-02
**Engenheiro responsável:** Análise de código Claude Code
**Versão analisada:** branch `main` (commit `78f29c1`)

---

## 1. Resumo Executivo

O jogo **Pentada** é um clone do Wordle em português, com suporte a múltiplos jogadores via Supabase (PostgreSQL remoto) e painel administrativo. A análise identificou **2 bugs críticos** que impedem o funcionamento correto do placar diário e do registro de palavras, além de **9 oportunidades de melhoria** técnica e de experiência do usuário.

---

## 2. Bugs Críticos Identificados

### Bug #1 — Placar não exibe resultados acumulados do dia

**Arquivo:** `src/components/GameStatus.jsx` · `src/lib/stats.js`
**Severidade:** Alta — funcionalidade central do jogo quebrada

#### Causa Raiz

A função `getDailyResults` (em `stats.js`) usa a seguinte lógica de fallback:

```js
// stats.js — comportamento atual (INCORRETO)
export const getDailyResults = async (dateStr) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_results')
        .select('won, attempts')
        .eq('date', dateStr);
      if (!error && data) return data;  // ← retorna [] se Supabase responde, mas vazio
    } catch { /* cai no fallback */ }   // ← fallback SÓ se lançar exceção
  }
  // localStorage nunca é consultado quando Supabase está configurado e responde
  const all = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
  return all[dateStr] || [];
};
```

**O problema:** O fallback para `localStorage` só é acionado se o Supabase **lançar uma exceção** (ex: timeout, sem conexão). Se o Supabase responde com `{ data: [], error: null }` — o que acontece quando:
- A tabela existe mas a RLS (Row Level Security) bloqueia o SELECT anônimo
- A RLS bloqueia o INSERT e os dados nunca foram gravados
- A tabela `daily_results` está vazia

→ A função retorna `[]` **sem consultar o localStorage**, silenciando os dados locais.

#### Segunda causa: race condition no salvamento

Em `useGameLogic.js`, `saveDailyResult` é chamado sem `await` dentro de um handler síncrono:

```js
// useGameLogic.js — linha 124 (jogo ganho)
saveGameResult(true, currentAttempt + 1);
saveDailyResult(today, true, currentAttempt + 1); // ← async, não é aguardado

// 1650ms depois, o modal abre e chama getDailyResults()
// O INSERT no Supabase pode ainda não ter concluído
```

Se o Supabase demorar mais que 1650ms para confirmar o INSERT (latência de rede), o `getDailyResults` executado pela abertura do modal não encontrará o resultado atual.

#### Evidência no código

```js
// GameStatus.jsx — linha 32-35
useEffect(() => {
  if (!isOpen) return;
  getDailyResults(today).then(setTodayResults); // busca ao abrir o modal
}, [isOpen, today]);
```

A busca é feita apenas uma vez quando `isOpen` muda para `true`. Não há retry, polling ou escuta em tempo real.

#### Impacto
- Placar sempre aparece vazio, mesmo após múltiplos jogos
- A seção "Ranking de hoje" nunca é renderizada (`todayResults.length > 0` nunca satisfeito)

---

### Bug #2 — Tabela `daily_words` não armazena dados

**Arquivo:** `src/lib/stats.js` · `AdminApp.jsx`
**Severidade:** Média — palavra do dia só persiste localmente, não globalmente

#### Causa Raiz

```js
// stats.js — saveDailyWord
export const saveDailyWord = async (dateStr, word) => {
  if (!supabase) return;
  try {
    await supabase.from('daily_words').upsert({ date: dateStr, word: word.toUpperCase() });
  } catch { /* ignore */ } // ← falha silenciosa
};
```

```js
// AdminApp.jsx — handleChange (WordOfDayPanel)
setWordOfDay(upper);       // ← salva em localStorage (sucesso visual imediato)
setCurrentWord(upper);
setNewWord('');
saveDailyWord(today, upper); // ← async, sem await, sem feedback de erro
setFeedback({ type: 'ok', msg: `Palavra alterada para "${upper}". Recarregue o jogo para aplicar.` });
```

**O problema:** O admin recebe a mensagem de sucesso verde **antes** de `saveDailyWord` concluir. Se o upsert falhar (tabela inexistente, RLS bloqueando, schema errado), o erro é engolido silenciosamente. A palavra fica salva apenas no `localStorage` do navegador do admin — qualquer outro dispositivo continuará vendo a palavra calculada pelo algoritmo padrão.

#### Possíveis causas da falha no Supabase
1. A tabela `daily_words` não foi criada no banco
2. RLS não permite INSERT/UPDATE de usuários anônimos
3. A coluna `word` possui constraint de tamanho diferente de 5

#### Impacto
- Palavra customizada pelo admin **não propaga** para outros jogadores
- Histórico no painel admin exibe palavras calculadas (algoritmo) em vez das palavras reais configuradas
- Admin não tem feedback sobre falhas de persistência

---

## 3. Correções Recomendadas

### Fix #1 — `getDailyResults` com merge correto

**Lógica:** mesclar dados do Supabase com dados locais, garantindo que o resultado atual sempre apareça:

```js
// stats.js — versão corrigida
export const getDailyResults = async (dateStr) => {
  // Sempre carrega o cache local (dados do dispositivo atual)
  let localResults = [];
  try {
    const all = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
    localResults = all[dateStr] || [];
  } catch { /* ignore */ }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_results')
        .select('won, attempts')
        .eq('date', dateStr);

      if (!error && data && data.length > 0) {
        // Supabase tem dados — usa como fonte principal
        return data;
      }
    } catch { /* fallback abaixo */ }
  }

  // Fallback: dados locais (inclui resultado do dispositivo atual)
  return localResults;
};
```

### Fix #2 — Feedback de erro no admin ao salvar palavra

```js
// AdminApp.jsx — handleChange corrigido
const handleChange = async (e) => {
  e.preventDefault();
  const upper = newWord.toUpperCase().trim();
  if (upper.length !== 5) return setFeedback({ type: 'error', msg: 'A palavra deve ter exatamente 5 letras.' });
  if (!/^[A-Z]+$/.test(upper)) return setFeedback({ type: 'error', msg: 'Use apenas letras sem acentos.' });

  setWordOfDay(upper);
  setCurrentWord(upper);
  setNewWord('');

  try {
    await saveDailyWord(today, upper);
    setFeedback({ type: 'ok', msg: `Palavra "${upper}" salva com sucesso.` });
  } catch {
    setFeedback({ type: 'warning', msg: `Palavra "${upper}" salva localmente. Erro ao sincronizar com o banco.` });
  }
  setTimeout(() => setFeedback(null), 5000);
};
```

E `saveDailyWord` deve lançar o erro em vez de engolir:

```js
// stats.js — saveDailyWord corrigido
export const saveDailyWord = async (dateStr, word) => {
  if (!supabase) return;
  const { error } = await supabase
    .from('daily_words')
    .upsert({ date: dateStr, word: word.toUpperCase() });
  if (error) throw error; // propaga para o chamador dar feedback
};
```

### Fix #3 — SQL para criação das tabelas no Supabase

```sql
-- Tabela de resultados diários (já deve existir, verificar RLS)
create table if not exists daily_results (
  id bigint generated always as identity primary key,
  date text not null,
  won boolean not null,
  attempts integer not null,
  created_at timestamptz default now()
);

-- Tabela de palavras do dia (pode estar faltando)
create table if not exists daily_words (
  date text primary key,
  word text not null check (length(word) = 5),
  updated_at timestamptz default now()
);

-- RLS: permitir leitura e escrita anônima (jogadores não autenticados)
alter table daily_results enable row level security;
create policy "allow anonymous insert" on daily_results
  for insert with check (true);
create policy "allow anonymous select" on daily_results
  for select using (true);

alter table daily_words enable row level security;
create policy "allow anonymous insert" on daily_words
  for insert with check (true);
create policy "allow anonymous update" on daily_words
  for update using (true);
create policy "allow anonymous select" on daily_words
  for select using (true);
```

---

## 4. Oportunidades de Melhoria

### 4.1 Segurança — Senha de admin exposta no código-fonte

**Arquivo:** `AdminApp.jsx`, linha 7
**Risco:** Alto

```js
const ADMIN_PASSWORD = 'termo@admin'; // ← hardcoded no bundle JavaScript
```

A senha está visível a qualquer pessoa que inspecione o bundle do app em produção. Um atacante pode acessar o painel admin sem restrições.

**Recomendação:** Usar autenticação Supabase (Auth) com usuário administrador. A senha nunca deve ficar no frontend.

---

### 4.2 Palavra do dia: inconsistência entre dispositivos

**Arquivo:** `src/lib/wordOfDay.js`

A função `getWordOfDay` usa `localStorage` como fonte principal da palavra customizada. Se o admin altera a palavra em um dispositivo, outros jogadores continuam vendo a palavra padrão calculada por algoritmo. A correção do Bug #2 ajudará, mas é necessário também que os jogadores **consultem o Supabase** ao iniciar o jogo.

**Recomendação:** Em `getWordOfDay`, adicionar uma busca assíncrona no Supabase ao inicializar o jogo para buscar se o admin configurou uma palavra para hoje.

---

### 4.3 Palavra do dia: fuso horário

**Arquivo:** `src/lib/wordOfDay.js`, linha 6-8

```js
export const getTodayDateStr = () => {
  const d = new Date(); // ← usa hora local do navegador do jogador
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
```

Se o jogo tem jogadores em fusos horários diferentes, a "palavra do dia" muda em horários diferentes para cada um. Um jogador em São Paulo pode já estar no dia seguinte enquanto outro em Lisboa ainda está no dia anterior.

**Recomendação:** Usar UTC como fuso de referência, ou sincronizar a data com o servidor Supabase.

---

### 4.4 Anti-cheat: validação de palavras sem consulta ao servidor

**Arquivo:** `src/lib/customWords.js`

Toda a validação de palavras acontece no frontend. Um jogador pode inspecionar o JavaScript e descobrir a palavra do dia sem jogar.

**Recomendação:** Para um jogo competitivo, a palavra não deveria ser transmitida ao cliente. O ideal é uma API que receba as tentativas e retorne apenas os status (correct/present/absent), nunca expondo a solução.

---

### 4.5 Sem proteção contra múltiplos jogos no mesmo dia via localStorage

**Arquivo:** `src/lib/gameState.js`

O bloqueio "já jogou hoje" é baseado no `localStorage`. Limpar o storage do navegador permite jogar quantas vezes quiser no mesmo dia, inflando as estatísticas globais do Supabase.

**Recomendação:** Registrar um identificador de sessão anônimo (UUID armazenado em `localStorage`) e usá-lo como chave única por data na tabela `daily_results` com constraint `UNIQUE(date, player_id)`.

---

### 4.6 Erros de rede completamente silenciosos

Em todos os arquivos que interagem com Supabase, os erros são capturados e descartados sem logging:

```js
} catch { /* ignora erros de rede silenciosamente */ }
```

Isso torna impossível diagnosticar problemas em produção.

**Recomendação:** Adicionar logging estruturado (ex: `console.error` em dev, serviço de error tracking em prod):

```js
} catch (err) {
  if (import.meta.env.DEV) console.error('[Supabase]', err);
}
```

---

### 4.7 `getGlobalStats` calcula médias com lógica incorreta

**Arquivo:** `src/lib/stats.js`, linha 240 (AdminApp.jsx)

```js
// AdminApp.jsx
const avgAttempts = stats.wins > 0
  ? (stats.totalAttempts / stats.totalGames).toFixed(1) // ← divide por TOTAL, não por vitórias
  : '–';
```

A divisão `totalAttempts / totalGames` inclui derrotas (que contam `MAX_GUESSES = 6` tentativas independente de quando erraram). A média de tentativas faz mais sentido calculada apenas sobre as vitórias.

**Recomendação:**
```js
const avgAttempts = stats.wins > 0
  ? (stats.totalAttempts / stats.wins).toFixed(1)
  : '–';
```

---

### 4.8 Modo para jogar múltiplos jogos por dia (modo treino)

Atualmente o jogo bloqueia uma única partida por dia. Uma melhoria de UX seria um **modo treino** (palavra aleatória, sem impacto nas estatísticas globais) disponível após o jogo diário ser concluído.

---

### 4.9 Acessibilidade (a11y)

- Não há atributos `aria-label` nas teclas do teclado virtual
- As tiles do tabuleiro não comunicam o status para leitores de tela
- O contraste de algumas cores (zinc-500 sobre zinc-900) pode não atingir WCAG AA

---

## 5. Checklist de Ações

| # | Prioridade | Ação | Arquivo |
|---|-----------|------|---------|
| 1 | 🔴 Crítico | Criar tabelas `daily_results` e `daily_words` no Supabase com RLS correto | Supabase SQL Editor |
| 2 | 🔴 Crítico | Corrigir `getDailyResults` para não retornar `[]` quando Supabase está vazio mas localStorage tem dados | `src/lib/stats.js` |
| 3 | 🔴 Crítico | Corrigir `saveDailyWord` para propagar erros e dar feedback real ao admin | `src/lib/stats.js` + `AdminApp.jsx` |
| 4 | 🟠 Alta | Remover senha hardcoded do frontend e usar Supabase Auth | `AdminApp.jsx` |
| 5 | 🟠 Alta | Adicionar consulta ao Supabase para buscar palavra do dia ao iniciar o jogo | `src/lib/wordOfDay.js` |
| 6 | 🟡 Média | Padronizar fuso horário para UTC na `getTodayDateStr` | `src/lib/wordOfDay.js` |
| 7 | 🟡 Média | Adicionar logging de erros Supabase (pelo menos em dev) | `src/lib/stats.js` |
| 8 | 🟡 Média | Corrigir cálculo de média de tentativas (dividir por vitórias) | `AdminApp.jsx` |
| 9 | 🟢 Baixa | Implementar modo treino (palavra aleatória pós-jogo diário) | `src/hooks/useGameLogic.js` |
| 10 | 🟢 Baixa | Melhorar acessibilidade (aria-labels, contraste) | Componentes |

---

## 6. Arquitetura Atual

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│                                                         │
│  App.jsx                                                │
│    └── useGameLogic.js (estado do jogo)                │
│          ├── wordOfDay.js   (palavra → localStorage)   │
│          ├── stats.js       (resultados → Supabase)    │
│          └── gameState.js   (sessão → localStorage)    │
│                                                         │
│  AdminApp.jsx (painel admin)                           │
│    ├── stats.js  (leitura/escrita Supabase)            │
│    └── wordOfDay.js (override local da palavra)        │
└────────────────────────┬────────────────────────────────┘
                         │ @supabase/supabase-js
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase (PostgreSQL)                  │
│                                                         │
│  daily_results  { id, date, won, attempts, created_at } │
│  daily_words    { date PK, word, updated_at }           │
└─────────────────────────────────────────────────────────┘
```

**Ponto de atenção:** A palavra do dia percorre dois caminhos distintos — o algoritmo determinístico (frontend) e o override do admin (localStorage → Supabase). Esses dois caminhos não estão sincronizados para os jogadores, o que causa inconsistência.

---

## 7. Conclusão

Os dois bugs críticos têm a mesma causa raiz: **erros do Supabase são engolidos silenciosamente**, e as funções de fallback não cobrem o cenário mais comum (Supabase configurado mas tabelas/RLS incorretos). A correção primária — e mais rápida de implementar — é garantir que as políticas de RLS no Supabase permitam inserts e selects anônimos nas tabelas `daily_results` e `daily_words`.

As melhorias de segurança (remoção da senha hardcoded) são igualmente urgentes para um ambiente de produção acessível publicamente.
