# PROYECTO: PROMPT GALLERY - HISTORIAL DE DESARROLLO DETALLADO (ANTIGRAVITY)
**Fecha y Hora de Generación:** 24.02.2026 11:57:38

---

## 1. HITOS CULMINADOS EN ESTA SESIÓN (Fase Marketplace & Boosts)

En esta etapa hemos transformado la experiencia del usuario y la economía del sitio, introduciendo el sistema de **Boosts** y reforzando la integridad visual y contable.

### Implementaciones Clave:
- **Marketplace v1.0:** Creación de una nueva pestaña en el perfil para la compra de visibilidad.
    - **TOP DIARIO (50 💎):** Posicionamiento优先 en carruseles por 24h.
    - **TOP SEMANAL (200 💎):** Exposición prolongada por 7 días.
    - **SUPERBOOST (500 💎):** Máxima visibilidad con ventana flotante exclusiva por 24h.
- **Reordenamiento Estratégico:** Priorización del SUPERBOOST en la UI para incentivar su uso.
- **Ventana Flotante (Cascarón):** Implementación de `SuperBoostFloat.js` que detecta boosts activos y muestra una card promocional al entrar al dashboard.
- **Despliegue Vercel:** Sincronización exitosa de todo el nuevo código con el entorno de producción ([www.prompt-gallery.app](https://www.prompt-gallery.app)).

---

## 2. BITÁCORA DE CAMBIOS, CORRECCIONES Y ERRORES

### Mejoras de UX/UI:
- **Corrección de Referencias:** Se cambió `window.openPromptDetail` por `window.openDetail` para asegurar compatibilidad con el sistema central de modales.
- **Normalización de Nombres:** Estandarización de nombres a "TOP DIARIO", "TOP SEMANAL" y "SUPERBOOST" en todo el frontend.
- **Recuperación de CSS:** Restauración de `src/style.css` tras una corrupción de archivo, consolidando más de 3000 líneas de estilos críticos y el nuevo módulo de Marketplace.

### Auditoría y Economía:
- **Descubrimiento Crítico (Audit Bug):** 
    - *Error:* El script `api/economy-audit.js` no contabilizaba las transferencias P2P (Tips/Gifts) en el balance esperado.
    - *Estado:* Bug identificado y reportado al usuario. Causa principal de las alertas de "sin registro en ledger" visuales.
- **Limpieza de Código:** Identificación de métodos redundantes en `store-final.js`. Se planea consolidar `giftTokens` para que siempre use `LedgerService.transfer` y reduzca el saldo del admin en lugar de "imprimir" billetes.
- **Hook de Registro:** Verificación de `pb_hooks/registration_bonus.pb.js` que otorga automáticamente 50💎 a nuevos usuarios.

---

## 3. ESTRUCTURA COMPLETA DE POCKETBASE (COLLECTIONS & FIELDS)

Detalle exhaustivo de la base de conocimiento sobre el esquema de datos actual:

### 🟢 Colección: `users` (auth)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | text | ID único del sistema. |
| `username` | text | Alias único (ej: @rodrigodlmoral). |
| `email` | email | Correo electrónico de acceso. |
| `name` | text | Nombre público. |
| `avatar` | file | Imagen de perfil. |
| `tokens` | number | Balance actual de PromptBits. |
| `xp` | number | Puntos de experiencia. |
| `level` | number | Nivel de usuario (0-5). |
| `role` | select | user, moderator, admin. |
| `prompts_count`| number | Caché de posts totales. |
| `total_copies` | number | Caché de copias totales recibidas. |
| `unique_badges`| json | Array de medallas (VIP, Fundador). |
| `moderation` | json | Preferencias de censura (nsfw, suggestive). |
| `batch_access` | bool | Permiso para subidas masivas. |
| `followers` | relation| Usuarios que siguen a esta cuenta. |
| `following` | relation| Cuentas seguidas. |

### 🔵 Colección: `prompts`
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `author` | relation| ID del creador. |
| `title` | text | Título del post. |
| `prompt` | text | Texto del comando IA. |
| `negative_prompt`| text | Texto del comando negativo. |
| `image` | url | Link a Cloudinary (WebP). |
| `image_hd` | url | Link a Cloudinary (Original/HD). |
| `type` | select | single, sequence (multi-imagen). |
| `content` | json | Pasos e imágenes de la secuencia. |
| `rating` | select | SFW / Apto, Sugestivo, NSFW. |
| `tags` | json | Array de etiquetas. |
| `tool` | select | IA usada (Midjourney, DALL-E 3, etc). |
| `is_private` | bool | Visibilidad en galería pública. |
| `copy_count` | number | Veces copiado. |
| `tokens_received`| number | Total de tips recibidos en este post. |
| `created_at_custom`| date | Fecha maestra de ordenación. |

### 🟡 Colección: `ledger` (Finanzas)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `from_user` | relation| Origen de los fondos. |
| `to_user` | relation| Destino de los fondos. |
| `amount` | number | Cantidad entera. |
| `type` | select | TIP, GIFT, PURCHASE, LEVEL_UP, POST_REWARD, REGISTRATION_BONUS, BOOST, FEE, DAILY_LOGIN, AUDIT_ADJUSTMENT. |
| `entry_type` | text | CREDIT (Entrada) / DEBIT (Salida). |
| `tx_hash` | text | Hash único de transacción (ej: TIP-X123-ABC). |
| `description` | text | Motivo de la transacción. |

### 🔴 Colección: `boosts` (Marketplace)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `prompt` | relation| Post impulsado. |
| `user` | relation| Usuario que pagó el boost. |
| `type` | select | daily, weekly, super. |
| `expires_at` | date | Fecha de caducidad automática. |
| `active` | bool | Estado del impulso. |
| `price_paid` | number | Costo en PromptBits. |

### 🟣 Otras Colecciones
- `activity_logs`: `user`, `action` (publish, tip, etc), `details` (json).
- `facebook_queue`: `prompt`, `status` (pending, posted), `scheduled_at`.
- `app_stats`: `total_visits` (contador global de tráfico).
- `tickets`: `user`, `title`, `description`, `status` (open, closed).
- `levels`: Definiciones de rangos y beneficios.

---

## 4. PRÓXIMAS SUGERENCIAS Y ROADMAP

1.  **Reconciliación de Tips:** Actualizar `economy-audit.js` para sumar/restar transferencias P2P en el saldo esperado. Esto eliminará las falsas discrepancias.
2.  **Sincronización Total de giftTokens:** Asegurar que todos los regalos manuales de admin salgan de la cuenta de `rodrigodlmoral` para mantener la base monetaria estable.
3.  **Refuerzo de Ventana SuperBoost:** Convertir el "cascarón" de `SuperBoostFloat.js` en un carrusel dinámico que muestre múltiples SuperBoosts activos si existieran.
4.  **Sistema de Verificación Automática:** Implementar un botón de "Reparar Ledger" en el panel Admin que genere registros de `AUDIT_ADJUSTMENT` automáticos para cuentas con discrepancias menores de 1💎.

---
*Generado por Antigravity AI - Protocolo de Log Detallado v4.1 - Feb 2026*
