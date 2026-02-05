const PB_URL = 'https://prompt-gallery.pockethost.io';

async function checkCount() {
    try {
        const uRes = await fetch(`${PB_URL}/api/collections/users/records?perPage=1`);
        const uData = await uRes.json();
        const pRes = await fetch(`${PB_URL}/api/collections/prompts/records?perPage=1`);
        const pData = await pRes.json();

        console.log(`Usuarios: ${uData.totalItems}`);
        console.log(`Prompts: ${pData.totalItems}`);
    } catch (e) {
        console.log('Error:', e.message);
    }
}

checkCount();
