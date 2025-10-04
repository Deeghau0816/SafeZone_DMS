@echo off
echo SafeZone DMS - Development Setup
echo ================================

echo.
echo Starting Backend Server (Port 5000)...
start "Backend Server" cmd /k "cd /d %~dp0backend && npm start"

echo.
echo Waiting 3 seconds before starting frontend...
timeout /t 3 /nobreak > nul

echo.
echo Starting Frontend Server (Port 3000)...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause > nul
