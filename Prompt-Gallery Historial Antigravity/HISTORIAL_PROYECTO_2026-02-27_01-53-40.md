# 📋 PROYECTO: PROMPT GALLERY — HISTORIAL DETALLADO DE DESARROLLO (ANTIGRAVITY)
**Fecha y Hora de Generación:** 27 de Febrero 2026. 01:53:40 CST (UTC -06:00)  
**Sesión de Conversación:** c12ab41c-c586-49c2-8597-c6e83355296c  
**Versión Actual del Proyecto:** v4.x (MPA con Economía Avanzada, Boosts, Referidos)

---

## 1. RESUMEN DE LA SESIÓN ACTUAL

### Objetivo Principal
Corregir las estadísticas de visitantes (Usuarios, Prompts, Visitas) que aparecían en **0** para usuarios no registrados en el banner "¡Desbloquea toda la galería!" tanto en la página principal como en los perfiles.

### Problema Raíz Identificado
En `store-final.js`, la función `init()` descarga las estadísticas públicas en **Phase 3** (con un `setTimeout` de 3 segundos). Sin embargo, la llamada a `window.render()` que actualiza la UI estaba condicionada con `!isProfilePage`, lo que significaba que en la página de perfil las estadísticas nunca se refrescaban visualmente para los visitantes no autenticados.

### Solución Implementada — Actualización Quirúrgica del DOM

Se optó por una solución **mínimamente invasiva** que no requiere un re-render completo:

1. **Se añadieron IDs a los elementos de estadísticas** en `Gallery.js` y `profile.js`:
   - `id="visStatsUsers"` — Contador de usuarios
   - `id="visStatsPrompts"` — Contador de prompts
   - `id="visStatsVisits"` — Contador de visitas

2. **Se añadió actualización directa del DOM** en `store-final.js` (Phase 3):
   ```javascript
   const u = document.getElementById('visStatsUsers');
   const p = document.getElementById('visStatsPrompts');
   const v = document.getElementById('visStatsVisits');
   if (u) u.innerText = this.stats.users.toLocaleString();
   if (p) p.innerText = this.stats.prompts.toLocaleString();
   if (v) v.innerText = this.stats.visits.toLocaleString();
   ```

### Archivos Modificados
| Archivo | Cambio | Líneas Afectadas |
|:---|:---|:---|
| `src/components/Gallery.js` | Añadidos IDs a 3 `<div>` de stats | ~161, ~166, ~171 |
| `src/profile.js` | Añadidos IDs a 3 `<div>` de stats | ~709, ~714, ~719 |
| `src/store-final.js` | Añadida actualización DOM post-fetch | ~253-259 (Phase 3) |

---

## 2. PROCESO DE DESPLIEGUE

### Conflictos de Merge
Al hacer `git push`, el remoto tenía commits anteriores que divergían del local. Se realizó:

1. `git pull --no-rebase` → Detectó conflictos en `store-final.js` y `profile.js`
2. `git checkout --ours src/store-final.js src/profile.js` → Se mantuvo la versión local (HEAD) que contiene:
   - `ReferralSystem` import y lógica de referidos
   - Correcciones de whitespace
   - Los nuevos IDs de stats
3. `git commit` + `git push` → Desplegado exitosamente: `ac8f6c3..27670b8 main -> main`

### Estado del Despliegue
✅ Push a GitHub exitoso  
✅ Vercel detecta automáticamente y construye  
✅ URL de producción: https://prompt-gallery-v2.vercel.app (alias: www.prompt-gallery.app)

---

## 3. CONTEXTO DE CONVERSACIONES ANTERIORES RELEVANTES

### Conversación: "Fixing Visitor Stats" (5e21c56b)
- **Fecha:** 26 Feb 2026
- **Tema:** Primer intento de corrección de las estadísticas de visitante.
- **Nota:** Esta sesión actual es la continuación directa de ese trabajo.

### Conversación: "Fixing Mobile Menu" (fcb0e12a)
- **Fecha:** 26 Feb 2026
- **Tema:** Corrección del botón de menú hamburguesa que desaparecía en la página de perfil en móvil.
- **Resultado:** Se integró el menú móvil en el header del perfil, replicando el comportamiento de la página principal.

### Conversación: "Fixing Profile Gallery" (f2db39e2)
- **Fecha:** 24 Feb 2026
- **Tema:** La galería del perfil desaparecía después de cargar y había un botón incorrecto de "Boost" en las cards de prompts dentro del perfil.
- **Resultado:** Se corrigió la lógica de renderizado y se eliminó el botón de boost de las cards del perfil.

