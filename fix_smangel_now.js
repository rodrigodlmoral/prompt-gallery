
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function fixSmangel() {
    const targetUsername = "smangel97";
    const targetUserId = "1fmcah0igjzburh";

    console.log(`🚀 Iniciando REPARACIÓN ATÓMICA para @${targetUsername}...`);

    try {
        // 1. Buscar posts que digan smangel97 pero no tengan el ID correcto
        const ghosts = await pb.collection('prompts').getFullList({
            filter: `author != "${targetUserId}" && (author_name = "${targetUsername}" || author_name ~ "${targetUsername}")`
        });

        console.log(`👻 Detectados ${ghosts.length} posts para reconectar.`);

        if (ghosts.length === 0) {
            console.log("❓ No se encontraron posts con ese author_name. Buscando por autor genérico...");
            // Si el campo author_name falló, los buscamos por cualquier medio
            const all = await pb.collection('prompts').getFullList();
            const filteredByContent = all.filter(p =>
                p.author_name === targetUsername ||
                p.username === targetUsername ||
                (p.title && p.title.includes(targetUsername))
            );
            console.log(`🔎 Búsqueda secundaria encontró ${filteredByContent.length} posts.`);

            for (const p of filteredByContent) {
                console.log(`✅ Reconectando post: ${p.title} (${p.id})`);
                await pb.collection('prompts').update(p.id, {
                    author: targetUserId,
                    author_name: targetUsername
                });
            }
        } else {
            for (const p of ghosts) {
                console.log(`✅ Reconectando post: ${p.title} (${p.id})`);
                await pb.collection('prompts').update(p.id, {
                    author: targetUserId,
                    author_name: targetUsername
                });
            }
        }

        // 2. Sincronizar el contador en la cuenta del usuario
        console.log("📊 Sincronizando contadores del perfil...");
        const finalCount = await pb.collection('prompts').getList(1, 1, {
            filter: `author = "${targetUserId}"`
        });

        await pb.collection('users').update(targetUserId, {
            prompts_count: finalCount.totalItems
        });

        console.log(`✨ ¡REPARACIÓN COMPLETADA! Ahora @${targetUsername} tiene ${finalCount.totalItems} posts vinculados.`);

    } catch (err) {
        console.error("❌ ERROR CRÍTICO:", err.message);
    }
}

fixSmangel();
