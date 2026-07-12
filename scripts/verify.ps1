$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$nodeDir = 'C:\Program Files\nodejs'

Write-Host '[1/4] Backend tests'
Set-Location "$repoRoot\backend"
python -m pytest -q

Write-Host '[2/4] Root tests'
Set-Location $repoRoot
python -m pytest -q

Write-Host '[3/4] Frontend install (npm ci)'
Set-Location "$repoRoot\frontend"
if (Test-Path "$nodeDir\npm.cmd") {
  $env:Path = "$nodeDir;$env:Path"
  & "$nodeDir\npm.cmd" ci
} else {
  npm ci
}

Write-Host '[4/4] Frontend build'
if (Test-Path "$nodeDir\npm.cmd") {
  & "$nodeDir\npm.cmd" run build
} else {
  npm run build
}

Write-Host 'Verification completed.'
