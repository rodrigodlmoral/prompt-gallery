routerAdd("POST", "/api/economy/transfer", (c) => {
    // 1. Validate Auth
    const user = c.get("authRecord");
    if (!user) {
        throw new ForbiddenError("Debes iniciar sesión para realizar transferencias.");
    }

    // 2. Parse Data
    const data = $apis.requestInfo(c).data;
    const recipientId = data.recipientId;
    const amount = parseInt(data.amount);
    const postId = data.postId || null;
    const type = data.type || "direct_transfer";

    // 3. Validate Input
    if (!recipientId) throw new BadRequestError("Falta el ID del destinatario.");
    if (!amount || amount <= 0) throw new BadRequestError("El monto debe ser positivo.");
    if (user.id === recipientId) throw new BadRequestError("No puedes enviarte fondos a ti mismo.");

    // 4. Validate Funds
    const currentTokens = user.getInt("tokens");
    if (currentTokens < amount) {
        throw new BadRequestError(`Saldo insuficiente. Tienes ${currentTokens} 💎.`);
    }

    // 5. Fetch Recipient
    const recipient = $app.dao().findRecordById("users", recipientId);
    if (!recipient) throw new BadRequestError("Destinatario no encontrado.");

    // 6. Execute Transaction (Atomic)
    $app.dao().runInTransaction((txDao) => {
        // Debit Sender
        user.set("tokens", user.getInt("tokens") - amount);
        user.set("total_spent", user.getInt("total_spent") + amount);
        txDao.saveRecord(user);

        // Credit Recipient
        recipient.set("tokens", recipient.getInt("tokens") + amount);
        recipient.set("total_earned", recipient.getInt("total_earned") + amount);
        txDao.saveRecord(recipient);

        // Log Activity
        const logsCollection = $app.dao().findCollectionByNameOrId("activity_logs");
        const log = new Record(logsCollection);

        log.set("user", user.id); // Sender logs the action
        log.set("action", "send_tip");
        log.set("details", {
            amount: amount,
            recipientId: recipientId,
            recipientName: recipient.getString("username") || recipient.getString("name"),
            senderName: user.getString("username") || user.getString("name"),
            postId: postId,
            type: type
        });

        txDao.saveRecord(log);
    });

    return c.json(200, {
        success: true,
        message: `Transferencia de ${amount} 💎 exitosa.`,
        newBalance: user.getInt("tokens")
    });
}, $apis.requireRecordAuth());
