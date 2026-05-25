# Reconfigura as tarefas do Task Scheduler para serem resilientes:
# - Roda mesmo na bateria
# - Roda ao ligar o PC se perdeu o horario agendado (StartWhenAvailable)
# - Nao exige sessao interativa (LogonType S4U)
#
# Rodar como Administrador:
#   powershell -ExecutionPolicy Bypass -File scripts\fix-tasks.ps1

$ErrorActionPreference = "Stop"

# --- Dev Agent ---
$devAction   = New-ScheduledTaskAction -Execute "C:\Users\davin\OneDrive\termo_fake\scripts\run-dev-agent.bat"
$devTrigger  = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday,Monday,Tuesday,Wednesday,Thursday,Saturday -At 20:00
$devSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$devPrincipal = New-ScheduledTaskPrincipal -UserId "davin" -LogonType S4U -RunLevel Limited

Register-ScheduledTask -TaskName "Kinto Dev Agent" -Action $devAction -Trigger $devTrigger -Settings $devSettings -Principal $devPrincipal -Force
Write-Host "Kinto Dev Agent reconfigurado com sucesso" -ForegroundColor Green

# --- CEO Agent ---
$ceoAction   = New-ScheduledTaskAction -Execute "C:\Users\davin\OneDrive\termo_fake\scripts\run-ceo-agent.bat"
$ceoTrigger  = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At 20:00
$ceoSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$ceoPrincipal = New-ScheduledTaskPrincipal -UserId "davin" -LogonType S4U -RunLevel Limited

Register-ScheduledTask -TaskName "Kinto CEO Agent" -Action $ceoAction -Trigger $ceoTrigger -Settings $ceoSettings -Principal $ceoPrincipal -Force
Write-Host "Kinto CEO Agent reconfigurado com sucesso" -ForegroundColor Green

Write-Host ""
Write-Host "Ambas as tarefas agora:" -ForegroundColor Cyan
Write-Host "  - Rodam mesmo na bateria"
Write-Host "  - Rodam ao ligar o PC se perderam o horario"
Write-Host "  - Nao exigem sessao interativa"
