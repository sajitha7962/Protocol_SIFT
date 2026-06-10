@echo off
cd /d "%~dp0"
"C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m http.server 3000 --bind 127.0.0.1
pause
