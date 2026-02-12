# 🏗️ ARQUITECTURA TÉCNICA - Prompt Gallery

## 🎯 Patrón Arquitectónico: MPA (Multi-Page Application) Modular

Prompt Gallery utiliza una arquitectura **MPA con componentes modulares**, similar a un framework moderno pero usando Vanilla JavaScript.

---

## 📊 DIAGRAMA DE CAPAS

```
┌─────────────────────────────────────────────┐
│           CAPA DE PRESENTACIÓN              │
│  (main.js, profile.js, components/)         │
│  - Renderiza UI                             │
│  - Maneja eventos del usuario               │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           CAPA DE LÓGICA                    │
│  (store-final.js)                           │
│  - Estado global                            │
│  - Reglas de negocio                        │
│  - Comunicación con backend                 │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           CAPA DE DATOS                     │
│  (PocketBase, Cloudinary)                   │
│  - Persistencia                             │
│  - Autenticación                            │
│  - Almacenamiento de archivos               │
└─────────────────────────────────────────────┘
```

---

## 🧩 COMPONENTES PRINCIPALES

### 1. Store (store-final.js)
**Responsabilidad:** Cerebro de la aplicación
- Mantiene el estado global (`currentUser`, `prompts`, `users`)
- Expone métodos para todas las operaciones CRUD
- Se comunica con PocketBase
- Calcula niveles, XP, moderación

**Patrón:** Singleton (una sola instancia global)

```javascript
// Ejemplo de uso
await store.init();
const user = store.currentUser;
await store.createPrompt(data);
```

### 2. Main.js (Orquestador del Dashboard)
**Responsabilidad:** Punto de entrada de la aplicación
- Importa todos los componentes
- Define la función `render()` que actualiza la UI
- Maneja el estado de la vista (`currentView`, `filters`, `searchQuery`)
- Adjunta event listeners

**Flujo de ejecución:**
1. Importa dependencias
2. Inicializa el Store
3. Llama a `render()` para pintar la UI
4. Escucha eventos del usuario

### 3. Componentes UI (components/)
**Responsabilidad:** Piezas visuales reutilizables
- Son funciones puras que retornan HTML (strings)
- Reciben datos como parámetros
- No mantienen estado propio

**Ejemplo:**
```javascript
export const TopCreators = (details, currentUser) => {
    if (!currentUser) return '';
    return `<div class="top-creators">...</div>`;
};
```

---

## 🔄 CICLO DE VIDA DE LA APLICACIÓN

### Inicialización
1. `main.js` se ejecuta
2. Se llama a `store.init()`
3. Store verifica si hay sesión activa en PocketBase
4. Si hay sesión, carga datos del usuario y prompts
5. Se llama a `render()` para mostrar la UI

### Renderizado
1. `render()` actualiza los "mount points" del DOM
2. Cada componente se renderiza con datos frescos del Store
3. Se adjuntan event listeners con `attachEvents()`

### Interacción del Usuario
1. Usuario hace clic en un botón (ej: "Copiar Prompt")
2. Se llama a una función global (ej: `window.doCopy(id)`)
3. La función llama a un método del Store (ej: `store.copyPrompt(id)`)
4. Store actualiza PocketBase
5. Store actualiza su estado local
6. Se llama a `render()` para reflejar los cambios

---

## 🗂️ GESTIÓN DE ESTADO

### Estado Global (en Store)
```javascript
{
    currentUser: {
        id: "abc123",
        username: "rodrigodlmoral",
        level: 5,
        xp: 8000,
        tokens: 250,
        moderation: { suggestive: 'ON', nsfw: 'BLUR' }
    },
    prompts: [...], // Array de todos los posts
    users: [...]    // Array de usuarios (solo para admin)
}
```

### Estado Local (en main.js)
```javascript
{
    currentView: 'home' | 'profile',
    profileUser: null | username,
    profileTab: 'creations' | 'saved' | 'activity',
    searchQuery: '',
    filters: {
        source: 'community' | 'following',
        sort: 'newest' | 'popular' | 'trending',
        time: 'all' | 'today' | 'week' | 'month',
        tools: [],
        ratings: [],
        categories: [],
        tags: []
    }
}
```

---

## 🔐 SEGURIDAD Y MODERACIÓN

### Escape de HTML
Todas las entradas del usuario se escapan con `escapeHTML()` antes de renderizarse para prevenir XSS.

### Moderación de Contenido
La función `getModeration(post)` determina si un post debe mostrarse con blur:

```javascript
// En utils/security.js
export const getModeration = (p) => {
    const mod = store.currentUser?.moderation || { suggestive: 'BLUR', nsfw: 'BLUR' };
    let applyBlur = false;
    let warningLabel = '';
    
    if (p.rating === 'Sugestivo' && mod.suggestive === 'BLUR') {
        applyBlur = true;
        warningLabel = 'SUGESTIVO';
    }
    // ... lógica para NSFW
    
    return { applyBlur, warningLabel };
};
```

---

## 📡 COMUNICACIÓN CON BACKEND

### PocketBase SDK
```javascript
import { pb } from './pocketbase.js';

// Autenticación
await pb.collection('users').authWithPassword(email, password);

// CRUD
await pb.collection('prompts').create(data);
await pb.collection('prompts').getList(page, perPage, options);
await pb.collection('prompts').update(id, data);
await pb.collection('prompts').delete(id);

// Archivos
const url = pb.files.getUrl(record, filename);
```

### Cloudinary Upload
```javascript
import { uploadToCloudinary } from './uploadService.js';

// Comprime y sube imagen
const url = await uploadToCloudinary(file);
```

---

## 🎨 RENDERIZADO DE COMPONENTES

### Patrón de Mount Points
El HTML base tiene "puntos de montaje" donde se inyectan componentes:

```html
<div id="topbar-mount"></div>
<div id="header-mount"></div>
<div id="hero-mount"></div>
<div id="main-gallery-container"></div>
<div id="modals-mount"></div>
```

En `render()`:
```javascript
const topBarMount = document.getElementById('topbar-mount');
if (topBarMount) topBarMount.innerHTML = TopBar();
```

---

## 🚀 OPTIMIZACIONES

### Renderizado No Destructivo
`render()` solo actualiza los mount points, no reemplaza todo el `<body>`, evitando perder el estado de inputs y modales abiertos.

### Event Delegation
Los clicks en posts se manejan con un listener global en lugar de adjuntar listeners individuales:

```javascript
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-post-id]');
    if (target) {
        window.openDetail(target.getAttribute('data-post-id'));
    }
});
```

---

## 📦 MÓDULOS Y DEPENDENCIAS

### Dependencias de Producción
- `pocketbase` - SDK oficial de PocketBase
- `vite` - Build tool

### Imports Clave
```javascript
// En main.js
import { store } from './store-final.js';
import { Gallery } from './components/Gallery.js';
import { getModeration } from './utils/security.js';
import { toast } from './utils/ui-helpers.js';
```

---

**Conclusión:** La arquitectura modular permite que cada pieza del sistema sea independiente y testeable, facilitando el mantenimiento y la escalabilidad del proyecto.
