import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function createMinimal() {
    try {
        console.log("🔑 Autenticando...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        try {
            // Delete if exists
            await pb.collections.delete('facebook_queue').catch(() => { });

            console.log("🛠️ Creando colección MINIMA 'facebook_queue'...");
            const collection = await pb.collections.create({
                name: 'facebook_queue',
                type: 'base',
                schema: [
                    {
                        name: 'dummy_field',
                        type: 'text'
                    }
                ]
            });
            console.log("✅ Colección MINIMA creada (ID:", collection.id, ")");

        } catch (e) {
            console.error("❌ Error creando colección:", e.data || e.message);
        }

    } catch (err) {
        console.error("❌ Error de Autenticación:", err.message);
    }
}

createMinimal();
