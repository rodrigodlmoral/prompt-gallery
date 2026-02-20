/**
 * ═══════════════════════════════════════════════════════════
 * INIT CENTRAL BANK — Prompt Gallery Phase C
 * ═══════════════════════════════════════════════════════════
 *
 * Creates (or finds) the "PromptBank_System" user in PocketBase.
 * This user acts as the Central Bank / System Wallet.
 *
 * USAGE:
 *   node init_central_bank.cjs
 *
 * REQUIRES:
 *   - .env with PB_ADMIN_EMAIL and PB_ADMIN_PASS
 *   - pocketbase/cjs installed
 *
 * OUTPUT:
 *   - Prints the BANK_USER_ID to use in src/lib/constants.js
 *   - Creates the user if it doesn't exist
 *   - Does NOT modify any existing data
 */

const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
const BANK_USERNAME = 'PromptBank_System';
const BANK_EMAIL = 'bank@promptgallery.system';

async function initCentralBank() {
    console.log('═'.repeat(60));
    console.log('🏦 INIT CENTRAL BANK — Prompt Gallery Phase C');
    console.log('═'.repeat(60));
    console.log(`  PB URL: ${PB_URL}`);
    console.log(`  Bank Username: ${BANK_USERNAME}`);
    console.log('');

    const pb = new PocketBase(PB_URL);

    // 1. Authenticate as Admin
    try {
        const adminEmail = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
        const adminPass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

        if (!adminEmail || !adminPass) {
            console.error('❌ ERROR: PB_ADMIN_EMAIL y PB_ADMIN_PASS son requeridos en .env');
            process.exit(1);
        }

        console.log('🔐 Autenticando como administrador...');
        await pb.admins.authWithPassword(adminEmail, adminPass);
        console.log('✅ Autenticación exitosa\n');
    } catch (err) {
        console.error('❌ Error de autenticación:', err.message);
        process.exit(1);
    }

    // 2. Check if the Bank user already exists
    let bankUser = null;
    console.log(`🔍 Buscando usuario existente "${BANK_USERNAME}"...`);

    try {
        bankUser = await pb.collection('users').getFirstListItem(`name="${BANK_USERNAME}"`);
        console.log(`✅ ¡Usuario "${BANK_USERNAME}" YA EXISTE!`);
        console.log(`   ID: ${bankUser.id}`);
        console.log(`   Tokens: ${bankUser.tokens || 0}`);
        console.log(`   Created: ${bankUser.created}`);
    } catch (e) {
        // 404 = no existe, lo cual es esperado
        if (e.status === 404 || e.message?.includes('no rows')) {
            console.log(`ℹ️  No encontrado. Se creará ahora.\n`);
        } else {
            // Try alternate search by email
            try {
                bankUser = await pb.collection('users').getFirstListItem(`email="${BANK_EMAIL}"`);
                console.log(`✅ Encontrado por email "${BANK_EMAIL}"`);
                console.log(`   ID: ${bankUser.id}`);
            } catch (e2) {
                console.log(`ℹ️  No encontrado por email tampoco. Se creará ahora.\n`);
            }
        }
    }

    // 3. Create the Bank user if it doesn't exist
    if (!bankUser) {
        console.log('🏗️  Creando usuario del Banco Central...');

        // Generate a secure random password (the bank never "logs in" via UI)
        const crypto = require('crypto');
        const bankPassword = crypto.randomBytes(32).toString('hex');

        try {
            bankUser = await pb.collection('users').create({
                name: BANK_USERNAME,
                email: BANK_EMAIL,
                password: bankPassword,
                passwordConfirm: bankPassword,
                emailVisibility: false,
                // Initialize with 0 tokens — negative balance = total minted
                tokens: 0,
                total_earned: 0,
                total_spent: 0,
                total_rewards: 0,
                level: 0,
                prompts_count: 0,
                total_copies: 0,
                // Mark as system account (no special badges to avoid validation issues)
                unique_badges: []
            });

            console.log('✅ ¡Banco Central creado exitosamente!\n');
            console.log(`   ID:       ${bankUser.id}`);
            console.log(`   Name:     ${bankUser.name}`);
            console.log(`   Email:    ${BANK_EMAIL}`);
            console.log(`   Tokens:   0 (saldo negativo = circulante emitido)`);
        } catch (createErr) {
            console.error('❌ Error creando el Banco Central:', createErr.message);
            if (createErr.data) {
                console.error('   Detalle:', JSON.stringify(createErr.data, null, 2));
            }
            process.exit(1);
        }
    }

    // 4. Output the ID for constants.js
    console.log('\n' + '═'.repeat(60));
    console.log('📋 RESULTADO — Copia este ID a src/lib/constants.js:');
    console.log('═'.repeat(60));
    console.log(`\n  export const BANK_USER_ID = '${bankUser.id}';\n`);
    console.log('═'.repeat(60));

    // 5. Verify the user is accessible
    console.log('\n🔍 Verificación final...');
    try {
        const verify = await pb.collection('users').getOne(bankUser.id);
        console.log(`✅ Verificado: "${verify.name}" (ID: ${verify.id})`);
        console.log(`   Tokens: ${verify.tokens || 0}`);
        console.log(`   Badges: ${JSON.stringify(verify.unique_badges || [])}`);
    } catch (verifyErr) {
        console.error('⚠️  Verificación falló:', verifyErr.message);
    }

    console.log('\n✅ LISTO. Ahora ejecuta la Sección 2 (add_entry_type_field.cjs).');
}

initCentralBank().catch(err => {
    console.error('\n❌ Error fatal:', err);
    process.exit(1);
});
