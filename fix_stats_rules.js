import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function fixRules() {
    try {
        await pb.admins.authWithPassword("rodridom.rock@gmail.com", "alcaline01#pock");

        console.log('🛠️ Iniciando restauración de reglas para estadísticas...');

        // 1. app_stats: Lectura pública (Necesario para visitas)
        await pb.collections.update('app_stats', {
            listRule: 'id != ""',
            viewRule: 'id != ""'
        });
        console.log('✅ app_stats actualizado: Lectura pública permitida.');

        // 2. users: Permitir listado público (Solo contar IDs)
        // NOTA: PocketBase protege campos sensibles por configuración de visibilidad del campo,
        // pero la regla de List permite que getList(1, 1, {fields: "id"}) funcione para invitados.
        await pb.collections.update('users', {
            listRule: 'id != ""',
            viewRule: 'id != ""'
        });
        console.log('✅ users actualizado: Lectura pública permitida (para conteo).');

        // 3. prompts: Asegurar acceso público
        await pb.collections.update('prompts', {
            listRule: 'id != ""',
            viewRule: 'id != ""'
        });
        console.log('✅ prompts actualizado: Lectura pública confirmada.');

        console.log('\n✨ ¡Reglas restauradas con éxito! Las estadísticas deberían volver a la normalidad.');

    } catch (e) {
        console.error('❌ Error actualizando reglas:', e.message);
    }
}

fixRules();
