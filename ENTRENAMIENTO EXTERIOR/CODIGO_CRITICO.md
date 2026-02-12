# 💻 CÓDIGO CRÍTICO - Ejemplos Comentados

Este documento contiene fragmentos de código esenciales con explicaciones detalladas.

---

## 🔧 1. INICIALIZACIÓN DEL STORE

```javascript
// store-final.js
async init() {
    try {
        // Verificar si hay sesión activa en PocketBase
        if (pb.authStore.isValid) {
            const userId = pb.authStore.model?.id;
            
            if (userId) {
                // Cargar perfil completo del usuario
                await this._loadUserProfile(userId);
                
                // Cargar todos los prompts
                await this.loadPrompts();
                
                // Cargar top creators para el dashboard
                await this.getTopCreators();
                
                console.log('✅ Store inicializado con usuario:', this.currentUser.username);
            }
        } else {
            console.log('👤 Modo visitante (sin sesión)');
            // Aún así cargamos prompts públicos
            await this.loadPrompts();
        }
    } catch (error) {
        console.error('❌ Error al inicializar store:', error);
    }
}
```

**Explicación:**
- Se ejecuta al cargar la página
- Verifica si hay un token de sesión válido en localStorage
- Si hay sesión, carga datos del usuario y posts
- Si no hay sesión, solo carga posts públicos

---

## 🎨 2. FUNCIÓN DE RENDERIZADO PRINCIPAL

```javascript
// main.js
const render = () => {
    // ESTRATEGIA NO-DESTRUCTIVA: No reemplazar todo el HTML
    // Solo crear estructura si no existe
    if (!document.getElementById('main-gallery-container')) {
        app.innerHTML = `
            <div id="topbar-mount"></div>
            <div id="header-mount"></div>
            <div id="hero-mount"></div>
            <div id="profile-mount" style="display:none"></div>
            <div id="main-gallery-container"></div>
            <div id="modals-mount"></div>
            <div id="adv-filter-mount"></div>
        `;
        
        // Renderizar modales una sola vez
        const modalsMount = document.getElementById('modals-mount');
        if (modalsMount) modalsMount.innerHTML = Modals();
    }

    // ACTUALIZACIÓN SELECTIVA: Solo actualizar mount points
    const topBarMount = document.getElementById('topbar-mount');
    if (topBarMount) {
        topBarMount.innerHTML = store.currentUser ? TopBar() : '';
    }

    const headerMount = document.getElementById('header-mount');
    if (headerMount) {
        headerMount.innerHTML = Header({ 
            currentUser: store.currentUser, 
            filters, 
            searchQuery 
        });
    }

    const galleryMount = document.getElementById('main-gallery-container');
    if (galleryMount) {
        galleryMount.innerHTML = Gallery({
            prompts: getFilteredPrompts(),
            currentUser: store.currentUser,
            currentView,
            profileUser,
            profileTab,
            filters,
            getModeration,
            topCreatorsList
        });
    }

    // Adjuntar event listeners
    attachEvents();

    // Scroll al inicio (solo si no es render incremental)
    if (!window._isIncrementalRender) {
        window.scrollTo(0, 0);
    }
    window._isIncrementalRender = false;
};
```

**Explicación:**
- Patrón de "mount points" para renderizado eficiente
- No destruye todo el DOM en cada render
- Solo actualiza las secciones que cambiaron
- Preserva estado de inputs y modales abiertos

---

## 🔐 3. SISTEMA DE MODERACIÓN

```javascript
// utils/security.js
export const getModeration = (p) => {
    // 1. Determinar rating efectivo (manejar secuencias)
    let rating = p.rating || 'SFW / Apto';
    if (p.type === 'sequence' && p.content && p.content.length > 0) {
        // En secuencias, usar rating de la primera imagen
        rating = p.content[0].rating || 'SFW / Apto';
    }

    // 2. Obtener configuración del usuario
    // Default: Blur todo para usuarios nuevos/no configurados
    const mod = store.currentUser?.moderation || { 
        suggestive: 'BLUR', 
        nsfw: 'BLUR' 
    };

    let applyBlur = false;
    let warningLabel = '';

    // 3. Aplicar lógica de moderación
    if (rating === 'Sugestivo') {
        if (mod.suggestive === 'BLUR') {
            applyBlur = true;
            warningLabel = 'SUGESTIVO';
        }
    } else if (rating === 'NSFW / +18') {
        if (mod.nsfw === 'BLUR' || mod.nsfw === 'OFF') {
            // Incluso si es OFF, si pasó el filtro, lo blureamos
            applyBlur = true;
            warningLabel = 'NSFW';
        }
    }

    return { applyBlur, warningLabel };
};
```

**Explicación:**
- Función pura que determina si aplicar blur
- Respeta la configuración del usuario
- Maneja casos especiales (secuencias)
- Retorna objeto con flag y label para UI

---

## 💰 4. TRANSACCIÓN DE COPIA DE PROMPT

