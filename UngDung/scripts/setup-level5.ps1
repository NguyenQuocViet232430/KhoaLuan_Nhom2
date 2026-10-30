param(
    [string]$PythonExe = 'python',
    [ValidateSet('cpu','cu124')][string]$TorchBuild = 'cpu'
)
$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:PIP_PROGRESS_BAR = 'off'
$appRoot = Split-Path $PSScriptRoot -Parent
$venvPath = Join-Path $appRoot '.venv-level5'
$pythonPath = Join-Path $venvPath 'Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) {
    & $PythonExe -c "import sys; assert (3,10) <= sys.version_info[:2] <= (3,12), 'Use Python 3.10-3.12 (3.11/3.12 recommended)'"
    if ($LASTEXITCODE -ne 0) { throw 'Select Python 3.11/3.12 using -PythonExe.' }
    & $PythonExe -m venv $venvPath
    if ($LASTEXITCODE -ne 0) { throw 'Could not create .venv-level5.' }
}
& $pythonPath -m pip install --upgrade pip setuptools wheel
if ($LASTEXITCODE -ne 0) { throw 'pip setup failed.' }
# Known matched pair; CPU works without an NVIDIA GPU. cu124 requires a suitable NVIDIA driver.
& $pythonPath -m pip install 'torch==2.6.0' 'torchvision==0.21.0' --index-url "https://download.pytorch.org/whl/$TorchBuild"
if ($LASTEXITCODE -ne 0) { throw 'PyTorch installation failed.' }
& $pythonPath -m pip install -r (Join-Path $appRoot 'Fontend/image-captioning-baseline/requirements-level5.txt')
if ($LASTEXITCODE -ne 0) { throw 'Backend dependencies failed.' }
$env:NLTK_DATA = Join-Path $appRoot 'models/level5/nltk_data'
& $pythonPath -m nltk.downloader -d $env:NLTK_DATA wordnet omw-1.4
if ($LASTEXITCODE -ne 0) { Write-Warning 'WordNet download failed. Runtime will report labels/aliases-only fallback.' }
Push-Location (Join-Path $appRoot 'Fontend/webapp')
try {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
} finally { Pop-Location }
Write-Host 'Dependencies ready. Verify the assets in models/level5, then run scripts/start-level5.ps1.'
