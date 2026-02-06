/**
 * SCRIPT PARA SINCRONIZACIÓN TOTAL (V4.3 CON PAUSA ANTI-BLOQUEO)
 * Incluye un retardo de 250ms entre usuarios para evitar el error 429 (Too Many Requests).
 */
(async () => {
    const LEVEL_REQS = [
        { posts: 0, copies: 0, name: 'Explorador' },
        { posts: 10, copies: 0, name: 'Novato' },
        { posts: 25, copies: 0, name: 'Creador Jr' },
        { posts: 50, copies: 15, name: 'Creador' },
        { posts: 100, copies: 40, name: 'Artista' },
        { posts: 250, copies: 80, name: 'Maestro' }
    ];

    const delay = ms => new Promise(res => setTimeout(res, ms));

    function calcularNivel(p, c) {
        let lv = 0;
        LEVEL_REQS.forEach((r, idx) => { if (p >= r.posts && c >= r.copies) lv = idx; });
        return lv;
    }

    let token = "";
    try {
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            if (key.includes('auth')) {
                const data = JSON.parse(localStorage.getItem(key));
                if (data && data.token) { token = data.token; break; }
            }
        }
    } catch (e) { }

    if (!token) return console.error('❌ ERROR: No se detectó sesión. Refresca la página y vuelve a intentar.');

    console.log('%c🚀 Iniciando sincronización V4.3 (Modo Seguro)...', 'color: #00ff00; font-weight: bold; font-size: 14px;');

    try {
        const baseUrl = 'https://prompt-gallery.pockethost.io/api/collections';

        const usersRes = await fetch(`${baseUrl}/users/records?perPage=500`, {
            headers: { 'Authorization': token }
        });
        const users = (await usersRes.json()).items || [];
        console.log(`📊 Procesando ${users.length} usuarios con pausas de seguridad...`);

        for (const user of users) {
            // 1. Pequeña pausa para no saturar PocketHost
            await delay(250);

            const filter = encodeURIComponent(`author='${user.id}'`);
            const promptsRes = await fetch(`${baseUrl}/prompts/records?filter=${filter}&perPage=500`, {
                headers: { 'Authorization': token }
            });

            if (!promptsRes.ok) {
                console.warn(`⚠️ Saltando @${user.username} por error de red (puedes re-ejecutar luego).`);
                continue;
            }

            const pData = await promptsRes.json();
            const userPrompts = pData.items || [];
            const totalPosts = pData.totalItems || 0;
            const totalCopies = userPrompts.reduce((sum, p) => sum + (parseInt(p.copy_count) || 0), 0);
            const nivelCorrecto = calcularNivel(totalPosts, totalCopies);

            await fetch(`${baseUrl}/users/records/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({
                    level: nivelCorrecto,
                    prompts_count: totalPosts,
                    total_copies: totalCopies
                })
            });

            if (totalPosts > 0 || user.username === 'rodrigodlmoral') {
                console.log(`✅ @${(user.username || user.name || user.id).padEnd(15)} | Posts: ${String(totalPosts).padStart(3)} | Copias: ${String(totalCopies).padStart(3)} | Lv: ${nivelCorrecto}`);
            }
        }
        console.log('\n%c✨ SINCRONIZACIÓN COMPLETADA EXITOSAMENTE.', 'color: #00ff00; font-weight: bold;');
    } catch (e) {
        console.error('❌ Error fatal:', e);
    }
})();
