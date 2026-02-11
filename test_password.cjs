const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompt-gallery.pockethost.io/');

async function testPassword() {
    try {
        const id = Date.now();
        const email = `test_pass_${id}@gmail.com`;
        const username = `TestPassUser_${id}`;
        const password = 'mia01#prompt'; // Contraseña del usuario

        console.log(`[TEST] Probando contraseña: "${password}"`);

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

        console.log('[SUCCESS] Cuenta creada con la contraseña del usuario.');

    } catch (err) {
        console.log('[CAUGHT] Código de error:', err.status);
        console.log('[DATA]:', JSON.stringify(err.data, null, 2));
    }
}

testPassword();
