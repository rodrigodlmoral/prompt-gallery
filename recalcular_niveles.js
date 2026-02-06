import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

// Sistema de niveles (igual que en el código)
const LEVEL_REQS = [
    { posts: 0, name: 'Explorador', icon: '🛡️' },
    { posts: 2, name: 'NOVATO', icon: '🌱' },
    { posts: 5, name: 'CREADOR', icon: '🎨' },
    { posts: 15, name: 'ARTISTA', icon: '🏆' },
    { posts: 50, name: 'MAESTRO', icon: '👑' },
    { posts: 100, name: 'LEYENDA', icon: '⚡' },
    { posts: 250, name: 'COLABORADOR', icon: '✨' }
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

async function recalcularNiveles() {
    try {
        // AUTENTICACIÓN COMO ADMIN
        console.log('🔐 Autenticando como admin...');
        await pb.admins.authWithPassword(
            'rodridom.rock@gmail.com',
            'alcaline01#pock'
        );
        console.log('✅ Autenticado como admin\n');

        console.log('🔍 Obteniendo todos los usuarios...');

        // Método alternativo: usar getList con paginación grande
        let allUsers = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const result = await pb.collection('users').getList(page, 200, {
                sort: 'username',
                '$autoCancel': false
            });

            allUsers = allUsers.concat(result.items);
            hasMore = result.page < result.totalPages;
            page++;
        }

        console.log(`📊 Total de usuarios encontrados: ${allUsers.length}\n`);

        let actualizados = 0;
        let errores = 0;

        for (const usuario of allUsers) {
            try {
                // Contar posts del usuario
                const posts = await pb.collection('prompts').getList(1, 1, {
                    filter: `author = "${usuario.id}"`
                });

                const numPosts = posts.totalItems;
                const nivelActual = usuario.level || 0;
                const nivelCorrecto = calcularNivel(numPosts);
                const nombreNivel = LEVEL_REQS[nivelCorrecto].name;

                console.log(`👤 ${usuario.username}:`);
                console.log(`   Posts: ${numPosts}`);
                console.log(`   Nivel actual: ${nivelActual} → Nivel correcto: ${nivelCorrecto} (${nombreNivel})`);

                // Solo actualizar si es diferente
                if (nivelActual !== nivelCorrecto) {
                    // NOTA: Esto requiere permisos de admin
                    // Necesitarás autenticarte primero
                    await pb.collection('users').update(usuario.id, {
                        level: nivelCorrecto
                    });
                    console.log(`   ✅ Nivel actualizado\n`);
                    actualizados++;
                } else {
                    console.log(`   ⏭️  No requiere actualización\n`);
                }

            } catch (err) {
                console.error(`   ❌ Error procesando ${usuario.username}:`, err.message);
                errores++;
            }
        }

        console.log('\n📈 RESUMEN:');
        console.log(`   Total usuarios: ${allUsers.length}`);
        console.log(`   Actualizados: ${actualizados}`);
        console.log(`   Sin cambios: ${allUsers.length - actualizados - errores}`);
        console.log(`   Errores: ${errores}`);

    } catch (error) {
        console.error('💥 Error general:', error.message);

        if (error.message.includes('403') || error.message.includes('401')) {
            console.log('\n⚠️  SOLUCIÓN: Necesitas autenticarte como admin primero.');
            console.log('Agrega estas líneas al inicio de la función recalcularNiveles():');
            console.log('');
            console.log('await pb.admins.authWithPassword(');
            console.log('    "rodridom.rock@gmail.com",');
            console.log('    "TU_CONTRASEÑA_ADMIN"');
            console.log(');');
        }
    }
}

// Ejecutar
recalcularNiveles();
