
/**
 * ═══════════════════════════════════════════════════════════
 * V3 MIGRATION SCRIPT - DAY 7: THE BIG SHIFT
 * ═══════════════════════════════════════════════════════════
 * 
 * PURPOSE: Migrate existing user data to the V3 Ledger system.
 * 
 * FOR EACH USER:
 *   1. Read current token balance
 *   2. Count real posts and copies (from prompts collection)
 *   3. Calculate correct level based on LEVEL_REQS
 *   4. Create a MIGRATION entry in the ledger
 *   5. Update user's level and level_progress
 * 
 * SAFETY:
 *   - DRY_RUN mode (no writes) by default
 *   - 2-second delay between users
 *   - Full pre-flight validation
 *   - Detailed JSON report
 *   - tx_hash for each ledger entry (unique, traceable)
 * 
 * USAGE:
 *   DRY RUN:  node scripts/v3-migration/migrate_users_v3.js
 *   LIVE RUN: node scripts/v3-migration/migrate_users_v3.js --live
 * ═══════════════════════════════════════════════════════════
 */

import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ═══ CONFIG ═══
const PB_URL = process.env.VITE_POCKETBASE_URL || "https://prompt-gallery.pockethost.io";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PB_ADMIN_PASS;
const DRY_RUN = !process.argv.includes('--live');
const DELAY_MS = 2000; // 2 seconds between each user
const ADMIN_ID = 'rkmrhmgh067x7un'; // System admin for ledger "from_user"

const pb = new PocketBase(PB_URL);

// ═══ LEVEL REQUIREMENTS (Mirror of store-final.js LEVEL_REQS) ═══
const LEVEL_REQS = [
    { posts: 0, copies: 0, name: 'Explorador' },
    { posts: 5, copies: 0, name: 'Novato' },
    { posts: 25, copies: 0, name: 'Creador Jr' },
    { posts: 50, copies: 100, name: 'Creador Elite' },
    { posts: 100, copies: 200, name: 'Artista Prompter' },
    { posts: 250, copies: 500, name: 'Maestro Prompter' }
];

