@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto missing_node
node launcher.mjs
if errorlevel 1 pause
exit /b
:missing_node
echo Node.js 22.13 or newer is required.
echo Install Node.js, then run this file again.
pause
exit /b 1
