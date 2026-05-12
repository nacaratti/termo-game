@echo off
REM ============================================================
REM Agente Desenvolvedor - Kinto
REM Configure AGENT_DURATION (minutos) como variavel de ambiente
REM ============================================================
cd /d "%~dp0.."

if not defined AGENT_DURATION set AGENT_DURATION=30

echo [%date% %time%] Iniciando Dev Agent (duracao: %AGENT_DURATION% min)

claude --dangerously-skip-permissions --print "Leia o arquivo .claude/agent-dev.md e execute as instrucoes do agente desenvolvedor. Tempo disponivel: %AGENT_DURATION% minutos. Trabalhe nos cards do kanban ate o tempo acabar."

set EXIT_CODE=%errorlevel%
echo [%date% %time%] Dev Agent finalizado (exit %EXIT_CODE%)

if not %EXIT_CODE%==0 (
  echo Erro detectado, enviando alerta Telegram...
  node scripts/notify-failure.mjs dev_agent %EXIT_CODE%
)
