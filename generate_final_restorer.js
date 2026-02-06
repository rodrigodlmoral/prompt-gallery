const fs = require('fs');

const data = JSON.parse(fs.readFileSync('filtered_backup.json', 'utf8'));

const script = `/* SCRIPT DE RESTAURACIÓN MASIVA - VERSIÓN ULTRA-SEGURA (PARA RODRIGO) */
(async () => {
    let token = "";
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('pb_auth') || key.includes('auth'))) {
            try {
                const d = JSON.parse(localStorage.getItem(key));
                if (d.token) { token = d.token; break; }
            } catch(e) {}
        }
    }
    if (!token) return console.error('❌ Error: No se encontró sesión admin. Por favor, refresca la página de PocketBase.');

    const baseUrl = 'https://prompt-gallery.pockethost.io/api/collections';
    const headers = { 'Authorization': token, 'Content-Type': 'application/json' };
    
    // LISTADO COMPLETO DE 266 REGISTROS (PROMPBITS + NSFW + PRIVACIDAD)
    const backupData = ${JSON.stringify(data)};

    console.log("%c🚀 Iniciando restauración masiva...", "color: #3498db; font-weight: bold; font-size: 14px;");
    console.log("%c🛡️ MODO SEGURO: Delay de 300ms entre cambios activado para evitar bloqueos.", "color: #e67e22; font-style: italic;");

    let page = 1;
    let totalUpdated = 0;
    let totalChecked = 0;

    while(true) {
        const res = await fetch(\`\${baseUrl}/prompts/records?page=\${page}&perPage=50\`, { headers });
        const d = await res.json();
        if (!d.items || d.items.length === 0) break;

        for (const item of d.items) {
            totalChecked++;
            const imgStr = (item.image || '').trim();
            // Buscar en el backup por la URL de la imagen
            const hist = backupData.find(b => b.img === imgStr && b.img !== "");
            
            if (hist) {
                const updateBody = {};
                
                // 1. Restaurar Bits solo si en PocketBase es 0 o null
                if (hist.b > 0 && (item.tokens_received === 0 || !item.tokens_received)) {
                    updateBody.tokens_received = hist.b;
                }
                
                // 2. Restaurar Rating solo si en PocketBase es SFW y en Backup es sugerente/NSFW
                if (hist.r && hist.r !== 'SFW / Apto' && (!item.rating || item.rating === 'SFW / Apto')) {
                    updateBody.rating = hist.r;
                }
                
                // 3. Restaurar Privacidad
                if (hist.p === true && item.is_private !== true) {
                    updateBody.is_private = true;
                }

                if (Object.keys(updateBody).length > 0) {
                    try {
                        const patchRes = await fetch(\`\${baseUrl}/prompts/records/\${item.id}\`, {
                            method: 'PATCH',
                            headers,
                            body: JSON.stringify(updateBody)
                        });
                        if (patchRes.ok) {
                            totalUpdated++;
                            console.log(\`✅ [\${totalUpdated}] Restaurado: "\${item.title}" | Bits: \${updateBody.tokens_received || '-'} | Rating: \${updateBody.rating || '-'}\`);
                        } else {
                            console.warn(\`⚠️ Error al actualizar "\${item.title}": \`, await patchRes.text());
                        }
                    } catch (err) {
                        console.error(\`❌ Error de red en "\${item.title}": \`, err);
                    }
                    
                    // ESPERA DE SEGURIDAD PARA TRANQUILIDAD DE RODRIGO Y POCKETHOST
                    await new Promise(r => setTimeout(r, 300));
                }
            }
        }
        if (d.items.length < 50) break;
        page++;
    }

    console.log(\`%c✨ RESTAURACIÓN COMPLETADA.\`, "color: #2ecc71; font-weight: bold; font-size: 14px;");
    console.log(\`Se analizaron \${totalChecked} posts de la base de datos real.\`);
    console.log(\`Se actualizaron exitosamente \${totalUpdated} registros con datos históricos.\`);
    console.log(\"⚠️ Ya puedes refrescar tu página de Prompt Gallery para ver los Bits y el contenido NSFW correcto.\");
})();`;

fs.writeFileSync('restauracion_final_rodrigo.js', script);
console.log('Script generado exitosamente: restauracion_final_rodrigo.js');
