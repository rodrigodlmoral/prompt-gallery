import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function verifyData() {
    try {
        const records = await pb.collection('prompts').getList(1, 1);
        if (records.items.length > 0) {
            console.log("=== VERIFICACIÓN TÉCNICA DE DATOS ===");
            console.log(JSON.stringify(records.items[0], null, 2));

            const p = records.items[0];
            if (p.image_url && !p.image) {
                console.log("\n✅ CONFIRMADO: El campo se llama 'image_url' pero el frontend busca 'image'.");
            }
            if (p.is_private !== undefined && p.isPrivate === undefined) {
                console.log("✅ CONFIRMADO: El campo se llama 'is_private' pero el frontend busca 'isPrivate'.");
            }
        } else {
            console.log("❌ No se encontraron registros en la colección 'prompts'.");
        }
    } catch (err) {
        console.error("❌ Error de conexión:", err.message);
    }
}

verifyData();
