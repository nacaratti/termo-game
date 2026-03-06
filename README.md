# Qual é a Palavra?

Clone em português do [Wordle](https://www.nytimes.com/games/wordle/index.html) — adivinhe a palavra de 5 letras em até 6 tentativas.

## Funcionalidades

- **Banco de palavras** gerado a partir do dicionário oficial pt-BR do LibreOffice (Hunspell), com milhares de palavras válidas
- **Palavra do dia** determinada pela data — a mesma para todos no mesmo dia, trocada automaticamente à meia-noite (horário de Brasília)
- **Feedback visual** por cores nos tiles e no teclado virtual:
  - Verde — letra correta na posição certa
  - Amarelo — letra está na palavra, mas em outra posição
  - Cinza — letra não está na palavra
- **Teclado virtual** com teclas coloridas conforme os palpites anteriores
- **Suporte a teclado físico** completo (letras, Backspace, Enter)
- **Validação de dicionário** — apenas palavras existentes são aceitas
- **Estatísticas** do dia e históricas, com distribuição de tentativas
- **Compartilhamento** do resultado em formato emoji (estilo Wordle)
- **Painel admin** (`/admin`) para gerenciar a palavra do dia e visualizar estatísticas

## Banco de palavras

### Fonte

O banco de palavras é derivado do dicionário **pt_BR** do LibreOffice, no formato **Hunspell** (arquivos `pt_BR.aff` + `pt-br.dic`). Esse é o mesmo dicionário usado pelo LibreOffice Writer para correção ortográfica em português brasileiro.

### Pipeline de geração

Os scripts ficam em `palavras/` e devem ser executados nesta ordem:

#### 1. `gerar_banco_completo.py`

Expande o dicionário Hunspell aplicando as regras de sufixação e prefixação do arquivo `.aff`. Isso gera todas as formas válidas da língua: plurais, conjugações verbais, derivadas, etc.

```bash
python palavras/gerar_banco_completo.py
# Saída: palavras/palavras_5_letras.txt
```

- Lê as regras `SFX`/`PFX` do `pt_BR.aff`
- Para cada entrada do `pt-br.dic`, aplica as flags de morfologia
- Filtra apenas palavras de exatamente 5 letras (A–Z + acentos + ç)
- Ignora compostos com hífen, abreviações e números

#### 2. `separar_listas.py`

Divide o banco em duas listas usando a biblioteca [`wordfreq`](https://github.com/rspeer/wordfreq) para medir a frequência de uso de cada palavra no corpus de português:

```bash
python palavras/separar_listas.py
# Saída: palavras/solucoes.txt  (palavras comuns — usadas como palavra do dia)
#        palavras/validas.txt   (todas as palavras — aceitas como palpite)
```

- **`solucoes.txt`** — palavras com frequência >= 3×10⁻⁶ (aprox. 3 ocorrências por milhão). São palavras do cotidiano, adequadas para serem a resposta do dia.
- **`validas.txt`** — todas as palavras do banco. Usada apenas para validar se o palpite do jogador existe no dicionário.

#### 3. `deduplicar.py`

Remove duplicatas de normalização (ex.: `ACABA` e `ACABÁ` normalizam para a mesma forma). Para cada grupo, mantém a variante mais frequente segundo o `wordfreq`; em caso de empate, prefere a forma sem acento.

```bash
python palavras/deduplicar.py
# Atualiza solucoes.txt e validas.txt in-place
```

### Como os arquivos são usados no jogo

| Arquivo | Módulo JS | Uso |
|---|---|---|
| `palavras/solucoes.txt` | `src/data/solutionList.js` | Sorteio da palavra do dia (carregado só no admin) |
| `palavras/validas.txt` | `src/data/wordList.js` | `VALID_WORDS_SET` — validação de palpites em O(1) |

O `wordList.js` importa `validas.txt` como texto bruto via Vite (`?raw`), converte em `Set` normalizado e é carregado no bundle principal. O `solutionList.js` é carregado de forma lazy apenas pelo painel admin, para não expor a lista de soluções ao jogador.

## Stack

| Tecnologia | Versão |
|---|---|
| React | 18 |
| Vite | 4 |
| Tailwind CSS | 3 |
| Framer Motion | 10 |
| Radix UI | — |
| Lucide React | — |

## Rodando localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Pré-visualizar o build
npm run preview
```

### Regenerar o banco de palavras

Requer Python 3.10+ e as dependências:

```bash
pip install wordfreq
```

Em seguida, execute os scripts na ordem descrita acima. Os arquivos `.txt` gerados são lidos diretamente pelo Vite no próximo build.

## Deploy no GitHub Pages

O projeto está configurado para deploy automático no GitHub Pages via GitHub Actions.

### Passos para configurar

1. Faça o push do repositório para o GitHub

2. Vá em **Settings → Pages** e selecione a source **GitHub Actions**

3. Na próxima vez que fizer push na branch `main`, o deploy será feito automaticamente

4. O site ficará disponível em:
   ```
   https://<seu-usuario>.github.io/<nome-do-repositorio>/
   ```

> O workflow em `.github/workflows/deploy.yml` cuida automaticamente do build e deploy, incluindo a configuração correta do `base` URL.

## Estrutura do projeto

```
palavras/
├── pt_BR.aff               # Regras morfológicas Hunspell (pt-BR)
├── pt-br.dic               # Dicionário base Hunspell (pt-BR)
├── gerar_banco_completo.py # Expande o .dic com regras do .aff
├── separar_listas.py       # Separa em solucoes.txt e validas.txt
├── deduplicar.py           # Remove duplicatas de normalização
├── palavras_5_letras.txt   # Banco bruto (saída do passo 1)
├── solucoes.txt            # Palavras comuns (saída final)
└── validas.txt             # Todas as palavras (saída final)

src/
├── components/
│   ├── ui/              # Componentes base (Button, Toast…)
│   ├── GameBoard.jsx    # Tabuleiro e tiles
│   ├── GameHeader.jsx
│   ├── GameStatus.jsx   # Tela de fim de jogo (resultado, ranking, countdown)
│   └── Keyboard.jsx     # Teclado virtual
├── config/
│   └── constants.js     # Constantes globais (WORD_LENGTH, MAX_GUESSES…)
├── data/
│   ├── wordList.js      # VALID_WORDS_SET (validas.txt)
│   └── solutionList.js  # SOLUTION_WORDS (solucoes.txt) — lazy, só no admin
├── hooks/
│   └── useGameLogic.js  # Toda a lógica do jogo
├── lib/
│   ├── gameLogic.js     # Funções puras (checkGuess, getTileStyling…)
│   ├── wordOfDay.js     # Palavra do dia (localStorage, troca à meia-noite BRT)
│   ├── customWords.js   # Palavras customizadas (admin)
│   ├── stats.js         # Estatísticas (diárias e históricas)
│   └── normalize.js     # Remove acentos para comparação
├── App.jsx
├── index.css
└── main.jsx
```

## Licença

MIT
