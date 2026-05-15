# ============================================================
# Setup das tasks agendadas para os agentes do Kinto
# Execute como Administrador na pasta do projeto:
#   PowerShell > Run as Administrator > navegue ate o projeto
#   > .\scripts\setup-tasks.ps1
# ============================================================

$ProjectDir = (Resolve-Path "$PSScriptRoot\..").Path
$DevBat = Join-Path $ProjectDir "scripts\run-dev-agent.bat"
$CeoBat = Join-Path $ProjectDir "scripts\run-ceo-agent.bat"

Write-Host "Projeto: $ProjectDir" -ForegroundColor Cyan
Write-Host "Criando task: Kinto Dev Agent (diario as 20h)..." -ForegroundColor Cyan

$devAction = New-ScheduledTaskAction `
  -Execute "cmd.exe" `
  -Argument "/c `"$DevBat`"" `
  -WorkingDirectory $ProjectDir

$devTrigger = New-ScheduledTaskTrigger -Daily -At "20:00"

$devSettings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 35)

Register-ScheduledTask `
  -TaskName "Kinto Dev Agent" `
  -Action $devAction `
  -Trigger $devTrigger `
  -Settings $devSettings `
  -Description "Agente desenvolvedor autonomo do Kinto - diario as 20h, 30min" `
  -Force

Write-Host "OK: Kinto Dev Agent criado!" -ForegroundColor Green

# -----------------------------------------------------------

Write-Host "Criando task: Kinto CEO Agent (sextas as 20h)..." -ForegroundColor Cyan

$ceoAction = New-ScheduledTaskAction `
  -Execute "cmd.exe" `
  -Argument "/c `"$CeoBat`"" `
  -WorkingDirectory $ProjectDir

$ceoTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At "20:00"

$ceoSettings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 35)

Register-ScheduledTask `
  -TaskName "Kinto CEO Agent" `
  -Action $ceoAction `
  -Trigger $ceoTrigger `
  -Settings $ceoSettings `
  -Description "Agente CEO do Kinto - sextas as 20h, relatorio semanal" `
  -Force

Write-Host "OK: Kinto CEO Agent criado!" -ForegroundColor Green

# -----------------------------------------------------------

Write-Host "Criando task: Kinto Watchdog (diario as 9h)..." -ForegroundColor Cyan

$WatchdogBat = Join-Path $ProjectDir "scripts\run-watchdog.bat"

$wdAction = New-ScheduledTaskAction `
  -Execute "cmd.exe" `
  -Argument "/c `"$WatchdogBat`"" `
  -WorkingDirectory $ProjectDir

$wdTrigger = New-ScheduledTaskTrigger -Daily -At "09:00"

$wdSettings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

Register-ScheduledTask `
  -TaskName "Kinto Watchdog" `
  -Action $wdAction `
  -Trigger $wdTrigger `
  -Settings $wdSettings `
  -Description "Watchdog do Kinto - verifica se os agentes rodaram e alerta via Telegram se algum falhou" `
  -Force

Write-Host "OK: Kinto Watchdog criado!" -ForegroundColor Green

# -----------------------------------------------------------

Write-Host "Criando task: Kinto Smoke Test (diario as 08h30)..." -ForegroundColor Cyan

$SmokeBat = Join-Path $ProjectDir "scripts\run-smoke-test.bat"

$smokeAction = New-ScheduledTaskAction `
  -Execute "cmd.exe" `
  -Argument "/c `"$SmokeBat`"" `
  -WorkingDirectory $ProjectDir

$smokeTrigger = New-ScheduledTaskTrigger -Daily -At "08:30"

$smokeSettings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

Register-ScheduledTask `
  -TaskName "Kinto Smoke Test" `
  -Action $smokeAction `
  -Trigger $smokeTrigger `
  -Settings $smokeSettings `
  -Description "Smoke test do Kinto - checa saude do site e erros de cliente, alerta no Telegram" `
  -Force

Write-Host "OK: Kinto Smoke Test criado!" -ForegroundColor Green

# -----------------------------------------------------------

Write-Host "Criando task: Kinto Analytics Pull (diario as 07h00)..." -ForegroundColor Cyan

$AnalyticsBat = Join-Path $ProjectDir "scripts\run-pull-analytics.bat"

$paAction = New-ScheduledTaskAction `
  -Execute "cmd.exe" `
  -Argument "/c `"$AnalyticsBat`"" `
  -WorkingDirectory $ProjectDir

$paTrigger = New-ScheduledTaskTrigger -Daily -At "07:00"

$paSettings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

Register-ScheduledTask `
  -TaskName "Kinto Analytics Pull" `
  -Action $paAction `
  -Trigger $paTrigger `
  -Settings $paSettings `
  -Description "Pull diario de metricas GA4 + PSI para product_metrics" `
  -Force

Write-Host "OK: Kinto Analytics Pull criado!" -ForegroundColor Green

# -----------------------------------------------------------

Write-Host "Criando task: Kinto E2E (diario as 19h30)..." -ForegroundColor Cyan

$E2EBat = Join-Path $ProjectDir "scripts\run-e2e.bat"

$e2eAction = New-ScheduledTaskAction `
  -Execute "cmd.exe" `
  -Argument "/c `"$E2EBat`"" `
  -WorkingDirectory $ProjectDir

$e2eTrigger = New-ScheduledTaskTrigger -Daily -At "19:30"

$e2eSettings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

Register-ScheduledTask `
  -TaskName "Kinto E2E" `
  -Action $e2eAction `
  -Trigger $e2eTrigger `
  -Settings $e2eSettings `
  -Description "Testes E2E Playwright contra kinto.fun - cria card se falhar" `
  -Force

Write-Host "OK: Kinto E2E criado!" -ForegroundColor Green

Write-Host ""
Write-Host "Tasks criadas com sucesso! Verifique no Agendador de Tarefas." -ForegroundColor Yellow
Write-Host "  - Kinto Analytics Pull: todo dia as 7h (GA4 + PageSpeed)"
Write-Host "  - Kinto Smoke Test:     todo dia as 8h30 (checa saude do site)"
Write-Host "  - Kinto Watchdog:       todo dia as 9h (verifica execucoes + saude)"
Write-Host "  - Kinto E2E:            todo dia as 19h30 (Playwright em producao)"
Write-Host "  - Kinto Dev Agent:      todo dia as 20h (30min)"
Write-Host "  - Kinto CEO Agent:      sextas as 20h"
Write-Host ""
Write-Host "A flag -StartWhenAvailable garante que Smoke Test e Watchdog"
Write-Host "rodam mesmo se o PC tiver estado desligado no horario, assim que ligar."
Write-Host ""
Write-Host "Para testar manualmente:"
Write-Host '  schtasks /Run /TN "Kinto Analytics Pull"'
Write-Host '  schtasks /Run /TN "Kinto Smoke Test"'
Write-Host '  schtasks /Run /TN "Kinto Watchdog"'
Write-Host '  schtasks /Run /TN "Kinto E2E"'
Write-Host '  schtasks /Run /TN "Kinto Dev Agent"'
Write-Host '  schtasks /Run /TN "Kinto CEO Agent"'

Read-Host "Pressione Enter para fechar"
