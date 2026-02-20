# 📋 HISTORIAL DE PROYECTO — Prompt Gallery
# 📅 Fecha: 19 de Febrero de 2026
# ⏰ Hora de inicio: ~02:00 hrs (CST) | Hora de cierre: 03:50 hrs (CST)
# 🤖 Asistente: Antigravity (Google DeepMind)
# 🆔 Conversation ID: ce1d0f8f-3b8e-48cb-a58f-8d0514b45d01
# 🏷️ Versión final desplegada: v4.7.7 (Commit: d47ba50)

---

## 🎯 OBJETIVO PRINCIPAL DE LA SESIÓN
Implementar mejoras de UI en el tab de Autopost del panel de administración, incluyendo:
1. Renombrar el tab "FB Autopost" a "Autopost"
2. Agregar un recuadro de estado de conexión con Instagram
3. Reemplazar el botón único de "Start" con botones separados de Iniciar/Pausar/Detener
4. Habilitar selección por lotes (batch) para agregar/quitar múltiples posts de la cola
5. Incluir el prompt completo en el caption de Instagram

---

## 📝 LOG DETALLADO DE CAMBIOS Y EVENTOS

### ═══════════════════════════════════════════
### FASE 1: Implementación de UI Enhancements (v4.7.4)
### Hora: ~02:00 - 02:30 hrs
### ═══════════════════════════════════════════

