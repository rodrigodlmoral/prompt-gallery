import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function resetUserPassword() {
    try {
        console.log("🔑 RESETEANDO TU CONTRASEÑA\n");

        // Autenticar como admin
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Autenticado como admin\n");

        // Buscar tu usuario
        const userEmail = 'rodridom.rock@gmail.com';
        const users = await pb.collection('users').getFullList({
            filter: `email = "${userEmail}"`
        });

        if (users.length === 0) {
            console.error(`❌ Usuario con email ${userEmail} no encontrado`);
            return;
        }

        const user = users[0];
        console.log(`👤 Usuario encontrado: ${user.username} (${user.email})\n`);

        // Nueva contraseña
        const NEW_PASSWORD = 'Promptgallery2024!';

        console.log("📝 Actualizando contraseña...");
        await pb.collection('users').update(user.id, {
            password: NEW_PASSWORD,
            passwordConfirm: NEW_PASSWORD
        });

        console.log("\n🎉 CONTRASEÑA ACTUALIZADA EXITOSAMENTE");
        console.log(`\n📧 Email: ${userEmail}`);
        console.log(`🔑 Nueva contraseña: ${NEW_PASSWORD}`);
        console.log("\nAhora puedes iniciar sesión en la web con estas credenciales.");

    } catch (err) {
        console.error("\n❌ ERROR:", err.message);
        console.error("Data:", err.data);
    }
}

resetUserPassword();
