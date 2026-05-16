@echo off
REM ============================================================
REM Agente Desenvolvedor - Kinto
REM Configure AGENT_DURATION (minutos) como variavel de ambiente
REM ============================================================
cd /d "%~dp0.."

REM Carrega .env para o ambiente (Claude e scripts node herdam)
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
  if not "%%a"=="" set "%%a=%%b"
)

if not defined AGENT_DURATION set AGENT_DURATION=30

echo [%date% %time%] Iniciando Dev Agent (duracao: %AGENT_DURATION% min)

REM Output em JSON para capturar tokens. stderr separado para nao
REM contaminar o JSON.
set OUTFILE=%TEMP%\kinto-dev-agent.json
claude --dangerously-skip-permissions --print --output-format json "Leia o arquivo .claude/agent-dev.md e execute as instrucoes do agente desenvolvedor. Tempo disponivel: %AGENT_DURATION% minutos. Trabalhe nos cards do kanban ate o tempo acabar." > "%OUTFILE%"

set EXIT_CODE=%errorlevel%
echo [%date% %time%] Dev Agent finalizado (exit %EXIT_CODE%)

REM Grava uso de tokens em agent_usage (nao bloqueia em caso de falha)
node scripts/record-usage.mjs dev_agent "%OUTFILE%" %EXIT_CODE%

if not %EXIT_CODE%==0 (
  echo Erro detectado, enviando alerta Telegram...
  node scripts/notify-failure.mjs dev_agent %EXIT_CODE%
)
