import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function checkPresence() {
    try {
        await pb.admins.authWithPassword("rodridom.rock@gmail.com", "alcaline01#pock");
        const records = await pb.collection('chat_presence').getFullList({
            expand: 'user'
        });

        console.log(`Total registros en chat_presence: ${records.length}`);

        const now = Date.now();
        const twoMin = 120000;
        const active = records.filter(r => {
            const lastSeen = new Date(r.last_seen).getTime();
            return (now - lastSeen) < twoMin;
        });

        console.log(`Registros activos (< 2min): ${active.length}`);

        active.forEach(r => {
            console.log(` - Usuario: ${r.expand?.user?.username || r.user} | Last Seen: ${r.last_seen}`);
        });

        // Revisar reglas
        const coll = await pb.collections.getOne('chat_presence');
        console.log('\n🛡️ REGLAS chat_presence:');
        console.log(`   List: ${coll.listRule}`);
        console.log(`   View: ${coll.viewRule}`);
        console.log(`   Create: ${coll.createRule}`);
        console.log(`   Update: ${coll.updateRule}`);

        // Revisar reglas global_chat también por si acaso
        const chatColl = await pb.collections.getOne('global_chat');
        console.log('\n🛡️ REGLAS global_chat:');
        console.log(`   List: ${chatColl.listRule}`);
        console.log(`   Create: ${chatColl.createRule}`);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkPresence();
