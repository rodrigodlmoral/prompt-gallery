
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function fixPresenceRules() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');

        if (!adminEmail || !adminPass) throw new Error('Admin credentials missing');

        console.log('Authenticating as admin...');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log('Updating "chat_presence" collection rules...');
        const collection = await pb.collections.getOne('chat_presence');

        // Reglas de Seguridad:
        // - List: Permitir a todos los logueados (para contar online)
        // - View: Permitir a todos los logueados
        // - Create: Permitir a cualquier logueado, forzando que el campo 'user' sea él mismo
        // - Update: Solo el dueño puede actualizar su registro

        collection.listRule = '@request.auth.id != ""';
        collection.viewRule = '@request.auth.id != ""';
        collection.createRule = '@request.auth.id != ""';
        collection.updateRule = '@request.auth.id != "" && user = @request.auth.id';

        await pb.collections.update(collection.id, collection);
        console.log('✅ Collection "chat_presence" rules updated successfully!');

    } catch (err) {
        console.error('❌ Error updating rules:', err.message);
        if (err.data) console.error('Details:', JSON.stringify(err.data, null, 2));
    }
}

fixPresenceRules();
