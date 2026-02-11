
const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function inspect() {
    const targetUserId = "1fmcah0igjzburh";
    console.log("🔍 INSPECCIONANDO USUARIO:", targetUserId);

    try {
        const user = await pb.collection('users').getOne(targetUserId);
        console.log(`✅ Usuario encontrado: Name=${user.name}, Username=${user.username}, Email=${user.email}`);

        console.log("🔍 BUSCANDO POSTS QUE DIGAN 'smangel' en cualquier lado...");
        const all = await pb.collection('prompts').getFullList();
        const found = all.filter(p => JSON.stringify(p).includes("smangel"));

        console.log(`📈 Encontrados ${found.length} posts relacionados.`);

        found.forEach(p => {
            console.log(`📌 Post: ${p.title}`);
            console.log(`   ID: ${p.id}`);
            console.log(`   Author ID actual en DB: ${p.author}`);
            console.log(`   Author Name en DB: ${p.author_name}`);
            console.log(`   ¿Coincide con el target?: ${p.author === targetUserId ? 'SÍ' : 'NO'}`);
            console.log("-----------------------------------------");
        });

    } catch (err) {
        console.log("❌ Error:", err.message);
    }
}

inspect();
