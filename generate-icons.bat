@echo off
echo ========================================
echo PWA Icon Generator
echo ========================================
echo.

REM Check if Node.js is available
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not found in PATH
    echo Please install Node.js or add it to your PATH
    pause
    exit /b 1
)

echo Checking for Sharp package...
call npm list sharp >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Sharp package not found. Installing Sharp...
    call npm install sharp
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Failed to install Sharp
        echo Please run manually: npm install sharp
        pause
        exit /b 1
    )
    echo.
)

echo.
echo Generating icons...
echo Source: GATEWAY\logo.png
echo Output: public\
echo.

call node scripts/generate-icons.js GATEWAY/logo.png public

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Icons generated successfully.
    echo ========================================
    echo.
    echo Check the public folder for generated icons.
) else (
    echo.
    echo ========================================
    echo ERROR: Icon generation failed
    echo ========================================
)

echo.
pause








