@echo off
echo Starting RAHA Premium Development Server...

echo.
echo Starting Next.js Development Server with integrated Payment Gateway...
start "RAHA Premium Dev Server" cmd /k "cd /d D:\raha && npm run dev"

echo.
echo Server is starting...
echo Main App: http://localhost:3001
echo Gateway Page: http://localhost:3001/gateway
echo Health Check: http://localhost:3001/api/health
echo.
echo Press any key to exit...
pause > nul
