
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function auditCollections() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');

        if (!adminEmail || !adminPass) throw new Error('Admin credentials missing');

        console.log('Authenticating as admin...');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log('Fetching all collections...');
        const collections = await pb.collections.getFullList();

        console.log('--- AUDIT REPORT ---');
        collections.forEach(c => {
            console.log(`\n📦 Collection: ${c.name} (${c.id}) [Type: ${c.type}]`);
            console.log(`   Rules:`);
            console.log(`     L: ${c.listRule || '❌'}`);
            console.log(`     V: ${c.viewRule || '❌'}`);
            console.log(`     C: ${c.createRule || '❌'}`);
            console.log(`     U: ${c.updateRule || '❌'}`);

            // Debug keys
            // console.log('   Keys:', Object.keys(c));

            if (c.schema && Array.isArray(c.schema)) {
                console.log('   Schema:');
                c.schema.forEach(f => {
                    console.log(`     - ${f.name} (${f.type})${f.required ? ' *REQUIRED*' : ''}`);
                });
            } else if (c.fields && Array.isArray(c.fields)) {
                // PocketBase v0.22+ uses fields instead of schema for data modeling in some contexts
                console.log('   Fields (v0.22+):');
                c.fields.forEach(f => {
                    console.log(`     - ${f.name} (${f.type})${f.required ? ' *REQUIRED*' : ''}`);
                });
            } else {
                console.log('   Schema/Fields: No definido');
            }
        });

    } catch (err) {
        console.error('❌ Audit Error:', err.message);
    }
}

auditCollections();