```javascript
// store-final.js
async copyPrompt(id) {
    if (!this.currentUser) {
        return { success: false, msg: 'Debes iniciar sesión' };
    }

    const prompt = this.prompts.find(p => String(p.id) === String(id));
    if (!prompt) {
        return { success: false, msg: 'Prompt no encontrado' };
    }

    const COST = 10;

    // VALIDACIONES
    if (this.currentUser.tokens < COST) {
        return { success: false, msg: 'Saldo insuficiente. Necesitas 10 PromptBits.' };
    }

    if (prompt.author === this.currentUser.username) {
        return { success: false, msg: 'No puedes copiar tus propios prompts' };
    }

    const copiedBy = prompt.copiedBy || [];
    if (copiedBy.includes(this.currentUser.username)) {
        return { success: false, msg: 'Ya copiaste este prompt' };
    }

    try {
        // TRANSACCIÓN ATÓMICA CON BATCH
        const author = await pb.collection('users').getOne(prompt.author_id);
        
        const batch = pb.createBatch();
        
        // Descontar tokens del usuario
        batch.collection('users').update(this.currentUser.id, { 
            tokens: this.currentUser.tokens - COST 
        });
        
        // Añadir tokens al autor
        batch.collection('users').update(prompt.author_id, { 
            tokens: (author.tokens || 0) + COST 
        });
        
        // Actualizar contador de copias y lista
        batch.collection('prompts').update(id, { 
            copy_count: (prompt.copy_count || 0) + 1,
            copiedBy: [...copiedBy, this.currentUser.username]
        });
        
        // Ejecutar todas las operaciones juntas
        await batch.send();

        // ACTUALIZAR ESTADO LOCAL
        this.currentUser.tokens -= COST;
        prompt.copy_count = (prompt.copy_count || 0) + 1;
        prompt.copiedBy = [...copiedBy, this.currentUser.username];

        // COPIAR AL PORTAPAPELES
        const textToCopy = `${prompt.prompt}\n\nNegative: ${prompt.negative_prompt || 'N/A'}`;
        await navigator.clipboard.writeText(textToCopy);

        // REGISTRAR ACTIVIDAD
        this.logActivity('copy_prompt', { 
            postId: id, 
            postTitle: prompt.title 
        });

        return { success: true };
    } catch (error) {
        console.error('Error al copiar prompt:', error);
        return { success: false, msg: 'Error al procesar la copia' };
    }
}
```

**Explicación:**
- Validaciones exhaustivas antes de la transacción
- Uso de `batch` para operaciones atómicas (todo o nada)
- Actualización del estado local para UI inmediata
- Copia al portapapeles del sistema
- Registro de actividad para historial

---

## 🎯 5. CÁLCULO DE NIVEL

```javascript
// store-final.js
export const LEVEL_REQS = {
    0: { xp: 0, name: 'Explorador', color: '#888' },
    1: { xp: 0, name: 'Novato', color: '#4ade80' },
    2: { xp: 100, name: 'Principiante', color: '#60a5fa' },
    3: { xp: 500, name: 'Creador', color: '#a78bfa' },
    4: { xp: 1500, name: 'Artista', color: '#f472b6' },
    5: { xp: 5000, name: 'Maestro', color: '#fb923c' },
    6: { xp: 15000, name: 'Leyenda', color: '#fbbf24' },
    7: { xp: 50000, name: 'Titán', color: '#ef4444' }
};

getUserLevel(xp) {
    let level = 0;
    
    // Iterar de mayor a menor para encontrar el nivel más alto alcanzado
    for (let i = 7; i >= 0; i--) {
        if (xp >= LEVEL_REQS[i].xp) {
            level = i;
            break;
        }
    }
    
    return level;
}

// Uso:
const currentLevel = store.getUserLevel(store.currentUser.xp);
const levelInfo = LEVEL_REQS[currentLevel];
console.log(`Eres ${levelInfo.name} (Nivel ${currentLevel})`);
```

**Explicación:**
- Tabla de requisitos de XP por nivel
- Algoritmo simple de búsqueda descendente
- Retorna el nivel más alto alcanzado
- Permite obtener nombre y color del nivel

---

## 🔍 6. FILTRADO DE POSTS

```javascript
// utils/gallery-filter.js
export const filterPrompts = ({ 
    prompts, 
    currentUser, 
    currentView, 
    profileUser, 
    profileTab, 
    filters, 
    searchQuery 
}) => {
    let filtered = [...prompts];

    // 1. FILTRO DE MODERACIÓN (según configuración del usuario)
    if (currentUser) {
        const mod = currentUser.moderation || { suggestive: 'BLUR', nsfw: 'BLUR' };
        
        filtered = filtered.filter(p => {
            const rating = p.rating || 'SFW / Apto';
            
            // Si NSFW está en OFF, no mostrar
            if (rating === 'NSFW / +18' && mod.nsfw === 'OFF') {
                return false;
            }
            
            return true;
        });
    }

    // 2. FILTRO DE FUENTE (Community vs Following)
    if (filters.source === 'following' && currentUser) {
        filtered = filtered.filter(p => 
            currentUser.following?.includes(p.author_id)
        );
    }

    // 3. BÚSQUEDA DE TEXTO
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        
        filtered = filtered.filter(p => {
            // Buscar en título
            if (p.title?.toLowerCase().includes(query)) return true;
            
            // Buscar en prompt
            if (p.prompt?.toLowerCase().includes(query)) return true;
            
            // Buscar en etiquetas
            if (p.tags?.some(tag => tag.toLowerCase().includes(query))) return true;
            
            // Buscar en nombre de autor
            if (p.author?.toLowerCase().includes(query)) return true;
            
            return false;
        });
    }

    // 4. FILTROS AVANZADOS
    if (filters.tools && filters.tools.length > 0) {
        filtered = filtered.filter(p => 
            filters.tools.includes(p.tool)
        );
    }

    if (filters.ratings && filters.ratings.length > 0) {
        filtered = filtered.filter(p => 
            filters.ratings.includes(p.rating)
        );
    }

    // 5. ORDENAMIENTO
    if (filters.sort === 'newest') {
        filtered.sort((a, b) => 
            new Date(b.created) - new Date(a.created)
        );
    } else if (filters.sort === 'popular') {
        filtered.sort((a, b) => 
            (b.copy_count || 0) - (a.copy_count || 0)
        );
    }

    return filtered;
};
```

