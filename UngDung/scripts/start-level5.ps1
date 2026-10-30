param([ValidateSet('auto','cpu','cuda:0')][string]$Device = 'auto')
$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONDONTWRITEBYTECODE = '1'
$appRoot = Split-Path $PSScriptRoot -Parent
$pythonPath = Join-Path $appRoot '.venv-level5/Scripts/python.exe'
$backendPath = Join-Path $appRoot 'Fontend/image-captioning-baseline'
$frontendPath = Join-Path $appRoot 'Fontend/webapp'
$vitePath = Join-Path $frontendPath 'node_modules/vite/bin/vite.js'
if (-not (Test-Path -LiteralPath $pythonPath)) { throw 'Run scripts/setup-level5.ps1 first.' }
if (-not (Test-Path -LiteralPath $vitePath)) { throw 'Run npm.cmd ci in Fontend/webapp first.' }
foreach ($port in @(8000, 5173)) {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
    try { $listener.Start() }
    catch { throw "Port $port is occupied. Stop the old server in its terminal before starting Level 5A." }
    finally { $listener.Stop() }
}
$env:LEVEL5_MODEL_DIR = Join-Path $appRoot 'models/level5'
$env:LEVEL5_DEVICE = $Device
$env:NLTK_DATA = Join-Path $env:LEVEL5_MODEL_DIR 'nltk_data'
$env:VITE_API_MODE = 'real'
$env:VITE_API_BASE_URL = 'http://localhost:8000'
$logPath = Join-Path $appRoot 'logs'
New-Item -ItemType Directory -Force -Path $logPath | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backendProcess = Start-Process -FilePath $pythonPath -ArgumentList @('-m','uvicorn','backend.main:app','--host','127.0.0.1','--port','8000','--workers','1') -WorkingDirectory $backendPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logPath "$stamp-backend.out.log") -RedirectStandardError (Join-Path $logPath "$stamp-backend.err.log")
try {
    $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
    $frontendProcess = Start-Process -FilePath $nodePath -ArgumentList @(('"' + $vitePath + '"'),'--host','127.0.0.1','--port','5173','--strictPort') -WorkingDirectory $frontendPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logPath "$stamp-frontend.out.log") -RedirectStandardError (Join-Path $logPath "$stamp-frontend.err.log")
} catch {
    Stop-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
    throw
}
$serverState = @{
    backend = @{ id = $backendProcess.Id; startedUtc = $backendProcess.StartTime.ToUniversalTime().ToString('o') }
    frontend = @{ id = $frontendProcess.Id; startedUtc = $frontendProcess.StartTime.ToUniversalTime().ToString('o') }
}
$serverState | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $logPath 'server-state.json') -Encoding UTF8
Write-Host "Backend PID: $($backendProcess.Id); frontend PID: $($frontendProcess.Id)"
Write-Host "Dashboard: http://localhost:5173 | Health: http://localhost:8000/api/health"
Write-Host "Logs: $logPath (prefix $stamp). Initial model/CLIP loading can take several minutes."
Write-Host 'Stop these servers with scripts/stop-level5.ps1 (also stops their child processes).'