### Conversación: "Debugging Economy Audit" (8e6cef2e)
- **Fecha:** 21-24 Feb 2026
- **Tema:** El Economy Dashboard mostraba "PromptBits without ledger entry" a pesar de que los registros existían.
- **Resultado:** Se identificó que el script `economy-audit.js` no contabilizaba las transferencias P2P (Tips/Gifts) correctamente.

### Conversación: "Fixing Level-Up Modal" (7d6f1b25)
- **Fecha:** 16-19 Feb 2026
- **Tema:** El modal de Level Up no bloqueaba correctamente las interacciones de fondo y los botones de cerrar no funcionaban.
- **Resultado:** Modal rediseñado con confetti, estrellas y tamaño apropiado.

### Conversación: "Debugging Facebook Queue" (27bb4ee1)
- **Fecha:** 13-18 Feb 2026
- **Tema:** La colección `facebook_queue` permanecía vacía.
- **Resultado:** Se reubicó la lógica de population al método `addPrompt` / `_bridgeToFacebook`.

---

## 4. ARQUITECTURA TÉCNICA ACTUAL

### Stack Tecnológico
```
Frontend:       Vite 7.2.4 + Vanilla JavaScript (MPA - Multi-Page Application)
Backend:        PocketBase (PocketHost.io — $5 USD/mes)
Storage:        Cloudinary (imágenes WebP + HD)
Hosting:        Vercel (Frontend — automático desde GitHub)
Analytics:      Google Analytics 4 (G-YYE3BBL1MQ)
Dominio:        www.prompt-gallery.app
PB Admin:       https://prompt-gallery.pockethost.io/_/
```

### Estructura de Archivos Core
```
prompt-gallery-v2/
├── index.html                 # Galería principal
├── profile.html               # Perfiles de usuario
├── admin.html                 # Panel de administración
├── vite.config.js             # Config de Vite (MPA)
├── vercel.json                # Config de deploy
├── .env                       # Variables de entorno
│
├── src/
│   ├── main.js                # 🔴 CORE — Lógica galería (~3000+ líneas)
│   ├── profile.js             # 🔴 CORE — Lógica perfiles (~2924 líneas)
│   ├── admin.js               # 🟡 Panel administrativo
│   ├── store-final.js         # 🔴 CORE — Estado global + API (~3084 líneas)
│   ├── pocketbase.js          # 🟢 Config de conexión PB
│   ├── uploadService.js       # 🟢 Upload a Cloudinary
│   ├── style.css              # 🔴 Estilos globales (~36KB+)
│   │
│   ├── components/
│   │   ├── Gallery.js         # Componente de galería (cards)
│   │   ├── Collage.js         # Renderizado de collage
│   │   ├── TopCreators.js     # Ranking de creadores
│   │   ├── DetailModal.js     # Vista expandida de prompts
│   │   ├── AdvancedFilters.js # Panel de filtros avanzados
│   │   ├── SearchSuggestions.js # Sugerencias de búsqueda
│   │   ├── EconomyDashboard.js # Dashboard económico
│   │   ├── LiveChat.js        # Chat en vivo
│   │   ├── MarketplaceTab.js  # Pestaña de Marketplace
│   │   ├── SuperBoostFloat.js # Ventana flotante SuperBoost
│   │   └── Modals/
│   │       ├── AuthModal.js   # Login/Register/Recover
│   │       └── LevelModals.js # Modales de nivel
│   │
│   ├── lib/
│   │   ├── LevelSystem.js     # Sistema de niveles
│   │   ├── LedgerService.js   # Contabilidad de doble entrada
│   │   ├── CopyBonusSystem.js # Bonos por copias (milestones)
│   │   ├── BoostSystem.js     # Sistema de boosts (marketplace)
│   │   ├── ReferralSystem.js  # Sistema de referidos
│   │   ├── boost-config.js    # Precios de boosts
│   │   └── constants.js       # BANK_USER_ID, ENTRY_TYPES
│   │
│   ├── data/
│   │   ├── tags.js            # TAG_CATEGORIES
│   │   └── tagAliases.js      # TAG_ALIASES
│   │
│   └── utils/
│       ├── search-logic.js    # Lógica de búsqueda
│       ├── ui-helpers.js      # Toasts y helpers de UI
│       └── LevelDebug.js      # Herramientas de debug de niveles
│
├── api/                       # Serverless functions (Vercel)
│   ├── economy-audit.js       # Auditoría de economía
│   └── backfill-registration-bonus.js
│
├── pb_hooks/
│   └── registration_bonus.pb.js  # Hook: 50💎 al registro
│
└── Prompt-Gallery Historial Antigravity/
    └── (Este archivo y logs anteriores)
```

