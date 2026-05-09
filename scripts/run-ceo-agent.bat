@echo off
REM ============================================================
REM Agente CEO - Kinto (execucao semanal)
REM ============================================================
cd /d "C:\Users\davin\OneDrive\termo_fake"

echo [%date% %time%] Iniciando CEO Agent

claude --print "Leia o arquivo .claude/agent-ceo.md e execute as instrucoes do agente CEO. Gere o relatorio semanal, crie cards de propostas e envie o resumo via Telegram."

echo [%date% %time%] CEO Agent finalizado
