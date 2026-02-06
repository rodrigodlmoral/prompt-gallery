/**
 * SCRIPT PARA RECALCULAR NIVELES (V2) - PROMPT GALLERY
 * Ejecutar en la consola de: https://prompt-gallery.pockethost.io/_/
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
            if (numPosts >= req.posts && numCopies >= req.copies) {
                nivel = idx;
            }
        });
        return nivel;
    }

    console.log('%c🚀 Iniciando recálculo masivo de niveles (Sistema Posts + Copias)...', 'color: #00ff00; font-weight: bold; font-size: 14px;');

    try {
        // 1. Obtener Token de Admin (usando el del panel actual)
        const pocketbase_auth = JSON.parse(localStorage.getItem('pocketbase_auth'));
        const token = pocketbase_auth?.token;

        if (!token) {
            console.error('❌ No se encontró token de sesión. Asegúrate de estar en el Admin Panel logueado.');
            return;
        }

        // 2. Obtener todos los usuarios
        const usersRes = await fetch('https://prompt-gallery.pockethost.io/api/collections/users/records?perPage=500', {
            headers: { 'Authorization': token }
        });
        const usersData = await usersRes.json();
        const users = usersData.items;

        console.log(`📊 Procesando ${users.length} usuarios...`);

        let actualizados = 0;

        for (const user of users) {
            // 3. Obtener todos los prompts del usuario para sumar copias
            const promptsRes = await fetch(`https://prompt-gallery.pockethost.io/api/collections/prompts/records?filter=author="${user.id}"&perPage=500`, {
                headers: { 'Authorization': token }
            });
            const promptsData = await promptsRes.json();
            const userPrompts = promptsData.items;

            const totalPosts = promptsData.totalItems;
            const totalCopies = userPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

            const nivelCorrecto = calcularNivel(totalPosts, totalCopies);
            const nivelActual = user.level || 0;

            console.log(`👤 @${user.username.padEnd(15)} | Posts: ${String(totalPosts).padStart(3)} | Copias: ${String(totalCopies).padStart(4)} | Lv: ${nivelActual} ➔ ${nivelCorrecto}`);

            // 4. Actualizar usuario si el nivel o el contador de copias cambió
            if (nivelActual !== nivelCorrecto || user.total_copies !== totalCopies) {
                await fetch(`https://prompt-gallery.pockethost.io/api/collections/users/records/${user.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token
                    },
                    body: JSON.stringify({
                        level: nivelCorrecto,
                        total_copies: totalCopies
                    })
                });
                actualizados++;
            }
        }

        console.log(`\n%c✅ PROCESO COMPLETADO`, 'color: #00ff00; font-weight: bold;');
        console.log(`📝 Usuarios actualizados: ${actualizados}`);
        console.log(`💡 Nota: El nivel ahora se basa en el requisito de posts Y el requisito de copias para niveles 3+`);

    } catch (error) {
        console.error('❌ Error durante el recálculo:', error);
    }
})();
