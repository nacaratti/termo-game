# Runbook — Operação dos agentes Kinto

Guia rápido para resolver os problemas mais comuns em até 5 minutos.
Os agentes rodam localmente via Windows Task Scheduler.

## Tasks agendadas

| Task | Quando | O que faz |
|---|---|---|
| Kinto Smoke Test | diário 08h30 | Checa se o site está no ar; checa erros de cliente |
| Kinto Watchdog | diário 09h00 | Verifica se os agentes rodaram + saúde do site; alerta no Telegram |
| Kinto Dev Agent | diário 20h00 | Implementa o card do dia |
| Kinto CEO Agent | sexta 20h00 | Planeja a semana, manda relatório |

---

## Sintoma: recebi alerta "Dev Agent não rodou ontem"

**Causa provável:** PC estava desligado às 20h, ou a task falhou.

1. Confira se o PC fica ligado às 20h. Se não, considere mudar o horário da task no Agendador de Tarefas.
2. Rode manualmente para recuperar o dia:
   ```
   scripts\run-dev-agent.bat
   ```
3. Se falhar na hora, veja o sintoma "Claude sem quota" abaixo.

## Sintoma: recebi alerta "sessão começou mas não terminou"

**Causa provável:** o Claude ficou sem tokens no meio da sessão, travou, ou bateu o limite de tempo da task (35 min).

1. Rode `node scripts/agent-status.mjs` para ver o estado do kanban.
2. Veja se algum card ficou preso em `in_progress`. Se sim, decida: mover de volta para `todo` (pelo /admin > Kanban) ou deixar o próximo Dev Agent continuar.
3. Rode `scripts\run-dev-agent.bat` manualmente se quiser recuperar.

## Sintoma: recebi alerta "Site com problema" / smoke test falhou

**Causa provável:** deploy quebrado, Vercel fora do ar, ou erro de runtime.

1. Abra o site no navegador: https://kinto.fun — confirme o que está quebrado.
2. Veja os últimos commits: `git log --oneline -5`. Se o último commit causou, considere reverter:
   ```
   git revert HEAD
   git push
   ```
3. Já existe um card de prioridade alta no kanban — o Dev Agent vai pegar na próxima sessão. Se for urgente, rode `scripts\run-dev-agent.bat` agora.

## Sintoma: "Claude sem quota" / Dev ou CEO falham imediatamente

**Causa provável:** assinatura do Claude Code esgotou a janela de uso.

1. Abra o Claude Code manualmente e veja a mensagem de quota.
2. Espere a janela renovar (5h no plano Pro) ou faça upgrade.
3. Rode o `.bat` correspondente manualmente quando a quota voltar.

## Sintoma: nenhum alerta há dias, mas desconfio que algo está errado

1. Rode `node scripts/agent-status.mjs` — mostra cards e atividade recente.
2. Rode `node scripts/agent-watchdog.mjs` manualmente — força a verificação.
3. Confira no Agendador de Tarefas (Win+R → `taskschd.msc`) se as 4 tasks existem e estão habilitadas.

## Sintoma: o Telegram parou de receber mensagens

1. Teste: `node scripts/telegram.mjs "teste"` (com o `.env` carregado).
2. Se der erro de token: o bot pode ter sido revogado. Gere novo token no @BotFather e atualize `TELEGRAM_BOT_TOKEN` no `.env`.

## Reconfigurar tudo do zero

Se as tasks sumiram ou o PC foi formatado:
```
PowerShell como Administrador, na raiz do projeto:
.\scripts\setup-tasks.ps1
```

## Contatos de infra

- Hospedagem: Vercel (deploy automático no push para `main`)
- Banco: Supabase
- Bot: Telegram (@BotFather para gerenciar)
