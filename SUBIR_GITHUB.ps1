# Script para subir código a GitHub sin credenciales interactivas
# Este script crea un archivo ZIP y lo sube manualmente

Write-Host "=== INSTRUCCIONES SIMPLES PARA SUBIR A GITHUB ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opción 1: Usar GitHub Desktop (MÁS FÁCIL)" -ForegroundColor Green
Write-Host "1. Descarga GitHub Desktop: https://desktop.github.com"
Write-Host "2. Instálalo y inicia sesión"
Write-Host "3. File -> Add Local Repository"
Write-Host "4. Selecciona esta carpeta: $PWD"
Write-Host "5. Click en 'Publish repository'"
Write-Host ""
Write-Host "Opción 2: Subir manualmente (SIN INSTALAR NADA)" -ForegroundColor Yellow
Write-Host "1. Ve a: https://github.com/rodrigodlmoral/prompt-gallery"
Write-Host "2. Click en 'uploading an existing file'"
Write-Host "3. Arrastra TODOS los archivos de esta carpeta (excepto node_modules)"
Write-Host "4. Click en 'Commit changes'"
Write-Host ""
Write-Host "Opción 3: Generar Personal Access Token" -ForegroundColor Magenta
Write-Host "1. Ve a: https://github.com/settings/tokens"
Write-Host "2. Click 'Generate new token (classic)'"
Write-Host "3. Nombre: 'Vercel Deploy'"
Write-Host "4. Marca: 'repo' (full control)"
Write-Host "5. Click 'Generate token'"
Write-Host "6. COPIA EL TOKEN"
Write-Host "7. Ejecuta: git push -u origin main"
Write-Host "8. Usuario: rodrigodlmoral"
Write-Host "9. Password: PEGA EL TOKEN"
Write-Host ""
Write-Host "¿Cuál prefieres?" -ForegroundColor Cyan
