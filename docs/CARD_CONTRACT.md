# Contrato de Card — como escrever um bom card no kanban

Todo card que o CEO Agent cria (e que o Dev Agent executa) deve seguir
este contrato. O objetivo é que cada sessão de 30 min do Dev entregue
algo que **importa para a meta**, não só "código bonito".

## Estrutura da descrição do card

A descrição (`description`) deve conter, em linguagem clara:

1. **Hipótese** — por que isso vale a pena? Que problema resolve ou que
   métrica deveria mover? Ex: *"Jogadores abandonam na primeira tela;
   um tutorial mais curto pode aumentar a retenção do dia 1."*

2. **Critério de aceitação mensurável** — como saber que terminou e deu
   certo? Ex: *"O tutorial tem no máximo 3 telas e pode ser fechado em
   1 clique. Verificável abrindo /."* Evite critérios vagos como
   "melhorar a UX".

3. **Risco / rollback** — o que pode dar errado e como desfazer? Ex:
   *"Baixo risco. Se quebrar, reverter o commit restaura o tutorial
   anterior."*

4. **Como validar em produção** — depois do deploy, como confirmar que
   funcionou? Ex: *"Abrir https://kinto.fun em aba anônima e conferir
   o fluxo do tutorial."*

## Campos do card

- `priority`: 0 (baixa) a 3 (urgente). Bugs de produção e segurança = 3.
- `labels`: `feature`, `bug`, `optimization`, `performance`, `security`,
  `ux`, `test`, `refactor`, `docs`, `internal`.
  - `internal` → não aparece na página pública `/changelog`. Use para
    cards sobre os próprios agentes/infra.
- `scheduled_for`: data em que o Dev deve pegar o card (YYYY-MM-DD).

## Regras de escopo

- Um card deve caber em **uma sessão de 30 min**. Se for maior, o CEO
  deve quebrá-lo em sub-cards entregáveis individualmente.
- Cards que mexem em **migrations de banco, dependências, secrets/`.env`
  ou config de build/deploy** devem receber o label `needs-human` — o
  Dev Agent não os executa sozinho (ver `docs/AUTONOMY_POLICY.md`).

## Privacidade

Títulos e descrições de cards (sem label `internal`) aparecem
publicamente em `/changelog`. Nunca inclua: nomes de usuários, trechos
literais de comentários, paths locais, credenciais, stack traces.
Detalhe técnico vai em `activity_logs`, não no card.

## Exemplo de card bem escrito

> **Título:** Reduzir tamanho do bundle inicial
>
> **Descrição:**
> Hipótese: o bundle inicial está grande e pode atrasar o primeiro
> carregamento em conexões móveis, afetando a retenção. Critério de
> aceitação: o JS inicial baixa abaixo de 250 KB gzip, verificável no
> build (`npm run build` mostra os tamanhos). Risco: baixo — se algo
> quebrar, reverter o commit. Validar em produção: abrir kinto.fun no
> Lighthouse mobile e conferir o tempo de carregamento.
>
> **priority:** 1 · **labels:** performance · **scheduled_for:** 2026-05-20
