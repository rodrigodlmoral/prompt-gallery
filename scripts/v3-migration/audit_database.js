
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
const REPORT_DIR = path.join(__dirname, 'reports');

// Ensure report dir exists
if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
}

async function auditDatabase() {
    console.log('🔍 Starting Database Audit...');
    console.log(`📡 Connecting to: ${PB_URL}`);

    const pb = new PocketBase(PB_URL);

    // --- AUTHENTICATION ---
    try {
        if (ADMIN_EMAIL && ADMIN_PASS) {
            console.log('🔑 Attempting to authenticate...');
            try {
                // Try Admin first
                await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
                console.log('✅ Admin authenticated successfully.');
            } catch (adminErr) {
                console.warn('⚠️  Admin auth failed. Trying as User...');
                try {
                    // Try User second
                    // Note: We use a new instance to avoid auth store confusion, then copy token
                    const pbUser = new PocketBase(PB_URL);
                    await pbUser.collection('users').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
                    pb.authStore.save(pbUser.authStore.token, pbUser.authStore.model);
                    console.log('✅ User authenticated successfully.');
                } catch (userErr) {
                    console.error('❌ User auth also failed:', userErr.message);
                    console.warn('⚠️  Proceeding as Guest (unauthenticated). Valid credentials are required for full user audit.');
                }
            }
        } else {
            console.warn('⚠️  No Credentials provided. Proceeding as Guest...');
        }
    } catch (e) {
        console.error('❌ Auth Error:', e.message);
    }

    const report = {
        timestamp: new Date().toISOString(),
        users: {
            total: 0,
            with_tokens: 0,
            total_tokens_in_circulation: 0,
            users_with_negative_tokens: [],
            users_with_suspicious_amounts: [],
            users_without_moderation_settings: 0
        },
        prompts: {
            total: 0,
            with_copies: 0,
            total_copies: 0,
            orphaned_prompts: [],
            prompts_with_negative_copies: []
        },
        inconsistencies: [],
        errors: []
    };

    // --- AUDIT USERS ---
    console.log('👤 Auditing Users...');
    let users = [];

    try {
        let page = 1;
        const perPage = 50;

        while (true) {
            console.log(`   Fetching users page ${page}...`);
            const result = await pb.collection('users').getList(page, perPage, { sort: '-created' });
            users = users.concat(result.items);

            if (page >= result.totalPages) break;
            page++;

            // Safety delay: 200ms
            await new Promise(r => setTimeout(r, 200));
        }
        console.log(`   Total users fetched: ${users.length}`);
    } catch (err) {
        console.error(`❌ Error fetching users: ${err.message}`);
        console.warn('⚠️  Skipping remaining user audit due to permission error/auth failure.');
        report.errors.push(`User audit failed: ${err.message}`);
    }

    report.users.total = users.length;

    for (const user of users) {
        const tokens = user.tokens || 0;

        if (tokens > 0) {
            report.users.with_tokens++;
            report.users.total_tokens_in_circulation += tokens;
        }

        if (tokens < 0) {
            report.users.users_with_negative_tokens.push({
                id: user.id,
                username: user.username,
                email: user.email,
                tokens: tokens
            });
            report.inconsistencies.push(`User ${user.id} (${user.username}) has negative tokens: ${tokens}`);
        }

        if (tokens > 10000) {
            report.users.users_with_suspicious_amounts.push({
                id: user.id,
                username: user.username,
                tokens: tokens
            });
        }

        if (!user.moderation) {
            report.users.users_without_moderation_settings++;
        }
    }

    // --- AUDIT PROMPTS ---
    console.log('🎨 Auditing Prompts...');
    let prompts = [];

    try {
        let page = 1;
        const perPage = 50;

        while (true) {
            console.log(`   Fetching prompts page ${page}...`);
            const result = await pb.collection('prompts').getList(page, perPage);
            prompts = prompts.concat(result.items);

            if (page >= result.totalPages) break;
            page++;

            // Safety delay: 200ms
            await new Promise(r => setTimeout(r, 200));
        }
        console.log(`   Total prompts fetched: ${prompts.length}`);
    } catch (err) {
        console.error(`❌ Error fetching prompts: ${err.message}`);
        report.errors.push(`Prompt audit failed: ${err.message}`);
    }

    report.prompts.total = prompts.length;

    const userIds = new Set(users.map(u => u.id));

    // Only identify orphans if we successfully managed to fetch users
    const canCheckOrphans = users.length > 0;

    for (const prompt of prompts) {
        const copyCount = prompt.copy_count || 0;

        if (copyCount > 0) {
            report.prompts.with_copies++;
            report.prompts.total_copies += copyCount;
        }

        if (copyCount < 0) {
            report.prompts.prompts_with_negative_copies.push({
                id: prompt.id,
                title: prompt.title,
                copy_count: copyCount
            });
            report.inconsistencies.push(`Prompt ${prompt.id} has negative copy_count: ${copyCount}`);
        }

        // Check for orphans
        if (canCheckOrphans && !userIds.has(prompt.author)) {
            // Check if author is defined but not in our list
            if (prompt.author) {
                report.prompts.orphaned_prompts.push({
                    id: prompt.id,
                    title: prompt.title,
                    author_id: prompt.author
                });
                report.inconsistencies.push(`Prompt ${prompt.id} is orphaned (Author ${prompt.author} not found in fetched users)`);
            }
        }
    }

    // --- SAVE REPORT ---
    const filename = `audit_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(REPORT_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    console.log('✅ Audit Completed!');
    console.log(`📊 Total Users: ${report.users.total}`);
    console.log(`💰 Total Tokens: ${report.users.total_tokens_in_circulation}`);
    console.log(`🖼️  Total Prompts: ${report.prompts.total}`);
    console.log(`❌ Inconsistencies Found: ${report.inconsistencies.length}`);

    if (report.inconsistencies.length > 0) {
        console.warn('⚠️  See report for details on inconsistencies.');
    }
    if (report.errors.length > 0) {
        console.warn('⚠️  Errors occurred during audit:', report.errors);
    }

    console.log(`📝 Report saved to: ${filepath}`);
}

// Run if called directly
auditDatabase();