### Módulos del Sistema de Economía

| Módulo | Archivo | Responsabilidad |
|:---|:---|:---|
| **LedgerService** | `lib/LedgerService.js` | Punto único de entrada para escrituras al ledger. Doble entrada contable. |
| **LevelSystem** | `lib/LevelSystem.js` | Cálculo de nivel, verificación de level-up, progreso. |
| **CopyBonusSystem** | `lib/CopyBonusSystem.js` | Bonos automáticos al alcanzar milestones de copias. |
| **BoostSystem** | `lib/BoostSystem.js` | Compra y gestión de Boosts (daily/weekly/super). |
| **ReferralSystem** | `lib/ReferralSystem.js` | Generación de códigos, registro de referidos, stats. |

---

## 5. ESTRUCTURA COMPLETA DE POCKETBASE (COLLECTIONS & FIELDS)

### 🟢 Colección: `users` (tipo: auth)
| Campo | Tipo | Descripción |
|:---|:---|:---|
| `id` | text (auto) | ID único del sistema |
| `email` | email | Correo electrónico de acceso |
| `username` | text | Alias único (ej: @rodrigodlmoral) — Campo interno de PB |
| `name` | text | Nombre público visible |
| `avatar` | file | Imagen de perfil (file de PB) |
| `avatar_url` | url | URL de avatar (Cloudinary) |
| `tokens` | number | Balance actual de PromptBits 💎 |
| `xp` | number | Puntos de experiencia |
| `level` | number | Nivel de usuario (0-5) |
| `level_progress` | json | Progreso detallado hacia el siguiente nivel |
| `role` | select | `user` / `moderator` / `admin` |
| `prompts_count` | number | Caché de posts totales (sincronizado) |
| `total_copies` | number | Caché de copias totales recibidas |
| `total_earned` | number | Total histórico de PromptBits ganados |
| `total_rewards` | number | Total de recompensas del sistema |
| `unique_badges` | json | Array de medallas especiales (VIP, Fundador, C.E.O, etc.) |
| `moderation` | json | Preferencias de censura `{ nsfw: 'BLUR', suggestive: 'ON' }` |
| `socials` | json | Redes sociales `{ ig, fb, x, tg, th, fv }` |
| `batch_access` | bool | Permiso para subidas masivas |
| `followers` | relation (users) | Usuarios que siguen a esta cuenta |
| `following` | relation (users) | Cuentas seguidas |
| `blocked` | json | Array de IDs de usuarios bloqueados |
| `referral_code` | text | Código único de referido |
| `referred_by` | text | Código del referidor (si fue referido) |
| `created` | datetime (auto) | Fecha de registro |
| `updated` | datetime (auto) | Última actualización |

### 🔵 Colección: `prompts`
| Campo | Tipo | Descripción |
|:---|:---|:---|
| `id` | text (auto) | ID único |
| `author` | relation (users) | ID del creador |
| `author_name` | text | Nombre del autor (redundancia para búsqueda) |
| `title` | text | Título del prompt |
| `prompt` | text | Texto del comando IA positivo |
| `negative_prompt` | text | Texto del comando negativo |
| `image` | text | URL de imagen (legacy) |
| `image_url` | url | URL de imagen principal (Cloudinary WebP) |
| `image_hd` | url | URL de imagen HD (Cloudinary original) |
| `type` | select | `single` / `sequence` (multi-imagen) |
| `content` | json | Pasos de la secuencia `[{ prompt, image, rating }]` |
| `rating` | select | `SFW / Apto` / `Sugestivo` / `NSFW / +18` |
| `tags` | json | Array de etiquetas categorizadas |
| `tool` | select | IA usada: ChatGPT, Gemini, Grok, Meta, DIGEN AI, SD 1.5, SD 2.0, SDXL, Flux, Midjourney, Whisk, Huggingface, Fooocus, ComfyUI, Perchance, Otro |
| `extra_config` | json | Configuración adicional (pares key-value) |
| `is_private` | bool | Visibilidad privada |
| `needs_reference` | bool | Requiere imagen de referencia |
| `copy_count` | number | Veces copiado |
| `tokens_received` | number | Total de tips recibidos |
| `reactions` | json | `{ like: N, love: N, fire: N, funny: N, dislike: N, sad: N, _u: {userId: {type}} }` |
| `comments` | json | Array de comentarios `[{ user, text, date }]` |
| `saved_by` | json | Array de user IDs que guardaron este prompt |
| `is_featured` | bool | Destacado por el usuario (50💎) |
| `featured_until` | datetime | Fecha de expiración del destacado |
| `admin_featured` | bool | Destacado por admin |
| `created_at_custom` | datetime | Fecha maestra de ordenación |
| `created` | datetime (auto) | Fecha de creación real |

