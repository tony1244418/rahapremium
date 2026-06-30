@echo off
echo Starting RAHA Premium Development Servers...

echo.
echo Starting PHP Gateway Server on port 8000...
start "PHP Gateway" cmd /k "cd /d D:\raha\GATEWAY && php -S localhost:8000"

echo.
echo Starting Next.js Development Server on port 3000...
start "Next.js Dev Server" cmd /k "cd /d D:\raha && npm run dev"

echo.
echo Both servers are starting...
echo PHP Gateway: http://localhost:8000
echo Next.js App: http://localhost:3000
echo.
echo Press any key to exit...
pause > nul
