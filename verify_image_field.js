import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function verifyImageUrl() {
    try {
        const record = await pb.collection('prompts').getOne('z5rx12lerae', {
            fields: '*' //  Todos los campos
        });

        console.log("=== PROMPT COMPLETO ===");
        console.log(JSON.stringify(record, null, 2));

        if (record.image_url) {
            console.log("\n✅ image_url EXISTE y está poblado");
        } else {
            console.log("\n❌ image_url NO EXISTE o está vacío");
            console.log("Campos disponibles:", Object.keys(record));
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

verifyImageUrl();
