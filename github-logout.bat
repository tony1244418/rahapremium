@echo off
echo ========================================
echo GitHub/Git Logout Tool
echo ========================================
echo.
echo This will remove all GitHub and Git credentials from Windows Credential Manager.
echo.
pause

echo.
echo Removing Git credentials from Windows Credential Manager...
echo.

REM Remove GitHub credentials (try both formats)
cmdkey /delete:"LegacyGeneric:target=git:https://github.com" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Removed: git:https://github.com
) else (
    cmdkey /delete:git:https://github.com 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Removed: git:https://github.com
    ) else (
        echo ℹ️  No GitHub credentials found (or already removed)
    )
)

REM Remove generic Git credentials
cmdkey /list | findstr /i "git" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Found Git-related credentials. Please remove them manually:
    echo 1. Open Windows Credential Manager
    echo 2. Go to Windows Credentials
    echo 3. Look for entries containing "git" or "github"
    echo 4. Click "Remove" for each one
    echo.
    echo Opening Credential Manager...
    start control /name Microsoft.CredentialManager
) else (
    echo ✅ No Git credentials found in Credential Manager
)

echo.
echo ========================================
echo Clearing Git config (optional)
echo ========================================
echo.
echo Do you want to clear Git user name and email? (Y/N)
set /p CLEAR_CONFIG="Enter choice: "

if /i "%CLEAR_CONFIG%"=="Y" (
    git config --global --unset user.name
    git config --global --unset user.email
    echo ✅ Git user name and email cleared
) else (
    echo ℹ️  Keeping Git user name and email
)

echo.
echo ========================================
echo Logout Complete!
echo ========================================
echo.
echo Next time you use Git/GitHub, you'll be prompted to authenticate again.
echo.
pause

