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

        // 4. Fetch Ledger (Transacciones Oficiales)
        // Buscamos donde sea remitente o destinatario
        const ledgerRecords = await pbAdmin.collection('ledger').getList(1, 50, {
            filter: `from_user = "${uid}" || to_user = "${uid}"`,
            sort: '-updated',
            expand: 'from_user,to_user'
        });

        // 5. Fetch Activity Logs (Solo Bonos por ahora, o fallbacks)
        // Como somos Admin, podemos ver TODO, así que filtramos explícitamente por el UID
        const logRecords = await pbAdmin.collection('activity_logs').getList(1, 50, {
            filter: `(user = "${uid}" || details.recipientId = "${uid}") && action = "copy_milestone_bonus"`,
            sort: '-updated'
        });

        // 6. Formatear y Fusionar
        const transactions = [];

        // A) Ledger
        // Phase C: Bank User ID — keep in sync with src/lib/constants.js
        const BANK_USER_ID = 'z44ierjl0thcczd';

        // Phase C: Filter double-entry TIPs to avoid showing duplicates
        const filteredLedger = ledgerRecords.items.filter(rec => {
            // Legacy records (no entry_type) always pass through
            if (!rec.entry_type) return true;
            // For TIPs/purchases: show DEBIT to sender, CREDIT to receiver
            if (rec.type === 'TIP' || rec.type === 'PURCHASE' || rec.type === 'FEE') {
                if (rec.from_user === uid) return rec.entry_type === 'DEBIT';
                if (rec.to_user === uid) return rec.entry_type === 'CREDIT';
            }
            // System rewards (CREDIT) always pass through
            return true;
        });

        filteredLedger.forEach(rec => {
            const isSender = rec.from_user === uid;
            // Recognize both null and BANK_USER_ID as "Sistema"
            const isSystemSource = !rec.from_user || rec.from_user === BANK_USER_ID;
            const txDate = rec.created || rec.updated;

            if (rec.type === 'TIP' || rec.type === 'PURCHASE' || rec.type === 'FEE') {
                if (isSender) {
                    const toName = rec.expand?.to_user?.username || 'Usuario';
                    transactions.push({
                        type: 'sent',
                        amount: -rec.amount,
                        description: rec.description || `Enviado a @${toName}`,
                        date: txDate,
                        icon: '📤',
                        id: rec.id
                    });
                } else {
                    const fromName = rec.expand?.from_user?.username || 'Usuario';
                    transactions.push({
                        type: 'received',
                        amount: rec.amount,
                        description: rec.description || `Recibido de @${fromName}`,
                        date: txDate,
                        icon: '📥',
                        id: rec.id
                    });
                }
            } else if (rec.type === 'POST_REWARD') {
                transactions.push({
                    type: 'income',
                    amount: rec.amount,
                    description: rec.description || 'Publicación',
                    date: txDate,
                    icon: '🖼️',
                    id: rec.id,
                    from: 'Sistema'
                });
            } else if (rec.type === 'LEVEL_UP') {
                transactions.push({
                    type: 'income',
                    amount: rec.amount,
                    description: rec.description || 'Bono de Nivel',
                    date: txDate,
                    icon: '✨',
                    id: rec.id,
                    from: 'Sistema'
                });
            } else if (rec.type === 'COPY_MILESTONE') {
                transactions.push({
                    type: 'bonus',
                    amount: rec.amount,
                    description: rec.description || 'Bono de Copias',
                    date: txDate,
                    icon: '🏆',
                    id: rec.id,
                    from: 'Sistema'
                });
            } else {
                const partnerName = isSender
                    ? (rec.expand?.to_user?.username || 'Usuario')
                    : (isSystemSource ? 'Sistema' : (rec.expand?.from_user?.username || 'Usuario'));

                transactions.push({
                    type: isSender ? 'expense' : 'income',
                    amount: isSender ? -rec.amount : rec.amount,
                    description: rec.description || (isSender ? `Enviado a @${partnerName}` : `Recibido de @${partnerName}`),
                    date: txDate,
                    icon: isSender ? '📉' : '📈',
                    id: rec.id
                });
            }
        });

        // B) Logs (Bonos)
        logRecords.items.forEach(log => {
            const details = log.details || {};
            const logDate = log.created || log.updated;
            transactions.push({
                type: 'bonus',
                amount: details.bonus || 0,
                description: `🎉 Milestone: ${details.copies} copias`,
                date: logDate,
                icon: '🏆',
                id: log.id
            });
        });

        // 7. Ordenar Cronológicamente (Más reciente primero)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        return res.status(200).json({
            items: transactions.slice(0, 50),
            total: transactions.length
        });

    } catch (error) {
        console.error("History API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
