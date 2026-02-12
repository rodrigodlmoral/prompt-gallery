import PocketBase from 'pocketbase';

export default async function handler(req, res) {
    // 1. Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { recipientEmail, recipientId, amount } = req.body;
    const authHeader = req.headers.authorization;

    // 2. Validaciones básicas
    if ((!recipientEmail && !recipientId) || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Datos inválidos (falta destinatario o monto)' });
    }

    if (!authHeader) {
        return res.status(401).json({ error: 'No autorizado (Falta token)' });
    }

    try {
        // 3. Conectar a PocketBase como ADMIN (Superusuario)
        const pbAdmin = new PocketBase(process.env.PB_URL);
        await pbAdmin.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);

        // 4. Verificar quién es el que envía (Sender)
        const userToken = authHeader.replace('Bearer ', '');

        // Simulamos ser el usuario solo para validar el token
        const pbUserVerify = new PocketBase(process.env.PB_URL);
        pbUserVerify.authStore.save(userToken, null);

        let senderId;
        try {
            const refreshResult = await pbUserVerify.collection('users').authRefresh();
            senderId = refreshResult.record.id;
        } catch (e) {
            return res.status(401).json({ error: 'Sesión expirada o inválida' });
        }

        // 5. Obtener datos FRESCOS del Sender
        const sender = await pbAdmin.collection('users').getOne(senderId);

        if (sender.tokens < amount) {
            return res.status(400).json({ error: 'Saldo insuficiente' });
        }

        // 6. Buscar al Destinatario (Por ID o Email)
        let recipient;
        try {
            if (recipientId) {
                recipient = await pbAdmin.collection('users').getOne(recipientId);
            } else {
                recipient = await pbAdmin.collection('users').getFirstListItem(`email="${recipientEmail}"`);
            }
        } catch (e) {
            return res.status(404).json({ error: 'Destinatario no encontrado' });
        }

        if (sender.id === recipient.id) {
            return res.status(400).json({ error: 'No puedes transferirte a ti mismo' });
        }

        // 7. EJECUTAR TRANSFERENCIA

        // A) Restar al Sender
        await pbAdmin.collection('users').update(sender.id, {
            "tokens-": amount
        });

        // B) Sumar al Recipient
        await pbAdmin.collection('users').update(recipient.id, {
            "tokens+": amount
        });

        // C) Registrar Log de Transacción
        await pbAdmin.collection('economy_transactions').create({
            from_user: sender.id,
            to_user: recipient.id,
            amount: amount,
            type: 'transfer',
            status: 'completed'
        });

        return res.status(200).json({ success: true, message: 'Transferencia exitosa' });

    } catch (error) {
        console.error("Transfer Error:", error);
        return res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
}
