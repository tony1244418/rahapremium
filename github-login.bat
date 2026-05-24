@echo off
echo ========================================
echo GitHub Login Helper
echo ========================================
echo.
echo This will help you log in to a different GitHub account.
echo.
echo IMPORTANT: Make sure you've logged out of the previous account first!
echo (Run github-logout.bat if you haven't already)
echo.
pause

echo.
echo ========================================
echo Step 1: Clear Old Credentials
echo ========================================
echo.

REM Remove any existing GitHub credentials
cmdkey /delete:"LegacyGeneric:target=git:https://github.com" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Removed old GitHub credentials
) else (
    echo ℹ️  No old credentials found
)

echo.
echo ========================================
echo Step 2: Set Git User Configuration
echo ========================================
echo.
echo Enter your NEW GitHub account details:
echo.

set /p GIT_USERNAME="GitHub Username: "
set /p GIT_EMAIL="GitHub Email: "

if "%GIT_USERNAME%"=="" (
    echo ❌ Username cannot be empty!
    pause
    exit /b 1
)

if "%GIT_EMAIL%"=="" (
    echo ❌ Email cannot be empty!
    pause
    exit /b 1
)

echo.
echo Setting Git configuration...
git config --global user.name "%GIT_USERNAME%"
git config --global user.email "%GIT_EMAIL%"

if %ERRORLEVEL% EQU 0 (
    echo ✅ Git user configured: %GIT_USERNAME% (%GIT_EMAIL%)
) else (
    echo ❌ Failed to set Git configuration
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 3: Test Authentication
echo ========================================
echo.
echo Now you need to authenticate with GitHub.
echo.
echo Choose your authentication method:
echo.
echo 1. Personal Access Token (Recommended)
echo 2. GitHub Desktop
echo 3. SSH Keys
echo.
set /p AUTH_METHOD="Enter choice (1-3): "

if "%AUTH_METHOD%"=="1" (
    echo.
    echo ========================================
    echo Personal Access Token Setup
    echo ========================================
    echo.
    echo 1. Go to: https://github.com/settings/tokens
    echo 2. Click "Generate new token" ^> "Generate new token (classic)"
    echo 3. Give it a name (e.g., "My Computer")
    echo 4. Select scopes: repo (full control)
    echo 5. Click "Generate token"
    echo 6. COPY the token (you won't see it again!)
    echo.
    echo When you push/pull, use your GitHub username and paste the token as password.
    echo.
    pause
) else if "%AUTH_METHOD%"=="2" (
    echo.
    echo ========================================
    echo GitHub Desktop Setup
    echo ========================================
    echo.
    echo 1. Download GitHub Desktop: https://desktop.github.com/
    echo 2. Install and sign in with your NEW GitHub account
    echo 3. GitHub Desktop will handle authentication automatically
    echo.
    pause
) else if "%AUTH_METHOD%"=="3" (
    echo.
    echo ========================================
    echo SSH Keys Setup
    echo ========================================
    echo.
    echo 1. Generate SSH key (if you don't have one):
    echo    ssh-keygen -t ed25519 -C "%GIT_EMAIL%"
    echo.
    echo 2. Copy your public key:
    echo    type %USERPROFILE%\.ssh\id_ed25519.pub
    echo.
    echo 3. Add it to GitHub:
    echo    https://github.com/settings/keys
    echo.
    echo 4. Change your remote URL to SSH:
    echo    git remote set-url origin git@github.com:USERNAME/REPO.git
    echo.
    pause
)

echo.
echo ========================================
echo Test Your Connection
echo ========================================
echo.
echo To test, try:
echo   git ls-remote https://github.com/%GIT_USERNAME%/REPO.git
echo.
echo Or push/pull from your repository.
echo.
echo ========================================
echo Login Setup Complete!
echo ========================================
echo.
echo Git User: %GIT_USERNAME%
echo Git Email: %GIT_EMAIL%
echo.
pause








