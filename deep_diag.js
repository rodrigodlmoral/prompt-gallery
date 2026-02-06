import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function diag() {
    try {
        const p = await pb.collection('prompts').getList(1, 10);
        console.log("KEYS ENCONTRADAS:", Object.keys(p.items[0]));

        p.items.forEach(i => {
            console.log(`ID: ${i.id} | Rating: ${i.rating} | Tips: ${i.tips} | Bits: ${i.bits} | Private: ${i.is_private}`);
        });

        const u = await pb.collection('users').getList(1, 1);
        console.log("\nKEYS EN USUARIOS:", Object.keys(u.items[0]));
        console.log("Settings de un usuario:", u.items[0].settings);

    } catch (e) {
        console.error(e);
    }
}

diag();
