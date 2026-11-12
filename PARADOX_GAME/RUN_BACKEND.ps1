$ErrorActionPreference = "Stop"
$backendDir = Join-Path $PSScriptRoot "backend"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"

try {
    $localData = $env:LOCALAPPDATA
    if ([string]::IsNullOrWhiteSpace($localData)) {
        $localData = Join-Path $env:USERPROFILE "AppData\Local"
    }
    $accountDir = Join-Path $localData "PARADOX"
    New-Item -ItemType Directory -Force -Path $accountDir | Out-Null
    $env:PARADOX_DB_PATH = Join-Path $accountDir "paradox_accounts.sqlite3"

    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/system/health" -TimeoutSec 2
        if ($health.build -eq "persistent-auth-starfix-2026-11-05") {
            Write-Host "[PARADOX] This PARADOX backend is already running." -ForegroundColor Green
            exit 0
        }
        throw "A different/older server is already using port 8000. Close the old PARADOX backend window, then double-click paradox.bat again."
    } catch {
        if ($_.Exception.Message -like "*different/older server*") { throw }
        try {
            $rootCheck = Invoke-WebRequest -Uri "http://127.0.0.1:8000/" -UseBasicParsing -TimeoutSec 2
            if ($rootCheck.StatusCode -eq 200) {
                throw "An older PARADOX backend is already using port 8000. Close its terminal window, then run paradox.bat again."
            }
        } catch {
            if ($_.Exception.Message -like "*older PARADOX backend*") { throw }
        }
    }

    if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
        throw "Python Launcher was not found. Install Python 3.13 x64 and enable the Python Launcher."
    }
    & py -3.13 --version
    if ($LASTEXITCODE -ne 0) {
        throw "Python 3.13 is required. Install Python 3.13 x64."
    }

    $recreateVenv = -not (Test-Path $venvPython)
    if (-not $recreateVenv) {
        $venvVersion = (& $venvPython --version 2>&1 | Out-String).Trim()
        if ($venvVersion -notmatch "^Python 3\.13\.") {
            Write-Host "[PARADOX] Replacing the old Python environment ($venvVersion) with Python 3.13..." -ForegroundColor Yellow
            $recreateVenv = $true
        }
    }
    if ($recreateVenv) {
        $venvPath = Join-Path $backendDir ".venv"
        if (Test-Path $venvPath) { Remove-Item $venvPath -Recurse -Force }
        Write-Host "[PARADOX] Creating the Python 3.13 environment..." -ForegroundColor Cyan
        & py -3.13 -m venv $venvPath
        if ($LASTEXITCODE -ne 0) { throw "Could not create backend/.venv." }
    }

    $requirements = Join-Path $backendDir "requirements.txt"
    $marker = Join-Path $backendDir ".venv\.paradox-deps-ready"
    if (-not (Test-Path $marker) -or (Get-Item $requirements).LastWriteTime -gt (Get-Item $marker).LastWriteTime) {
        Write-Host "[PARADOX] Installing backend packages (first run only)..." -ForegroundColor Cyan
        & $venvPython -m pip install --disable-pip-version-check --upgrade pip setuptools wheel
        if ($LASTEXITCODE -ne 0) { throw "Could not prepare pip." }
        & $venvPython -m pip install --disable-pip-version-check -r $requirements
        if ($LASTEXITCODE -ne 0) { throw "Backend dependency installation failed. Check your internet connection." }
        Set-Content -Path $marker -Value "ready" -Encoding ASCII
    }

    Write-Host "[PARADOX] Account database: $env:PARADOX_DB_PATH" -ForegroundColor DarkGray
    Write-Host "[PARADOX] Starting API at http://127.0.0.1:8000 ..." -ForegroundColor Green
    Set-Location $backendDir
    & $venvPython -m uvicorn main:app --host 127.0.0.1 --port 8000
    if ($LASTEXITCODE -ne 0) { throw "Backend stopped with exit code $LASTEXITCODE." }
}
catch {
    Write-Host ""
    Write-Host "[PARADOX BACKEND ERROR] $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to close this window"
    exit 1
}
