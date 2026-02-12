# 🧠 STORE API - Referencia Completa

Este documento detalla todas las funciones disponibles en `store-final.js`, el cerebro de la aplicación.

---

## 🔧 MÉTODOS DE INICIALIZACIÓN

### `async init()`
**Descripción:** Inicializa el Store y carga datos iniciales
**Retorna:** `Promise<void>`
**Flujo:**
1. Verifica si hay sesión activa en PocketBase
2. Si hay sesión, carga datos del usuario con `_loadUserProfile()`
3. Carga todos los prompts con `loadPrompts()`
4. Carga top creators con `getTopCreators()`

```javascript
await store.init();
```

---

### `async _loadUserProfile(userId)`
**Descripción:** Carga el perfil completo del usuario
**Parámetros:**
- `userId` (string): ID del usuario en PocketBase
**Retorna:** `Promise<void>`
**Efectos:**
- Actualiza `store.currentUser` con los datos del usuario
- Normaliza el avatar usando `normalizeProfile()`

---

## 🔐 MÉTODOS DE AUTENTICACIÓN

### `async login(identifier, password)`
**Descripción:** Inicia sesión con email/username y contraseña
**Parámetros:**
- `identifier` (string): Email o username
- `password` (string): Contraseña
**Retorna:** `Promise<{ success: boolean, msg?: string }>`

```javascript
const result = await store.login('user@example.com', 'password123');
if (result.success) {
    // Login exitoso, store.currentUser está disponible
}
```

---

### `async register(email, username, password)`
**Descripción:** Crea una nueva cuenta de usuario
**Parámetros:**
- `email` (string): Email del usuario
- `username` (string): Nombre de usuario
- `password` (string): Contraseña
**Retorna:** `Promise<{ success: boolean, msg?: string }>`
**Efectos:**
- Crea usuario en PocketBase con valores iniciales:
  - `tokens: 100`
  - `level: 0`
  - `xp: 0`
  - `moderation: { suggestive: 'BLUR', nsfw: 'BLUR' }`
- Envía email de verificación
- Auto-sigue al admin

```javascript
const result = await store.register('user@example.com', 'username', 'password123');
```

---

### `logout()`
**Descripción:** Cierra sesión y recarga la página
**Retorna:** `void`

```javascript
store.logout();
```

---

### `async recoverPassword(email)`
**Descripción:** Envía email de recuperación de contraseña
**Parámetros:**
- `email` (string): Email del usuario
**Retorna:** `Promise<{ success: boolean, msg: string }>`

---

### `async confirmResetPassword(token, newPassword, userOrEmail)`
**Descripción:** Confirma el reset de contraseña con el token del email
**Parámetros:**
- `token` (string): Token de verificación
- `newPassword` (string): Nueva contraseña
- `userOrEmail` (string): Username o email
**Retorna:** `Promise<{ success: boolean, msg?: string }>`

---

## 📝 MÉTODOS DE POSTS

### `async loadPrompts()`
**Descripción:** Carga todos los prompts de la base de datos
**Retorna:** `Promise<void>`
**Efectos:**
- Actualiza `store.prompts` con todos los posts
- Normaliza los datos de autor
- Ordena por fecha de creación (más recientes primero)

```javascript
await store.loadPrompts();
const allPosts = store.prompts;
```

---

### `async createPrompt(data)`
**Descripción:** Crea un nuevo post
**Parámetros:**
- `data` (object):
  - `type`: 'simple' | 'sequence'
  - `title`: string
  - `prompt`: string
  - `negative_prompt`: string
  - `image`: string (URL o data URL)
  - `tool`: string
  - `rating`: string
  - `isPrivate`: boolean
  - `needsReference`: boolean
  - `tags`: string[]
  - `content`: array (solo para secuencias)
**Retorna:** `Promise<{ success: boolean, msg?: string }>`
**Validaciones:**
- Usuario debe estar autenticado
- Nivel mínimo 1 para posts simples
- Nivel mínimo 3 para secuencias
- Máximo 10 etiquetas
**Efectos:**
- Comprime y sube imagen(es) a Cloudinary
- Crea registro en PocketBase
- Incrementa contador de posts del usuario
- Añade 50 XP al usuario
- Recarga prompts

```javascript
const result = await store.createPrompt({
    type: 'simple',
    title: 'Mi Prompt',
    prompt: 'a beautiful landscape...',
    negative_prompt: 'blurry...',
    image: 'data:image/png;base64,...',
    tool: 'Midjourney',
    rating: 'SFW / Apto',
    isPrivate: false,
    needsReference: false,
    tags: ['landscape', 'nature']
});
```

---

### `async updatePrompt(id, data)`
**Descripción:** Actualiza un post existente
**Parámetros:**
- `id` (string): ID del post
- `data` (object): Mismos campos que `createPrompt`
**Retorna:** `Promise<{ success: boolean, msg?: string }>`
**Validaciones:**
- Solo el autor puede editar
- Verifica propiedad del post

---

