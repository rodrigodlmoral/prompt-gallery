import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function testWithoutExpand() {
    try {
        console.log("Probando SIN expand...");
        const records = await pb.collection('prompts').getList(1, 5, {
            sort: '-created'
        });

        console.log(`✅ FUNCIONA! Total: ${records.totalItems}`);
        console.log(`Con imágenes:`);
        records.items.forEach(p => {
            console.log(`  - "${p.title}": ${p.image ? '✅' : '❌'}`);
        });

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

testWithoutExpand();
