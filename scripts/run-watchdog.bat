@echo off
REM ============================================================
REM Watchdog Kinto — verifica se os agentes rodaram
REM Roda diariamente as 9h (PC ja deve estar ligado)
REM ============================================================
cd /d "%~dp0.."

REM Carrega .env para o ambiente
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
  if not "%%a"=="" if not "%%a:~0,1%"=="#" set "%%a=%%b"
)

node scripts/agent-watchdog.mjs
