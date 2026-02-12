# 💼 LÓGICA DE NEGOCIO - Prompt Gallery

Este documento detalla todas las reglas de negocio, cálculos y restricciones del sistema.

---

## 💎 SISTEMA DE PROMPTBITS (Moneda Virtual)

### Reglas Básicas
- **Saldo Inicial:** 100 PromptBits al registrarse
- **Costo de Copia:** 10 PromptBits por prompt
- **Ganancia por Copia:** El autor recibe 10 PromptBits cuando alguien copia su prompt
- **Límite de Copias:** Un usuario solo puede copiar el mismo prompt una vez

### Flujo de Transacción
```javascript
// En store-final.js
async copyPrompt(id) {
    const prompt = this.prompts.find(p => p.id === id);
    const COST = 10;
    
    // Validaciones
    if (this.currentUser.tokens < COST) {
        return { success: false, msg: 'Saldo insuficiente' };
    }
    
    if (prompt.copiedBy?.includes(this.currentUser.username)) {
        return { success: false, msg: 'Ya copiaste este prompt' };
    }
    
    // Transacción
    const batch = pb.createBatch();
    batch.collection('users').update(this.currentUser.id, { 
        tokens: this.currentUser.tokens - COST 
    });
    batch.collection('users').update(prompt.author_id, { 
        tokens: authorTokens + COST 
    });
    batch.collection('prompts').update(id, { 
        copy_count: (prompt.copy_count || 0) + 1,
        copiedBy: [...copiedBy, this.currentUser.username]
    });
    await batch.send();
}
```

---

## 📊 SISTEMA DE EXPERIENCIA Y NIVELES

### Tabla de Niveles
```javascript
// En store-final.js
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
```

### Cálculo de Nivel
```javascript
getUserLevel(xp) {
    let level = 0;
    for (let i = 7; i >= 0; i--) {
        if (xp >= LEVEL_REQS[i].xp) {
            level = i;
            break;
        }
    }
    return level;
}
```

### Ganancia de XP
- **Crear un post:** +50 XP
- **Recibir una copia:** +10 XP
- **Recibir una reacción:** +2 XP

### Restricciones por Nivel
| Nivel | Restricción |
|-------|-------------|
| 0 | Solo puede ver contenido, no puede crear posts |
| 1 | Puede crear posts simples |
| 2 | Puede cambiar avatar y añadir redes sociales |
| 3 | Puede crear secuencias (múltiples imágenes) |
| 4+ | Acceso a herramientas premium en filtros |

---

## 🔞 SISTEMA DE MODERACIÓN

### Categorías de Contenido
1. **SFW / Apto:** Contenido seguro para todos
2. **Sugestivo:** Contenido insinuante pero no explícito
3. **NSFW / +18:** Contenido adulto explícito

### Configuración del Usuario
Cada usuario puede configurar cómo ver cada categoría:

**Para Sugestivo:**
- `ON` - Mostrar sin blur
- `BLUR` - Mostrar con blur (requiere click para revelar)

**Para NSFW:**
- `ON` - Mostrar sin blur
- `BLUR` - Mostrar con blur
- `OFF` - No mostrar en absoluto (filtrado)

### Valores por Defecto (Nuevos Usuarios)
```javascript
moderation: {
    suggestive: 'BLUR',
    nsfw: 'BLUR'
}
```

### Lógica de Filtrado
```javascript
// En utils/gallery-filter.js
const filterByModeration = (prompts, moderation) => {
    return prompts.filter(p => {
        const rating = p.rating || 'SFW / Apto';
        
        // Si es NSFW y el usuario tiene OFF, no mostrarlo
        if (rating === 'NSFW / +18' && moderation.nsfw === 'OFF') {
            return false;
        }
        
        return true; // Mostrar (con o sin blur según getModeration)
    });
};
```

---

## 👥 SISTEMA DE SEGUIMIENTO

### Reglas
- Un usuario puede seguir a otro
- El seguimiento es unidireccional (no es mutuo automáticamente)
- Al seguir, se actualiza el array `following` del usuario y el array `followers` del seguido

### Implementación
```javascript
async followUser(targetUsername) {
    const target = await pb.collection('users').getFirstListItem(
        `username="${targetUsername}"`
    );
    
    const following = [...(this.currentUser.following || [])];
    const followers = [...(target.followers || [])];
    
    const idx = following.indexOf(target.id);
    if (idx > -1) {
        // Unfollow
        following.splice(idx, 1);
        followers.splice(followers.indexOf(this.currentUser.id), 1);
    } else {
        // Follow
        following.push(target.id);
        followers.push(this.currentUser.id);
    }
    
    const batch = pb.createBatch();
    batch.collection('users').update(this.currentUser.id, { following });
    batch.collection('users').update(target.id, { followers });
    await batch.send();
}
```

---

## 🏆 SISTEMA DE TOP CREADORES

### Criterios de Ranking
Los top creadores se ordenan por:
1. **Número de prompts publicados** (descendente)
2. En caso de empate, por **fecha de creación** (más antiguos primero)

