const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompt-gallery.pockethost.io/');

async function testFilter(label, filter) {
    try {
        console.log(`[TEST] ${label}: filter="${filter}"`);
        const res = await pb.collection('users').getList(1, 1, { filter });
        console.log(`[SUCCESS] ${label}: Items found: ${res.totalItems}`);
    } catch (err) {
        console.error(`[ERROR] ${label}:`, err.message);
    }
}

async function run() {
    const val = 'valentine'; // Un usuario que sabemos que existe
    await testFilter('INDIVIDUAL-NAME', `name = "${val}"`);
    await testFilter('INDIVIDUAL-EMAIL', `email = "dquiroz@gmail.com"`); // Probablemente existe
    await testFilter('INDIVIDUAL-USERNAME', `username = "${val}"`);

    // Probar con espacios
    const valWithSpace = 'Mia ModelTwo';
    await testFilter('SPACE-NAME', `name = "${valWithSpace}"`);
    await testFilter('SPACE-USERNAME', `username = "${valWithSpace}"`);
}

run();
