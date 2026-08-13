@echo off
chcp 65001 >nul
cd /d "%~dp0"
where pnpm >nul 2>nul
if %errorlevel%==0 (
  pnpm dev
) else (
  set "NODE=C:\Users\10268\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
  set "PATH=%NODE%;%PATH%"
  call "C:\Users\10268\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd" dev
)
pause
