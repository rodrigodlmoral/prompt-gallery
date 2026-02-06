import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function debugFilter(username) {
    try {
        console.log(`🧪 Probando: name = "${username}"`);
        const res = await pb.collection('users').getList(1, 1, {
            filter: `name = "${username}"`
        });
        console.log(`✅ Éxito. Items: ${res.totalItems}`);
        if (res.items.length > 0) {
            console.log("Dato encontrado:", JSON.stringify(res.items[0], null, 2));
        } else {
            console.log("❌ NO encontrado.");
        }
    } catch (err) {
        console.log(`   ❌ Falló: ${err.message}`);
    }
}

debugFilter('valentine');
