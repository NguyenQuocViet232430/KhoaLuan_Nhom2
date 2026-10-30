$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:PIP_PROGRESS_BAR = 'off'
$appRoot = Split-Path $PSScriptRoot -Parent
$pythonPath = Join-Path $appRoot '.venv-level5/Scripts/python.exe'
if (!(Test-Path -LiteralPath $pythonPath)) { throw 'Run setup-level5.ps1 first.' }
$reltrRoot = Join-Path $appRoot 'models/reltr'
$repoPath = Join-Path $reltrRoot 'RelTR'
New-Item -ItemType Directory -Force -Path $reltrRoot | Out-Null
if (!(Test-Path -LiteralPath (Join-Path $repoPath 'models/reltr.py'))) {
    & git clone --depth 1 'https://github.com/yrcong/RelTR.git' $repoPath
    if ($LASTEXITCODE -ne 0) { throw 'RelTR clone failed.' }
}
& git -C $repoPath fetch --depth 1 origin 'fca7397e9aaeccd95541e83afa4b971f3fa89014'
if ($LASTEXITCODE -ne 0) { throw 'Could not fetch the pinned RelTR source.' }
& git -C $repoPath -c advice.detachedHead=false checkout 'fca7397e9aaeccd95541e83afa4b971f3fa89014'
if ($LASTEXITCODE -ne 0) { throw 'Use the RelTR source commit specified in this script.' }
& $pythonPath -m pip install scipy
if ($LASTEXITCODE -ne 0) { throw 'SciPy installation failed.' }
$env:RELTR_ASSET_ROOT = $reltrRoot
@'
import argparse, hashlib, json, os, pathlib, torch
import gdown
folder = pathlib.Path(os.environ['RELTR_ASSET_ROOT'])
out = folder / 'checkpoint0149.pth'
if out.exists():
    saved = torch.load(out, map_location='cpu', weights_only=True)
    assert 'model' in saved and all(torch.is_tensor(v) for v in saved['model'].values())
    print('Keeping existing tensor-only RelTR weights.')
else:
    source = folder / 'checkpoint0149.full.part'
    if not gdown.download(id='1id6oD_iwiNDD6HyCn2ORgRTIKkPD3tUD', output=str(source), quiet=False, resume=False):
        raise RuntimeError('RelTR download failed')
    def digest(path):
        d = hashlib.sha256()
        with path.open('rb') as f:
            for chunk in iter(lambda: f.read(8*1024*1024), b''): d.update(chunk)
        return d.hexdigest()
    original_hash = digest(source)
    assert original_hash == '2b3601e5cc5d835d9538d78b698dd7b3f4f1646bdb0e5c459d2cbe959d5906b1', 'Unexpected official checkpoint hash'
    # The author's file contains a standard argparse.Namespace for training arguments.
    with torch.serialization.safe_globals([argparse.Namespace]):
        saved = torch.load(source, map_location='cpu', weights_only=True)
    state = saved['model']
    assert state and all(torch.is_tensor(v) and torch.isfinite(v).all() for v in state.values())
    temporary = out.with_suffix('.pth.part')
    torch.save({'model': state}, temporary)
    os.replace(temporary, out)
    receipt = {'source_url': 'https://drive.google.com/file/d/1id6oD_iwiNDD6HyCn2ORgRTIKkPD3tUD/view', 'official_repository': 'https://github.com/yrcong/RelTR', 'repository_commit': 'fca7397e9aaeccd95541e83afa4b971f3fa89014', 'original_sha256': original_hash, 'inference_sha256': digest(out), 'conversion': 'Keep original model tensors; remove optimizer and argparse metadata'}
    (folder/'provenance.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
'@ | & $pythonPath -
if ($LASTEXITCODE -ne 0) { throw 'RelTR preparation failed.' }
$temporaryPath = Join-Path $reltrRoot 'checkpoint0149.full.part'
if (Test-Path -LiteralPath $temporaryPath) {
    $resolvedTemporary = (Resolve-Path -LiteralPath $temporaryPath).Path
    $resolvedRoot = (Resolve-Path -LiteralPath $reltrRoot).Path
    if (!$resolvedTemporary.StartsWith($resolvedRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected temporary file path.' }
    Remove-Item -LiteralPath $resolvedTemporary -Force
}
Write-Host 'RelTR ready. Restart Level 5A servers to load it automatically.'
