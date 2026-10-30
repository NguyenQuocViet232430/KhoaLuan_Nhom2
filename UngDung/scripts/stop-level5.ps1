$ErrorActionPreference = 'Stop'
$appRoot = Split-Path $PSScriptRoot -Parent
$statePath = Join-Path $appRoot 'logs/server-state.json'
if (!(Test-Path -LiteralPath $statePath)) { Write-Host 'No recorded Level 5A server processes.'; return }
$state = Get-Content -Raw -LiteralPath $statePath -Encoding UTF8 | ConvertFrom-Json
foreach ($serverName in @('backend','frontend')) {
    $entry = $state.$serverName
    if (!$entry) { continue }
    $serverProcess = Get-Process -Id $entry.id -ErrorAction SilentlyContinue
    if (!$serverProcess) { continue }
    $expectedStart = ([DateTimeOffset]$entry.startedUtc).UtcDateTime
    if ($serverProcess.StartTime.ToUniversalTime().Ticks -ne $expectedStart.Ticks) {
        throw "PID $($entry.id) now belongs to another process; it was not stopped."
    }
    & taskkill.exe /PID $entry.id /T /F
    if ($LASTEXITCODE -ne 0) { throw "Could not stop $serverName process tree." }
}
Remove-Item -LiteralPath $statePath -Force
Write-Host 'Level 5A servers stopped.'
