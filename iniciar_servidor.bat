@echo off
title Servidor RifaApp - SQLite + Node.js
echo ==============================================
echo   Iniciando Servidor de RifaApp...
echo ==============================================
echo.
echo Verificando e instalando dependencias (npm install)...
call npm install
echo.
echo Iniciando servidor backend...
start "" "http://localhost:3000"
npm start
pause
