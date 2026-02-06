/* SCRIPT DE RECUPERACIÓN DE DATOS HISTÓRICOS V3.0 (BROWSER CONSOLE) */
// Ejecutar en la consola de PocketBase (Admin Panel)

(async () => {
    // 1. Obtener Token
    let token = "";
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('pb_auth') || key.includes('auth')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data.token) { token = data.token; break; }
            } catch (e) { }
        }
    }
    if (!token) return console.error('❌ Error: No se encontró sesión. Refresca la página.');

    const baseUrl = 'https://prompt-gallery.pockethost.io/api/collections';
    const headers = { 'Authorization': token, 'Content-Type': 'application/json' };

    // 2. Datos del Backup (Inyectados directamente para simplicidad)
    // He extraído los registros que tienen Ratings o Propinas del backup.
    const backupData = [
        { "img": "https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837658/pg_1769837658457_7bcd5bvla.png", "rating": "Sugestivo", "bits": 0, "priv": false },
        { "img": "https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837660/pg_1769837661122_l21vpi3et.png", "rating": "NSFW / +18", "bits": 0, "priv": false },
        { "img": "https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837681/pg_1769837681891_4aipxy4lg.jpg", "rating": "Sugestivo", "bits": 0, "priv": false },
        { "img": "https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837693/pg_1769837693751_dz7ot7itv.webp", "rating": "NSFW / +18", "bits": 0, "priv": false },
        { "img": "https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837675/pg_1769837675955_oq8o9tuqj.png", "rating": "Sugestivo", "bits": 5, "priv": false }
        // ... (Se añadirán más si detecto otros importantes)
    ];

    console.log("%c🚀 Iniciando restauración de propinas y ratings...", "color: #3498db; font-weight: bold;");

    let page = 1;
    let totalUpdated = 0;

    while (true) {
        const res = await fetch(`${baseUrl}/prompts/records?page=${page}&perPage=50`, { headers });
        const data = await res.json();
        if (!data.items || data.items.length === 0) break;

        for (const item of data.items) {
            // Buscamos coincidencia en nuestro backup inyectado
            const hist = backupData.find(b => b.img === item.image);

            if (hist) {
                const updateBody = {};
                if (hist.bits > 0) updateBody.tokens_received = hist.bits;
                if (hist.rating && hist.rating !== 'SFW / Apto') updateBody.rating = hist.rating;
                if (hist.priv === true) updateBody.is_private = true;

                if (Object.keys(updateBody).length > 0) {
                    const upRes = await fetch(`${baseUrl}/prompts/records/${item.id}`, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify(updateBody)
                    });
                    if (upRes.ok) {
                        totalUpdated++;
                        console.log(`✅ [${totalUpdated}] Restaurado: "${item.title}"`);
                    }
                }
            }
        }
        if (data.items.length < 50) break;
        page++;
    }

    console.log(`%c✨ PROCESO FINALIZADO. ${totalUpdated} posts recuperados.`, "color: #2ecc71; font-weight: bold;");
})();
