@echo off
title DASH to HLS Transcoder Server
color 0A

echo ============================================
echo   DASH to HLS Transcoder Server
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Check if FFmpeg is installed
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] FFmpeg is not installed!
    echo.
    echo Please install FFmpeg:
    echo   1. Download from: https://www.gyan.dev/ffmpeg/builds/
    echo   2. Extract and add the 'bin' folder to your PATH
    echo   OR run: winget install ffmpeg
    echo.
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting server...
echo.
node server.js

pause
