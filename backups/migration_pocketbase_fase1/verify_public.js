const PB_URL = 'https://prompt-gallery.pockethost.io';

async function verifyPublic() {
    console.log('🌐 Verificando acceso público...');
    try {
        const res = await fetch(`${PB_URL}/api/collections/prompts/records?perPage=5`);
        const data = await res.json();

        if (data.items && data.items.length > 0) {
            console.log(`✅ ¡Éxito! Se encontraron ${data.items.length} prompts públicos.`);
            console.log('Ejemplo:', data.items[0].title);
        } else {
            console.log('❌ Error: No se encontraron prompts o el acceso sigue denegado.');
            console.log('Respuesta:', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.log('❌ Error de red:', e.message);
    }
}

verifyPublic();
