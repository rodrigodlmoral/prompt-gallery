
import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Config
const PB_URL = process.env.PB_URL || process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PB_ADMIN_PASS;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, 'backups_files');

// Ensure backup dir exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupDatabase() {
    console.log('💾 Starting Full Database Backup...');
    console.log(`📡 Connecting to: ${PB_URL}`);

    const pb = new PocketBase(PB_URL);

    // --- AUTHENTICATION ---
    try {
        if (ADMIN_EMAIL && ADMIN_PASS) {
            console.log('🔑 Attempting to authenticate...');
            try {
                await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
                console.log('✅ Admin authenticated successfully.');
            } catch (adminErr) {
                console.warn('⚠️  Admin auth failed. Trying as User...');
                try {
                    const pbUser = new PocketBase(PB_URL);
                    await pbUser.collection('users').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
                    pb.authStore.save(pbUser.authStore.token, pbUser.authStore.model);
                    console.log('✅ User authenticated successfully.');
                } catch (userErr) {
                    console.error('❌ User auth also failed:', userErr.message);
                    console.warn('⚠️  Proceeding as Guest. Some collections will be empty.');
                }
            }
        }
    } catch (e) {
        console.error('❌ Auth Error:', e.message);
    }

    const collectionsToBackup = ['users', 'prompts', 'activity_logs', 'app_stats', 'tickets'];
    const backupData = {
        timestamp: new Date().toISOString(),
        collections: {}
    };

    for (const collectionName of collectionsToBackup) {
        console.log(`📦 Backing up collection: ${collectionName}...`);
        let records = [];
        try {
            let page = 1;
            const perPage = 50;

            while (true) {
                console.log(`   Fetching ${collectionName} page ${page}...`);
                // Note: No sorting to avoid potential 400 errors found in audit
                const result = await pb.collection(collectionName).getList(page, perPage);
                records = records.concat(result.items);

                if (page >= result.totalPages) break;
                page++;

                await new Promise(r => setTimeout(r, 300)); // Safety delay
            }
            console.log(`   Total ${collectionName} records: ${records.length}`);
            backupData.collections[collectionName] = records;
        } catch (err) {
            console.error(`❌ Failed to backup ${collectionName}: ${err.message}`);
            backupData.collections[collectionName] = [];
        }
    }

    // --- SAVE BACKUP ---
    const filename = `full_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    console.log('✅ Backup Completed!');
    console.log(`📝 File saved to: ${filepath}`);
    console.log(`📊 Backup Summary:`);
    for (const [name, data] of Object.entries(backupData.collections)) {
        console.log(`   - ${name}: ${data.length} records`);
    }
}

// Run if called directly
backupDatabase();