#### 1.1 — Caption de Instagram con Prompt Completo
**Archivo:** `api/facebook-post.js` (líneas 106-112)
**Cambio:** Se actualizó la construcción del caption de Instagram para incluir:
- Título del prompt
- Autor (@display)
- Herramienta usada
- Si requiere referencia (SÍ/NO)
- **PROMPT COMPLETO** (texto íntegro)
- **NEGATIVE PROMPT** (si aplica)
- URL del sitio web
- Hashtags optimizados (#PromptGallery #AI #AIArt #Prompts #AIGenerated #DigitalArt #CreativeAI)

**Formato del caption:**
```
✨ {título}

👤 Por @{autor}
🛠️ {herramienta}
📸 Requiere Referencia: SÍ ✅ / NO ❌

💡 PROMPT:
{prompt completo}

🚫 NEGATIVE PROMPT:
{negative prompt (si existe)}

🌐 www.prompt-gallery.app

#PromptGallery #AI #AIArt ...
```

#### 1.2 — Renombramiento del Tab
**Archivo:** `src/admin.js` (línea 56-59)
**Cambio:** Se modificó el texto del botón de navegación:
- **Antes:** `📘 FB Autopost`
- **Después:** `📘 Autopost`

#### 1.3 — Recuadro de Estado de Instagram
**Archivo:** `src/admin.js` (líneas 374-391)
**Nuevo endpoint:** `api/ig-detect.js` (ARCHIVO NUEVO — 58 líneas)

**Implementación del endpoint `api/ig-detect.js`:**
1. Se conecta a PocketBase como superusuario
2. Obtiene el registro activo de `fb_settings`
3. Consulta la Graph API de Facebook: `GET /{page_id}?fields=instagram_business_account{id,username,profile_picture_url,name}`
4. Retorna: `{ connected: true/false, username, id, name, profile_picture_url, reason }`

**UI en admin.js:**
- Nuevo div `#igStatusBox` debajo del recuadro de Facebook
- Texto dinámico `#igStatusText` que muestra:
  - `⏳ Detectando cuenta...` (cargando)
  - `✅ Conectado: @{username}` (éxito)
  - `⚠️ No vinculada ({razón})` (error/no encontrado)
- Llamada asíncrona a `/api/ig-detect` al cargar el tab

#### 1.4 — Botones de Control: Iniciar / Pausar / Detener
**Archivo:** `src/admin.js` (líneas 411-427)
**Cambios:**
- Se eliminó el toggle único `btnToggleSmartQueue`
- Se crearon 3 botones independientes:
  - `btnStartSmartQueue` (▶️ Iniciar) — Azul `#3b82f6`
  - `btnPauseSmartQueue` (⏸️ Pausar) — Amarillo `#eab308` — Se oculta hasta que se inicia
  - `btnStopSmartQueue` (⏹️ Detener) — Rojo `#ef4444` — Se oculta hasta que se inicia

**Lógica de los botones:**
- **Iniciar:** Muestra Pausar+Detener, oculta Iniciar, ejecuta `runSmartCycle()`
- **Pausar:** Alterna entre pausar y reanudar. Al pausar, cambia texto a "▶️ Reanudar". Al reanudar, vuelve a "⏸️ Pausar" y ejecuta `runSmartCycle()`
- **Detener:** Limpia timeouts, reinicia estado, muestra Iniciar, oculta Pausar+Detener

#### 1.5 — Selección por Lotes (Batch Selection)
**Archivo:** `src/admin.js` (líneas 430-550, 556-608)

**Panel de Fuente (Source):**
- Checkbox `cbSelectAllSource` — "Seleccionar todos"
- Checkbox individual `.cb-source-item` en cada prompt
- Botón `btnBatchAddSource` — "➕ Añadir seleccionados" (verde `#22c55e`)
- Set `window.selectedSourceIds` para rastrear selección
- Funciones: `updateSourceSelection()`, `toggleSelectAllSource()`, `batchAddToQueue()`

**Panel de Cola (Queue):**
- Checkbox `cbSelectAllQueue` — "Seleccionar todos"
- Checkbox individual `.cb-queue-item` en cada item
- Botón `btnBatchRemoveQueue` — "🗑️ Quitar seleccionados" (rojo `#ef4444`)
- Set `window.selectedQueueIds` para rastrear selección
- Funciones: `updateQueueSelection()`, `toggleSelectAllQueue()`, `batchRemoveFromQueue()`

**Lógica de batch:**
- Los botones de batch solo aparecen cuando hay ≥1 item seleccionado
- Muestran contador: "➕ Añadir 3 seleccionados"
- Operaciones ejecutadas con `Promise.all` para rendimiento
- Después de operación, se limpian las selecciones y se recargan las listas

#### 1.6 — Detección de Instagram (Función Backend)
**Archivo:** `api/facebook-post.js` (líneas 170-232)
**Nueva función:** `detectInstagram(pageId, accessToken)`
- Consulta Graph API para obtener `instagram_business_account`
- Retorna el objeto IG o `null`
- Se exporta para uso en otros módulos

**Deploy v4.7.4:** Commit exitoso. Build limpio con Vite.

---

### ═══════════════════════════════════════════
### FASE 2: Bug Fix — IG "No Vinculada" + Error al Desconectar (v4.7.5)
### Hora: ~03:10 - 03:33 hrs
### ═══════════════════════════════════════════

#### 2.1 — Error: "Cannot read properties of undefined (reading 'collection')"
**Problema:** Al hacer clic en "❌ Desconectar", aparecía el error:
```
Error: Cannot read properties of undefined (reading 'collection')
```
**Causa raíz:** En `admin.js` línea 516, se usaba `store.pb.collection('fb_settings').delete(settingsId)`. El objeto `store.pb` no estaba inicializado correctamente en el contexto del módulo.
**Fix v4.7.5:** Se cambió `store.pb` por `pb` (importado directamente de `./pocketbase.js`).

#### 2.2 — IG muestra "⚠️ No vinculada (No IG account linked to Page)"
**Problema:** A pesar de que la cuenta de Instagram SÍ estaba vinculada a la página de Facebook, el endpoint `api/ig-detect.js` no la detectaba.
**Causa raíz:** El token de acceso almacenado en `fb_settings` fue generado SIN los permisos de Instagram. Los permisos `instagram_basic` e `instagram_content_publish` no estaban incluidos en el scope del login de Facebook.
**Fix v4.7.5:** Se actualizó el scope del `FB.login()` en `admin.js`:
- **Antes:** `pages_manage_posts,pages_read_engagement,business_management`
- **Después:** `pages_manage_posts,pages_read_engagement,business_management,instagram_basic,instagram_content_publish`

**⚠️ IMPORTANTE:** Este fix requiere que el usuario **DESCONECTE y RECONECTE** la página para que el nuevo token incluya los permisos de IG.

**Deploy v4.7.5:** Commit `182e13c`.

---

### ═══════════════════════════════════════════
### FASE 3: Bug Fix — "Only superusers can perform this action" (v4.7.6)
### Hora: ~03:33 - 03:38 hrs
### ═══════════════════════════════════════════

#### 3.1 — Error al Desconectar (persistente)
**Problema:** Después del fix v4.7.5, al intentar desconectar:
```
Error: Only superusers can perform this action.
```
**Causa raíz:** La colección `fb_settings` en PocketBase tiene reglas de acceso (RLS) que solo permiten operaciones de escritura/borrado a superusuarios. El cliente del navegador no tiene token de superusuario.
**Solución:** Se creó un endpoint del lado del servidor para manejar la desconexión.

#### 3.2 — Nuevo Archivo: `api/fb-disconnect.js` (ARCHIVO NUEVO — 28 líneas)
**Implementación:**
1. Recibe `{ settingsId }` en el body del POST
2. Se autentifica como superusuario en PocketBase
3. Ejecuta `pb.collection('fb_settings').delete(settingsId)`
4. Retorna `{ success: true }`

#### 3.3 — Actualización en `admin.js`
**Cambio en `window.disconnectFacebook`:**
- **Antes:** `await pb.collection('fb_settings').delete(settingsId)` (client-side)
- **Después:** `fetch('/api/fb-disconnect', { method: 'POST', body: { settingsId } })` (server-side)

**Deploy v4.7.6:** Commit `39d8714`. Con este fix, el botón de desconectar funciona correctamente.

---

### ═══════════════════════════════════════════
### FASE 4: Modal de Selección estilo Metricool (v4.7.7)
### Hora: ~03:39 - 03:49 hrs
### ═══════════════════════════════════════════

#### 4.1 — Solicitud del Usuario
El usuario pidió que al seleccionar la página, se mostrara un modal similar al de Metricool, donde se vea claramente la cuenta de Instagram vinculada junto con la página de Facebook, para confirmar que se está conectando la combinación correcta.

#### 4.2 — Modificación de `api/fb-connect.js`
**Cambios (líneas 57-100):**
Para cada página retornada por la Graph API se obtiene:
1. **Instagram Business Account:** Consulta `GET /{page_id}?fields=instagram_business_account{id,username,profile_picture_url,name}`
2. **Foto de perfil de la página FB:** Consulta `GET /{page_id}/picture?redirect=false&type=small`
3. Ambas consultas se ejecutan en paralelo con `Promise.all`

**Nuevo formato de respuesta por página:**
```json
{
    "id": "page_id",
    "name": "Prompt-gallery.app",
    "category": "Artes visuales",
    "access_token": "...",
    "tasks": [...],
    "fb_picture": "https://...",
    "instagram": {
        "id": "ig_id",
        "username": "promptgallery.app",
        "name": "prompt-gallery.app",
        "picture": "https://..."
    }
}
```

#### 4.3 — Reescritura de `renderPageSelectionModal` en `admin.js`
**Nuevo diseño del modal:**

| Elemento | Estilo |
|---|---|
| Foto de perfil IG | Circular, 36px, borde rosa `#E1306C` |
| @username IG | Color rosa, font-weight 600 |
| Nombre IG | Color gris `#888`, tamaño 0.65rem |
| Flecha → | Color gris `#666`, tamaño 1.2rem |
| Foto de página FB | Circular, 36px, borde azul `#1877F2` |
| Nombre de página FB | Color azul, font-weight 600 |
| Categoría | Color gris `#888`, tamaño 0.65rem |
| Botón "Seleccionar" | Azul `#3b82f6`, pointer-events:none |

**Si no hay IG vinculado:**
- Se muestra un ícono 📷 con borde punteado gris
- Texto "Sin IG vinculado" en color `#666` con opacity 0.4

**Interacciones:**
- Hover: borde cambia a dorado, fondo se aclara
- Click: ejecuta `window.selectPage(id, name, token)`
- Ancho del modal: 650px (antes 550px)

#### 4.4 — Fix de Syntax Error
Se detectó un backtick duplicado `` `; `` en la línea 581 causado por la sustitución del template literal. Se removió la línea extra.

#### 4.5 — Resultado Final
✅ El usuario confirmó que el modal se ve correctamente con las 5 cuentas listadas:
1. 📸 @the.new.indie.wave → 📘 The New INDIE WAVE (Grupo de música)
2. 📸 @promptgallery.app → 📘 Prompt-gallery.app (Artes visuales) ← **SELECCIONADA**
3. 📸 @cyra.m1 → 📘 Cyra Modelone (Creador digital)
4. 📸 @rodrigodlmoral → 📘 Rodrigo dl Moral (Blog personal)
5. 📸 @rodrigodlmoralphoto → 📘 RodrigodlMoral Photo (Creador digital)

✅ Conexión exitosa: "✅ Conectado exitosamente a: Prompt-gallery.app"
✅ Estado de IG detectado: "✅ Conectado: @promptgallery.app"

**Deploy v4.7.7:** Commit `d47ba50`. 2 archivos modificados, 81 inserciones, 24 eliminaciones.

---

## 🧪 PRUEBAS REALIZADAS POR EL USUARIO

| Prueba | Resultado |
|---|---|
| Conexión de página FB | ✅ Exitosa |
| Detección de IG vinculado | ✅ Exitosa (@promptgallery.app) |
| Modal estilo Metricool | ✅ Funcional (5 cuentas visibles) |
| Desconexión de página | ✅ Funcional (via server-side endpoint) |
| Reconexión con permisos IG | ✅ Exitosa |
| Publicación en Facebook | ✅ Exitosa |
| **Publicación en Instagram** | ❌ **FALLÓ** (no se publicó la imagen) |

---

## ❌ ERRORES ENCONTRADOS Y CORREGIDOS

| # | Error | Causa | Fix | Versión |
|---|---|---|---|---|
| 1 | `Cannot read properties of undefined (reading 'collection')` | `store.pb` no inicializado en módulo | Cambiar a `pb` importado directamente | v4.7.5 |
| 2 | IG muestra "No vinculada" pese a estar conectada | Token sin permisos `instagram_basic` | Agregar permisos al scope de `FB.login()` | v4.7.5 |
| 3 | `Only superusers can perform this action` al desconectar | RLS de PocketBase bloquea borrado client-side | Crear `api/fb-disconnect.js` (server-side) | v4.7.6 |
| 4 | Syntax error: backtick duplicado | Error de sustitución en template literal | Remover línea extra `` `; `` | v4.7.7 |

---

## ⚠️ PENDIENTES PARA PRÓXIMA SESIÓN

### 🔴 CRÍTICO — Publicación en Instagram no funciona
**Problema:** A pesar de que la conexión con IG se detecta correctamente (`✅ Conectado: @promptgallery.app`), al publicar desde la cola automática, el post SOLO se publica en Facebook. El post de Instagram falla silenciosamente.

**Posibles causas a investigar:**
1. **Logs del servidor:** Revisar los logs de Vercel para errores `[IG_PUBLISH]` en `api/facebook-post.js`
2. **Aspect ratio de imagen:** Instagram requiere imágenes entre 4:5 y 1.91:1. Si la imagen no cumple, el container creation falla.
3. **Permisos del token:** Verificar que el token almacenado en `fb_settings` efectivamente tiene `instagram_content_publish`
4. **Delay insuficiente:** El delay de 3 segundos entre container creation y publish podría ser insuficiente
5. **URL de imagen:** Verificar que la URL de la imagen (Cloudinary) es accesible públicamente para la API de IG
6. **Cuenta de Instagram:** Verificar que la cuenta sea de tipo "Business" o "Creator" (cuentas personales no soportan la API de contenido)

**Archivos relevantes:**
- `api/facebook-post.js` — Líneas 104-165 (flujo de publicación IG)
- `api/ig-detect.js` — Para verificar que la detección funciona

### 🟡 MEJORAS SUGERIDAS (No urgentes)
1. **Comentario automático en IG:** Agregar el prompt completo como primer comentario, en caso de que el caption sea demasiado largo (límite 2200 caracteres)
2. **Retry automático para IG:** Si el primer intento falla, reintentar después de un delay mayor
3. **Estado de IG en la cola:** Mostrar si un item de la cola se publicó en FB pero no en IG
4. **Logs visibles en admin:** Panel de logs en tiempo real para ver el progreso de publicación

---

## 📁 ARCHIVOS CREADOS EN ESTA SESIÓN

| Archivo | Tipo | Descripción |
|---|---|---|
| `api/ig-detect.js` | NUEVO | Endpoint para detectar cuenta IG vinculada a la página FB |
| `api/fb-disconnect.js` | NUEVO | Endpoint server-side para desconectar página FB (bypass RLS) |

## 📁 ARCHIVOS MODIFICADOS EN ESTA SESIÓN

| Archivo | Cambios principales |
|---|---|
| `api/facebook-post.js` | Caption IG con prompt completo, función `detectInstagram()` |
| `api/fb-connect.js` | Detección de IG Business Account y foto de perfil FB por página |
| `src/admin.js` | Tab rename, IG status box, Pause/Stop buttons, Batch selection, Modal Metricool, Server-side disconnect |

---

## 🔢 RESUMEN DE DEPLOYS

| Versión | Commit | Cambios | Hora |
|---|---|---|---|
| v4.7.4 | `46a207d` | UI Enhancements (tab, status, buttons, batch, caption) | ~03:22 |
| v4.7.5 | `182e13c` | Fix: `store.pb` → `pb`, agregar permisos IG al scope | ~03:33 |
| v4.7.6 | `39d8714` | Fix: Server-side disconnect (`api/fb-disconnect.js`) | ~03:38 |
| v4.7.7 | `d47ba50` | Modal Metricool (IG↔FB pairs), fix syntax error | ~03:42 |

---

## 🏗️ ARQUITECTURA ACTUAL DEL FLUJO DE AUTOPOST

```
┌─────────────────────────────────────────────────────┐
│                    ADMIN PANEL                       │
│  Tab: "Autopost"                                     │
│                                                      │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │ Conexión FB      │  │ Conexión IG              │ │
│  │ ✅ Prompt-gallery │  │ ✅ @promptgallery.app    │ │
│  └──────────────────┘  └──────────────────────────┘ │
│                                                      │
│  [▶️ Iniciar] [⏸️ Pausar] [⏹️ Detener]             │
│                                                      │
│  ┌─────────────────┐    ┌─────────────────────────┐ │
│  │ SOURCE (Prompts) │    │ QUEUE (Cola)            │ │
│  │ ☐ Select All     │    │ ☐ Select All            │ │
│  │ ☐ Prompt 1       │    │ ☐ Item 1 [pending]      │ │
│  │ ☐ Prompt 2       │    │ ☐ Item 2 [published]    │ │
│  │ [➕ Añadir sel.]  │    │ [🗑️ Quitar sel.]       │ │
│  └─────────────────┘    └─────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         │                         │
         ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐
│ api/fb-connect   │    │ api/facebook-post     │
│ (Conexión)       │    │ (Publicación)         │
│ + IG detection   │    │ FB → IG (separados)   │
└──────────────────┘    └──────────────────────┘
         │                         │
         ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐
│ api/ig-detect    │    │ api/fb-disconnect     │
│ (Status check)   │    │ (Server-side delete)  │
└──────────────────┘    └──────────────────────┘
```

---

## 📌 NOTAS TÉCNICAS IMPORTANTES

1. **PocketBase v0.23+**: Usa `_superusers` en lugar de `admins` para autenticación
2. **Token de Facebook**: Long-lived (60 días). Se genera intercambiando el short-lived token del SDK
3. **Instagram Content Publishing API**: Proceso de 2 pasos — crear container + publicar container (3s delay)
4. **RLS en `fb_settings`**: Solo superusuarios pueden crear/borrar registros. Todas las operaciones de escritura deben pasar por endpoints del servidor.
5. **Vite Build**: 53 módulos transformados. Deploy via `DEPLOY_TO_VERCEL.bat` (build + git push)

---

> **Fin del historial de sesión**
> **Próxima prioridad:** Debugging de publicación en Instagram
> **Sesión cerrada a las 03:50 hrs CST del 19 de febrero de 2026**
