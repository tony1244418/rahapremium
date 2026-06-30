@echo off
echo Generating PWA icons...
node scripts/generate-icons.js GATEWAY/logo.png public
echo.
echo Checking generated files...
dir public\icon-*.png
pause