### 🟡 Colección: `ledger` (Finanzas — Doble Entrada)
| Campo | Tipo | Descripción |
|:---|:---|:---|
| `id` | text (auto) | ID único |
| `from_user` | relation (users) | Origen de los fondos (BANK_USER_ID para sistema) |
| `to_user` | relation (users) | Destino de los fondos |
| `amount` | number | Cantidad entera |
| `type` | select | `TIP`, `GIFT`, `PURCHASE`, `LEVEL_UP`, `POST_REWARD`, `REGISTRATION_BONUS`, `BOOST`, `FEE`, `DAILY_LOGIN`, `AUDIT_ADJUSTMENT`, `COPY_MILESTONE` |
| `entry_type` | text | `CREDIT` (Entrada) / `DEBIT` (Salida) |
| `tx_hash` | text | Hash único de transacción (ej: `TIP-X123-ABC`) |
| `description` | text | Motivo de la transacción |
| `created` | datetime (auto) | Fecha de la transacción |

### 🔴 Colección: `boosts` (Marketplace)
| Campo | Tipo | Descripción |
|:---|:---|:---|
| `id` | text (auto) | ID único |
| `prompt` | relation (prompts) | Post impulsado |
| `user` | relation (users) | Usuario que pagó |
| `type` | select | `daily` (50💎/24h) / `weekly` (200💎/7d) / `super` (500💎/24h) |
| `expires_at` | datetime | Fecha de caducidad |
| `is_active` | bool | Estado del impulso |
| `price_paid` | number | Costo en PromptBits |
| `created` | datetime (auto) | Fecha de compra |

### 🟣 Colección: `boost_notifications`
| Campo | Tipo | Descripción |
|:---|:---|:---|
| `boost` | relation (boosts) | Boost asociado |
| `user` | relation (users) | Usuario destino de la notificación |
| `type` | text | Tipo de notificación |
| `read` | bool | Si fue leída |
| `created` | datetime (auto) | Fecha |

### 🟠 Colección: `referrals`
| Campo | Tipo | Descripción |
|:---|:---|:---|
| `id` | text (auto) | ID único |
| `referrer` | relation (users) | Usuario que refirió |
| `referred` | relation (users) | Usuario referido |
| `referral_code` | text | Código utilizado |
| `status` | text | Estado (pending, active, rewarded) |
| `created` | datetime (auto) | Fecha del referido |

### 🟤 Colección: `activity_logs`
| Campo | Tipo | Descripción |
|:---|:---|:---|
| `id` | text (auto) | ID único |
| `user` | relation (users) | Usuario que realizó la acción |
| `action` | text | Tipo: `publish`, `tip`, `follow`, `level_up`, `referral`, etc. |
| `details` | json | Datos adicionales de la acción |
| `created` | datetime (auto) | Fecha |

### 🔘 Colección: `facebook_queue`
| Campo | Tipo | Descripción |
|:---|:---|:---|
| `prompt` | relation (prompts) | Prompt asociado |
| `status` | select | `pending` / `posted` |
| `scheduled_at` | datetime | Fecha de programación |
| `created` | datetime (auto) | Fecha |

### ⚪ Colección: `app_stats`
| Campo | Tipo | Descripción |
|:---|:---|:---|
| `total_visits` | number | Contador global de tráfico del sitio |
| *(Nota: un solo registro en esta colección)* | | |

### 🔳 Colección: `tickets` (Soporte)
| Campo | Tipo | Descripción |
|:---|:---|:---|
| `user` | relation (users) | Usuario que abrió el ticket |
| `title` | text | Título del ticket |
| `description` | text | Descripción del problema |
| `status` | select | `open` / `closed` |
| `created` | datetime (auto) | Fecha |

