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

Write-Host ""
Write-Host "Tasks criadas com sucesso! Verifique no Agendador de Tarefas." -ForegroundColor Yellow
Write-Host "  - Kinto Dev Agent: todo dia as 20h (30min)"
Write-Host "  - Kinto CEO Agent: sextas as 20h"
Write-Host ""
Write-Host "Para testar manualmente:"
Write-Host '  schtasks /Run /TN "Kinto Dev Agent"'
Write-Host '  schtasks /Run /TN "Kinto CEO Agent"'

Read-Host "Pressione Enter para fechar"
