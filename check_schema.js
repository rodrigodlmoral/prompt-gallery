import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function checkSchema() {
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        console.log("=== VERIFICANDO ESTRUCTURA DE DATOS ===\n");

        // 1. Ver campos de users
        console.log("1. USUARIOS - Primeros 2 registros:");
        const users = await pb.collection('users').getList(1, 2);
        users.items.forEach((u, i) => {
            console.log(`\n   Usuario ${i + 1}:`);
            console.log(`   - id: ${u.id}`);
            console.log(`   - email: ${u.email}`);
            console.log(`   - username: ${u.username || 'NO EXISTE'}`);
            console.log(`   - name: ${u.name || 'NO EXISTE'}`);
            console.log(`   - display_name: ${u.display_name || 'NO EXISTE'}`);
            console.log(`   Todos los campos:`, Object.keys(u));
        });

        // 2. Ver campos de prompts
        console.log("\n\n2. PROMPTS - Primeros 2 registros:");
        const prompts = await pb.collection('prompts').getList(1, 2);
        prompts.items.forEach((p, i) => {
            console.log(`\n   Prompt ${i + 1}: "${p.title}"`);
            console.log(`   - author (ID): ${p.author}`);
            console.log(`   - author_name: ${p.author_name || 'NO EXISTE'}`);
            console.log(`   - username: ${p.username || 'NO EXISTE'}`);
            console.log(`   Todos los campos:`, Object.keys(p));
        });

        // 3. Ver tu usuario específico
        console.log("\n\n3. TU USUARIO (rodridom.rock@gmail.com):");
        const you = users.items.find(u => u.email === ADMIN_EMAIL) || await pb.collection('users').getFirstListItem(`email="${ADMIN_EMAIL}"`);
        console.log(`   - id: ${you.id}`);
        console.log(`   - username: ${you.username || 'NO EXISTE'}`);
        console.log(`   - email: ${you.email}`);
        console.log(`   Campos disponibles:`, Object.keys(you));

    } catch (err) {
        console.error("Error:", err.message);
    }
}

checkSchema();