**Explicación:**
- Filtros se aplican en cascada (AND lógico)
- Cada filtro reduce el conjunto de resultados
- Búsqueda de texto es inclusiva (OR entre campos)
- Ordenamiento se aplica al final

---

## 🖼️ 7. COMPRESIÓN Y UPLOAD DE IMÁGENES

```javascript
// uploadService.js
export const uploadToCloudinary = async (file) => {
    // 1. COMPRIMIR IMAGEN
    const compressed = await compressImage(file);
    
    // 2. PREPARAR FORMDATA
    const formData = new FormData();
    formData.append('file', compressed);
    formData.append('upload_preset', 'prompt_gallery_preset');
    formData.append('folder', 'prompt-gallery');
    
    // 3. UPLOAD A CLOUDINARY
    const response = await fetch(
        'https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload',
        {
            method: 'POST',
            body: formData
        }
    );
    
    const data = await response.json();
    
    // 4. RETORNAR URL PÚBLICA
    return data.secure_url;
};

const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Redimensionar si es muy grande
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1920;
                
                if (width > MAX_SIZE || height > MAX_SIZE) {
                    if (width > height) {
                        height = (height / width) * MAX_SIZE;
                        width = MAX_SIZE;
                    } else {
                        width = (width / height) * MAX_SIZE;
                        height = MAX_SIZE;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Dibujar imagen redimensionada
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convertir a WebP con calidad 85%
                canvas.toBlob((blob) => {
                    resolve(new File([blob], 'compressed.webp', { 
                        type: 'image/webp' 
                    }));
                }, 'image/webp', 0.85);
            };
            
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    });
};
```

**Explicación:**
- Compresión en cliente para reducir ancho de banda
- Redimensionamiento automático si excede 1920px
- Conversión a WebP para mejor compresión
- Upload a Cloudinary para CDN global

---

## 🎭 8. SISTEMA DE REACCIONES

```javascript
// store-final.js
async toggleReaction(postId, type) {
    if (!this.currentUser) return { success: false };
    
    const prompt = this.prompts.find(p => String(p.id) === String(postId));
    if (!prompt) return { success: false };

    const username = this.currentUser.username;
    let reactions = { ...(prompt.reactions || {}) };

    // Inicializar contadores si no existen
    ['like', 'love', 'fire', 'funny', 'dislike', 'sad'].forEach(k => {
        if (typeof reactions[k] !== 'number') reactions[k] = 0;
    });

    let uMap = reactions._u || {}; // Mapa de usuarios
    const oldReaction = uMap[username];

    // ACTUALIZACIÓN OPTIMISTA (LOCAL)
    if (oldReaction === type) {
        // Quitar reacción
        reactions[type] = Math.max(0, reactions[type] - 1);
        delete uMap[username];
    } else {
        // Cambiar/añadir reacción
        if (oldReaction) {
            reactions[oldReaction] = Math.max(0, reactions[oldReaction] - 1);
        }
        reactions[type] = (reactions[type] || 0) + 1;
        uMap[username] = type;
    }
    reactions._u = uMap;

    // Sync local inmediato (UI)
    prompt.reactions = reactions;
    prompt.userReactions = uMap;
    if (window.render) window.render();

    // SINCRONIZACIÓN CON BACKEND
    try {
        await pb.collection('prompts').update(postId, { 
            reactions: reactions 
        });
        
        this.logActivity(type, { postTitle: prompt.title || 'Post' });
        
        return { success: true };
    } catch (error) {
        console.error('Error al sincronizar reacción:', error);
        // Podríamos revertir el cambio optimista aquí
        return { success: false };
    }
}
```

**Explicación:**
- Actualización optimista para UI instantánea
- Estructura de datos eficiente (contadores + mapa)
- Manejo de casos edge (cambiar reacción, quitar reacción)
- Sincronización asíncrona con backend

---

**Conclusión:** Estos fragmentos de código representan los patrones y técnicas más importantes usados en Prompt Gallery. Estudiarlos permitirá a una IA externa comprender la implementación técnica del proyecto.
