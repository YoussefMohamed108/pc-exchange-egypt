$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskConfig = Get-Content -LiteralPath (Join-Path $taskRoot '.artifacts\backend\autostart-config.json') -Raw | ConvertFrom-Json
$taskProcess = Start-Process -FilePath $taskConfig.node -ArgumentList ('"' + (Join-Path $PSScriptRoot 'autostart.mjs') + '"') -WorkingDirectory $taskRoot -WindowStyle Hidden -Wait -PassThru
exit $taskProcess.ExitCode
