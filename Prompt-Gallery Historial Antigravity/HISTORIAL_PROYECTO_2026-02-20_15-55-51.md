# PROYECTO: PROMPT GALLERY - HISTORIAL DE DESARROLLO DETALLADO (ANTIGRAVITY)
**Fecha y Hora de Generación:** 20.02.2026 15:55:51

---

## 1. OBJETIVOS Y FILOSOFÍA DEL PROYECTO (v4.0)

El objetivo principal de esta etapa ha sido la **Transparencia Total** y la **Integridad de Datos**. Se ha migrado de un sistema basado en campos de resumen (`users.tokens`) a un sistema **Ledger-First** (Libro de Contabilidad), donde cada centavo de PromptBit está respaldado por un registro histórico inmutable.

### Puntos Importantes:
- **Ledger como Fuente de Verdad:** Los saldos se calculan "al vuelo" desde la colección `ledger` para garantizar que no existan "tokens fantasma".
- **Línea Base Verificada:** Tras el reboot de febrero, se estableció una circulación real de **1,686 💎** distribuida entre 215 usuarios activos.
- **Arquitectura MPA:** Refactorización a una Multi-Page Application para mejorar el SEO y la carga de componentes.

---

## 2. BITÁCORA DE CAMBIOS, ERRORES Y CORRECCIONES

### Fase L a Q: Estabilización y Auditoría
- **HD Quality:** Estabilización de subidas en alta definición y optimización de Cloudinary.
- **Auditoría Enero:** Identificación de discrepancias por bonos de registro duplicados. Se eliminaron 183 registros huérfanos.
- **Migración vs Compras:** Se reclasificaron 4,794 💎 legacy de "Purchases" a "Migración" para reflejar que fueron emisiones de sistema y no compras con dinero real.

### Fase U a W: El Gran Reinicio (Reboot)
- **Hard Reset:** Se borró el ledger histórico para eliminar el "drift" acumulado y se re-inicializó con un registro de `GIFT` por usuario.
- **Error en Backend (v4.12.16):** 
    - *Error:* `ReferenceError: totalPurchased is not defined` en `api/history.js`.
    - *Solución:* Declaración correcta de variables y tipado de datos en el servidor.
- **Error en Frontend:** Se eliminó la lógica de fallback que sumaba prompts/copias para inventar un contador de transacciones. Ahora es 100% Ledger.

### Fase X: Reparación de Autenticación
- **Caso `smangel97`:** 
    - *Problema:* El usuario no podía entrar pese a estar verificado.
    - *Causa:* El campo `username` estaba como `undefined` en la DB, rompiendo la lógica de sesión del frontend.
    - *Corrección:* Reparación manual del registro y asignación de 112 💎 vía Ledger por ajuste de sistema.

---

## 3. ESTRUCTURA DE POCKETBASE (COLLECTIONS & FIELDS)

A continuación se detalla el esquema actual de la base de datos para referencia de futuros agentes o auditorías:

### Colección: `users` (auth)
- `id` (text): Identificador único.
- `username` (text): Nombre de usuario único.
- `email` (email): Correo electrónico.
- `verified` (bool): Estado de verificación.
- `tokens` (number): Balance actual (respaldado por ledger).
- `xp` (number): Experiencia acumulada.
- `level` (number): Nivel actual del usuario (1-5).
- `prompts_count` (number): Total de prompts publicados.
- `total_copies` (number): Total de veces que sus prompts han sido copiados.
- `unique_badges` (select): Medallas especiales (VIP, Fundador, etc).
- `socials` (json): Enlaces a redes sociales.
- `followers` / `following` (relation): Red social interna.

### Colección: `prompts` (base)
- `author` (relation -> users): Creador del prompt.
- `prompt` / `negative_prompt` (text): El contenido técnico.
- `image` / `image_hd` (url): Enlaces a Cloudinary.
- `rating` (text): SFW, Sugestivo, NSFW.
- `tags` (json): Etiquetas para búsqueda.
- `copy_count` (number): Popularidad.
- `tool` (text): IA usada (Midjourney, Flux, etc).

### Colección: `ledger` (base) - *CRÍTICA*
- `from_user` (relation): Emisor (o BANK_USER_ID para sistema).
- `to_user` (relation): Receptor.
- `amount` (number): Cantidad de PromptBits.
- `type` (select): TIP, GIFT, PURCHASE, COPY_MILESTONE, FEE, BOOST.
- `entry_type` (text): CREDIT / DEBIT.
- `tx_hash` (text): Identificador único de transacción.

### Otras Colecciones:
- `activity_logs`: Historial de acciones (logins, uploads, milestones).
- `facebook_queue`: Cola de autoposting para redes sociales.
- `fb_settings`: Configuraciones de la Graph API de Meta.
- `tickets`: Soporte técnico y reportes.
- `levels`: Definición de beneficios y requisitos de nivel.

---

## 4. SUGERENCIAS Y PRÓXIMAS IMPLEMENTACIONES

1.  **Script de Inactividad:** Implementar un proceso que detecte usuarios sin prompts tras 90 días para redistribuir sus tokens a la reserva del sistema (quema por desuso).
2.  **Sistema de Quema Real:** Activar funciones de `BOOST` y `PRIORITY_UPLOAD` que consuman tokens del usuario y los envíen permanentemente al `BANK_USER_ID`.
3.  **Total Comprado (Real):** Integrar una pasarela (Stripe/PayPal) para que el indicador de "Total Comprado" en el Dashboard deje de ser "próximamente" y refleje ingresos reales.
4.  **Auditoría Automática Periodica:** Un script cron que compare semanalmente `SUM(ledger)` vs `users.tokens` y genere un ticket de soporte ante cualquier desviación superior a 1💎.

---
*Generado por Antigravity AI - Protocolo de Transparencia 2026*
