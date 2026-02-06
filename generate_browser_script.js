import fs from 'fs';

const backup = JSON.parse(fs.readFileSync('./backups/migration_pocketbase_fase1/prompts_backup.json', 'utf8'));

// Filtramos solo los que tienen datos útiles que se perdieron
const filtered = backup.filter(p => {
    return (p.tokens_received > 0) ||
        (p.rating && p.rating !== 'SFW / Apto' && p.rating !== 'undefined') ||
        (p.is_private === true);
}).map(p => ({
    img: p.image_url ? p.image_url.trim() : "",
    r: p.rating,
    b: p.tokens_received,
    p: p.is_private === true
}));

const browserScript = `
/* SCRIPT DE RECUPERACIÓN FINAL (DATOS INTEGRADOS) */
(async () => {
    let token = "";
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('pb_auth') || key.includes('auth')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data.token) { token = data.token; break; }
            } catch(e) {}
        }
    }
    if (!token) return console.error('❌ Error: No se encontró sesión admin. Refresca la página.');

    const baseUrl = 'https://prompt-gallery.pockethost.io/api/collections';
    const headers = { 'Authorization': token, 'Content-Type': 'application/json' };
    
    // DATOS INYECTADOS
    const backupData = ${JSON.stringify(filtered)};

    console.log("%c🚀 Iniciando restauración de propinas, ratings y privacidad...", "color: #3498db; font-weight: bold;");

    let page = 1;
    let totalUpdated = 0;

    while(true) {
        const res = await fetch(\`\${baseUrl}/prompts/records?page=\${page}&perPage=50\`, { headers });
        const data = await res.json();
        if (!data.items || data.items.length === 0) break;

        for (const item of data.items) {
            const imgStr = (item.image || '').trim();
            const hist = backupData.find(b => b.img === imgStr);
            
            if (hist) {
                const updateBody = {};
                
                // 1. Restaurar Propinas (si en PB está en cero)
                if (hist.b > 0 && (item.tokens_received === 0 || !item.tokens_received)) {
                    updateBody.tokens_received = hist.b;
                }
                
                // 2. Restaurar Rating (si en PB es SFW por defecto)
                if (hist.r && hist.r !== 'SFW / Apto' && (!item.rating || item.rating === 'SFW / Apto')) {
                    updateBody.rating = hist.r;
                }

                // 3. Restaurar Privacidad
                if (hist.p === true && item.is_private !== true) {
                    updateBody.is_private = true;
                }

                if (Object.keys(updateBody).length > 0) {
                    const patchRes = await fetch(\`\${baseUrl}/prompts/records/\${item.id}\`, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify(updateBody)
                    });
                    
                    if (patchRes.ok) {
                        totalUpdated++;
                        console.log(\`✅ [\${totalUpdated}] Restaurado: "\${item.title}" | Rating: \${updateBody.rating || '-'} | Bits: \${updateBody.tokens_received || '-'}\`);
                    }
                }
            }
        }
        if (data.items.length < 50) break;
        page++;
    }

    console.log(\`%c✨ PROCESO FINALIZADO. \${totalUpdated} posts recuperados con sus datos originales.\`, "color: #2ecc71; font-weight: bold;");
    console.log("Ya puedes refrescar la web para ver los cambios.");
})();
`;

fs.writeFileSync('browser_recovery_final.js', browserScript);
console.log("Script generado exitosamente en browser_recovery_final.js");
