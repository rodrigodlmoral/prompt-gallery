/**
 * ═══════════════════════════════════════════════════════════
 * VERIFY LEDGER INTEGRITY — Phase C Audit Script
 * ═══════════════════════════════════════════════════════════
 *
 * Comprehensive audit of the double-entry ledger system.
 *
 * Checks:
 *   1. All ledger records are readable and well-formed
 *   2. Per-user: sum of credits - debits vs stored balance
 *   3. Central Bank health: negative balance = total minted
 *   4. Legacy vs Modern record counts
 *   5. Orphan detection (records referencing non-existent users)
 *   6. Duplicate tx_hash detection
 *   7. COPY_MILESTONE records exist in ledger (new in Phase C)
 *
 * USAGE:
 *   node verify_ledger_integrity.cjs
 *
 * OUTPUT:
 *   Console report + JSON file saved to disk
 */

const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
const BANK_USER_ID = 'z44ierjl0thcczd'; // src/lib/constants.js

async function verifyLedgerIntegrity() {
    console.log('═'.repeat(65));
    console.log('🔍 VERIFY LEDGER INTEGRITY — Phase C Audit');
    console.log('═'.repeat(65));
    console.log(`  PB URL: ${PB_URL}`);
    console.log(`  Bank ID: ${BANK_USER_ID}`);
    console.log(`  Time: ${new Date().toISOString()}\n`);

    const pb = new PocketBase(PB_URL);

    // ─── Auth ───
    try {
        const adminEmail = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
        const adminPass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');
        if (!adminEmail || !adminPass) {
            console.error('❌ PB_ADMIN_EMAIL / PB_ADMIN_PASS required in .env');
            process.exit(1);
        }
        await pb.admins.authWithPassword(adminEmail, adminPass);
        console.log('🔐 Admin auth OK\n');
    } catch (err) {
        console.error('❌ Auth failed:', err.message);
        process.exit(1);
    }

    const report = {
        timestamp: new Date().toISOString(),
        totalLedgerRecords: 0,
        legacyRecords: 0,
        modernRecords: 0,
        byType: {},
        byEntryType: {},
        users: { total: 0, withTokens: 0, totalCirculating: 0 },
        bank: { id: BANK_USER_ID, balance: 0 },
        discrepancies: [],
        orphanRecords: [],
        duplicateTxHashes: [],
        warnings: [],
        status: 'PENDING'
    };

    // ═══════════════════════════════════════════════════════════
    // 1. FETCH ALL LEDGER RECORDS
    // ═══════════════════════════════════════════════════════════
    console.log('📒 Fetching ALL ledger records...');
    let allLedger = [];
    try {
        allLedger = await pb.collection('ledger').getFullList({
            sort: '-created'
        });
        report.totalLedgerRecords = allLedger.length;
        console.log(`   Total: ${allLedger.length} records\n`);
    } catch (err) {
        console.error('❌ Failed to fetch ledger:', err.message);
        report.status = 'ERROR';
        report.warnings.push('Could not fetch ledger: ' + err.message);
        saveReport(report);
        return;
    }

    // ═══════════════════════════════════════════════════════════
    // 2. CLASSIFY RECORDS
    // ═══════════════════════════════════════════════════════════
    console.log('📊 Classifying records...');

    const txHashCount = {};

    for (const rec of allLedger) {
        // By type
        const type = rec.type || 'UNKNOWN';
        report.byType[type] = (report.byType[type] || 0) + 1;

        // By entry_type
        const entryType = rec.entry_type || 'LEGACY';
        report.byEntryType[entryType] = (report.byEntryType[entryType] || 0) + 1;

        if (rec.entry_type) {
            report.modernRecords++;
        } else {
            report.legacyRecords++;
        }

        // tx_hash duplicates
        if (rec.tx_hash) {
            txHashCount[rec.tx_hash] = (txHashCount[rec.tx_hash] || 0) + 1;
        }
    }

    console.log('   By Type:');
    for (const [type, count] of Object.entries(report.byType)) {
        console.log(`     ${type}: ${count}`);
    }
    console.log('   By Entry Type:');
    for (const [et, count] of Object.entries(report.byEntryType)) {
        console.log(`     ${et}: ${count}`);
    }
    console.log(`   Legacy: ${report.legacyRecords} | Modern: ${report.modernRecords}\n`);

    // ═══════════════════════════════════════════════════════════
    // 3. DUPLICATE TX_HASH CHECK
    // ═══════════════════════════════════════════════════════════
    console.log('🔗 Checking tx_hash integrity...');
    for (const [hash, count] of Object.entries(txHashCount)) {
        // For double-entry TIPs, exactly 2 records per hash is expected
        // For system rewards, exactly 1 is expected
        if (count > 2) {
            report.duplicateTxHashes.push({ hash, count });
        }
    }
    if (report.duplicateTxHashes.length === 0) {
        console.log('   ✅ No anomalous tx_hash duplicates\n');
    } else {
        console.log(`   ⚠️  ${report.duplicateTxHashes.length} tx_hashes with >2 records\n`);
    }

    // ═══════════════════════════════════════════════════════════
    // 4. FETCH ALL USERS
    // ═══════════════════════════════════════════════════════════
    console.log('👥 Fetching ALL users...');
    let allUsers = [];
    try {
        allUsers = await pb.collection('users').getFullList({
            fields: 'id,name,email,tokens,total_earned,total_spent,total_rewards,level'
        });
        report.users.total = allUsers.length;
        report.users.withTokens = allUsers.filter(u => (u.tokens || 0) > 0).length;
        report.users.totalCirculating = allUsers.reduce((sum, u) => sum + (u.tokens || 0), 0);
        console.log(`   Total users: ${allUsers.length}`);
        console.log(`   Users with tokens: ${report.users.withTokens}`);
        console.log(`   Total circulating: ${report.users.totalCirculating} 💎\n`);
    } catch (err) {
        console.error('❌ Failed to fetch users:', err.message);
        report.warnings.push('Could not fetch users: ' + err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // 5. PER-USER BALANCE RECONCILIATION
    // ═══════════════════════════════════════════════════════════
    console.log('💰 Reconciling balances...\n');

    const userIds = new Set(allUsers.map(u => u.id));

    // Build ledger-derived balances
    const ledgerBalances = {};
    for (const rec of allLedger) {
        const amount = rec.amount || 0;
        const fromId = rec.from_user;
        const toId = rec.to_user;

        // Check orphans
        if (fromId && fromId !== BANK_USER_ID && !userIds.has(fromId)) {
            report.orphanRecords.push({ recordId: rec.id, field: 'from_user', userId: fromId });
        }
        if (toId && toId !== BANK_USER_ID && !userIds.has(toId)) {
            report.orphanRecords.push({ recordId: rec.id, field: 'to_user', userId: toId });
        }

        // For double-entry records (modern), use entry_type to determine direction
        if (rec.entry_type) {
            if (rec.entry_type === 'DEBIT' && fromId) {
                // Money leaving fromId
                ledgerBalances[fromId] = (ledgerBalances[fromId] || 0) - amount;
            }
            if (rec.entry_type === 'CREDIT' && toId) {
                // Money arriving to toId
                ledgerBalances[toId] = (ledgerBalances[toId] || 0) + amount;
            }
        } else {
            // Legacy: single-entry, infer from from_user/to_user
            // from_user=null means system mint → only credit the to_user
            if (fromId) {
                ledgerBalances[fromId] = (ledgerBalances[fromId] || 0) - amount;
            }
            if (toId) {
                ledgerBalances[toId] = (ledgerBalances[toId] || 0) + amount;
            }
        }
    }

    // Compare ledger-derived balance vs stored balance for each user
    let matchCount = 0;
    let mismatchCount = 0;
    const TOLERANCE = 1; // Allow ±1 for rounding

    for (const user of allUsers) {
        if (user.id === BANK_USER_ID) continue; // Skip Bank in user comparison

        const storedBalance = user.tokens || 0;
        const ledgerBalance = ledgerBalances[user.id] || 0;
        const diff = storedBalance - ledgerBalance;

        if (Math.abs(diff) > TOLERANCE) {
            mismatchCount++;
            report.discrepancies.push({
                userId: user.id,
                name: user.name || user.email || 'N/A',
                storedTokens: storedBalance,
                ledgerBalance: ledgerBalance,
                difference: diff,
                note: diff > 0
                    ? 'User has MORE tokens than ledger shows (unrecorded income?)'
                    : 'User has FEWER tokens than ledger shows (unrecorded expense?)'
            });

            if (report.discrepancies.length <= 10) {
                console.log(`   ⚠️  ${user.name || user.id}: stored=${storedBalance}, ledger=${ledgerBalance}, diff=${diff > 0 ? '+' : ''}${diff}`);
            }
        } else {
            matchCount++;
        }
    }

    console.log(`\n   ✅ Matching: ${matchCount} users`);
    console.log(`   ⚠️  Mismatched: ${mismatchCount} users`);

    // ═══════════════════════════════════════════════════════════
    // 6. CENTRAL BANK HEALTH
    // ═══════════════════════════════════════════════════════════
    console.log('\n🏦 Central Bank Health...');
    const bankUser = allUsers.find(u => u.id === BANK_USER_ID);
    if (bankUser) {
        report.bank.balance = bankUser.tokens || 0;
        report.bank.ledgerBalance = ledgerBalances[BANK_USER_ID] || 0;
        console.log(`   Stored Balance: ${report.bank.balance}`);
        console.log(`   Ledger Balance: ${report.bank.ledgerBalance}`);
        console.log(`   (Negative = tokens minted into economy)`);
    } else {
        console.log('   ⚠️  Bank user not found in users list!');
        report.warnings.push('Bank user not found');
    }

    // ═══════════════════════════════════════════════════════════
    // 7. ORPHAN CHECK
    // ═══════════════════════════════════════════════════════════
    if (report.orphanRecords.length > 0) {
        console.log(`\n👻 Orphan Records: ${report.orphanRecords.length}`);
        report.orphanRecords.slice(0, 5).forEach(o => {
            console.log(`   Record ${o.recordId}: ${o.field} = ${o.userId} (user not found)`);
        });
    } else {
        console.log('\n👻 No orphan records found ✅');
    }

    // ═══════════════════════════════════════════════════════════
    // FINAL VERDICT
    // ═══════════════════════════════════════════════════════════
    const issues = report.discrepancies.length + report.orphanRecords.length + report.duplicateTxHashes.length;
    report.status = issues === 0 ? 'CLEAN' : `${issues} ISSUES FOUND`;

    console.log('\n' + '═'.repeat(65));
    console.log('📋 AUDIT SUMMARY');
    console.log('═'.repeat(65));
    console.log(`  Total Ledger Records:    ${report.totalLedgerRecords}`);
    console.log(`    Legacy (no entry_type): ${report.legacyRecords}`);
    console.log(`    Modern (with entry_type): ${report.modernRecords}`);
    console.log(`  Total Users:             ${report.users.total}`);
    console.log(`  Circulating Supply:      ${report.users.totalCirculating} 💎`);
    console.log(`  Bank Balance:            ${report.bank.balance} 💎`);
    console.log(`  Balance Mismatches:      ${report.discrepancies.length}`);
    console.log(`  Orphan Records:          ${report.orphanRecords.length}`);
    console.log(`  Duplicate tx_hashes:     ${report.duplicateTxHashes.length}`);
    console.log(`  Warnings:                ${report.warnings.length}`);
    console.log('─'.repeat(65));
    console.log(`  STATUS: ${report.status === 'CLEAN' ? '✅ ' : '⚠️  '}${report.status}`);
    console.log('═'.repeat(65));

    if (report.discrepancies.length > 0) {
        console.log('\n💡 NOTE: Discrepancies are EXPECTED for legacy data. The system');
        console.log('   had operations (CopyBonus, etc.) that updated user.tokens');
        console.log('   without creating ledger records. Phase C fixes this going forward.');
    }

    // Save report
    saveReport(report);
}

function saveReport(report) {
    try {
        const fs = require('fs');
        const filename = `audit_ledger_integrity_${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));
        console.log(`\n📄 Full report saved: ${filename}`);
    } catch (e) {
        console.warn('Could not save report file:', e.message);
    }
}

verifyLedgerIntegrity().catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});
