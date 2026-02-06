// ========================================
// SCRIPT PARA RECALCULAR NIVELES
// Ejecutar en el Admin Panel de PocketBase
// ========================================

// INSTRUCCIONES:
// 1. Abre https://prompt-gallery.pockethost.io/_/
// 2. Inicia sesión con tu cuenta admin
// 3. Abre la consola del navegador (F12 > Console)
// 4. Copia y pega TODO este código
// 5. Presiona Enter

(async () => {
    console.log('🚀 Iniciando recalculación de niveles...\n');

    // Sistema de niveles
    const LEVEL_REQS = [
        { posts: 0, name: 'Explorador' },
        { posts: 2, name: 'NOVATO' },
        { posts: 5, name: 'CREADOR' },
        { posts: 15, name: 'ARTISTA' },
        { posts: 50, name: 'MAESTRO' },
        { posts: 100, name: 'LEYENDA' },
        { posts: 250, name: 'COLABORADOR' }
    ];

    function calcularNivel(numPosts) {
        let nivel = 0;
        for (let i = LEVEL_REQS.length - 1; i >= 0; i--) {
            if (numPosts >= LEVEL_REQS[i].posts) {
                nivel = i;
                break;
            }
        }
        return nivel;
    }

    try {
        // Obtener todos los usuarios
        console.log('📋 Obteniendo usuarios...');
        const usersResponse = await fetch('https://prompt-gallery.pockethost.io/api/collections/users/records?perPage=500', {
            headers: {
                'Authorization': document.cookie.match(/pb_auth=([^;]+)/)?.[1] || ''
            }
        });

        if (!usersResponse.ok) {
            throw new Error(`Error al obtener usuarios: ${usersResponse.status}`);
        }

        const usersData = await usersResponse.json();
        const usuarios = usersData.items;

        console.log(`✅ ${usuarios.length} usuarios encontrados\n`);

        let actualizados = 0;
        let sinCambios = 0;
        let errores = 0;

        for (const usuario of usuarios) {
            try {
                // Contar posts del usuario
                const promptsResponse = await fetch(`https://prompt-gallery.pockethost.io/api/collections/prompts/records?filter=author="${usuario.id}"&perPage=1`, {
                    headers: {
                        'Authorization': document.cookie.match(/pb_auth=([^;]+)/)?.[1] || ''
                    }
                });

                if (!promptsResponse.ok) {
                    throw new Error(`Error al contar posts de ${usuario.username}`);
                }

                const promptsData = await promptsResponse.json();
                const numPosts = promptsData.totalItems;
                const nivelActual = usuario.level || 0;
                const nivelCorrecto = calcularNivel(numPosts);
                const nombreNivel = LEVEL_REQS[nivelCorrecto].name;

                console.log(`👤 ${usuario.username}: ${numPosts} posts → Nivel ${nivelActual} → ${nivelCorrecto} (${nombreNivel})`);

                if (nivelActual !== nivelCorrecto) {
                    // Actualizar nivel
                    const updateResponse = await fetch(`https://prompt-gallery.pockethost.io/api/collections/users/records/${usuario.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': document.cookie.match(/pb_auth=([^;]+)/)?.[1] || ''
                        },
                        body: JSON.stringify({ level: nivelCorrecto })
                    });

                    if (updateResponse.ok) {
                        console.log(`   ✅ Actualizado a nivel ${nivelCorrecto}`);
                        actualizados++;
                    } else {
                        console.log(`   ❌ Error al actualizar`);
                        errores++;
                    }
                } else {
                    console.log(`   ⏭️  No requiere cambios`);
                    sinCambios++;
                }

            } catch (err) {
                console.error(`❌ Error con ${usuario.username}:`, err.message);
                errores++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMEN FINAL');
        console.log('='.repeat(50));
        console.log(`Total usuarios:    ${usuarios.length}`);
        console.log(`✅ Actualizados:   ${actualizados}`);
        console.log(`⏭️  Sin cambios:    ${sinCambios}`);
        console.log(`❌ Errores:        ${errores}`);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('💥 Error general:', error);
    }
})();
