import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function quickTest() {
    try {
        console.log("Probando consulta simple...");
        const result = await pb.collection('prompts').getList(1, 1);
        console.log(`✅ FUNCIONA! Total: ${result.totalItems}`);
    } catch (err) {
        console.error(`❌ Error ${err.status}: ${err.message}`);
    }
}

quickTest();
