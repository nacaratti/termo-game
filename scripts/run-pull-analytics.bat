@echo off
REM ============================================================
REM Pull-analytics do Kinto — coleta GA4 + PSI do dia anterior
REM Roda diariamente as 07h00 (dados do dia anterior ja
REM consolidados no GA4)
REM ============================================================
cd /d "%~dp0.."

REM Carrega .env para o ambiente
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
  if not "%%a"=="" if not "%%a:~0,1%"=="#" set "%%a=%%b"
)

node scripts/pull-analytics.mjs
