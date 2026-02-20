import PocketBase from 'pocketbase';
import crypto from 'crypto';

export default async function handler(req, res) {
    // 1. Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { recipientEmail, recipientId, amount, postId, type } = req.body;
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

        if ((sender.tokens || 0) < amount) {
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

        // 7. EJECUTAR TRANSFERENCIA (Secuencial para evitar condiciones de carrera en logs)

        // A) Restar al Sender
        await pbAdmin.collection('users').update(sender.id, {
            "tokens-": amount,
            "total_spent+": amount
        });

        // B) Sumar al Recipient
        await pbAdmin.collection('users').update(recipient.id, {
            "tokens+": amount,
            "total_earned+": amount
        });

        const recipientName = recipient.username || recipient.name || 'Usuario';
        const senderName = sender.username || sender.name || 'Usuario';

        // B.2) Si hay Post ID, actualizar el contador del prompt
        if (postId) {
            try {
                await pbAdmin.collection('prompts').update(postId, {
                    "tokens_received+": amount
                });
                console.log(`[TRANSFER] Updated prompt ${postId} with +${amount} tokens`);
            } catch (err) {
                console.error(`[TRANSFER] Failed to update prompt ${postId}:`, err);
                // No fallamos la transferencia principal, solo logueamos
            }
        }

        // C) Registrar en LEDGER — Phase C: Double-Entry Bookkeeping
        // NOTE: BANK_USER_ID sourced from src/lib/constants.js — keep in sync!
        const BANK_USER_ID = 'z44ierjl0thcczd';
        try {
            const txHash = crypto.randomBytes(16).toString('hex');

            // Entry 1: DEBIT — Sender loses tokens
            await pbAdmin.collection('ledger').create({
                amount: parseInt(amount),
                type: 'TIP',
                from_user: sender.id,
                to_user: recipient.id,
                tx_hash: txHash,
                description: `Propina de ${senderName} a ${recipientName}`,
                entry_type: 'DEBIT'
            });

            // Entry 2: CREDIT — Receiver gains tokens
            await pbAdmin.collection('ledger').create({
                amount: parseInt(amount),
                type: 'TIP',
                from_user: sender.id,
                to_user: recipient.id,
                tx_hash: txHash,
                description: `Propina de ${senderName} a ${recipientName}`,
                entry_type: 'CREDIT'
            });

            console.log(`[LEDGER] Double-entry recorded: ${txHash} (${senderName} → ${recipientName}, ${amount} 💎)`);
        } catch (ledgerErr) {
            console.error("Error creating ledger records:", ledgerErr);
            // No fallamos si el ledger falla, pero es crítico loguearlo
        }

        // D) Registrar en ACTIVITY_LOGS (Compatibilidad UI Actual)
        // El frontend actual (store-final.js) lee de aquí para mostrar el historial
        try {
            await pbAdmin.collection('activity_logs').create({
                user: sender.id,
                action: 'send_tip',
                details: {
                    amount: parseInt(amount),
                    recipient: recipientName,
                    recipientId: recipient.id,
                    postId: postId || null,
                    type: type || 'direct_transfer'
                }
            });
        } catch (logErr) {
            console.error("Error creating activity log:", logErr);
        }

        return res.status(200).json({ success: true, message: 'Transferencia exitosa' });

    } catch (error) {
        console.error("Transfer Error:", error);
        return res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
}
