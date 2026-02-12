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
            sort: '-created',
            expand: 'from_user,to_user'
        });

        // 5. Fetch Activity Logs (Solo Bonos por ahora, o fallbacks)
        // Como somos Admin, podemos ver TODO, así que filtramos explícitamente por el UID
        const logRecords = await pbAdmin.collection('activity_logs').getList(1, 50, {
            filter: `(user = "${uid}" || details.recipientId = "${uid}") && action = "copy_milestone_bonus"`,
            sort: '-created'
        });

        // 6. Formatear y Fusionar
        const transactions = [];

        // A) Ledger
        ledgerRecords.items.forEach(rec => {
            const isSender = rec.from_user === uid;

            if (rec.type === 'TIP' || rec.type === 'PURCHASE' || rec.type === 'FEE') {
                if (isSender) {
                    const toName = rec.expand?.to_user?.username || 'Usuario';
                    transactions.push({
                        type: 'sent',
                        amount: -rec.amount,
                        description: rec.description || `Enviado a @${toName}`,
                        date: rec.created,
                        icon: '📤',
                        id: rec.id
                    });
                } else {
                    const fromName = rec.expand?.from_user?.username || 'Usuario';
                    transactions.push({
                        type: 'received',
                        amount: rec.amount,
                        description: rec.description || `Recibido de @${fromName}`,
                        date: rec.created,
                        icon: '📥',
                        id: rec.id
                    });
                }
            } else {
                transactions.push({
                    type: isSender ? 'expense' : 'income',
                    amount: isSender ? -rec.amount : rec.amount,
                    description: rec.description || 'Transacción',
                    date: rec.created,
                    icon: isSender ? '📉' : '📈',
                    id: rec.id
                });
            }
        });

        // B) Logs (Bonos)
        logRecords.items.forEach(log => {
            const details = log.details || {};
            transactions.push({
                type: 'bonus',
                amount: details.bonus || 0,
                description: `🎉 Milestone: ${details.copies} copias`,
                date: log.created,
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
