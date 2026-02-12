
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PB_URL = process.env.VITE_POCKETBASE_URL || "https://prompt-gallery.pockethost.io";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PB_ADMIN_PASS;

console.log(`Debug URL: ${PB_URL}`);

const pb = new PocketBase(PB_URL);

async function run() {
    try {
        console.log("Attempting auth...");
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("Auth success!");

        console.log("Getting 'activity_logs' collection schema...");
        try {
            const logsCollection = await pb.collections.getOne('activity_logs');
            console.log("Got activity_logs collection:", logsCollection.name);
            const fields = logsCollection.fields || [];
            fields.forEach(f => console.log(` - ${f.name} (${f.type})`));

            console.log("Testing getList on activity_logs (no filter)...");
            const list = await pb.collection('activity_logs').getList(1, 1);
            console.log(`getList success! Found ${list.totalItems} items.`);

            console.log("Testing filter on activity_logs...");
            const filtered = await pb.collection('activity_logs').getList(1, 1, {
                filter: 'action = "send_tip"'
            });
            console.log(`Filtered list success! Found ${filtered.totalItems} items.`);

            console.log("Testing sort='-created' on activity_logs...");
            const sorted = await pb.collection('activity_logs').getList(1, 1, {
                sort: '-created'
            });
            console.log(`Sorted (-created) list success! Found ${sorted.totalItems} items.`);

            console.log("Testing getFullList with filter and sort...");
            const fulllist = await pb.collection('activity_logs').getFullList({
                filter: 'action = "send_tip"',
                sort: 'created'
            });
            console.log(`getFullList success! Found ${fulllist.length} items.`);

        } catch (e) {
            console.error("Failed inner:", e.response?.data || e.message);
        }

    } catch (err) {
        console.error("Error:", err);
        if (err.response) {
            console.error("Response data:", JSON.stringify(err.response.data, null, 2));
        }
    }
}

run();
