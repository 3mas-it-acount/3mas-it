@echo off
echo Building IT Support Installer...

REM Check if NSIS is installed
where makensis >nul 2>&1
if %errorlevel% neq 0 (
    echo NSIS is not installed or not in PATH
    echo Please install NSIS from https://nsis.sourceforge.io/
    pause
    exit /b 1
)

REM Build the installer
echo Compiling NSIS script...
makensis installer.nsi

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Installer built successfully!
    echo File: ITSupportSetup-1.0.0.exe
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Error building installer!
    echo ========================================
)

pause 