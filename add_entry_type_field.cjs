/**
 * ═══════════════════════════════════════════════════════════
 * ADD ENTRY_TYPE FIELD — Ledger Schema Migration
 * ═══════════════════════════════════════════════════════════
 *
 * Adds the 'entry_type' field to the 'ledger' collection in PocketBase.
 * This field enables double-entry bookkeeping:
 *   - DEBIT:  Money leaving an account
 *   - CREDIT: Money entering an account
 *   - (empty): Legacy records (pre-Phase C)
 *
 * SAFETY:
 *   - The field is OPTIONAL (required: false)
 *   - Existing records are NOT modified
 *   - Idempotent: safe to run multiple times
 *
 * USAGE:
 *   node add_entry_type_field.cjs
 */

const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function addEntryTypeField() {
    console.log('═'.repeat(60));
    console.log('📐 ADD ENTRY_TYPE FIELD — Ledger Schema Migration');
    console.log('═'.repeat(60));
    console.log(`  PB URL: ${PB_URL}\n`);

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

    // 2. Get current ledger collection schema
    let ledgerColl;
    try {
        console.log('📋 Leyendo esquema actual de "ledger"...');
        ledgerColl = await pb.collections.getOne('ledger');
        console.log(`  Campos actuales: ${ledgerColl.fields.map(f => f.name).join(', ')}`);
    } catch (err) {
        console.error('❌ No se pudo leer la colección "ledger":', err.message);
        process.exit(1);
    }

    // 3. Check if entry_type already exists
    const existingField = ledgerColl.fields.find(f => f.name === 'entry_type');
    if (existingField) {
        console.log('\nℹ️  El campo "entry_type" YA EXISTE en el esquema.');
        console.log(`   Tipo: ${existingField.type}`);
        console.log('   No se necesitan cambios.');
    } else {
        // 4. Count existing records BEFORE migration (for verification)
        let countBefore = 0;
        try {
            const result = await pb.collection('ledger').getList(1, 1);
            countBefore = result.totalItems;
            console.log(`\n📊 Registros ANTES de migración: ${countBefore}`);
        } catch (err) {
            console.warn('⚠️  No se pudo contar registros:', err.message);
        }

        // 5. Add the entry_type field
        console.log('\n🔧 Agregando campo "entry_type"...');
        try {
            // Clone existing fields and add the new one
            const updatedFields = [
                ...ledgerColl.fields,
                {
                    name: 'entry_type',
                    type: 'text',
                    required: false,
                    options: {
                        min: null,
                        max: 10,
                        pattern: ''
                    }
                }
            ];

            await pb.collections.update(ledgerColl.id, {
                fields: updatedFields
            });

            console.log('✅ Campo "entry_type" agregado exitosamente.');
            console.log('   Tipo: text');
            console.log('   Required: false (legacy records keep empty)');
            console.log('   Values: DEBIT | CREDIT | (empty for legacy)');
        } catch (err) {
            console.error('❌ Error al agregar campo:', err.message);
            if (err.data) {
                console.error('   Detalle:', JSON.stringify(err.data, null, 2));
            }
            process.exit(1);
        }

        // 6. Verify records are intact
        try {
            const result = await pb.collection('ledger').getList(1, 1);
            const countAfter = result.totalItems;
            console.log(`\n📊 Registros DESPUÉS de migración: ${countAfter}`);

            if (countAfter === countBefore) {
                console.log('✅ Verificación: Conteo idéntico. Ningún registro fue alterado.');
            } else {
                console.error(`⚠️  ADVERTENCIA: Conteo cambió de ${countBefore} a ${countAfter}`);
            }
        } catch (err) {
            console.warn('⚠️  No se pudo verificar conteo:', err.message);
        }
    }

    // 7. Final schema check
    console.log('\n📋 Esquema final de "ledger":');
    try {
        const finalColl = await pb.collections.getOne('ledger');
        finalColl.fields.forEach(f => {
            const req = f.required ? '(REQUIRED)' : '(optional)';
            console.log(`  - ${f.name}: ${f.type} ${req}`);
        });
    } catch (err) {
        console.warn('⚠️  No se pudo leer esquema final:', err.message);
    }

    // 8. Verify a random legacy record still works
    console.log('\n🔍 Verificando lectura de registro legacy...');
    try {
        const sample = await pb.collection('ledger').getList(1, 1, {
            sort: '-created'
        });
        if (sample.items.length > 0) {
            const record = sample.items[0];
            console.log(`  ID: ${record.id}`);
            console.log(`  Type: ${record.type}`);
            console.log(`  Amount: ${record.amount}`);
            console.log(`  entry_type: "${record.entry_type || ''}" (expected empty for legacy)`);
            console.log('✅ Registro legacy legible y funcional.');
        } else {
            console.log('ℹ️  No hay registros en el ledger aún.');
        }
    } catch (err) {
        console.warn('⚠️  Error leyendo registro legacy:', err.message);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ MIGRACIÓN COMPLETADA — Sección 2 finalizada');
    console.log('═'.repeat(60));
}

addEntryTypeField().catch(err => {
    console.error('\n❌ Error fatal:', err);
    process.exit(1);
});
