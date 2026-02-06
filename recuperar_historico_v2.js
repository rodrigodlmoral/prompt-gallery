import PocketBase from 'pocketbase';
import fs from 'fs';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function recoverHistoricalData() {
    try {
        console.log("📂 Cargando backup histórico...");
        const backupData = JSON.parse(fs.readFileSync('./backups/migration_pocketbase_fase1/prompts_backup.json', 'utf8'));

        // Crear un mapa por image_url para búsqueda rápida
        const backupMap = new Map();
        backupData.forEach(p => {
            if (p.image_url) {
                // Normalizar URL (quitar espacios o parámetros si hubiera)
                const cleanUrl = p.image_url.trim();
                backupMap.set(cleanUrl, p);
            }
        });

        console.log(`📊 Backup cargado: ${backupMap.size} posts con imagen encontrados.`);

        let page = 1;
        let totalUpdated = 0;
        let totalRecords = 0;

        while (true) {
            const records = await pb.collection('prompts').getList(page, 50);
            if (records.items.length === 0) break;

            for (const item of records.items) {
                totalRecords++;
                const pbImageUrl = (item.image || "").trim();

                // Buscar en el mapa de backup por la URL de la imagen
                const hist = backupMap.get(pbImageUrl);

                if (hist) {
                    const updateData = {};

                    // 1. Propinas (tokens_received)
                    if ((item.tokens_received === 0 || !item.tokens_received) && hist.tokens_received > 0) {
                        updateData.tokens_received = hist.tokens_received;
                    }

                    // 2. Rating (NSFW)
                    // Si el PB está vacío o es 'SFW / Apto' por defecto, y el histórico tiene algo más serio
                    if ((!item.rating || item.rating === 'SFW / Apto') && hist.rating && hist.rating !== 'SFW / Apto') {
                        updateData.rating = hist.rating;
                    }

                    // 3. Privacidad
                    const histPrivate = hist.is_private === true;
                    if (item.is_private !== histPrivate) {
                        updateData.is_private = histPrivate;
                    }

                    if (Object.keys(updateData).length > 0) {
                        try {
                            await pb.collection('prompts').update(item.id, updateData);
                            totalUpdated++;
                            console.log(`✅ [${totalUpdated}] UPDATED: "${item.title}" | Rating: ${updateData.rating || '-'} | Bits: ${updateData.tokens_received || '-'}`);
                        } catch (err) {
                            console.error(`❌ Error actualizando ${item.id} (${item.title}):`, err.message);
                        }
                        await new Promise(r => setTimeout(r, 150));
                    }
                }
            }

            if (records.items.length < 50) break;
            page++;
        }

        console.log(`\n✨ RECUPERACIÓN FINALIZADA.`);
        console.log(`Total registros analizados: ${totalRecords}`);
        console.log(`Total registros actualizados: ${totalUpdated}`);

    } catch (error) {
        console.error("❌ Error en script de recuperación:", error);
    }
}

recoverHistoricalData();
