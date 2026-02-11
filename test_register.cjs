const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompt-gallery.pockethost.io/');

async function testRegister() {
    try {
        const email = `test_${Date.now()}@example.com`;
        const username = `Test User ${Date.now()}`;
        const password = 'TestPassword123!';

        console.log(`[TEST] Intentando registrar: ${email} / ${username}`);

        const record = await pb.collection('users').create({
            username,
            email,
            password,
            passwordConfirm: password,
            name: username,
            tokens: 100,
            level: 0,
            xp: 0,
            role: 'user'
        });

        console.log('[SUCCESS] Cuenta creada:', record.id);

        try {
            await pb.collection('users').requestVerification(email);
            console.log('[SUCCESS] Verificación solicitada');
        } catch (vErr) {
            console.error('[ERROR] Fallo al solicitar verificación:', JSON.stringify(vErr.data, null, 2));
        }

    } catch (err) {
        console.error('[CRITICAL] Error en creación:', JSON.stringify(err.data, null, 2));
        console.error('[MESSAGE]:', err.message);
        console.error('[STAKE]:', err.stack);
    }
}

testRegister();
