# Qual é a Palavra?

Clone do jogo [Termo](https://term.ooo) em português — adivinhe a palavra de 5 letras em até 6 tentativas.

## Funcionalidades

- **Banco de palavras** com mais de 796 palavras válidas do dicionário português (sem acentos)
- **Palavra do dia** determinada pela data — a mesma para todos no mesmo dia
- **Botão Nova Palavra** para sortear uma palavra aleatória e praticar à vontade
- **Feedback visual** por cores nos tiles e no teclado virtual:
  - 🟩 **Verde** — letra correta na posição certa
  - 🟨 **Amarelo** — letra está na palavra, mas em outra posição
  - ⬜ **Cinza** — letra não está na palavra
- **Teclado virtual** com teclas ausentes desabilitadas e apagadas visualmente
- **Suporte a teclado físico** completo (letras, Backspace, Enter, setas ←→)
- **Modal de instruções** acessível pelo botão "Sobre"
- **Validação de dicionário** — apenas palavras existentes são aceitas

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
src/
├── components/
│   ├── ui/              # Componentes base (Button, Toast…)
│   ├── GameBoard.jsx    # Tabuleiro e tiles
│   ├── GameControls.jsx # Botões Nova Palavra e Sobre
│   ├── GameFooter.jsx
│   ├── GameHeader.jsx
│   ├── GameStatus.jsx   # Tela de fim de jogo
│   ├── GuessInput.jsx
│   └── Keyboard.jsx     # Teclado virtual
├── config/
│   └── constants.js     # Constantes e re-exportação do wordList
├── data/
│   └── wordList.js      # Banco de palavras (SOLUTION_WORDS + VALID_WORDS_SET)
├── hooks/
│   └── useGameLogic.js  # Toda a lógica do jogo
├── lib/
│   └── gameLogic.js     # Funções puras (checkGuess, getTileStyling…)
├── App.jsx
├── index.css
└── main.jsx
```

## Licença

MIT
