@echo off
setlocal
echo ========================================================
echo   DESPLEGAR A VERCEL (ACTUALIZACION COMPLETA)
echo ========================================================
echo.
echo Este script hara una COPIA EXACTA de tu version local
echo a la carpeta de GitHub, eliminando archivos viejos
echo para evitar errores.
echo.

set "ORIGEN=c:\Users\dquiroz\.gemini\antigravity\scratch\prompt-gallery-v2"
set "DESTINO=C:\Users\dquiroz\Documents\GitHub\prompt-gallery"

echo [1/4] Limpiando carpeta de destino (Borrando src antiguo)...
if exist "%DESTINO%\src" rmdir /s /q "%DESTINO%\src"
echo OK.

echo [2/4] Copiando nueva version limpia...
xcopy "%ORIGEN%\src" "%DESTINO%\src" /E /I /Y
if exist "%ORIGEN%\public" xcopy "%ORIGEN%\public" "%DESTINO%\public" /E /I /Y
copy /y "%ORIGEN%\index.html" "%DESTINO%\index.html"
copy /y "%ORIGEN%\admin.html" "%DESTINO%\admin.html"
copy /y "%ORIGEN%\profile.html" "%DESTINO%\profile.html"
copy /y "%ORIGEN%\package.json" "%DESTINO%\package.json"
copy /y "%ORIGEN%\vite.config.js" "%DESTINO%\vite.config.js"

echo [3/4] Enviando a GitHub (Modo Silencioso)...
cd /d "%DESTINO%"
git add .
git commit -m "Auto-Deploy Fix: User Settings & UI Repairs"
git push origin main
echo.
echo ========================================================
echo   DESPLIEGUE COMPLETADO
echo ========================================================
exit
