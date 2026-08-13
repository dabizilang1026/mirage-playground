@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist .vite-server.pid (
  echo 没有找到正在运行的游戏服务器。
  pause
  exit /b
)
set /p PID=<.vite-server.pid
taskkill /PID %PID% /F >nul 2>nul
del .vite-server.pid >nul 2>nul
echo 游戏服务器已停止。
pause
