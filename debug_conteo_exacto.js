import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function debugUsers() {
    try {
        console.log("--- BUSCANDO USUARIO RODRIGO ---");
        const users = await pb.collection('users').getFullList();
        const rodrigo = users.find(u => u.username === 'rodrigodlmoral' || u.name === 'rodrigodlmoral' || u.email.includes('jacrispin92'));

        if (rodrigo) {
            console.log(`Usuario encontrado: ${rodrigo.username || rodrigo.name}`);
            console.log(`ID: ${rodrigo.id}`);
            console.log(`Prompts Count en DB: ${rodrigo.prompts_count}`);

            const realPrompts = await pb.collection('prompts').getList(1, 1, {
                filter: `author = "${rodrigo.id}"`
            });
            console.log(`Prompts reales encontrados para este ID: ${realPrompts.totalItems}`);
        } else {
            console.log("No se encontró un usuario llamado rodrigodlmoral");
        }

        console.log("\n--- BUSCANDO QUIÉN TIENE 23 POSTS ---");
        for (const u of users) {
            const count = await pb.collection('prompts').getList(1, 1, {
                filter: `author = "${u.id}"`
            });
            if (count.totalItems > 0) {
                console.log(`ID: ${u.id} | Email: ${u.email} | Posts: ${count.totalItems} | Field: ${u.prompts_count}`);
            }
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

debugUsers();
