import PocketBase from 'pocketbase';

export default async function handler(req, res) {
    // 1. Validar Método
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        // 2. Autenticar Admin (para tener permisos de lectura en Ledger/Logs)
        const pbAdmin = new PocketBase(process.env.PB_URL);
        await pbAdmin.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);

        // 3. Validar Token de Usuario (para saber quién pide los datos)
        const userToken = authHeader.replace('Bearer ', '');
        const pbUserVerify = new PocketBase(process.env.PB_URL);
        pbUserVerify.authStore.save(userToken, null);

        let uid;
        try {
            const refreshResult = await pbUserVerify.collection('users').authRefresh();
            uid = refreshResult.record.id;
        } catch (e) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

        // 4. Fetch FULL Ledger for aggregation (to ensure metrics are 100% accurate)
        const allLedger = await pbAdmin.collection('ledger').getFullList({
            filter: `from_user = "${uid}" || to_user = "${uid}"`,
            expand: 'from_user,to_user'
        });

        // 5. Fetch Activity Logs (Milestones) - Aggregation
        const logRecords = await pbAdmin.collection('activity_logs').getFullList({
            filter: `user = "${uid}" && action = "copy_milestone_bonus"`,
        });

        // 6. Metrics Aggregation
        let totalEarned = 0;
        let totalSpent = 0;    // True spending (Tokens -> System)
        let totalReceived = 0; // P2P Incoming (Tips)
        let totalSent = 0;     // P2P Outgoing (Tips)
        let totalBonuses = 0;  // Specifically Copy Milestones
        let totalGifts = 0;    // System Rewards (Registration, Level Up, Reboot, Gifts)

        const transactions = [];
        const BANK_USER_ID = 'z44ierjl0thcczd';

        allLedger.forEach(rec => {
            const amount = rec.amount || 0;
            const isSender = rec.from_user === uid;
            const isSystemSource = !rec.from_user || rec.from_user === BANK_USER_ID;
            const isSystemTarget = rec.to_user === BANK_USER_ID;
            const txDate = rec.created || rec.updated;

            // A) Aggregation Logic
            if (!isSender) {
                // INCOMING (CREDIT)
                totalEarned += amount;

                if (rec.type === 'TIP') {
                    totalReceived += amount;
                } else if (rec.type === 'COPY_MILESTONE') {
                    totalBonuses += amount;
                } else if (rec.type === 'PURCHASE') {
                    totalPurchased += amount;
                } else if (['POST_REWARD', 'LEVEL_UP', 'GIFT', 'REGISTRATION_BONUS'].includes(rec.type)) {
                    totalGifts += amount;
                }
            } else {
                // OUTGOING (DEBIT)
                // We only count DEBIT entries for double-entry records to avoid double-counting
                const isRealDebit = !rec.entry_type || rec.entry_type === 'DEBIT';

                if (isRealDebit) {
                    if (rec.type === 'TIP') {
                        totalSent += amount;
                    } else if (isSystemTarget || ['BOOST', 'FEE', 'PURCHASE'].includes(rec.type)) {
                        totalSpent += amount;
                    }
                }
            }

            // B) Transaction List Logic (Recent 50)
            // Filter double-entry TIPs for the list to avoid showing duplicates
            let showInList = true;
            if (rec.entry_type) {
                if (rec.type === 'TIP' || rec.type === 'PURCHASE' || rec.type === 'FEE') {
                    if (isSender) showInList = (rec.entry_type === 'DEBIT');
                    else showInList = (rec.entry_type === 'CREDIT');
                }
            }

            if (showInList) {
                if (rec.type === 'TIP' || rec.type === 'PURCHASE' || rec.type === 'FEE') {
                    if (isSender) {
                        const toName = rec.expand?.to_user?.username || 'Usuario';
                        transactions.push({ type: 'sent', amount: -amount, description: rec.description || `Enviado a @${toName}`, date: txDate, icon: '📤', id: rec.id });
                    } else {
                        const fromName = rec.expand?.from_user?.username || 'Usuario';
                        transactions.push({ type: 'received', amount: amount, description: rec.description || `Recibido de @${fromName}`, date: txDate, icon: '📥', id: rec.id });
                    }
                } else {
                    const icon = rec.type === 'POST_REWARD' ? '🖼️' : (rec.type === 'LEVEL_UP' ? '✨' : (rec.type === 'COPY_MILESTONE' ? '🏆' : (isSender ? '📉' : '📈')));
                    transactions.push({
                        type: isSender ? 'expense' : 'income',
                        amount: isSender ? -amount : amount,
                        description: rec.description || (isSender ? 'Gasto' : 'Ingreso'),
                        date: txDate,
                        icon: icon,
                        id: rec.id
                    });
                }
            }
        });

        // Add milestone logs to transactions (if not already in ledger)
        // Note: New milestones ARE in ledger, but older ones might only be in logs.
        logRecords.forEach(log => {
            const details = log.details || {};
            const txDate = log.created || log.updated;
            // Check if we already have this transaction in the list (dedupe)
            if (!transactions.find(t => t.date === txDate && t.amount === (details.bonus || 0))) {
                transactions.push({
                    type: 'bonus',
                    amount: details.bonus || 0,
                    description: `🎉 Milestone: ${details.copies} copias`,
                    date: txDate,
                    icon: '🏆',
                    id: log.id
                });
                totalEarned += (details.bonus || 0);
                totalBonuses += (details.bonus || 0);
            }
        });

        // 7. Get Current Balance from User Record
        const user = await pbAdmin.collection('users').getOne(uid);

        // 8. Final Sort & Return
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        return res.status(200).json({
            currentBalance: user.tokens || 0,
            totalEarned,
            totalSpent,
            totalReceived,
            totalSent,
            totalBonuses,
            totalGifts,
            totalPurchased,
            transactionCount: transactions.length,
            items: transactions.slice(0, 50)
        });

    } catch (error) {
        console.error("History API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
