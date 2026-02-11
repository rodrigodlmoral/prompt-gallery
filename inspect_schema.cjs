const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompt-gallery.pockethost.io/');

async function inspectSchema() {
    try {
        console.log(`[INSPECT] Obteniendo un usuario para ver esquema...`);
        const res = await pb.collection('users').getList(1, 1);
        if (res.items.length > 0) {
            console.log(`[SCHEMA] Campos disponibles:`, Object.keys(res.items[0]).join(', '));
            console.log(`[DATA] Ejemplo:`, JSON.stringify(res.items[0], null, 2));
        } else {
            console.log(`[EMPTY] No hay usuarios en la colección.`);
        }
    } catch (err) {
        console.error(`[ERROR] Fallo en inspección:`, err.message);
    }
}

inspectSchema();
