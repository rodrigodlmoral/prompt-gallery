import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function testBasicQuery() {
    try {
        console.log("Probando consulta básica sin expand...");
        const result = await pb.collection('prompts').getList(1, 1);
        console.log("✅ ÉXITO! Datos recibidos:");
        console.log(JSON.stringify(result.items[0], null, 2));
        console.log(`\nTotal items: ${result.totalItems}`);
    } catch (err) {
        console.error("❌ Error:", err.message);
        console.error("Status:", err.status);
        console.error("Data:", err.data);
    }
}

testBasicQuery();
