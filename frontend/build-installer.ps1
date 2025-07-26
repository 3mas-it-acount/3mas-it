Write-Host "Building IT Support Installer..." -ForegroundColor Green

# Check if NSIS is installed
try {
    $makensis = Get-Command makensis -ErrorAction Stop
    Write-Host "NSIS found at: $($makensis.Source)" -ForegroundColor Yellow
} catch {
    Write-Host "NSIS is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install NSIS from https://nsis.sourceforge.io/" -ForegroundColor Yellow
    Write-Host "After installation, make sure makensis.exe is in your PATH" -ForegroundColor Yellow
    Read-Host "Press Enter to continue"
    exit 1
}

# Build the installer
Write-Host "Compiling NSIS script..." -ForegroundColor Yellow
& makensis installer.nsi

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Installer built successfully!" -ForegroundColor Green
    Write-Host "File: ITSupportSetup-1.0.0.exe" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Error building installer!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

Read-Host "Press Enter to continue" 