### `async removePrompt(id)`
**Descripción:** Elimina un post
**Parámetros:**
- `id` (string): ID del post
**Retorna:** `Promise<{ success: boolean, msg?: string }>`
**Efectos:**
- Elimina post de PocketBase
- Decrementa contador de posts del usuario
- Actualiza `store.prompts`

---

### `async copyPrompt(id)`
**Descripción:** Copia el prompt de otro usuario
**Parámetros:**
- `id` (string): ID del post
**Retorna:** `Promise<{ success: boolean, msg?: string }>`
**Validaciones:**
- Usuario debe tener al menos 10 PromptBits
- No puede copiar el mismo prompt dos veces
- No puede copiar sus propios prompts
**Efectos:**
- Descuenta 10 PB del usuario
- Añade 10 PB al autor del post
- Incrementa `copy_count` del post
- Añade username a `copiedBy` array
- Copia el texto al portapapeles
- Añade 10 XP al autor

```javascript
const result = await store.copyPrompt('post123');
if (result.success) {
    // Prompt copiado al portapapeles
}
```

---

## 💬 MÉTODOS DE INTERACCIÓN

### `async toggleReaction(postId, type)`
**Descripción:** Añade/quita una reacción a un post
**Parámetros:**
- `postId` (string): ID del post
- `type` (string): 'like' | 'love' | 'fire' | 'funny' | 'dislike' | 'sad'
**Retorna:** `Promise<{ success: boolean }>`
**Lógica:**
- Si el usuario ya dio esa reacción, la quita
- Si el usuario dio otra reacción, la reemplaza
- Actualiza contadores y mapa de usuarios

```javascript
await store.toggleReaction('post123', 'like');
```

---

### `async addComment(postId, text)`
**Descripción:** Añade un comentario a un post
**Parámetros:**
- `postId` (string): ID del post
- `text` (string): Texto del comentario
**Retorna:** `Promise<{ success: boolean }>`
**Efectos:**
- Añade comentario con timestamp
- Incluye avatar y username del autor

---

### `async toggleSave(id)`
**Descripción:** Guarda/desguarda un post
**Parámetros:**
- `id` (string): ID del post
**Retorna:** `Promise<void>`
**Efectos:**
- Añade/quita username del array `saved_by` del post

---

## 👥 MÉTODOS SOCIALES

### `async followUser(targetUsername)`
**Descripción:** Sigue/deja de seguir a un usuario
**Parámetros:**
- `targetUsername` (string): Username del usuario a seguir
**Retorna:** `Promise<{ success: boolean }>`
**Efectos:**
- Actualiza array `following` del usuario actual
- Actualiza array `followers` del usuario objetivo
- Usa batch para actualizar ambos registros atómicamente

```javascript
await store.followUser('rodrigodlmoral');
```

---

### `async getTopCreators()`
**Descripción:** Obtiene los top 10 creadores
**Retorna:** `Promise<Array>`
**Criterios:**
- Ordenados por `prompts_count` (descendente)
- Solo usuarios con al menos 1 post
- Normaliza perfiles con avatares completos

---

## 💰 MÉTODOS DE ECONOMÍA

### `async sendTip(postId, amount, recipientId)`
**Descripción:** Envía una propina en PromptBits
**Parámetros:**
- `postId` (string): ID del post (opcional)
- `amount` (number): Cantidad de PromptBits
- `recipientId` (string): ID del destinatario (opcional)
**Retorna:** `Promise<{ success: boolean, msg?: string }>`
**Validaciones:**
- Usuario debe tener saldo suficiente
**Efectos:**
- Descuenta tokens del remitente
- Añade tokens al destinatario
- Registra en activity logs

---

### `async boostPost(postId)`
**Descripción:** Destaca un post por 7 días
**Parámetros:**
- `postId` (string): ID del post
**Retorna:** `Promise<{ success: boolean, msg?: string }>`
**Costo:** 50 PromptBits
**Efectos:**
- Marca post como `is_featured: true`
- Establece `featured_until` a 7 días en el futuro

---

## ⚙️ MÉTODOS DE CONFIGURACIÓN

### `async updateUserSettings(data)`
**Descripción:** Actualiza configuración del usuario
**Parámetros:**
- `data` (object):
  - `username`: string
  - `avatar`: string (data URL)
  - `socials`: object
  - `moderation`: object
**Retorna:** `Promise<{ success: boolean, msg?: string }>`
**Efectos:**
- Actualiza registro en PocketBase
- Actualiza `store.currentUser`

```javascript
await store.updateUserSettings({
    username: 'newusername',
    socials: { ig: '@myinstagram' },
    moderation: { suggestive: 'ON', nsfw: 'BLUR' }
});
```

---

### `async changePassword(oldPass, newPass)`
**Descripción:** Cambia la contraseña del usuario
**Parámetros:**
- `oldPass` (string): Contraseña actual
- `newPass` (string): Nueva contraseña
**Retorna:** `Promise<{ success: boolean, msg: string }>`

---

