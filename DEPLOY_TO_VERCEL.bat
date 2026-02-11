@echo off
setlocal
echo ========================================================
echo   DESPLEGAR A VERCEL (ROBUSTO + LOGS)
echo ========================================================

set "ORIGEN=c:\Users\dquiroz\.gemini\antigravity\scratch\prompt-gallery-v2"
set "DESTINO=C:\Users\dquiroz\Documents\GitHub\prompt-gallery"
set "LOGFILE=%ORIGEN%\deploy_log.txt"

echo Iniciando despliegue > "%LOGFILE%"
echo %DATE% %TIME% >> "%LOGFILE%"

echo [0/4] Sincronizando con GitHub...
if exist "%DESTINO%" (
    cd /d "%DESTINO%"
    echo Resetting repo... >> "%LOGFILE%"
    git checkout main >> "%LOGFILE%" 2>&1
    git reset --hard origin/main >> "%LOGFILE%" 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Fallo al resetear repositorio. Revisar logs.
        goto :error
    )
    git pull origin main >> "%LOGFILE%" 2>&1
    cd /d "%ORIGEN%"
) else (
    echo ERROR: No se encuentra la carpeta de destino: %DESTINO%
    echo ERROR: Carpeta destino no existe >> "%LOGFILE%"
    goto :error
)

echo [1/4] Limpiando carpeta de destino...
if exist "%DESTINO%\src" rmdir /s /q "%DESTINO%\src"
echo Limpieza OK. >> "%LOGFILE%"

echo [2/4] Copiando nueva version...
xcopy "%ORIGEN%\src" "%DESTINO%\src" /E /I /Y >> "%LOGFILE%" 2>&1
if %errorlevel% neq 0 goto :error
if exist "%ORIGEN%\public" xcopy "%ORIGEN%\public" "%DESTINO%\public" /E /I /Y >> "%LOGFILE%" 2>&1
copy /y "%ORIGEN%\index.html" "%DESTINO%\index.html" >> "%LOGFILE%" 2>&1
copy /y "%ORIGEN%\admin.html" "%DESTINO%\admin.html" >> "%LOGFILE%" 2>&1
copy /y "%ORIGEN%\profile.html" "%DESTINO%\profile.html" >> "%LOGFILE%" 2>&1
copy /y "%ORIGEN%\batch_upload.html" "%DESTINO%\batch_upload.html" >> "%LOGFILE%" 2>&1
copy /y "%ORIGEN%\package.json" "%DESTINO%\package.json" >> "%LOGFILE%" 2>&1
copy /y "%ORIGEN%\vite.config.js" "%DESTINO%\vite.config.js" >> "%LOGFILE%" 2>&1
copy /y "%ORIGEN%\vercel.json" "%DESTINO%\vercel.json" >> "%LOGFILE%" 2>&1

echo [3/4] Enviando a GitHub...
cd /d "%DESTINO%"
git add . >> "%LOGFILE%" 2>&1
git commit -m "Auto-Deploy Update: %DATE% %TIME%" >> "%LOGFILE%" 2>&1

echo Push a origin main...
git push origin main >> "%LOGFILE%" 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Fallo al hacer git push.
    echo Revisar %LOGFILE% para detalles.
    goto :error
)

echo.
echo ========================================================
echo   DESPLIEGUE COMPLETADO EXITOSAMENTE
echo ========================================================
echo Detalles en: %LOGFILE%
exit /b 0

:error
echo.
echo ========================================================
echo   !!! ERROR EN EL DESPLIEGUE !!!
echo ========================================================
echo Por favor revisa el archivo: %LOGFILE%
pause
exit /b 1
