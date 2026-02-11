const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompt-gallery.pockethost.io/');

async function testDuplicate() {
    try {
        const email = 'miatwo@gmail.com'; // Probablemente el que está fallando
        const username = 'Mia ModelTwo';
        const password = 'TestPassword123!';

        console.log(`[TEST] Forzando registro duplicado: ${email}`);

        await pb.collection('users').create({
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

        console.log('[SUCCESS] ¡No falló! El usuario no era duplicado.');

    } catch (err) {
        console.log('[CAUGHT] Código de error:', err.status);
        console.log('[DATA]:', JSON.stringify(err.data, null, 2));
    }
}

testDuplicate();
