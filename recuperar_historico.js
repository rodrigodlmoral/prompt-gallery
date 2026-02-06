import PocketBase from 'pocketbase';
import fs from 'fs';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function recoverHistoricalData() {
    try {
        console.log("📂 Cargando backup histórico...");
        const backupData = JSON.parse(fs.readFileSync('./backups/migration_pocketbase_fase1/prompts_backup.json', 'utf8'));

        // Crear un mapa por supabase_id para búsqueda rápida
        // Ojo: algunos backups pueden usar 'id' como el id de supabase original
        const backupMap = new Map();
        backupData.forEach(p => {
            const sid = p.supabase_id || p.id;
            backupMap.set(String(sid), p);
        });

        console.log(`📊 Backup cargado: ${backupMap.size} prompts encontrados.`);

        // 1. Obtener todos los prompts de PocketBase
        // No podemos usar sort '-created' por limitaciones de PocketHost, así que pedimos por página
        let page = 1;
        let totalUpdated = 0;

        while (true) {
            console.log(`🔍 Procesando página ${page} de PocketBase...`);
            const records = await pb.collection('prompts').getList(page, 50);

            if (records.items.length === 0) break;

            for (const item of records.items) {
                const sid = item.supabase_id;
                if (!sid) {
                    // console.log(`⏩ Saltando prompt ${item.id} (Sin supabase_id)`);
                    continue;
                }

                const hist = backupMap.get(String(sid));
                if (hist) {
                    const updateData = {};

                    // Solo actualizamos si el campo está vacío o es nulo
                    if (item.tokens_received === 0 && hist.tokens_received > 0) {
                        updateData.tokens_received = hist.tokens_received;
                    }
                    if (!item.rating || item.rating === 'SFW / Apto' || item.rating === 'undefined') {
                        updateData.rating = hist.rating || 'SFW / Apto';
                    }

                    // Privacidad (Asegurar boolean)
                    const histPrivate = hist.is_private === true;
                    if (item.is_private !== histPrivate) {
                        updateData.is_private = histPrivate;
                    }

                    if (Object.keys(updateData).length > 0) {
                        try {
                            await pb.collection('prompts').update(item.id, updateData);
                            totalUpdated++;
                            console.log(`✅ [${totalUpdated}] Prompt ${item.id} actualizado:`, JSON.stringify(updateData));
                        } catch (err) {
                            console.error(`❌ Error actualizando ${item.id}:`, err.message);
                        }
                        // Pequeño delay para no saturar
                        await new Promise(r => setTimeout(r, 100));
                    }
                }
            }

            if (records.items.length < 50) break;
            page++;
        }

        console.log(`\n✨ RECUPERACIÓN COMPLETADA. Total prompts reparados: ${totalUpdated}`);

    } catch (error) {
        console.error("❌ Error fatall en recuperación:", error);
    }
}

recoverHistoricalData();
