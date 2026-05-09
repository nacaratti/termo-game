@echo off
REM ============================================================
REM Agente Desenvolvedor - Kinto
REM Configure AGENT_DURATION (minutos) como variavel de ambiente
REM ============================================================
cd /d "C:\Users\davin\OneDrive\termo_fake"

if not defined AGENT_DURATION set AGENT_DURATION=30

echo [%date% %time%] Iniciando Dev Agent (duracao: %AGENT_DURATION% min)

claude --print "Leia o arquivo .claude/agent-dev.md e execute as instrucoes do agente desenvolvedor. Tempo disponivel: %AGENT_DURATION% minutos. Trabalhe nos cards do kanban ate o tempo acabar."

echo [%date% %time%] Dev Agent finalizado
