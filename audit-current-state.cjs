// audit-current-state.cjs
// Script de auditoría adaptado al schema REAL de PROMPT-GALLERY

const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(PB_URL);

async function auditCurrentState() {
    console.log(`🔍 AUDITORÍA DEL ESTADO ACTUAL - PROMPT-GALLERY (${PB_URL})\n`);
    console.log('='.repeat(60));

    const report = {
        timestamp: new Date().toISOString(),
        users: { status: 'pending' },
        prompts: { status: 'pending' },
        ledger: { status: 'pending' },
        levels: { status: 'pending' },
        issues: [],
        recommendations: []
    };

    try {
        // Autenticación como Admin si las credenciales existen
        if (process.env.PB_ADMIN_EMAIL && process.env.PB_ADMIN_PASS) {
            console.log('🔐 Autenticando como administrador...');
            await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
            console.log('✅ Autenticación exitosa\n');
        }

        // ========================================
        // USUARIOS
        // ========================================
        try {
            console.log('📊 Auditando USERS...');
            const users = await pb.collection('users').getFullList({
                fields: 'id,email,name,tokens,level,xp,level_progress,prompts_count,total_copies,total_earned,total_spent'
            });

            report.users = {
                status: 'success',
                total: users.length,
                with_tokens: users.filter(u => (u.tokens || 0) > 0).length,
                total_tokens: users.reduce((sum, u) => sum + (u.tokens || 0), 0),
                by_level: {}
            };

            for (let i = 0; i <= 5; i++) {
                report.users.by_level[i] = users.filter(u => (u.level || 0) === i).length;
            }

            for (const user of users) {
                if ((user.tokens || 0) < 0) {
                    report.issues.push({ type: 'negative_tokens', severity: 'critical', user: user.email, value: user.tokens });
                }
                const netBalance = (user.total_earned || 0) - (user.total_spent || 0);
                if (Math.abs(netBalance - (user.tokens || 0)) > 1) {
                    report.issues.push({
                        type: 'balance_mismatch',
                        severity: 'medium',
                        user: user.email,
                        stored: user.tokens,
                        calculated: netBalance,
                        difference: (user.tokens || 0) - netBalance
                    });
                }
            }
            console.log(`  ✓ Total usuarios: ${users.length}\n`);
        } catch (err) {
            console.error('  ❌ Error auditando USERS:', err.message);
            report.users.status = 'error';
            report.users.error = err.message;
        }

        // ========================================
        // PROMPTS
        // ========================================
        try {
            console.log('📝 Auditando PROMPTS...');
            const prompts = await pb.collection('prompts').getFullList({
                fields: 'id,title,author,copy_count,tokens_received,rating,tool,tags'
            });

            report.prompts = {
                status: 'success',
                total: prompts.length,
                with_copies: prompts.filter(p => (p.copy_count || 0) > 0).length,
                total_copies: prompts.reduce((sum, p) => sum + (p.copy_count || 0), 0),
                total_tokens_distributed: prompts.reduce((sum, p) => sum + (p.tokens_received || 0), 0),
                top_10: prompts
                    .sort((a, b) => (b.copy_count || 0) - (a.copy_count || 0))
                    .slice(0, 10)
                    .map(p => ({ title: p.title, copies: p.copy_count, tokens: p.tokens_received, tool: p.tool }))
            };

            if (report.users.status === 'success') {
                // Solo si tenemos los usuarios podemos verificar huérfanos
                // Pero necesitamos los IDs de todos los usuarios
                const userIds = new Set();
                // Nota: para esta verificación rápida, mejor usar una lista de IDs completa si users fue exitoso
            }

            console.log(`  ✓ Total prompts: ${prompts.length}\n`);
        } catch (err) {
            console.error('  ❌ Error auditando PROMPTS:', err.message);
            report.prompts.status = 'error';
            report.prompts.error = err.message;
        }

        // ========================================
        // LEDGER
        // ========================================
        try {
            console.log('💰 Auditando LEDGER (limitado a 500 para evitar 400 error)...');
            // Intentamos obtener solo los últimos 500 para ver si el error es por volumen
            const ledgerResult = await pb.collection('ledger').getList(1, 500, {
                sort: '-created'
            });

            report.ledger = {
                status: 'success_partial',
                total_transactions: ledgerResult.totalItems,
                sample_size: ledgerResult.items.length,
                by_type: {},
                total_volume_sample: ledgerResult.items.reduce((sum, r) => sum + (r.amount || 0), 0)
            };

            const types = ['DAILY_LOGIN', 'POST_REWARD', 'LEVEL_UP', 'TIP', 'PURCHASE', 'FEE'];
            for (const type of types) {
                const count = ledgerResult.items.filter(r => r.type === type).length;
                if (count > 0) report.ledger.by_type[type] = count;
            }

            console.log(`  ✓ Total transacciones (estimado): ${ledgerResult.totalItems}`);
            console.log(`  ✓ Muestra analizada: ${ledgerResult.items.length}\n`);
        } catch (err) {
            console.error('  ❌ Error auditando LEDGER:', err.message);
            report.ledger.status = 'error';
            report.ledger.error = err.message;
        }

        // ========================================
        // LEVELS
        // ========================================
        try {
            console.log('🎖️  Auditando LEVELS...');
            const levelsConfig = await pb.collection('levels').getFullList({ sort: 'level_number' });

            report.levels = {
                status: 'success',
                configured: levelsConfig.length,
                configs: levelsConfig.map(l => ({
                    level: l.level_number,
                    name: l.name,
                    min_posts: l.min_posts,
                    min_copies: l.min_copies,
                    icon: l.icon,
                    has_benefits: !!l.benefits
                }))
            };

            if (levelsConfig.length < 6) {
                report.recommendations.push({
                    type: 'missing_levels',
                    message: `Solo ${levelsConfig.length} niveles configurados. Se esperan 6 (0-5).`,
                    action: 'Completar configuración de niveles faltantes'
                });
            }
            console.log(`  ✓ Niveles configurados: ${levelsConfig.length}\n`);
        } catch (err) {
            console.error('  ❌ Error auditando LEVELS:', err.message);
            report.levels.status = 'error';
            report.levels.error = err.message;
        }

        // ========================================
        // RESUMEN FINAL
        // ========================================
        console.log('='.repeat(60));
        console.log('📊 RESUMEN FINAL');
        console.log('='.repeat(60));

        const summary = {
            users: report.users.total || 0,
            prompts: report.prompts.total || 0,
            transactions: report.ledger.total_transactions || 0,
            tokens: report.users.total_tokens || 0
        };

        console.log(`Usuarios:        ${summary.users}`);
        console.log(`Prompts:         ${summary.prompts}`);
        console.log(`Transacciones:   ${summary.transactions} (Total estimado)`);
        console.log(`Tokens circulando: ${summary.tokens} 💎`);
        console.log(`\nProblemas detectados: ${report.issues.length}`);
        console.log(`Recomendaciones: ${report.recommendations.length}`);

        const fs = require('fs');
        const filename = `audit_current_state_${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));
        console.log(`\n✅ Reporte guardado en: ${filename}`);

    } catch (error) {
        console.error('\n❌ Error fatal durante auditoría:', error.message);
    }
}

auditCurrentState();