### Implementación
```javascript
async getTopCreators() {
    const users = await pb.collection('users').getFullList({
        sort: '-prompts_count,created',
        filter: 'prompts_count > 0',
        fields: 'id,username,name,avatar,avatar_url,level,prompts_count'
    });
    
    return users.slice(0, 10).map(window.normalizeProfile);
}
```

### Normalización de Perfiles
```javascript
window.normalizeProfile = (p) => {
    if (!p) return p;
    const username = p.name || p.username || 'Usuario';
    
    let avatarUrl = p.avatar_url;
    if (!avatarUrl && p.avatar) {
        avatarUrl = pb.files.getUrl(p, p.avatar);
    }
    
    return {
        ...p,
        username,
        avatar: avatarUrl || `https://robohash.org/${encodeURIComponent(username)}?set=set4`
    };
};
```

---

## 📝 SISTEMA DE POSTS

### Tipos de Posts
1. **Simple:** Una imagen + un prompt
2. **Secuencia:** Múltiples imágenes, cada una con su propio prompt

### Estructura de Datos

**Post Simple:**
```javascript
{
    id: "abc123",
    type: "simple",
    title: "Retrato Cyberpunk",
    prompt: "cyberpunk portrait, neon lights...",
    negative_prompt: "blurry, low quality...",
    image: "https://res.cloudinary.com/...",
    tool: "Midjourney",
    rating: "SFW / Apto",
    author: "rodrigodlmoral",
    author_id: "xyz789",
    copy_count: 15,
    copiedBy: ["user1", "user2"],
    reactions: {
        like: 5,
        love: 3,
        fire: 2,
        _u: { user1: 'like', user2: 'love' }
    },
    tags: ["cyberpunk", "portrait", "neon"]
}
```

**Post Secuencia:**
```javascript
{
    id: "def456",
    type: "sequence",
    title: "Evolución de Personaje",
    content: [
        {
            image: "https://...",
            prompt: "young warrior...",
            negative_prompt: "...",
            rating: "SFW / Apto"
        },
        {
            image: "https://...",
            prompt: "battle-hardened veteran...",
            negative_prompt: "...",
            rating: "Sugestivo"
        }
    ],
    // ... resto de campos
}
```

### Validaciones al Crear Post
```javascript
// Nivel mínimo para crear posts
if (!currentUser) {
    return { success: false, msg: 'Debes iniciar sesión' };
}

if (currentUser.level < 1) {
    return { success: false, msg: 'Debes verificar tu email primero' };
}

// Secuencias requieren nivel 3
if (data.type === 'sequence' && currentUser.level < 3) {
    return { success: false, msg: 'Necesitas ser Nivel 3 (Creador) para crear secuencias' };
}

// Máximo 10 etiquetas
if (data.tags && data.tags.length > 10) {
    return { success: false, msg: 'Máximo 10 etiquetas permitidas' };
}
```

---

## 🎯 SISTEMA DE REACCIONES

### Tipos de Reacciones
- `like` 👍
- `love` ❤️
- `fire` 🔥
- `funny` 😂
- `dislike` 👎
- `sad` 😢

### Reglas
- Un usuario solo puede dar una reacción por post
- Si da otra reacción, la anterior se reemplaza
- Si da la misma reacción dos veces, se elimina (toggle)

### Estructura de Datos
```javascript
reactions: {
    like: 5,      // Contadores
    love: 3,
    fire: 2,
    funny: 0,
    dislike: 0,
    sad: 1,
    _u: {         // Mapa de usuarios
        user1: 'like',
        user2: 'love',
        user3: 'fire'
    }
}
```

---

## 🔍 SISTEMA DE BÚSQUEDA Y FILTROS

### Búsqueda por Texto
Busca en:
- Título del post
- Prompt
- Etiquetas (con soporte de alias)
- Nombre de usuario del autor

### Filtros Disponibles
- **Fuente:** Community / Following
- **Ordenar:** Newest / Popular / Trending
- **Tiempo:** All / Today / Week / Month
- **Herramientas:** Midjourney, DALL-E, Stable Diffusion, etc.
- **Rating:** SFW, Sugestivo, NSFW
- **Referencia:** All / With Reference / No Reference
- **Categorías:** Personajes, Paisajes, Objetos, etc.
- **Etiquetas:** Búsqueda específica por tags

### Lógica de Filtrado
Los filtros se aplican en cascada (AND lógico):
1. Filtro de moderación (según configuración del usuario)
2. Filtro de fuente (community vs following)
3. Búsqueda de texto
4. Filtros avanzados (herramientas, ratings, etc.)
5. Ordenamiento
6. Filtro de tiempo

---

**Conclusión:** Todas estas reglas están implementadas principalmente en `store-final.js` y `utils/gallery-filter.js`. El sistema está diseñado para ser extensible y permitir añadir nuevas reglas sin romper la funcionalidad existente.
