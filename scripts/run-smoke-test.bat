@echo off
REM ============================================================
REM Smoke test sintético do Kinto — sensor de saúde de produção
REM Roda diariamente as 08h30 (antes do watchdog das 9h)
REM ============================================================
cd /d "%~dp0.."

REM Carrega .env para o ambiente
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
  if not "%%a"=="" if not "%%a:~0,1%"=="#" set "%%a=%%b"
)

node scripts/smoke-test.mjs
node scripts/check-client-errors.mjs
