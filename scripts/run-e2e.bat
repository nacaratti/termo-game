@echo off
REM ============================================================
REM Playwright E2E - sensor de fluxos de UI em producao
REM Roda diariamente as 19h30 (meia hora antes do Dev Agent),
REM contra kinto.fun
REM ============================================================
cd /d "%~dp0.."

REM Carrega .env para o ambiente
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
  if not "%%a"=="" set "%%a=%%b"
)

node scripts/e2e-run.mjs
