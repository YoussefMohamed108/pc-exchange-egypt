param([ValidateSet('install','status','disable','resume')][string]$Action = 'status')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskName = 'PC Exchange Egypt - Backend'
$taskState = Join-Path $taskRoot '.artifacts\backend'
function Stop-ProjectSupervisor {
  $taskRunnerPath = Join-Path $PSScriptRoot 'autostart.mjs'
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($taskRunnerPath) } | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
}
if ($Action -eq 'install') {
  if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { Stop-ScheduledTask -TaskName $taskName }
  Stop-ProjectSupervisor
  $taskNode = (Get-Command node.exe).Source
  $taskDocker = (Get-Command docker.exe).Source
  $taskCloudflared = (Get-Command cloudflared.exe).Source
  if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'infrastructure\backend\.env'))) { throw 'Configure the backend first.' }
  New-Item -ItemType Directory -Force -Path $taskState | Out-Null
  $taskUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  $taskVercel = Join-Path $taskState 'vercel'
  New-Item -ItemType Directory -Force -Path $taskVercel | Out-Null
  # The app's login profile can be virtualized and invisible to Task Scheduler.
  # Reuse a private local CLI store; never put credentials in task arguments or logs.
  if (-not (Test-Path -LiteralPath (Join-Path $taskVercel 'auth.json'))) {
    foreach ($taskFile in @('auth.json','config.json')) {
      Copy-Item -LiteralPath (Join-Path $env:APPDATA ('com.vercel.cli\Data\' + $taskFile)) -Destination (Join-Path $taskVercel $taskFile)
    }
  }
  & icacls.exe $taskVercel /inheritance:r /grant:r ($taskUser + ':(OI)(CI)F') 'SYSTEM:(OI)(CI)F' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not restrict the private CLI store.' }
  @{ node = $taskNode; docker = $taskDocker; dockerDir = (Split-Path $taskDocker); cloudflaredDir = (Split-Path $taskCloudflared); vercelConfig = $taskVercel } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskState 'autostart-config.json') -Encoding utf8
  $taskArguments = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + (Join-Path $PSScriptRoot 'run-autostart.ps1') + '"'
  $taskAction = New-ScheduledTaskAction -Execute (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -Argument $taskArguments -WorkingDirectory $taskRoot
  $taskTrigger = New-ScheduledTaskTrigger -AtLogOn -User $taskUser
  $taskTrigger.Delay = 'PT20S'
  $taskPrincipal = New-ScheduledTaskPrincipal -UserId $taskUser -LogonType Interactive -RunLevel Limited
  $taskSettings = New-ScheduledTaskSettingsSet -Hidden -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
  Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -Principal $taskPrincipal -Settings $taskSettings -Description 'Starts installed PC Exchange backend and restores its public tunnel after Windows sign-in. Reuses current Vercel production source when connection changes.' -Force | Out-Null
  Remove-Item -LiteralPath (Join-Path $taskState 'autostart.paused') -ErrorAction SilentlyContinue
  Start-ScheduledTask -TaskName $taskName
} elseif ($Action -eq 'disable') {
  Disable-ScheduledTask -TaskName $taskName | Out-Null
  Stop-ScheduledTask -TaskName $taskName
  Stop-ProjectSupervisor
  Write-Output 'Automatic startup disabled. Running backend containers and tunnel are preserved.'
} elseif ($Action -eq 'resume') {
  Remove-Item -LiteralPath (Join-Path $taskState 'autostart.paused') -ErrorAction SilentlyContinue
  Enable-ScheduledTask -TaskName $taskName | Out-Null
  Start-ScheduledTask -TaskName $taskName
}
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName,State
if (Test-Path -LiteralPath (Join-Path $taskState 'autostart-status.json')) { Get-Content -LiteralPath (Join-Path $taskState 'autostart-status.json') }
