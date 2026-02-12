# 🧩 CATÁLOGO DE COMPONENTES UI - Prompt Gallery

Este documento lista todos los componentes visuales del sistema y su función.

---

## 📂 COMPONENTES DE LAYOUT

### TopBar.js
**Ubicación:** `src/components/Layout.js`
**Función:** Barra superior con enlaces legales y de soporte
**Visibilidad:** Solo para usuarios autenticados
**Contenido:**
- Enlace a Términos de Servicio
- Enlace a Política de Privacidad
- Enlace a Soporte

```javascript
export const TopBar = () => `
    <div class="top-bar">
        <a onclick="window.openInfo('tos')">Términos</a>
        <a onclick="window.openInfo('privacy')">Privacidad</a>
        <a onclick="window.openInfo('support')">Soporte</a>
    </div>
`;
```

---

### Header.js
**Ubicación:** `src/components/Layout.js`
**Función:** Cabecera principal con logo, buscador y botones de acción
**Contenido:**
- Logo de Prompt Gallery (clickeable para volver al home)
- Barra de búsqueda con sugerencias en tiempo real
- Botón "Crear Post" (solo usuarios autenticados)
- Botón "Login" (solo visitantes)
- Perfil del usuario con dropdown (solo autenticados)

**Características:**
- Búsqueda con autocompletado
- Sugerencias de etiquetas y usuarios
- Indicador de nivel y PromptBits del usuario

---

### ProfileHeader.js
**Ubicación:** `src/components/Layout.js`
**Función:** Cabecera de perfil de usuario
**Contenido:**
- Avatar del usuario
- Nombre de usuario y badge de nivel
- Estadísticas (Posts, Seguidores, Siguiendo)
- Botón "Seguir" / "Siguiendo"
- Redes sociales del usuario
- Tabs (Creaciones, Guardados, Actividad)

---

## 🖼️ COMPONENTES DE CONTENIDO

### Gallery.js
**Ubicación:** `src/components/Gallery.js`
**Función:** Grid principal de posts
**Responsabilidades:**
- Renderiza el grid de posts
- Inserta el componente TopCreators cada 12 posts
- Maneja el estado vacío (sin posts)
- Aplica blur según configuración de moderación

**Estructura:**
```javascript
export const Gallery = ({ prompts, currentUser, topCreatorsList, ... }) => {
    let html = '<div class="gallery">';
    
    prompts.forEach((p, idx) => {
        // Cada 12 posts, insertar Top Creators
        if (idx > 0 && idx % 12 === 0 && topCreatorsList.length > 0) {
            html += renderTopCreators(topCreatorsList, currentUser);
        }
        
        html += renderPostCard(p);
    });
    
    html += '</div>';
    return html;
};
```

---

### Collage.js (HeroCarousel)
**Ubicación:** `src/components/Collage.js`
**Función:** Carrusel hero con posts destacados
**Características:**
- Muestra los 5 posts más recientes
- Animación de desplazamiento automático
- Blur según moderación
- Click para abrir detalle

---

### TopCreators.js
**Ubicación:** `src/components/TopCreators.js`
**Función:** Cuadro de honor con top 10 creadores
**Características:**
- Bordes especiales para top 3 (Oro, Plata, Bronce)
- Avatar del usuario
- Nombre y nivel
- Contador de prompts publicados
- Click para ir al perfil

**Diseño:**
```
┌─────────────────────────────────────┐
│  ⭐ TOP CREADORES                   │
│  CUADRO DE HONOR • LOS 10 MEJORES  │
├─────────────────────────────────────┤
│  [🥇] Avatar  Usuario1  Nivel 7     │
│              150 PROMPTS            │
├─────────────────────────────────────┤
│  [🥈] Avatar  Usuario2  Nivel 6     │
│              120 PROMPTS            │
└─────────────────────────────────────┘
```

---

### SearchSuggestions.js
**Ubicación:** `src/components/SearchSuggestions.js`
**Función:** Dropdown de sugerencias de búsqueda
**Contenido:**
- Etiquetas que coinciden con la búsqueda
- Usuarios que coinciden con la búsqueda
- Click para ejecutar búsqueda

---

### AdvancedFilters.js
**Ubicación:** `src/components/AdvancedFilters.js`
**Función:** Panel lateral de filtros avanzados
**Filtros:**
- Herramientas (Midjourney, DALL-E, etc.)
- Ratings (SFW, Sugestivo, NSFW)
- Referencia (Con/Sin foto de referencia)
- Categorías de etiquetas
- Búsqueda de etiquetas específicas

---

## 🎭 MODALES

### AuthModal.js
**Ubicación:** `src/components/Modals/AuthModal.js`
**Función:** Modal de autenticación (Login/Registro/Recuperación)
**Formularios:**
1. **Login:** Usuario/Email + Contraseña
2. **Registro:** Email + Usuario + Contraseña
3. **Recuperación:** Email
4. **Activación:** Usuario + Nueva Contraseña (para verificación de email)