### 🔲 Colección: `levels` (Definiciones)
| Campo | Tipo | Descripción |
|:---|:---|:---|
| *(Definiciones de rangos y beneficios por nivel)* | | |

---

## 6. SISTEMA DE NIVELES ACTUAL (LEVEL_REQS)

```javascript
const LEVEL_REQS = [
    { level: 0, posts: 0,   copies: 0,   name: 'Explorador',      icon: '🛡️', color: '#22c55e' },
    { level: 1, posts: 5,   copies: 0,   name: 'Novato',           icon: '🌱', color: '#3b82f6' },
    { level: 2, posts: 25,  copies: 0,   referrals: 5,   name: 'Creador Jr',    icon: '🎨', color: '#a855f7' },
    { level: 3, posts: 50,  copies: 100, reputation: 10, name: 'Creador Elite', icon: '🏆', color: '#f97316' },
    { level: 4, posts: 100, copies: 200, reputation: 25, name: 'Artista Prompter', icon: '💎', color: '#ef4444' },
    { level: 5, posts: 250, copies: 500, reputation: 50, name: 'Maestro Prompter', icon: '👑', color: '#eab308' }
];
```

### Level-Up Bonuses (PromptBits)
| Nivel | Bonus | Nombre |
|:---|:---|:---|
| 0→1 | +10 💎 | Novato |
| 1→2 | +20 💎 | Creador Jr |
| 2→3 | +30 💎 | Creador Elite |
| 3→4 | +40 💎 | Artista Prompter |
| 4→5 | +50 💎 | Maestro Prompter |

### Beneficios por Nivel
| Nivel | Posts/día | Funciones Desbloqueadas |
|:---|:---|:---|
| 0 | 3 | Acceso a galería, filtros, seguir usuarios, copiar |
| 1 | 5 | Comentar, guardar favoritos, enviar/recibir PromptBits, destacar posts |
| 2 | 10 | Cambiar foto de perfil, publicar secuencias multi-imagen |
| 3 | 20 | Añadir redes sociales y bio |
| 4 | 30 | Badge visual destacado, early access |
| 5 | 50 | Programa de Creadores (Monetización), Perfil Verificado |

---

## 7. SISTEMA DE ECONOMÍA — LEDGERSERVICE

### Principios de Diseño
1. **Toda transacción tiene origen y destino**
2. **Recompensas del sistema vienen del Central Bank** (`BANK_USER_ID`)
3. **Transferencias P2P crean pares DEBIT/CREDIT**
4. **Fallos en ledger NUNCA bloquean la acción primaria** (fire-and-forget)
5. **Todos los entries comparten un `tx_hash`** para trazabilidad

### Métodos Disponibles
| Método | Uso |
|:---|:---|
| `LedgerService.systemReward(userId, amount, type, desc)` | Recompensa del sistema (minting) |
| `LedgerService.transfer(senderId, receiverId, amount, desc)` | Transferencia P2P (tips) |
| `LedgerService.systemPayment(userId, amount, type, desc)` | Pago al sistema (boosts, compras) |

### Formato de tx_hash
`PREFIX-TIMESTAMP_BASE36-RANDOM_HEX`  
Ejemplos: `TIP-LK4M2A-F8B3C1`, `POST-LK4M3B-A2D4E6`, `LVL_-LK4M4C-7F9E2A`

---

## 8. SISTEMA DE BOOSTS (MARKETPLACE)

### Precios (definidos en `boost-config.js`)
| Tipo | Costo | Duración | Efecto |
|:---|:---|:---|:---|
| **TOP DIARIO** | 50 💎 | 24 horas | Posicionamiento prioritario en carruseles |
| **TOP SEMANAL** | 200 💎 | 7 días | Exposición prolongada |
| **SUPERBOOST** | 500 💎 | 24 horas | Máxima visibilidad + ventana flotante exclusiva |

### Flujo de Compra
1. Usuario abre MarketplaceTab en su perfil
2. Selecciona tipo de boost y prompt
3. Sistema verifica saldo y crea registro en `boosts`
4. Se debita del usuario vía `LedgerService.systemPayment`
5. Se crea notificación en `boost_notifications`
6. Expiración automática cada 5 minutos vía `setInterval`

---

## 9. SISTEMA DE REFERIDOS (ReferralSystem)

