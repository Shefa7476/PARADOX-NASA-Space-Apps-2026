$ErrorActionPreference = "Stop"
$frontendDir = Join-Path $PSScriptRoot "frontend"

try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw "Node.js was not found. Install Node.js 22 LTS (22.12 or newer)."
    }
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npmCommand) { $npmCommand = Get-Command npm -ErrorAction SilentlyContinue }
    if (-not $npmCommand) {
        throw "npm was not found. Reinstall Node.js 22 LTS with npm selected."
    }
    $npmPath = $npmCommand.Source
    if ([string]::IsNullOrWhiteSpace($npmPath)) { $npmPath = $npmCommand.Name }

    $nodeText = (& node -p "process.versions.node").Trim()
    $nodeParts = $nodeText.Split(".")
    $major = [int]$nodeParts[0]
    $minor = [int]$nodeParts[1]
    $nodeOk = (($major -eq 20 -and $minor -ge 19) -or
               ($major -eq 22 -and $minor -ge 12) -or
               ($major -ge 23))
    if (-not $nodeOk) {
        throw "Node.js $nodeText is too old. Install Node.js 22 LTS (22.12 or newer)."
    }

    try {
        $buildMarker = (Invoke-WebRequest -Uri "http://127.0.0.1:5173/paradox-build.txt" -UseBasicParsing -TimeoutSec 2).Content.Trim()
        if ($buildMarker -eq "persistent-auth-starfix-2026-11-05") {
            Write-Host "[PARADOX] This PARADOX frontend is already running." -ForegroundColor Green
            exit 0
        }
        throw "A different/older frontend is already using port 5173. Close the old PARADOX frontend window, then run paradox.bat again."
    } catch {
        if ($_.Exception.Message -like "*different/older frontend*") { throw }
        try {
            $rootCheck = Invoke-WebRequest -Uri "http://127.0.0.1:5173/" -UseBasicParsing -TimeoutSec 2
            if ($rootCheck.StatusCode -eq 200) {
                throw "An older PARADOX frontend is already using port 5173. Close its terminal window, then run paradox.bat again."
            }
        } catch {
            if ($_.Exception.Message -like "*older PARADOX frontend*") { throw }
        }
    }

    Set-Location $frontendDir
    $viteCli = Join-Path $frontendDir "node_modules\vite\dist\node\cli.js"
    $reactPackage = Join-Path $frontendDir "node_modules\react\package.json"
    $threePackage = Join-Path $frontendDir "node_modules\three\package.json"

    if (-not (Test-Path $viteCli) -or -not (Test-Path $reactPackage) -or -not (Test-Path $threePackage)) {
        Write-Host "[PARADOX] Installing frontend packages for this Windows PC..." -ForegroundColor Cyan
        if (Test-Path (Join-Path $frontendDir "node_modules")) {
            Remove-Item (Join-Path $frontendDir "node_modules") -Recurse -Force
        }
        if (Test-Path (Join-Path $frontendDir "package-lock.json")) {
            & $npmPath ci
        } else {
            & $npmPath install
        }
        if ($LASTEXITCODE -ne 0) { throw "Frontend dependency installation failed. Check internet access and try again." }
    }

    Write-Host "[PARADOX] Building the game..." -ForegroundColor Cyan
    & $npmPath run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed. Read the build errors above." }

    Write-Host "[PARADOX] Starting game at http://localhost:5173 ..." -ForegroundColor Green
    & $npmPath run preview -- --host 127.0.0.1 --port 5173 --strictPort
    if ($LASTEXITCODE -ne 0) { throw "Frontend stopped with exit code $LASTEXITCODE." }
}
catch {
    Write-Host ""
    Write-Host "[PARADOX FRONTEND ERROR] $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to close this window"
    exit 1
}
