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

Write-Host ""
Write-Host "Tasks criadas com sucesso! Verifique no Agendador de Tarefas." -ForegroundColor Yellow
Write-Host "  - Kinto Dev Agent: todo dia as 20h (30min)"
Write-Host "  - Kinto CEO Agent: sextas as 20h"
Write-Host "  - Kinto Watchdog:  todo dia as 9h (verifica execucoes do dia anterior)"
Write-Host ""
Write-Host "A flag -StartWhenAvailable no Watchdog garante que ele roda"
Write-Host "mesmo se o PC tiver estado desligado as 9h, assim que o PC ligar."
Write-Host ""
Write-Host "Para testar manualmente:"
Write-Host '  schtasks /Run /TN "Kinto Dev Agent"'
Write-Host '  schtasks /Run /TN "Kinto CEO Agent"'
Write-Host '  schtasks /Run /TN "Kinto Watchdog"'

Read-Host "Pressione Enter para fechar"