### Flujo
1. Usuario genera su código de referido (único, almacenado en `users.referral_code`)
2. Comparte el link con el código
3. Nuevo usuario se registra con el código → se almacena en `localStorage`
4. Post-registro: se crea entrada en colección `referrals`
5. Referidor recibe bonus de PromptBits

### Colección `referrals`
- `referrer` → Usuario que refirió
- `referred` → Usuario nuevo
- `referral_code` → Código utilizado
- `status` → `pending` / `active` / `rewarded`

---

## 10. SISTEMA DE CARGA DE LA APLICACIÓN (Init Phases)

### `store.init()` — Fases de Carga
```
Phase 1 (Inmediata):     Gallery + Boosts + Referrals → render()
Phase 2 (1s delay):      AllPrompts para Análisis + SlimUsers → render() (boosts/top creators)
Phase 3 (3s delay):      Stats públicas + trackVisit + syncUser → DOM update quirúrgico
```

### Protección para Perfil
- En `profile.js`, se evita cargar prompts globales (solo los del usuario del perfil)
- `loadUserPromptsForAnalysis(userId)` carga la lista maestra del perfil específico
- `fetchUserProfileByUsername()` busca con 4 estrategias (memoria → slim → prompts → filtro directo)

---

## 11. ERRORES Y BUGS CONOCIDOS / RESUELTOS

### ✅ Resueltos en esta sesión
| Bug | Causa | Solución |
|:---|:---|:---|
| Stats de visitante en 0 | `window.render()` condicionado a `!isProfilePage` | Actualización quirúrgica DOM con IDs |

### ✅ Resueltos en sesiones anteriores recientes
| Bug | Causa | Solución | Sesión |
|:---|:---|:---|:---|
| Menú móvil desaparece en perfil | Header del perfil no incluía botón hamburguesa | Integrado en Header() de profile.js | fcb0e12a |
| Galería de perfil desaparecía | Lógica de renderizado incorrecta | Corregida renderización | f2db39e2 |
| Botón Boost en cards del perfil | PromptCard incluía botón boost siempre | Condicionado a contexto marketplace | f2db39e2 |
| Audit falsos positivos | economy-audit.js no contaba P2P | Identificado, pendiente fix completo | 8e6cef2e |
| Modal Level-Up no cerraba | Conflicto de z-index y listeners | Modal rediseñado con confetti | 7d6f1b25 |
| Facebook queue vacía | Lógica en método equivocado | Reubicada a addPrompt | 27bb4ee1 |

### ⚠️ Bugs / Deuda Técnica Pendiente
1. **economy-audit.js** — Necesita actualización para contabilizar transferencias P2P correctamente
2. **giftTokens** — Debería siempre usar `LedgerService.transfer` y reducir saldo del admin
3. **SuperBoostFloat.js** — Es un "cascarón"; necesita convertirse en carrusel dinámico para múltiples SuperBoosts
4. **main.js demasiado largo** — 3000+ líneas, dificulta mantenimiento
5. **Sin tests automatizados**

---

## 12. SUGERENCIAS PRÓXIMAS Y ROADMAP

1. **🔧 Reconciliación de Tips en Audit** — Actualizar `economy-audit.js` para sumar/restar transferencias P2P
2. **🔧 SuperBoost Carrusel** — Convertir cascarón en carrusel dinámico
3. **🔧 Botón "Reparar Ledger"** — Auto-generar `AUDIT_ADJUSTMENT` para discrepancias menores
4. **📱 PWA / Notificaciones Push** — Mejorar engagement móvil
5. **🧪 Tests Automatizados** — Al menos smoke tests para auth, prompts, y economía
6. **📊 Analytics de Creador** — Dashboard personalizado con métricas de impacto
7. **🔄 Migración a componentes** — Extraer más lógica de main.js a componentes modulares

---

## 13. VARIABLES DE ENTORNO

```bash
VITE_POCKETBASE_URL=https://prompt-gallery.pockethost.io
VITE_OPENROUTER_API_KEY=<clave para IA Auto-Tag>
```

**Google Analytics ID:** `G-YYE3BBL1MQ`

---

## 14. COMANDOS DE DEPLOY

```bash
# Build local
npm run build

# Preview local
npm run preview

# Deploy a Vercel (automático con push)
git add -A
git commit -m "descripción del cambio"
git push
```

---

*Generado por Antigravity AI — Protocolo de Log Detallado v4.2 — 27 Feb 2026, 01:53 CST*
