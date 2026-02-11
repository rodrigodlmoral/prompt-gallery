# Configuración del Centro de Soporte 📨

Para que los tickets lleguen a tu correo `soporte@prompt-gallery.app`, sigue estos 3 pasos sencillos en tu panel de PocketBase.

## 1. Crear la Colección de Tickets
1. Entra a tu Panel de PocketBase.
2. Haz clic en el botón **"+"** (New collection).
3. Nombre de la colección: **`tickets`**.
4. Añade los siguientes campos (Fields):
   - **`name`**: Tipo `Text` (Plain).
   - **`email`**: Tipo `Email`.
   - **`message`**: Tipo `Editor` o `Text` (Plain).
   - **`status`**: Tipo `Select` (Opciones: `new`, `replied`, `closed`). Por defecto pon `new`.
5. En la pestaña **API Rules**, asegúrate de que **"Create"** esté vacío (o pon `""` si es necesario) para permitir que cualquiera envíe tickets. Los demás (List, View, Update) déjalos solo para administradores.

## 2. Configurar la Notificación por Correo
Para que PocketBase te avise cuando llegue un ticket:
1. Ve a **Settings (⚙️)** > **Webhooks** (o usa la sección de Correo si prefieres).
2. **Alternativa más simple**: Ya configuramos el SMTP de Zoho. Ahora ve a **Settings** > **Mail settings**.
3. PocketBase no envía correos de "notificación interna" automáticamente por defecto sin código, **PERO** puedes revisar los tickets entrando a la colección `tickets` una vez al día.

> [!TIP]
> **Recomendación**: Entra a tu PocketBase cada mañana. Verás la bolita roja de "Nuevos registros" en la colección `tickets`. Ahí tendrás el nombre, correo y mensaje del usuario para responderles desde tu Zoho.

## 3. Probar el Botón
1. Entra a tu web local.
2. Abre el **Centro de Soporte**.
3. Envía un mensaje de prueba.
4. Revisa tu PocketBase -> ¡Aparecerá el ticket ahí como por arte de magia! ✨