// ═══ HELPERS ═══
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateTxHash(userId) {
    const raw = `MIGRATION_V3_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

function calculateLevel(totalPosts, totalCopies) {
    let level = 0;
    LEVEL_REQS.forEach((req, idx) => {
        if (totalPosts >= req.posts && totalCopies >= req.copies) {
            level = idx;
        }
    });
    return level;
}

function calculateProgress(level, totalPosts, totalCopies) {
    if (level >= LEVEL_REQS.length - 1) return 100; // Max level

    const current = LEVEL_REQS[level];
    const next = LEVEL_REQS[level + 1];

    // Use whichever is the harder requirement as the bottleneck
    const postProgress = next.posts > current.posts
        ? Math.min(100, ((totalPosts - current.posts) / (next.posts - current.posts)) * 100)
        : 100;
    const copyProgress = next.copies > current.copies
        ? Math.min(100, ((totalCopies - current.copies) / (next.copies - current.copies)) * 100)
        : 100;

    // Progress = minimum of both (both need to be met)
    return Math.floor(Math.min(postProgress, copyProgress));
}

// ═══ AUTHENTICATION ═══
async function authenticate() {
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Autenticado como Admin.");
    } catch (error) {
        console.error("❌ FATAL: Auth Error:", error.message);
        process.exit(1);
    }
}

// ═══ PRE-FLIGHT CHECKS ═══
async function preflight() {
    console.log("\n🔍 PRE-FLIGHT CHECKS...");
    const errors = [];

    // 1. Check ledger exists and has fields
    try {
        const ledger = await pb.collections.getOne('ledger');
        const fieldNames = ledger.fields.map(f => f.name);
        if (!fieldNames.includes('from_user')) errors.push("Ledger missing 'from_user' field.");
        if (!fieldNames.includes('to_user')) errors.push("Ledger missing 'to_user' field.");
        if (!fieldNames.includes('amount')) errors.push("Ledger missing 'amount' field.");
        if (!fieldNames.includes('type')) errors.push("Ledger missing 'type' field.");
        if (!fieldNames.includes('tx_hash')) errors.push("Ledger missing 'tx_hash' field.");
        console.log("   ✅ Colección 'ledger' verificada.");
    } catch (e) {
        errors.push("Ledger collection NOT FOUND. Run Phase 1 first.");
    }

    // 2. Check levels exists and has data
    try {
        const levels = await pb.collection('levels').getFullList();
        if (levels.length < 6) errors.push(`Levels collection has ${levels.length} items, expected 6.`);
        console.log(`   ✅ Colección 'levels' verificada (${levels.length} items).`);
    } catch (e) {
        errors.push("Levels collection NOT FOUND.");
    }

    // 3. Check users has 'level' and 'level_progress' fields
    try {
        const users = await pb.collections.getOne('users');
        const fieldNames = users.fields.map(f => f.name);
        if (!fieldNames.includes('level')) errors.push("Users missing 'level' field. Run Day 6 first.");
        if (!fieldNames.includes('level_progress')) errors.push("Users missing 'level_progress' field.");
        console.log("   ✅ Schema de 'users' verificado.");
    } catch (e) {
        errors.push("Users collection NOT FOUND (critical!).");
    }

    // 4. Check admin user exists (for ledger from_user)
    try {
        await pb.collection('users').getOne(ADMIN_ID);
        console.log("   ✅ Admin user existe para 'from_user' en ledger.");
    } catch (e) {
        errors.push(`Admin user '${ADMIN_ID}' NOT FOUND. Ledger entries need a valid from_user.`);
    }

    // 5. Check existing ledger entries (to prevent duplicate migrations)
    try {
        const existing = await pb.collection('ledger').getList(1, 1, {
            filter: `type = 'PURCHASE'`  // We'll use PURCHASE for now since MIGRATION isn't in enum
        });
        if (existing.totalItems > 0) {
            console.warn(`   ⚠️ WARNING: Ledger already has ${existing.totalItems} PURCHASE entries.`);
            console.warn("   This may indicate a previous migration run.");
        }
    } catch (e) {
        // Non-critical, continue
    }

    if (errors.length > 0) {
        console.error("\n🚫 PRE-FLIGHT FAILED:");
        errors.forEach(e => console.error(`   ❌ ${e}`));
        process.exit(1);
    }

    console.log("   ✅ ALL PRE-FLIGHT CHECKS PASSED.\n");
}

// ═══ MAIN MIGRATION ═══
async function migrate() {
    const report = {
        timestamp: new Date().toISOString(),
        mode: DRY_RUN ? 'DRY_RUN' : 'LIVE',
        totalUsers: 0,
        migrated: 0,
        skipped: 0,
        errors: [],
        users: []
    };

    // Fetch ALL users
    console.log("📦 Cargando todos los usuarios...");
    const allUsers = await pb.collection('users').getFullList({ sort: 'created' });
    report.totalUsers = allUsers.length;
    console.log(`   Total: ${allUsers.length} usuarios.\n`);

    // Process each user
    for (let i = 0; i < allUsers.length; i++) {
        const user = allUsers[i];
        const prefix = `[${i + 1}/${allUsers.length}]`;

        try {
            // 1. Get user's current token balance
            const currentTokens = user.tokens || 0;

            // 2. Count REAL posts (from prompts collection, not cached value)
            const postsResult = await pb.collection('prompts').getList(1, 1, {
                filter: `author = "${user.id}"`,
                fields: 'id'
            });
            const realPosts = postsResult.totalItems || 0;

            // 3. Count REAL total copies (sum of copy_count from all their prompts)
            let realCopies = 0;
            if (realPosts > 0) {
                const allPrompts = await pb.collection('prompts').getFullList({
                    filter: `author = "${user.id}"`,
                    fields: 'copy_count'
                });
                realCopies = allPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);
            }

            // 4. Calculate correct level
            const calculatedLevel = calculateLevel(realPosts, realCopies);
            const calculatedProgress = calculateProgress(calculatedLevel, realPosts, realCopies);
            const levelName = LEVEL_REQS[calculatedLevel].name;

            // 5. Build user report entry
            const userEntry = {
                id: user.id,
                username: user.username,
                email: user.email,
                currentTokens: currentTokens,
                realPosts: realPosts,
                realCopies: realCopies,
                oldLevel: user.level || 0,
                newLevel: calculatedLevel,
                levelName: levelName,
                progress: calculatedProgress,
                action: 'PENDING'
            };

            // 6. Skip users with 0 tokens (no ledger entry needed, but still update level)
            const txHash = generateTxHash(user.id);

            if (DRY_RUN) {
                userEntry.action = 'DRY_RUN (No changes)';
                console.log(`${prefix} 🟡 ${user.username}: ${currentTokens} tokens, ${realPosts} posts, ${realCopies} copies → Lvl ${calculatedLevel} (${levelName}) [DRY]`);
            } else {
                // ═══ LIVE WRITES ═══

                // 6a. Create ledger entry (only if user has tokens to record)
                if (currentTokens > 0) {
                    await pb.collection('ledger').create({
                        from_user: ADMIN_ID,      // System (admin) as source
                        to_user: user.id,          // User receives
                        amount: currentTokens,
                        type: 'PURCHASE',          // Using PURCHASE as migration marker
                        description: `[MIGRATION V3] Saldo inicial migrado. Original: ${currentTokens} PromptBits.`,
                        tx_hash: txHash
                    });
                }

                // 6b. Update user's level and progress
                await pb.collection('users').update(user.id, {
                    level: calculatedLevel,
                    level_progress: calculatedProgress
                });

                userEntry.action = 'MIGRATED';
                userEntry.tx_hash = txHash;
                report.migrated++;
                console.log(`${prefix} ✅ ${user.username}: ${currentTokens} tokens → ledger, Lvl ${calculatedLevel} (${levelName})`);
            }

            report.users.push(userEntry);

            // 7. Delay to avoid rate limiting
            if (i < allUsers.length - 1) {
                await sleep(DELAY_MS);
            }

        } catch (err) {
            const errorEntry = {
                userId: user.id,
                username: user.username,
                error: err.message || JSON.stringify(err.data)
            };
            report.errors.push(errorEntry);
            report.skipped++;
            console.error(`${prefix} ❌ ERROR ${user.username}: ${err.message}`);

            // Still delay to be safe
            await sleep(DELAY_MS);
        }
    }

    // ═══ SAVE REPORT ═══
    const reportPath = path.resolve(__dirname, `reports/migration_report_${DRY_RUN ? 'DRY_' : ''}${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // ═══ SUMMARY ═══
    console.log("\n═══════════════════════════════════════════════");
    console.log(`📊 MIGRATION ${DRY_RUN ? '(DRY RUN)' : 'COMPLETE'}`);
    console.log(`   Total Users:  ${report.totalUsers}`);
    console.log(`   Migrated:     ${report.migrated}`);
    console.log(`   Skipped:      ${report.skipped}`);
    console.log(`   Errors:       ${report.errors.length}`);
    console.log(`   Report:       ${reportPath}`);
    console.log("═══════════════════════════════════════════════\n");

    if (DRY_RUN) {
        console.log("💡 Este fue un DRY RUN. No se hicieron cambios.");
        console.log("   Para ejecutar en vivo: node scripts/v3-migration/migrate_users_v3.js --live\n");
    }
}

// ═══ ENTRY POINT ═══
async function main() {
    console.log("═══════════════════════════════════════════════");
    console.log("  V3 MIGRATION - DAY 7: THE BIG SHIFT");
    console.log(`  MODE: ${DRY_RUN ? '🟡 DRY RUN (Safe Preview)' : '🔴 LIVE (Writing Data!)'}`);
    console.log(`  DELAY: ${DELAY_MS}ms per user`);
    console.log("═══════════════════════════════════════════════\n");

    await authenticate();
    await preflight();
    await migrate();
}

main().catch(err => {
    console.error("💀 FATAL ERROR:", err);
    process.exit(1);
});