**Validaciones:**
- Dominios de email permitidos (anti-spam)
- Contraseña mínima 6 caracteres
- Reglas de comunidad visibles en registro

---

### CreateModal.js
**Ubicación:** `src/components/Modals/CreateModal.js`
**Función:** Modal para crear posts
**Características:**
- Selector de tipo (Simple / Secuencia)
- Upload de imagen con preview
- Campos: Título, Prompt, Negative Prompt
- Selector de herramienta
- Selector de rating
- Checkbox "Requiere foto de referencia"
- Selector de etiquetas con categorías
- Auto-tagging con IA (Gemini 2.0 Flash Lite)

**Flujo de Auto-Tag:**
1. Usuario sube imagen
2. Click en "IA Auto-Tag"
3. Imagen se convierte a base64
4. Se envía a OpenRouter API
5. IA sugiere 3-5 etiquetas relevantes
6. Etiquetas se añaden automáticamente

---

### DetailModal.js
**Ubicación:** `src/components/DetailModal.js`
**Función:** Modal de detalle de post
**Contenido:**
- Imagen (con navegación si es secuencia)
- Título y autor
- Prompt y Negative Prompt
- Botones de acción:
  - Copiar Prompt
  - Guardar Post
  - Compartir
  - Editar (solo autor)
  - Eliminar (solo autor)
- Reacciones (like, love, fire, etc.)
- Comentarios
- Información de herramienta y rating

---

### SettingsModal.js
**Ubicación:** `src/components/Modals/SettingsModal.js`
**Función:** Configuración de perfil
**Secciones:**
1. **Cuenta:**
   - Cambiar avatar (Nivel 2+)
   - Cambiar nombre de usuario
   - Cambiar contraseña
2. **Redes Sociales:** (Nivel 2+)
   - Instagram, Facebook, X, Telegram, Threads, Fanvue
3. **Moderación:**
   - Configuración de contenido Sugestivo
   - Configuración de contenido NSFW
4. **Zona de Peligro:**
   - Eliminar cuenta

---

### TipModal.js
**Ubicación:** `src/components/Modals/TipModal.js`
**Función:** Enviar propina en PromptBits
**Contenido:**
- Selector de cantidad (10, 25, 50, 100 PB)
- Botón confirmar
- Validación de saldo

---

### ConfirmModal.js
**Ubicación:** `src/components/Modals/ConfirmModal.js`
**Función:** Modal de confirmación genérico
**Uso:** Para acciones destructivas (eliminar post, eliminar cuenta, etc.)

---

### ActivityModal.js
**Ubicación:** `src/components/Modals/ActivityModal.js`
**Función:** Historial de actividad del usuario
**Contenido:**
- Log de acciones (copias, reacciones, tips, etc.)
- Fecha y hora de cada acción
- Filtro por tipo de acción

---

### InfoModal.js (Legal)
**Ubicación:** `src/components/Legal.js`
**Función:** Mostrar textos legales
**Contenidos:**
- Términos de Servicio (16 puntos)
- Política de Privacidad
- Formulario de Soporte

---

## 🎨 COMPONENTES AUXILIARES

### LevelModals.js
**Ubicación:** `src/components/Modals/LevelModals.js`
**Función:** Modales de celebración de subida de nivel
**Características:**
- Modal único por nivel (0-7)
- Animaciones de confetti
- Descripción de beneficios desbloqueados

---

## 🔧 UTILIDADES DE RENDERIZADO

### renderPostCard()
**Ubicación:** Inline en `Gallery.js`
**Función:** Renderiza una tarjeta de post individual
**Contenido:**
- Imagen (con blur si aplica)
- Título
- Avatar y nombre del autor
- Contador de copias
- Badge de nivel del autor
- Indicador de secuencia (si aplica)

---

## 📊 RESUMEN DE COMPONENTES

| Componente | Tipo | Responsabilidad Principal |
|------------|------|---------------------------|
| TopBar | Layout | Enlaces legales |
| Header | Layout | Navegación y búsqueda |
| ProfileHeader | Layout | Información de perfil |
| Gallery | Contenido | Grid de posts |
| Collage | Contenido | Carrusel hero |
| TopCreators | Contenido | Ranking de usuarios |
| AuthModal | Modal | Autenticación |
| CreateModal | Modal | Crear posts |
| DetailModal | Modal | Ver detalle de post |
| SettingsModal | Modal | Configuración |
| TipModal | Modal | Enviar propinas |
| ConfirmModal | Modal | Confirmaciones |
| ActivityModal | Modal | Historial |
| InfoModal | Modal | Textos legales |

---

**Nota:** Todos los componentes son funciones puras que retornan strings de HTML. No mantienen estado propio y dependen del Store para los datos.
