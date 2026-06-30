@echo off
echo ========================================
echo Replace All Logos and Icons
echo ========================================
echo.
echo This will replace all logos and icons with:
echo public\20251124_105924.png
echo.
pause

cd /d "%~dp0"

echo.
echo Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not found!
    echo Please install Node.js first.
    pause
    exit /b 1
)

echo Node.js found!
echo.
echo Generating icons from: public\20251124_105924.png
echo.

REM Try to find Node.js in common locations
set NODE_PATH=
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "delims=" %%i in ('where node') do set NODE_PATH=%%i
)

REM If found, use it; otherwise try default location
if "%NODE_PATH%"=="" (
    if exist "D:\nodejs\node.exe" (
        set NODE_PATH=D:\nodejs\node.exe
    ) else (
        set NODE_PATH=node
    )
)

echo Using Node.js: %NODE_PATH%
echo.

"%NODE_PATH%" replace-logo.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! All logos and icons replaced!
    echo ========================================
    echo.
    echo Check the public folder for:
    echo - logo.png (favicon)
    echo - icon-72x72.png through icon-512x512.png
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: Failed to generate icons
    echo ========================================
    echo.
    echo Please check:
    echo 1. Node.js is installed
    echo 2. Sharp package is installed (npm install sharp)
    echo 3. The source image exists: public\20251124_105924.png
    echo.
)

pause

