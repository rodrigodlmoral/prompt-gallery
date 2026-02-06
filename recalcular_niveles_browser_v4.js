/**
 * SCRIPT PARA SINCRONIZACIÓN TOTAL (V4.0 FINAL) - PROMPT GALLERY
 * Actualiza: prompts_count, total_copies y nivel de TODOS los usuarios.
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

    function calcularNivel(numPosts, numCopies) {
        let nivel = 0;
        LEVEL_REQS.forEach((req, idx) => {
            if (numPosts >= req.posts && numCopies >= req.copies) nivel = idx;
        });
        return nivel;
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

    console.log('%c🚀 Iniciando sincronización masiva de progreso...', 'color: #00ff00; font-weight: bold; font-size: 14px;');

    try {
        const usersRes = await fetch('https://prompt-gallery.pockethost.io/api/collections/users/records?perPage=500', {
            headers: { 'Authorization': token }
        });
        const users = (await usersRes.json()).items || [];
        console.log(`📊 Analizando ${users.length} usuarios...`);

        let actualizados = 0;

        for (const user of users) {
            const promptsRes = await fetch(`https://prompt-gallery.pockethost.io/api/collections/prompts/records?filter=author="${user.id}"&perPage=500`, {
                headers: { 'Authorization': token }
            });
            const data = await promptsRes.json();
            const userPrompts = data.items || [];

            const totalPosts = data.totalItems || 0;
            const totalCopies = userPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);
            const nivelCorrecto = calcularNivel(totalPosts, totalCopies);

            const userName = (user.username || user.email || user.id).slice(0, 15);

            // Siempre actualizar para asegurar que la barra de progreso (prompts_count) sea correcta
            await fetch(`https://prompt-gallery.pockethost.io/api/collections/users/records/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({
                    level: nivelCorrecto,
                    prompts_count: totalPosts,
                    total_copies: totalCopies
                })
            });

            console.log(`✅ @${userName.padEnd(15)} | Posts: ${String(totalPosts).padStart(3)} | Copias: ${String(totalCopies).padStart(3)} | Lv: ${nivelCorrecto}`);
            actualizados++;
        }
        console.log(`\n%c✅ SINCRONIZACIÓN COMPLETADA. ${actualizados} usuarios al día.`, 'color: #00ff00; font-weight: bold;');
        console.log('💡 Ahora la barra de progreso en el perfil debería marcar exactamente el avance real.');
    } catch (e) {
        console.error('❌ Error general:', e);
    }
})();
