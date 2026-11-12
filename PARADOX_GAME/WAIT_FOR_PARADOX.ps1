$backendReady = $false
$frontendReady = $false
$backendConflict = $false
$frontendConflict = $false
$expectedBuild = "persistent-auth-starfix-2026-11-05"

for ($i = 0; $i -lt 180; $i++) {
    if (-not $backendReady -and -not $backendConflict) {
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/system/health" -TimeoutSec 2
            if ($health.build -eq $expectedBuild -and $health.status -eq "ok") {
                $backendReady = $true
            } else {
                $backendConflict = $true
            }
        } catch {
            try {
                $rootCheck = Invoke-WebRequest -Uri "http://127.0.0.1:8000/" -UseBasicParsing -TimeoutSec 2
                if ($rootCheck.StatusCode -eq 200) { $backendConflict = $true }
            } catch { }
        }
    }

    if (-not $frontendReady -and -not $frontendConflict) {
        try {
            $marker = (Invoke-WebRequest -Uri "http://127.0.0.1:5173/paradox-build.txt" -UseBasicParsing -TimeoutSec 2).Content.Trim()
            if ($marker -eq $expectedBuild) {
                $frontendReady = $true
            } else {
                $frontendConflict = $true
            }
        } catch {
            try {
                $rootCheck = Invoke-WebRequest -Uri "http://127.0.0.1:5173/" -UseBasicParsing -TimeoutSec 2
                if ($rootCheck.StatusCode -eq 200) { $frontendConflict = $true }
            } catch { }
        }
    }

    if ($backendConflict -or $frontendConflict) {
        Write-Host "[PARADOX] An older/different service is already using a required port." -ForegroundColor Red
        if ($backendConflict) { Write-Host "Close the old backend terminal using port 8000." -ForegroundColor Yellow }
        if ($frontendConflict) { Write-Host "Close the old frontend terminal using port 5173." -ForegroundColor Yellow }
        Write-Host "Then double-click paradox.bat again."
        exit 1
    }

    if ($backendReady -and $frontendReady) {
        Start-Process "http://localhost:5173/"
        Write-Host "[PARADOX] Both updated services are ready. Game opened in your browser." -ForegroundColor Green
        exit 0
    }
    Start-Sleep -Seconds 2
}

Write-Host "[PARADOX] Timed out waiting for the updated PARADOX services." -ForegroundColor Red
Write-Host "Check the Backend and Frontend PowerShell windows for errors."
exit 1
