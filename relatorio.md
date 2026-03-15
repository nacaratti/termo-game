## Relatório de possíveis otimizações

### Visão geral

- **Qualidade atual**: o código está bem estruturado, com boa separação entre lógica pura (`lib`), estado de jogo (`hooks`) e UI (`components`). Há testes cobrindo as partes críticas.
- **Foco das sugestões**: micro-otimizações de performance/renderização, ergonomia de código, consistência de API e algumas considerações de segurança/empacotamento.

---

### `src/hooks/useGameLogic.js`

- **Evitar recriação de funções a cada render**  
  - **Situação**: `processGuess`, `handleKeyboardPress` e `handleTileFocus` são recriados em todo render, e são passados para vários componentes (`GameBoard`, `Keyboard`, listener global de `keydown`).  
  - **Sugestão**: envolver essas funções em `useCallback` com dependências corretas. Isso reduz re-renders desnecessários de filhos que fazem `React.memo` ou shallow compare de props, além de evitar reinstalação de listeners caso sejam extraídos.

- **Recalcular data do dia apenas uma vez por interação**  
  - **Situação**: `getTodayDateStr()` é chamado múltiplas vezes dentro de `processGuess` e `initializeGame`.  
  - **Sugestão**: capturar `const today = getTodayDateStr();` uma única vez dentro de cada fluxo e reutilizar, evitando chamadas repetidas (mesmo que baratas) e facilitando testes/mocks.

- **Otimizar reconstrução de teclado em `initializeGame`**  
  - **Situação**: o teclado é reconstruído com loops aninhados sobre `submittedGuessesInfo`.  
  - **Sugestão**: a lógica está correta, mas pode ser extraída para uma função pura em `lib/gameLogic.js` (ex: `rebuildUsedLetters(submittedGuessesInfo)`) reutilizável e mais fácil de testar. Isso melhora manutenção e reduz código no hook.

- **Controle de dependências do `useEffect` do teclado físico**  
  - **Situação**: o efeito depende de várias variáveis (`processGuess`, `handleKeyboardPress`, `activeInputCol`, etc.). Como as funções não são memorizadas, o effect é recriado com frequência.  
  - **Sugestão**: após aplicar `useCallback`, o array de dependências ficará mais estável, reduzindo attach/detach do listener. Opcionalmente, mover a lógica de navegação de colunas para dentro de `useGameLogic` para expor uma API ainda mais simples para o componente `App`.

- **Pequena melhoria de UX no backspace**  
  - **Situação**: no `handleKeyboardPress`, quando o usuário pressiona BACKSPACE em uma coluna vazia, o foco anda para trás e apaga a letra anterior, mas o comportamento depende do `activeInputCol`.  
  - **Sugestão**: considerar alinhar este comportamento ao Wordle original (apagar sempre o último caractere preenchido) percorrendo o array de trás para frente. Não é performance, mas melhora consistência de UX.

---

### `src/lib/gameLogic.js`

- **Reuso de constantes e normalização**  
  - **Situação**: `getRandomWord` e `getWordOfTheDay` utilizam `Math.random()` e lógica própria de seleção.  
  - **Sugestão**: padronizar a lógica de seleção de palavras (por exemplo, sempre via índice determinístico por data para modos “do dia” e `Math.random()` apenas para modos “livres”). Isso facilita futuros recursos (modo treino vs modo diário) e reduz duplicação.

- **Pequena otimização na contagem de letras**  
  - **Situação**: o map `available` é preenchido com um loop simples, e depois dois loops (corretos / presentes) percorrem a palavra.  
  - **Sugestão**: a complexidade já é \(O(n)\) com `n = WORD_LENGTH`, então está adequada. Não há necessidade de micro-otimizações aqui; mantenha como está, apenas garantindo que `WORD_LENGTH` continue pequeno (5).

---

### `src/lib/wordOfDay.js`

- **Carregamento da lista de soluções no bundle principal**  
  - **Situação**: `rawSolucoes` é importado diretamente de `../../palavras/solucoes.txt?raw`, o que traz toda a lista de soluções para o bundle onde `initWordOfDay` é usado (jogo principal). Isso contrasta com a estratégia descrita no `README`, onde as soluções deveriam estar apenas no painel admin/lado servidor.  
  - **Riscos**:
    - Aumenta o tamanho do bundle principal.
    - Facilita “cheat” pelo inspeção do bundle.  
  - **Sugestão**:
    - Mover a seleção de palavra do dia totalmente para o backend/Supabase (lista de soluções só no servidor), deixando o front apenas consumir a palavra pronta.
    - Caso precise de fallback offline, usar uma lista reduzida/embaralhada separada ou uma estratégia determinística baseada em `wordList.js`, em vez de importar o arquivo completo de soluções.

