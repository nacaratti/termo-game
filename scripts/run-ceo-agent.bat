@echo off
REM ============================================================
REM Agente CEO - Kinto (execucao semanal)
REM ============================================================
cd /d "%~dp0.."

REM Carrega .env para o ambiente (necessario para scripts node abaixo)
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
  if not "%%a"=="" if not "%%a:~0,1%"=="#" set "%%a=%%b"
)

echo [%date% %time%] Calculando north-star da semana...
node scripts/compute-north-star.mjs

echo [%date% %time%] Iniciando CEO Agent

set OUTFILE=%TEMP%\kinto-ceo-agent.json
claude --dangerously-skip-permissions --print --output-format json "Leia o arquivo .claude/agent-ceo.md e execute as instrucoes do agente CEO. Gere o relatorio semanal, crie cards de propostas e envie o resumo via Telegram." > "%OUTFILE%"

set EXIT_CODE=%errorlevel%
echo [%date% %time%] CEO Agent finalizado (exit %EXIT_CODE%)

REM Grava uso de tokens em agent_usage (nao bloqueia em caso de falha)
node scripts/record-usage.mjs ceo_agent "%OUTFILE%" %EXIT_CODE%

if not %EXIT_CODE%==0 (
  echo Erro detectado, enviando alerta Telegram...
  node scripts/notify-failure.mjs ceo_agent %EXIT_CODE%
)
