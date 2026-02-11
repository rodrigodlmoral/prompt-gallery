const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompt-gallery.pockethost.io/');

async function checkUser(query) {
    try {
        console.log(`[CHECK] Investigando: "${query}"`);
        const res = await pb.collection('users').getList(1, 1, {
            filter: `email = "${query}" || username = "${query}" || name = "${query}"`
        });
        if (res.items.length > 0) {
            console.log(`[FOUND] Usuario encontrado:`, JSON.stringify(res.items[0], null, 2));
        } else {
            console.log(`[NOT FOUND] No existe registro para "${query}"`);
        }
    } catch (err) {
        console.error(`[ERROR] Fallo en búsqueda:`, err.message);
    }
}

async function run() {
    await checkUser('miatwo@gmail.com');
    await checkUser('Mia ModelTwo');
}

run();
