/* SCRIPT SYNC ULTRA-SEGURO V4.5 (10 MINUTOS) */
(async () => {
    // 3000ms = 3 segundos por usuario. 195 usuarios * 3s = 585s (~9.75 min)
    const delay = ms => new Promise(res => setTimeout(res, ms));
    let token = "";
    for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i).includes('auth')) {
            token = JSON.parse(localStorage.getItem(localStorage.key(i))).token;
            break;
        }
    }
    if (!token) return console.error('❌ Refresca la página antes de empezar.');

    console.log('%c⏳ Iniciando Sincronización Ultra-Segura V4.5...', 'color: #3498db; font-weight: bold;');
    console.log('Este proceso tardará aproximadamente 10 minutos para ser 100% seguro.');

    const baseUrl = 'https://prompt-gallery.pockethost.io/api/collections';

    try {
        const usersRes = await fetch(`${baseUrl}/users/records?perPage=500`, {
            headers: { 'Authorization': token }
        });
        const users = (await usersRes.json()).items || [];
        const totalUsers = users.length;

        for (let idx = 0; idx < totalUsers; idx++) {
            const user = users[idx];

            // Pausa de 3 segundos por usuario (EXTRA SEGURIDAD)
            await delay(3000);

            try {
                const filter = encodeURIComponent(`author='${user.id}'`);
                const promptsRes = await fetch(`${baseUrl}/prompts/records?filter=${filter}&perPage=500`, {
                    headers: { 'Authorization': token }
                });

                if (promptsRes.status === 429) {
                    console.error("🛑 BLOQUEO DETECTADO. Deteniendo script inmediatamente.");
                    return;
                }

                const pData = await promptsRes.json();
                const userPrompts = pData.items || [];
                const totalPosts = pData.totalItems || 0;
                const totalCopies = userPrompts.reduce((sum, p) => sum + (parseInt(p.copy_count) || 0), 0);

                // Actualizar DB física
                await fetch(`${baseUrl}/users/records/${user.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token },
                    body: JSON.stringify({
                        prompts_count: totalPosts,
                        total_copies: totalCopies
                    })
                });

                const pct = Math.round(((idx + 1) / totalUsers) * 100);
                if (totalPosts > 0 || user.name === 'rodrigodlmoral') {
                    console.log(`[${pct}%] ✅ @${(user.name || user.id).slice(0, 12)}.. | P: ${totalPosts} | C: ${totalCopies}`);
                } else if ((idx + 1) % 10 === 0) {
                    console.log(`[${pct}%] Procesando... (${idx + 1}/${totalUsers})`);
                }

            } catch (innerErr) {
                console.warn(`⚠️ Error procesando usuario ${user.id}:`, innerErr);
            }
        }
        console.log('%c✨ SINCRONIZACIÓN EXITOSA AL 100%.', 'color: #2ecc71; font-weight: bold; font-size: 16px;');
        console.log("Ya puedes refrescar tu web (Ctrl + F5).");
    } catch (err) {
        console.error("❌ Error fatal en el script:", err);
    }
})();
