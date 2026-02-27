/**
 * Add REGISTRATION_BONUS to the ledger collection's type select field.
 * Run: node add_registration_bonus_type.cjs
 */
const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);
    console.log('✅ Admin authenticated');

    // 1. Get the ledger collection schema
    const collections = await pb.collections.getFullList();
    const ledgerCol = collections.find(c => c.name === 'ledger');

    if (!ledgerCol) {
        console.error('❌ Ledger collection not found!');
        return;
    }

    // 2. Find the type field
    const typeField = ledgerCol.fields.find(f => f.name === 'type');
    if (!typeField) {
        console.error('❌ type field not found in ledger collection!');
        return;
    }

    console.log('Current type values:', typeField.values);

    // 3. Add REGISTRATION_BONUS if not already present
    if (typeField.values && typeField.values.includes('REGISTRATION_BONUS')) {
        console.log('✅ REGISTRATION_BONUS already exists — nothing to do');
        return;
    }

    const newValues = [...(typeField.values || []), 'REGISTRATION_BONUS'];
    console.log('New type values:', newValues);

    // 4. Update the field
    typeField.values = newValues;

    await pb.collections.update(ledgerCol.id, {
        fields: ledgerCol.fields
    });

    console.log('✅ REGISTRATION_BONUS added to ledger type field!');
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