- **Determinismo do fallback offline**  
  - **Situação**: o fallback usa `Math.random()` sobre `SOLUTION_WORDS`, o que faz com que a palavra possa mudar entre recarregamentos num mesmo dia em ambiente totalmente offline.  
  - **Sugestão**: usar uma função determinística baseada em `getTodayDateStr()` (por exemplo, `hash(date) % SOLUTION_WORDS.length`) para garantir que a mesma palavra seja usada para todos no mesmo dia mesmo sem Supabase.

- **Compactação e estrutura de cache**  
  - **Situação**: o cache em localStorage serializa `{ date, word }` em base64, o que já é razoável.  
  - **Sugestão**: se quiser micro-otimizar armazenamento e segurança leve:
    - Compactar ainda mais a chave (ex.: datas como inteiros `YYYYMMDD`).
    - Avaliar uso de um nome de chave mais consistente com outros módulos (hoje `_g7x`, `_s1z`, `_p3q` etc.).

---

### `src/lib/stats.js`

- **Normalização de stats e backward compatibility**  
  - **Situação**: `getStats` já mescla valores existentes com `defaultStats`, garantindo compatibilidade e estrutura estável.  
  - **Sugestão**: manter este padrão em outras estruturas de armazenamento local, como `_readDaily`, retornando sempre um shape bem-definido (ex.: `{ resultsByKey: {} }`) para facilitar migrações futuras.

- **Redução de leituras em localStorage**  
  - **Situação**: `_readStats` e `_readDaily` fazem decode/parse em cada chamada. Em apps pequenos isso não é crítico, mas pode crescer.  
  - **Sugestão**: manter um cache em memória semelhante a `_resultsCache` para stats globais, invalidando apenas em operações de escrita (save/reset). Isso reduz acessos a `localStorage` e parsing JSON repetido.

- **Uso de índices no Supabase (lado servidor)**  
  - **Situação**: consultas em `daily_results` filtram por `date` e `word`.  
  - **Sugestão**: garantir que há índices compostos (`(date, word)`) no banco Supabase para manter essas queries performáticas conforme o volume de dados cresce. Isso é uma otimização de infraestrutura, mas importante se o uso aumentar.

---

### `src/lib/gameState.js`

- **Isolamento de schema e versionamento**  
  - **Situação**: `saveGameProgress` e `saveCompletedGame` salvam o mesmo “schema” com flags diferentes (`isGameOver`, `isGameWon`).  
  - **Sugestão**:
    - Incluir um campo de versão (`schemaVersion`) no objeto salvo para facilitar futuras migrações (por exemplo mudança de estrutura de `guesses`/`submittedGuessesInfo`).
    - Padronizar o shape retornado por `getSavedGame`/`getCompletedGame` para ter sempre todos os campos, com defaults, reduzindo checks defensivos no hook.

- **Validação mínima ao carregar**  
  - **Situação**: `getSavedGame` assume que, se data e solução batem, o objeto está íntegro.  
  - **Sugestão**: adicionar uma validação leve (ex.: garantir que `Array.isArray(guesses)` e `Array.isArray(submittedGuessesInfo)`) antes de retornar, descartando dados corrompidos automaticamente.

---

### `src/App.jsx` e `src/main.jsx`

- **Listeners globais mais estáveis**  
  - **Situação**: o efeito que adiciona `window.addEventListener('keydown', ...)` recria o handler quando `activeInputCol`, `currentGuess.length`, `processGuess` ou `handleKeyboardPress` mudam.  
  - **Sugestão**:
    - Após memozar handlers no hook, o número de recriações será reduzido.
    - Alternativamente, mover o listener para dentro de `useGameLogic` e expor apenas o estado/handlers de alto nível, centralizando a lógica e tornando `App` ainda mais “preso” à UI.

- **Detecção de rota admin baseada em URL**  
  - **Situação**: `isAdmin` é calculado via `window.location.pathname.replace(/\/$/, '').endsWith('/admin');`.  
  - **Sugestão**: para evitar falsos positivos em caminhos mais complexos, considerar o uso de um roteador leve (React Router) ou uma checagem mais robusta (`/admin` exato ou prefixos bem definidos). Não é crítico para performance, mas melhora escalabilidade de rotas.

---

### Outras considerações gerais

- **Bundle size e segurança mínima**  
  - **Sugestão**: revisar todos os imports que trazem arquivos grandes (`.txt` de palavras, listas completas de soluções) para garantir que apenas o necessário é carregado no bundle principal do jogador, mantendo o restante em rotas/admin ou no backend.

- **Padronização de chaves de localStorage**  
  - **Sugestão**: consolidar o padrão de chaves internas (`_g7x`, `_s1z`, `_p3q`) em um pequeno módulo `storageKeys.js` ou similar, centralizando os nomes e permitindo futura troca/obfuscação em um só lugar.

- **Monitoramento**  
  - **Sugestão**: caso o uso do Supabase cresça, adicionar logging opcional (ativado apenas em `import.meta.env.DEV` ou via flag) para medir latência/erros das operações mais críticas (`initWordOfDay`, `getDailyResults`, `getGlobalStats`), ajudando a priorizar otimizações reais baseadas em dados de produção.

