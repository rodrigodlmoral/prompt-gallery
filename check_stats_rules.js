import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function checkRules() {
    try {
        await pb.admins.authWithPassword("rodridom.rock@gmail.com", "alcaline01#pock");

        const collections = ['users', 'prompts', 'app_stats'];

        for (const name of collections) {
            const coll = await pb.collections.getOne(name);
            console.log(`\n🛡️ REGLAS ${name}:`);
            console.log(`   List: ${coll.listRule}`);
            console.log(`   View: ${coll.viewRule}`);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkRules();
