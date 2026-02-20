
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function testPresenceAsUser() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        // Usar una cuenta normal para probar (no admin)
        // Intentaremos loguearnos con las credenciales que el usuario pueda tener o simplemente listar si es público
        // Pero el List Rule pide @request.auth.id != ""

        // Vamos a intentar obtener un usuario real para simularlo o pedirle al usuario que nos diga uno.
        // Por ahora, usaremos admin para obtener un usuario, y luego probaremos con ese usuario.

        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        const users = await pb.collection('users').getList(1, 1);
        if (users.items.length === 0) throw new Error("No users found to test with");

        const testUser = users.items[0];
        console.log(`Testing visibility as user: ${testUser.username} (${testUser.id})`);

        // PocketBase permite "simular" un auth si tenemos el token, pero aquí es más fácil 
        // simplemente verificar las reglas de nuevo con mucho detalle.

        const presenceCol = await pb.collections.getOne('chat_presence');
        console.log(`Current List Rule: ${presenceCol.listRule}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

testPresenceAsUser();