### `async deleteAccount()`
**Descripción:** Elimina la cuenta del usuario
**Retorna:** `Promise<{ success: boolean }>`
**Efectos:**
- Elimina usuario de PocketBase
- Cierra sesión
- Recarga página

---

## 👑 MÉTODOS DE ADMINISTRACIÓN

### `async adminLoadAllUsers()`
**Descripción:** Carga todos los usuarios (solo admin)
**Retorna:** `Promise<Array>`
**Restricción:** Solo usuarios con rol 'admin' o usernames específicos

---

### `async adminUpdateUser(userId, data)`
**Descripción:** Actualiza datos de un usuario (solo admin)
**Parámetros:**
- `userId` (string): ID del usuario
- `data` (object):
  - `level`: number
  - `badges`: array
  - `role`: string
**Retorna:** `Promise<{ success: boolean, msg?: string }>`

---

### `async adminDeleteUser(userId)`
**Descripción:** Elimina un usuario (solo admin)
**Parámetros:**
- `userId` (string): ID del usuario
**Retorna:** `Promise<{ success: boolean, msg?: string }>`

---

### `async giftTokens(userId, amount)`
**Descripción:** Regala PromptBits a un usuario (solo admin)
**Parámetros:**
- `userId` (string): ID del usuario
- `amount` (number): Cantidad de tokens
**Retorna:** `Promise<{ success: boolean, msg?: string }>`

---

### `async adminUpdatePrompt(id, data)`
**Descripción:** Actualiza cualquier post (solo admin)
**Parámetros:**
- `id` (string): ID del post
- `data` (object): Datos a actualizar
**Retorna:** `Promise<{ success: boolean, msg?: string }>`

---

## 📊 MÉTODOS DE CÁLCULO

### `getUserLevel(xp)`
**Descripción:** Calcula el nivel basado en XP
**Parámetros:**
- `xp` (number): Puntos de experiencia
**Retorna:** `number` (0-7)

```javascript
const level = store.getUserLevel(1200); // Retorna 3
```

---

### `getModeration(post, forcedRating)`
**Descripción:** Determina si un post debe mostrarse con blur
**Parámetros:**
- `post` (object): Post a evaluar
- `forcedRating` (string, opcional): Rating forzado
**Retorna:** `{ applyBlur: boolean, warningLabel: string }`

```javascript
const { applyBlur, warningLabel } = store.getModeration(post);
if (applyBlur) {
    // Aplicar clase CSS de blur
}
```

---

## 🔍 MÉTODOS DE BÚSQUEDA

### `getAllUsers()`
**Descripción:** Obtiene todos los usuarios cargados
**Retorna:** `Array`
**Nota:** Solo disponible si se llamó `adminLoadAllUsers()` previamente

---

## 📈 MÉTODOS DE ACTIVIDAD

### `logActivity(action, details)`
**Descripción:** Registra una acción del usuario
**Parámetros:**
- `action` (string): Tipo de acción
- `details` (object): Detalles adicionales
**Retorna:** `void`
**Efectos:**
- Crea registro en collection 'activity_logs'

---

## 🎯 PROPIEDADES DEL STORE

### `store.currentUser`
**Tipo:** `object | null`
**Descripción:** Usuario actualmente autenticado
**Estructura:**
```javascript
{
    id: string,
    username: string,
    email: string,
    level: number,
    xp: number,
    tokens: number,
    avatar: string,
    avatar_url: string,
    moderation: {
        suggestive: 'ON' | 'BLUR',
        nsfw: 'ON' | 'BLUR' | 'OFF'
    },
    socials: {
        ig: string,
        fb: string,
        x: string,
        tg: string,
        th: string,
        fv: string
    },
    following: string[],
    followers: string[],
    prompts_count: number,
    total_copies: number
}
```

---

### `store.prompts`
**Tipo:** `Array`
**Descripción:** Todos los posts cargados
**Estructura de cada elemento:** Ver sección "Estructura de Datos" en LOGICA_NEGOCIO.md

---

### `store.users`
**Tipo:** `Array`
**Descripción:** Usuarios cargados (solo para admin)

---

## 🔄 CONSTANTES EXPORTADAS

### `TOOLS`
**Tipo:** `Array<string>`
**Descripción:** Lista de herramientas disponibles
```javascript
['Midjourney', 'DALL-E 3', 'Stable Diffusion', 'Leonardo AI', ...]
```

---

### `RATINGS`
**Tipo:** `Array<string>`
**Descripción:** Opciones de rating
```javascript
['SFW / Apto', 'Sugestivo', 'NSFW / +18']
```

---

### `LEVEL_REQS`
**Tipo:** `Object`
**Descripción:** Requisitos de XP por nivel
```javascript
{
    0: { xp: 0, name: 'Explorador', color: '#888' },
    1: { xp: 0, name: 'Novato', color: '#4ade80' },
    // ...
}
```

---

**Conclusión:** El Store es el único punto de acceso a los datos y la lógica de negocio. Todos los componentes deben interactuar con el Store en lugar de llamar directamente a PocketBase.
