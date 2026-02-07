import './style.css'
import './admin_fix.css' // Emergency CSS Fix for Admin Panel
import { pb } from './pocketbase.js';
import { store, TOOLS, RATINGS, RATING_INFO, INFO_ICON, LEVEL_REQS } from './store-final.js';
import { uploadToCloudinary } from './uploadService.js';
import { TAG_CATEGORIES } from './data/tags.js';

// --- MODO MANTENIMIENTO (Activar/Desactivar aquí) ---
const MAINTENANCE_MODE = false;
const MAINTENANCE_END_TIME = new Date('2026-02-05T04:35:00-06:00').getTime(); // 4:35 AM Local

const renderMaintenance = () => {
    document.body.innerHTML = `
        <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#0a0a0a; color:white; font-family: 'Inter', sans-serif; text-align:center; padding:20px">
            <div style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(15px); padding: 50px; border-radius: 32px; border: 1px solid rgba(255, 255, 255, 0.12); max-width: 500px; box-shadow: 0 20px 50px rgba(0,0,0,0.5)">
                <div style="font-size: 5rem; margin-bottom: 25px; animation: float 3s ease-in-out infinite">🏗️</div>
                <h1 style="font-size: 2.2rem; font-weight: 800; margin-bottom: 15px; background: linear-gradient(135deg, #fff 0%, #888 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -1px">Estamos Mejorando</h1>
                <p style="color: #aaa; line-height: 1.6; font-size: 1.1rem; font-weight: 300">
                    Prompt Gallery se encuentra en proceso de migración para ofrecerte una experiencia más rápida y estable.
                </p>
                <div style="margin-top: 35px; padding: 25px; background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.15)">
                    <p style="font-size: 0.8rem; color: #666; text-transform: uppercase; letter-spacing: 3px; font-weight: 700">Estado del Sistema</p>
                    <div style="font-size: 1.8rem; font-weight: 700; margin: 15px 0; color: #fff; text-shadow: 0 0 20px rgba(255,255,255,0.1)">Migración en Progreso</div>
                    <p style="font-size: 0.85rem; color: #555">Regresaremos lo antes posible</p>
                </div>
                <p style="margin-top: 35px; font-size: 0.8rem; color: #444; font-style: italic">Gracias por tu infinita paciencia.</p>
            </div>
            <style>
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                body { margin: 0; overflow: hidden; background: #050505; }
            </style>
        </div>
    `;

    // Temporizador removido por solicitud del usuario
};


// --- SECURITY HELPERS ---
window.escapeHTML = (str) => {
    if (!str) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// --- GLOBAL STATE ---
let currentView = 'home';
let profileUser = null;
let profileTab = 'creations';
let searchQuery = '';
let filters = { source: 'community', sort: 'newest', time: 'all', tool: 'all', refFilter: 'all', rating: 'all' };

// --- ADMIN SORT STATE ---
window.adminSort = { col: 'username', dir: 'asc' };

// --- TOP CREATORS STATE ---
let topCreatorsList = [];
window.openUserProfile = (username) => {
    window.location.href = `/profile.html?u=${encodeURIComponent(username)}`;
};

// --- TAGS STATE ---
window.selectedTags = new Set();
window.openCategory = null;

// --- SAFETY CHECK: Ensure NSFW Reveal Buttons always exist in Detail View ---
setInterval(() => {
    document.querySelectorAll('.card-blurred').forEach(wrapper => {
        // Find or create overlay
        let overlay = wrapper.querySelector('.blur-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'blur-overlay';
            wrapper.appendChild(overlay);
        }

        const isModal = wrapper.closest('.view-modal-wrapper') || wrapper.id === 'detImgWrap';
        const hasButton = overlay.querySelector('button');
        const hasLabel = overlay.querySelector('span');
        const warningLabel = wrapper.dataset.warning || "NSFW";

        if (isModal) {
            // Force inject button in MODAL detail
            if (!hasButton) {
                overlay.innerHTML = `<span>🔞 ${warningLabel}</span><button class="btn" style="margin-top:10px; background: #ff4444; color: white; border:none; padding: 5px 10px; border-radius:4px; font-weight:700; cursor:pointer;" onclick="event.stopPropagation(); window.revealImage(this)">👁️ Revelar Imagen</button>`;
            }
        } else {
            // Dashboard / Collage: Only show Label, NO button
            if (hasButton || !hasLabel) {
                overlay.innerHTML = `<span>🔞 ${warningLabel}</span>`;
            }
        }
    });
}, 500);

// Constants imported from store-final.js

const app = document.querySelector('#app');

// Exponer render y filters a window para que funcionen con onclick/onchange inline
window.filters = filters;
window.render = null; // Se asignará cuando se defina render

// NEW: Gate filter changes
window.setFilter = (key, value) => {
    if (!store.currentUser) {
        // Reset select to previous value if possible (hard to do cleanly without state tracking on UI, 
        // but alerting is the main requirement).
        const el = event.target;
        if (el) el.value = filters[key]; // Revert visual change
        if (window.toast) window.toast("Debes iniciar sesión para usar los filtros.", "warning"); return;
    }
    filters[key] = value;
    render();
};
// INFO_ICON and RATING_INFO imported from store-final.js

const renderCollage = (p, isHero = false) => {
    if (p.type !== 'sequence' || !p.content || p.content.length === 0) {
        return `<img src="${p.image || ''}" loading="lazy">`;
    }

    // Support up to 6 items
    const items = p.content.slice(0, 6);
    const count = items.length;
    let gridStyle = '';

    // Dynamic Grid Logic
    if (count === 1) gridStyle = 'grid-template-columns: 1fr; grid-template-rows: 1fr;';
    else if (count === 2) gridStyle = 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr;';
    else if (count === 3) gridStyle = 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;';
    else if (count === 4) gridStyle = 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;';
    else if (count === 5) gridStyle = 'grid-template-columns: repeat(6, 1fr); grid-template-rows: 1fr 1fr;';
    else if (count >= 6) gridStyle = 'grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr;';

    return `
    <div class="card-collage" style="${gridStyle}">
        ${items.map((step, idx) => {
        const { applyBlur } = getModeration(p, step.rating);
        let spanStyle = '';

        // Custom Spans for nicer layouts
        if (count === 3 && idx === 0) spanStyle = 'grid-column: span 2;';

        // 5 items: Top row 2 items (span 3), Bottom row 3 items (span 2) = Total 6 cols
        if (count === 5) {
            if (idx < 2) spanStyle = 'grid-column: span 3;'; // Top 2 items bigger
            else spanStyle = 'grid-column: span 2;'; // Bottom 3 items smaller
        }

        return `
            <div class="collage-item ${applyBlur ? 'card-blurred' : ''}" data-warning="${applyBlur ? warningLabel : ''}" style="${spanStyle}">
                <img src="${step.image}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
            </div>`;
    }).join('')}
    </div>`;
};

// --- LEGAL CONTENT ---
const LEGAL_TEXTS = {
    tos: `
        <h2>Términos de Servicio</h2>
        <div style="text-align:left; max-height:60vh; overflow-y:auto; padding-right:10px">
            <p><strong>1. Licencia de Uso:</strong> Prompt Gallery es una plataforma para compartir, descubrir y organizar prompts de IA. Al utilizar nuestros servicios, aceptas operar bajo estos términos.</p>
            <p><strong>2. Propiedad Intelectual:</strong> Tú conservas todos los derechos de autor sobre los prompts y secuencias que creas. Sin embargo, al publicarlos en la plataforma (en modo público), otorgas a Prompt Gallery y a sus usuarios una licencia no exclusiva, mundial y gratuita para ver, copiar, modificar y ejecutar dichos prompts.</p>
            <p><strong>3. Responsabilidad del Contenido:</strong> Eres el único responsable del material que subes. La plataforma actúa como un intermediario pasivo. Nos reservamos el derecho de eliminar cualquier contenido que viole leyes internacionales, derechos de autor de terceros o nuestras políticas de seguridad.</p>
            <p><strong>4. Clasificación Obligatoria:</strong> Es tu deber etiquetar correctamente el contenido (SFW, Sugestivo, NSFW). El uso indebido de etiquetas resultará en la suspensión de la cuenta.</p>
            <p><strong>5. Modificaciones:</strong> Nos reservamos el derecho de actualizar estos términos en cualquier momento. El uso continuado implica la aceptación de los cambios.</p>
        </div>
    `,
    privacy: `
        <h2>Política de Privacidad</h2>
        <div style="text-align:left; max-height:60vh; overflow-y:auto; padding-right:10px">
            <p><strong>1. Recolección de Datos:</strong> Recopilamos información mínima necesaria: correo electrónico, nombre de usuario y datos técnicos de acceso (IP, navegador) para seguridad y análisis.</p>
            <p><strong>2. Imágenes y Prompts:</strong> Las imágenes subidas a servidores públicos son accesibles externamente. Recomendamos no subir fotos personales privadas ni información sensible en los prompts.</p>
            <p><strong>3. Seguridad:</strong> Utilizamos cifrado estándar (HTTPS) y hash seguro para contraseñas. Nunca almacenamos contraseñas en texto plano.</p>
            <p><strong>4. Terceros:</strong> No vendemos tus datos a terceros. Podemos utilizar servicios de análisis anonimizados para mejorar la experiencia.</p>
            <p><strong>5. Tus Derechos:</strong> Puedes solicitar la eliminación de tu cuenta y todos tus datos enviando un correo a soporte o desde la configuración de tu perfil.</p>
        </div>
    `,
    safety: `
        <h2>Centro de Seguridad</h2>
        <div style="text-align:left; max-height:60vh; overflow-y:auto; padding-right:10px">
            <p><strong>Nuestra Prioridad:</strong> Mantener un entorno creativo seguro y respetuoso.</p>
            <ul>
                <li><strong>Tolerancia Cero:</strong> No permitimos contenido ilegal, CSAM, violencia extrema, doxxing o discurso de odio. Reportaremos a las autoridades cualquier material ilegal.</li>
                <li><strong>Herramientas de Control:</strong> Usa el botón "Bloquear" en perfiles molestos y configura tus filtros de contenido en "Configuración" para ocultar material sensible.</li>
                <li><strong>Moderación:</strong> Contamos con sistemas automáticos y moderadores humanos. Si ves algo incorrecto, usa el botón de reporte.</li>
            </ul>
            <p><strong>Consejo:</strong> Nunca compartas tu contraseña ni datos bancarios con otros usuarios.</p>
        </div>
    `,
    faq: `
        <h2>Preguntas Frecuentes (FAQ)</h2>
        <div style="text-align:left; max-height:60vh; overflow-y:auto; padding-right:10px">
            <p><strong>¿Qué es Prompt Gallery?</strong><br>
            Es una comunidad para entusiastas de la IA Generativa. Puedes guardar, organizar y compartir prompts para herramientas como Midjourney, Stable Diffusion, DALL-E, etc.</p>
            
            <p><strong>¿Es gratuito?</strong><br>
            Sí, el registro y uso básico es 100% gratuito. Ofrecemos funciones avanzadas para usuarios activos que suben de nivel.</p>
            
            <p><strong>¿Qué son los PromptBits?</strong><br>
            Son puntos de reputación y moneda virtual. Los ganas al recibir propinas de otros usuarios o contribuir a la comunidad. Sirven para destacar tus posts y apoyar a otros creadores.</p>
            
            <p><strong>¿Puedo vender mis prompts?</strong><br>
            Actualmente la plataforma es de libre intercambio. Sin embargo, puedes incluir enlaces a tus redes o portafolios en tu perfil para que te contacten profesionalmente.</p>
            
            <p><strong>¿Cómo subo de nivel?</strong><br>
            Publicando prompts de calidad. Cada nivel desbloquea nuevas funciones como publicar secuencias, personalizar tu perfil o destacar posts.</p>
        </div>
    `,
    support: `
        <h2>📞 Centro de Soporte</h2>
        <p style="margin-bottom:15px; color:#aaa">Envíanos un ticket y te responderemos lo antes posible.</p>
        <div class="form-group">
            <label class="form-label">Tu Nombre</label>
            <input type="text" id="supName" class="form-input" placeholder="Ej: Juan Perez">
        </div>
        <div class="form-group">
            <label class="form-label">Tu Email</label>
            <input type="email" id="supEmail" class="form-input" placeholder="contacto@ejemplo.com">
        </div>
        <div class="form-group">
            <label class="form-label">Mensaje / Reporte</label>
            <textarea id="supMsg" class="form-input" rows="4" placeholder="Describe tu problema o sugerencia..."></textarea>
        </div>
        <button class="btn" style="width:100%" onclick="window.submitSupport()">📨 Enviar Ticket</button>
    `
};

// --- COMPONENTS ---
const TopBar = () => `<div class="top-bar"><div class="container top-bar-inner"><div class="top-bar-links"><span onclick="window.openInfo('tos')">Términos</span><span onclick="window.openInfo('privacy')">Privacidad</span><span onclick="window.openInfo('safety')">Seguridad</span><span onclick="window.openInfo('faq')">Preguntas</span></div><button class="support-btn" onclick="window.openInfo('support')">💬 Soporte</button></div></div>`;

const getModeration = (p, forcedRating) => {
    // Si no hay rating, asumimos SFW por defecto
    let rating = forcedRating || p.rating || 'SFW / Apto';
    if (!forcedRating && p.type === 'sequence' && p.content && p.content.length > 0) {
        rating = p.content[0].rating || 'SFW / Apto';
    }

    // Obtener preferencias del usuario logueado (moderation ahora es un campo oficial)
    const mod = store.currentUser?.moderation || { suggestive: 'ON', nsfw: 'BLUR' };
    let applyBlur = false;
    let warningLabel = '';

    if (rating === 'Sugestivo' && mod.suggestive === 'BLUR') {
        applyBlur = true;
        warningLabel = 'SUGESTIVO';
    }
    if (rating === 'NSFW / +18' && mod.nsfw === 'BLUR') {
        applyBlur = true;
        warningLabel = 'NSFW';
    }

    return { applyBlur, warningLabel };
};

const getFilteredPrompts = () => {
    let list = Array.isArray(store.prompts) ? [...store.prompts] : [];

    // 1. Scope Filtering (Profile vs Feed)
    if (store.currentUser) {
        const hidden = store.currentUser.hiddenPrompts || [];
        const blocked = store.currentUser.blockedUsers || [];
        list = list.filter(p => !hidden.includes(p.id) && !blocked.includes(p.author));
    }

    if (currentView === 'profile') {
        // En perfil, el filtro 'user' es implícito o forzado
        list = list.filter(p => {
            // UNIFICACIÓN DE PRIVACIDAD: is_private es la clave oficial
            const isPrivate = p.is_private === true || p.isPrivate === true;
            if (isPrivate) {
                // Solo el autor puede ver sus propios posts privados
                if (!store.currentUser || store.currentUser.id !== p.author_id) return false;
            }
            return profileTab === 'creations' ? p.author_id === profileUser : p.savedBy?.includes(profileUser);
        });
    } else {
        // En el Dashboard público, ocultar TODO lo privado de raíz
        list = list.filter(p => !(p.is_private === true || p.isPrivate === true));
        if (filters.source === 'following' && store.currentUser) {
            const myFollowing = store.currentUser.following || [];
            list = list.filter(p => myFollowing.includes(p.author_id));
        } else if (filters.source === 'user' && store.currentUser) {
            // "Tus Prompts" en Home (librería propia)
            list = list.filter(p => p.author === store.currentUser.username);
        }
    }

    // 2. Search Query
    if (searchQuery) {
        const term = searchQuery.toLowerCase();
        list = list.filter(p => {
            const inTitle = p.title?.toLowerCase().includes(term);
            const inTags = (p.tags || []).some(t => t.toLowerCase().includes(term));
            return inTitle || inTags;
        });
    }

    // 3. Filters
    if (filters.time !== 'all') {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        list = list.filter(p => {
            const age = now - p.createdAt;
            if (filters.time === 'today') return age < oneDay;
            if (filters.time === 'week') return age < oneDay * 7;
            if (filters.time === 'month') return age < oneDay * 30;
            return true;
        });
    }

    if (filters.tool !== 'all') {
        list = list.filter(p => p.tool === filters.tool);
    }

    if (filters.refFilter !== 'all') {
        if (filters.refFilter === 'withRef') list = list.filter(p => p.needsReference);
        if (filters.refFilter === 'noRef') list = list.filter(p => !p.needsReference);
    }

    if (filters.rating !== 'all') {
        list = list.filter(p => {
            const r = p.type === 'sequence' && p.content && p.content.length > 0 ? p.content[0].rating : p.rating;
            return r === filters.rating;
        });
    }

    // 4. Sorting
    if (filters.sort === 'newest') list.sort((a, b) => b.createdAt - a.createdAt);
    if (filters.sort === 'oldest') list.sort((a, b) => a.createdAt - b.createdAt);
    if (filters.sort === 'popular') {
        list.sort((a, b) => {
            const reaA = Object.values(a.reactions || {}).reduce((x, y) => x + y, 0);
            const reaB = Object.values(b.reactions || {}).reduce((x, y) => x + y, 0);
            return reaB - reaA; // Descending
        });
    }
    if (filters.sort === 'commented') {
        list.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
    }

    // 5. Guest User Restriction (Non-Registered)
    if (!store.currentUser) {
        list = list.slice(0, 12);
    }

    return list;
};

const Header = () => `
<header style="height:auto; display:flex; flex-direction:column">
    <div class="container" style="height:72px; border-bottom:1px solid #222">
        <div class="logo" onclick="window.goHome()" style="cursor:pointer">✨ Prompt Gallery</div>
        
        <!-- Desktop Search -->
        <div class="search-bar search-desktop">
            <input type="search" class="search-input" id="searchInput" autocomplete="off" placeholder="Buscar..." value="${searchQuery}" onfocus="this.removeAttribute('readonly');" readonly>
        </div>

        <!-- Mobile Search Toggle -->
        <div class="search-mobile-btn" onclick="document.querySelector('.search-mobile-overlay').classList.add('active'); document.getElementById('searchMobileInput').focus()">🔍</div>
        <nav>
            ${store.currentUser ? `
                ${store.currentUser.role === 'admin' ? `<a href="/admin.html" class="btn-outline" style="border-color:gold; color:gold; text-decoration:none; padding: 10px 15px; border-radius: 8px; font-weight: 600;">👑 Admin</a>` : ''}
                <button class="btn" id="addBtn">Compartir Prompt</button>
                <div class="user-info" onclick="window.openUserProfile('${store.currentUser.username}')" style="cursor:pointer">
                    <div class="user-avatar-sm" style="background-image:url('${store.currentUser.avatar || 'https://robohash.org/' + store.currentUser.username}')"></div>
                    <span>${store.currentUser.username}</span>
                </div>
                <button class="btn-outline" onclick="window.doLogout()">Salir</button>
            ` : `<button class="btn" id="loginBtn">Iniciar Sesión</button>`}
        </nav>
    </div>

    <!-- Mobile Search Overlay -->
    <div class="search-mobile-overlay">
        <div class="container" style="display:flex; align-items:center; gap:10px; height:100%">
             <button class="btn-icon" onclick="document.querySelector('.search-mobile-overlay').classList.remove('active')" style="font-size:1.2rem; color:#fff">✕</button>
             <div class="search-bar" style="flex:1; max-width:none">
                <input type="search" class="search-input" id="searchMobileInput" placeholder="Buscar prompts..." value="${searchQuery}" autocomplete="off" onkeydown="if(event.key === 'Enter'){ window.handleSearch(this.value); document.querySelector('.search-mobile-overlay').classList.remove('active'); }">
             </div>
        </div>
    </div>
    </div>
    ${store.currentUser ? `
    <div class="container" style="padding:10px 20px; display:flex; gap:10px; overflow-x:auto; background:rgba(0,0,0,0.3)">
        <select id="sourceFilter" onchange="window.setFilter('source', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem" ${currentView === 'profile' ? 'disabled' : ''}>
            <option value="community" ${filters.source === 'community' ? 'selected' : ''}>👥 Comunidad</option>
            <option value="following" ${filters.source === 'following' ? 'selected' : ''}>⭐ Siguiendo</option>
            <option value="user" ${filters.source === 'user' ? 'selected' : ''}>👤 Tus Prompts / Usuario</option>
        </select>
        <select onchange="window.setFilter('time', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem">
            <option value="all" ${filters.time === 'all' ? 'selected' : ''}>📅 Todo el tiempo</option>
            <option value="today" ${filters.time === 'today' ? 'selected' : ''}>Hoy</option>
            <option value="week" ${filters.time === 'week' ? 'selected' : ''}>Esta Semana</option>
            <option value="month" ${filters.time === 'month' ? 'selected' : ''}>Este Mes</option>
        </select>
        <select onchange="window.setFilter('sort', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem">
            <option value="newest" ${filters.sort === 'newest' ? 'selected' : ''}>🔥 Más Recientes</option>
            <option value="popular" ${filters.sort === 'popular' ? 'selected' : ''}>❤️ Más Populares</option>
            <option value="commented" ${filters.sort === 'commented' ? 'selected' : ''}>💬 Más Comentados</option>
            <option value="oldest" ${filters.sort === 'oldest' ? 'selected' : ''}>👴 Más Antiguos</option>
        </select>
        <select onchange="window.setFilter('tool', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem">
            <option value="all" ${filters.tool === 'all' ? 'selected' : ''}>🛠️ Todas las Herramientas</option>
            ${TOOLS.map(t => `<option value="${t}" ${filters.tool === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <select onchange="window.setFilter('refFilter', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem">
            <option value="all" ${filters.refFilter === 'all' ? 'selected' : ''}>📸 Referencia (Todos)</option>
            <option value="withRef" ${filters.refFilter === 'withRef' ? 'selected' : ''}>Con Referencia</option>
            <option value="noRef" ${filters.refFilter === 'noRef' ? 'selected' : ''}>Sin Referencia</option>
        </select>
        <select onchange="window.setFilter('rating', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem">
            <option value="all" ${filters.rating === 'all' ? 'selected' : ''}>👀 Clasificación (Todos)</option>
            ${RATINGS.map(r => `<option value="${r}" ${filters.rating === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
    </div>
    ` : ''}
</header>`;

const HeroCarousel = () => {
    if (currentView !== 'home') return '';

    // === FEATURED PROMPTS: THREE TYPES ===
    const all = [...store.prompts].filter(p => !p.isPrivate);

    // Calculate engagement score function
    function calculateEngagementScore(p) {
        const reactions = Object.values(p.reactions || {}).reduce((sum, val) => sum + val, 0);
        const comments = (p.comments || []).length;
        const copies = (p.saved_by || []).length;
        const tips = p.tokens_received || 0;
        return reactions + comments + copies + tips;
    }

    // 1. ADMIN-FEATURED (permanent, manually marked by admin)
    const adminFeatured = all.filter(p => p.admin_featured === true);

    // 2. USER-BOOSTED (paid 50 tokens, 1 week duration)
    const userBoosted = all.filter(p => {
        if (!p.is_featured || !p.featured_until) return false;
        return new Date(p.featured_until) > new Date();
    });

    // 3. ORGANIC TOP 12 (by engagement score)
    const organicCandidates = all
        .filter(p => !p.admin_featured && (!p.is_featured || new Date(p.featured_until) <= new Date()))
        .map(p => ({ ...p, engagementScore: calculateEngagementScore(p) }))
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 12);

    // Combine all three types
    const featured = [...adminFeatured, ...userBoosted, ...organicCandidates];
    if (featured.length === 0) return '';

    // Duplicate for infinite scroll if needed
    const list = featured.length < 6 ? featured : featured.concat(featured);

    return `
    <div class="container" style="margin-top:20px; margin-bottom:-10px">
        <h2 style="font-size:1.2rem; font-weight:800; color:var(--accent); letter-spacing:1px">🌟 PROMPTS DESTACADOS</h2>
    </div>
    <div class="hero-carousel">
        <div class="carousel-track" style="${featured.length < 6 ? 'animation:none; justify-content:center; width:100%' : ''}">
            ${list.map((p, idx) => {
        const { applyBlur, warningLabel } = getModeration(p);

        // Determine badge type
        let badge = '';
        if (p.admin_featured) {
            badge = `<div style="position:absolute; top:10px; left:10px; background:rgba(139,0,255,0.95); color:white; padding:6px 12px; border-radius:20px; font-size:0.75rem; font-weight:700; z-index:10; box-shadow:0 4px 12px rgba(0,0,0,0.4); display:flex; align-items:center; gap:5px">⚡ Admin</div>`;
        } else if (p.is_featured && new Date(p.featured_until) > new Date()) {
            badge = `<div style="position:absolute; top:10px; left:10px; background:rgba(241,196,15,0.95); color:#000; padding:6px 12px; border-radius:20px; font-size:0.75rem; font-weight:700; z-index:10; box-shadow:0 4px 12px rgba(0,0,0,0.4); display:flex; align-items:center; gap:5px">💎 Semana</div>`;
        } else {
            // Find organic rank (1-12)
            const organicRank = organicCandidates.findIndex(oc => oc.id === p.id);
            if (organicRank !== -1) {
                const rankNumber = organicRank + 1;

                // Color mapping for top 3
                let rankStyle = 'background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2);';
                let textColor = '#fff';

                if (rankNumber === 1) {
                    rankStyle = 'background: linear-gradient(135deg, #FFD700 0%, #FF8C00 100%); border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 0 15px rgba(255, 140, 0, 0.5);';
                    textColor = '#000';
                } else if (rankNumber === 2) {
                    rankStyle = 'background: linear-gradient(135deg, #E0E0E0 0%, #808080 100%); border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 0 15px rgba(128, 128, 128, 0.5);';
                    textColor = '#000';
                } else if (rankNumber === 3) {
                    rankStyle = 'background: linear-gradient(135deg, #CD7F32 0%, #8B4513 100%); border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 0 15px rgba(139, 69, 19, 0.5);';
                    textColor = '#000';
                }

                badge = `<div style="position:absolute; top:10px; left:10px; ${rankStyle} color:${textColor}; width:34px; height:34px; border-radius:50%; font-size:1.1rem; font-weight:900; z-index:10; display:flex; align-items:center; justify-content:center; font-family:'Outfit', sans-serif;">${rankNumber}</div>`;
            }
        }

        return `
                <div class="carousel-item ${applyBlur ? 'card-blurred' : ''}" data-post-id="${p.id}" style="cursor:pointer">
                    ${renderCollage(p, true)}
                    ${applyBlur ? `<div class="blur-overlay"><span>🔞 ${warningLabel}</span></div>` : ''}
                    ${badge}
                </div>`;
    }).join('')}
        </div>
    </div>`;
};

const ProfileHeader = () => {
    if (currentView !== 'profile' || !profileUser) return '';

    // PRIORIDAD: Si es mi propio perfil, usar store.currentUser para ver cambios de saldo al instante
    let user = (store.currentUser && store.currentUser.username === profileUser)
        ? store.currentUser
        : null; // Fix: store.users no existe

    // ULTIMATE FALLBACK: Skeleton User
    // If we have profileUser string (from URL/click) but no full user object, create a fake one
    if (!user && profileUser) {
        user = {
            username: profileUser,
            avatar: null, // RoboHash will handle this in the template
            followers: [],
            following: [],
            socials: {},
            isSkeleton: true
        };
    }

    if (!user) return `<div class="container" style="padding:40px; text-align:center">
        <h2>Usuario no encontrado</h2>
        <p>El usuario @${profileUser} no existe o no ha cargado.</p>
        <button class="btn" onclick="window.location.reload()">Recargar</button>
    </div>`;

    const isMe = store.currentUser && store.currentUser.username.toLowerCase() === user.username.toLowerCase();


    const getLevelInfo = (lvl) => {
        return LEVEL_REQS[lvl] || LEVEL_REQS[0];
    };

    const lvlInfo = getLevelInfo(user.level || 0);

    return `
    <div class="profile-header">
        <div class="container" style="padding: 40px 0 0 0;">
            <div style="display:flex; gap:30px; align-items:center; margin-bottom:30px">
                <div class="user-avatar-lg" style="background-image:url('${user.avatar || 'https://robohash.org/' + user.username}')"></div>
                <div>
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px">
                        <h1 style="font-size:2.5rem; margin:0">${window.escapeHTML(user.username)}</h1>
                        
                        <!-- Level Badge -->
                        <span class="level-badge tier-${user.level || 0}" 
                              title="${isMe ? 'Haz clic para ver tu progreso' : 'Nivel ' + (user.level || 0)}"
                              style="${isMe ? 'cursor:pointer' : ''}"
                              ${isMe ? 'onclick="window.openLevelProgress()"' : ''}>
                            ${lvlInfo.icon} NIVEL ${user.level || 0} - ${lvlInfo.name}
                        </span>
                    </div>

                    <!-- Badges Container -->
                    <div class="badge-container">
                        <!-- Founder Badge (Hardcoded for specific users) -->
                        ${(user.username === 'rodrigodlmoral' || user.username === 'rodridomrock') ? `
                        <div class="founder-badge">
                            <span class="badge-text">👑 Administrador - Fundador</span>
                        </div>
                        ` : ''}

                        <!-- Dynamic Badges from DB -->
                        ${(user.badges || []).map(b => {
        if (b.type === 'creator_founder') {
            return `
                                <div class="creator-founder-badge">
                                    <span class="badge-text">✨ CREADOR FUNDADOR</span>
                                </div>`;
        }
        return '';
    }).join('')}
                    </div>
                    
                    <div style="display:flex; gap:20px; color:#888; font-size:0.9rem; align-items:center">
                        <div class="token-display" title="PromptBits (Tu saldo actual)">💎 ${user.tokens || 0} PromptBits</div>
                        <span>|</span>
                        <span>${user.followers?.length || 0} Seguidores</span>
                        <span>${user.following?.length || 0} Siguiendo</span>
                    </div>
                    
                    ${user.socials ? `
                    <div style="display:flex; gap:15px; margin-top:10px; align-items:center">
                        ${user.socials.ig ? `<a href="${user.socials.ig.startsWith('http') ? user.socials.ig : 'https://instagram.com/' + user.socials.ig.replace('@', '')}" target="_blank" title="Instagram" style="text-decoration:none; width:24px; height:24px">
                            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </a>` : ''}
                        
                        ${user.socials.fb ? `<a href="${user.socials.fb.startsWith('http') ? user.socials.fb : 'https://facebook.com/' + user.socials.fb}" target="_blank" title="Facebook" style="text-decoration:none; width:24px; height:24px">
                            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>` : ''}
                        
                        ${user.socials.x ? `<a href="${user.socials.x.startsWith('http') ? user.socials.x : 'https://x.com/' + user.socials.x.replace('@', '')}" target="_blank" title="X / Twitter" style="text-decoration:none; width:22px; height:22px">
                            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>` : ''}
                        
                        ${user.socials.tg ? `<a href="${user.socials.tg.startsWith('http') ? user.socials.tg : 'https://t.me/' + user.socials.tg.replace('t.me/', '')}" target="_blank" title="Telegram" style="text-decoration:none; width:24px; height:24px">
                            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                        </a>` : ''}
                        
                        ${user.socials.th ? `<a href="${user.socials.th.startsWith('http') ? user.socials.th : 'https://threads.net/' + user.socials.th.replace('@', '')}" target="_blank" title="Threads" style="text-decoration:none; width:30px; height:30px">
                            <svg viewBox="0 0 4001 4001" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M 1975.5 901 L 1979.5 902 L 1980.5 901 L 2066.5 901 L 2068.5 901 L 2071.5 902 L 2087.5 902 L 2088.5 903 L 2092.5 903 L 2106.5 903 L 2107.5 904 L 2142.5 906 L 2150.5 908 L 2160.5 908 L 2161.5 909 L 2190.5 912 L 2191.5 913 L 2220.5 917 L 2231.5 920 L 2236.5 920 L 2281.5 931 L 2285.5 931 L 2330.5 943 L 2387.5 961 L 2461.5 990 Q 2622.5 1061.5 2734 1182.5 Q 2816.6 1271.4 2876 1383.5 Q 2903.9 1435.6 2926 1493.5 L 2948 1558.5 L 2956 1587.5 L 2959 1605 L 2928.5 1611 L 2923.5 1611 L 2918.5 1613 L 2908.5 1614 L 2877.5 1621 L 2872.5 1621 L 2862.5 1624 L 2852.5 1625 L 2775 1641 L 2763 1596.5 L 2746 1549.5 Q 2722.5 1491 2692 1439.5 Q 2637.3 1346.2 2560.5 1275 Q 2515.4 1233.6 2461.5 1201 Q 2411.7 1171.3 2354.5 1149 L 2293.5 1128 L 2254.5 1117 L 2250.5 1117 L 2242.5 1114 L 2238.5 1114 L 2207.5 1106 L 2176.5 1101 L 2170.5 1099 L 2163.5 1099 L 2162.5 1098 L 2141.5 1096 L 2133.5 1094 L 2123.5 1094 L 2122.5 1093 L 2101.5 1092 L 2100.5 1091 L 2086.5 1091 L 2085.5 1090 L 2070.5 1090 L 2069.5 1089 L 2067.5 1090 L 2066.5 1089 L 1981.5 1089 L 1979.5 1090 L 1977.5 1090 L 1961.5 1090 L 1960.5 1091 L 1958.5 1091 L 1933.5 1092 L 1932.5 1093 L 1922.5 1093 L 1921.5 1094 L 1879.5 1098 L 1810.5 1110 L 1738.5 1128 L 1706.5 1138 L 1665.5 1153 Q 1608.1 1175.6 1558.5 1206 Q 1502.4 1242.4 1458 1290.5 Q 1404.7 1348.2 1364 1418.5 Q 1325.8 1484.3 1297 1559.5 L 1273 1630.5 L 1260 1679.5 L 1253 1713.5 L 1253 1718.5 L 1250 1729.5 L 1250 1735.5 L 1246 1754.5 L 1243 1781.5 L 1242 1782.5 L 1240 1805.5 L 1239 1806.5 L 1236 1842.5 L 1235 1843.5 L 1235 1853.5 L 1234 1854.5 L 1233 1876.5 L 1232 1877.5 L 1232 1889.5 L 1231 1890.5 L 1231 1892.5 L 1231 1905.5 L 1230 1906.5 L 1230 1908.5 L 1230 1921.5 L 1229 1922.5 L 1229 1926.5 L 1229 1943.5 L 1228 1944.5 L 1229 1947.5 L 1228 1949.5 L 1228 1985.5 L 1227 1986.5 L 1227 1988.5 L 1227 2041.5 L 1228 2042.5 L 1228 2044.5 L 1227 2049.5 L 1228 2051.5 L 1228 2053.5 L 1228 2079.5 L 1229 2080.5 L 1229 2101.5 L 1230 2104.5 L 1230 2106.5 L 1230 2119.5 L 1231 2120.5 L 1231 2122.5 L 1231 2134.5 L 1232 2136.5 L 1232 2138.5 L 1233 2159.5 L 1234 2160.5 L 1234 2170.5 L 1235 2171.5 L 1235 2173.5 L 1238 2208.5 L 1239 2209.5 L 1246 2264.5 L 1261 2340.5 L 1263 2344.5 L 1268 2368.5 L 1281 2413.5 L 1307 2484.5 Q 1364.5 2622.5 1464.5 2718 Q 1559 2808.5 1692.5 2860 L 1760.5 2882 L 1796.5 2891 L 1836.5 2899 L 1842.5 2899 L 1869.5 2904 L 1892.5 2906 L 1893.5 2907 L 1912.5 2908 L 1913.5 2909 L 1938.5 2910 L 1939.5 2911 L 1956.5 2911 L 1957.5 2912 L 1979.5 2912 L 1980.5 2913 L 1983.5 2912 L 1986.5 2913 L 1989.5 2912 L 1991.5 2913 L 2019.5 2913 L 2021.5 2912 L 2023.5 2912 L 2053.5 2912 L 2055.5 2911 L 2057.5 2911 L 2073.5 2911 L 2074.5 2910 L 2076.5 2910 L 2086.5 2910 L 2087.5 2909 L 2089.5 2909 L 2112.5 2908 L 2113.5 2907 L 2121.5 2907 L 2138.5 2904 L 2140.5 2904 L 2167.5 2901 L 2168.5 2900 L 2203.5 2895 L 2209.5 2893 L 2214.5 2893 L 2279.5 2878 L 2337.5 2860 L 2373.5 2845 Q 2473.5 2797.5 2546 2722.5 Q 2574.6 2693.1 2599 2659.5 Q 2624.8 2623.8 2644 2581.5 L 2657 2547.5 L 2666 2513.5 L 2666 2508.5 L 2672 2479.5 L 2674 2454.5 L 2675 2453.5 L 2675 2442.5 L 2676 2441.5 L 2675 2439.5 L 2676 2438.5 L 2676 2398.5 L 2675 2396.5 L 2675 2394.5 L 2674 2374.5 L 2667 2334.5 L 2656 2298.5 L 2647 2276.5 Q 2617.7 2213.8 2569.5 2170 Q 2535.9 2138.3 2494 2116 L 2486 2162.5 L 2472 2219.5 L 2458 2262.5 L 2436 2315.5 Q 2397.1 2398.6 2335.5 2459 Q 2275.4 2518.9 2187.5 2551 L 2145.5 2564 L 2103.5 2573 L 2075.5 2576 L 2074.5 2577 L 2065.5 2577 L 2064.5 2578 L 2052.5 2578 L 2051.5 2579 L 2011.5 2580 L 2010.5 2579 L 1986.5 2579 L 1985.5 2578 L 1962.5 2577 L 1961.5 2576 L 1946.5 2575 L 1916.5 2569 L 1911.5 2569 L 1868.5 2558 L 1820.5 2541 Q 1734.3 2505.2 1675 2442.5 Q 1631.7 2397.3 1607 2333.5 L 1595 2295.5 L 1588 2260.5 L 1587 2245.5 L 1586 2244.5 L 1586 2234.5 L 1585 2233.5 L 1585 2183.5 L 1586 2182.5 L 1586 2172.5 L 1588 2164.5 L 1588 2162.5 L 1591 2139.5 L 1598 2111.5 Q 1607.6 2079.1 1622 2051.5 Q 1649.6 2000.1 1690.5 1962 Q 1745.2 1910.7 1821.5 1881 L 1866.5 1866 L 1898.5 1858 L 1943.5 1850 L 1967.5 1848 L 1968.5 1847 L 1977.5 1847 L 1978.5 1846 L 1990.5 1846 L 1992.5 1845 L 1994.5 1845 L 2029.5 1844 L 2030.5 1843 L 2063.5 1843 L 2064.5 1842 L 2127.5 1842 L 2128.5 1843 L 2155.5 1843 L 2156.5 1844 L 2160.5 1844 L 2177.5 1844 L 2178.5 1845 L 2180.5 1844 L 2181.5 1845 L 2194.5 1845 L 2195.5 1846 L 2197.5 1846 L 2222.5 1847 L 2223.5 1848 L 2232.5 1848 L 2242.5 1850 L 2252.5 1850 L 2253.5 1851 L 2276.5 1853 L 2277.5 1854 L 2297.5 1856 L 2307 1858 L 2304 1836.5 L 2294 1797.5 L 2276 1749.5 Q 2251.4 1695.6 2209.5 1659 Q 2183.5 1636.5 2149.5 1622 L 2120.5 1612 L 2080.5 1604 L 2078.5 1604 L 2054.5 1603 L 2053.5 1602 L 2011.5 1602 L 2009.5 1602 L 2007.5 1603 L 1983.5 1604 L 1982.5 1605 L 1976.5 1605 L 1975.5 1606 L 1969.5 1606 L 1946.5 1610 L 1922.5 1616 L 1896.5 1625 Q 1840.3 1647.8 1803 1689.5 L 1777.5 1724 L 1643.5 1643 L 1617 1625.5 Q 1648.3 1575.8 1690.5 1537 Q 1742.1 1489.1 1810.5 1458 Q 1843.3 1443.3 1880.5 1433 L 1924.5 1423 L 1955.5 1419 L 1956.5 1418 L 1958.5 1418 L 1974.5 1417 L 1975.5 1416 L 1987.5 1416 L 1988.5 1415 L 2003.5 1415 L 2004.5 1414 L 2010.5 1414 L 2061.5 1414 L 2062.5 1415 L 2078.5 1415 L 2079.5 1416 L 2107.5 1418 L 2151.5 1426 L 2205.5 1442 Q 2303.9 1479.6 2368 1551.5 Q 2430.5 1620 2465 1716.5 L 2480 1764.5 L 2492 1818.5 L 2496 1849.5 L 2497 1850.5 L 2497 1857.5 L 2498 1858.5 L 2499 1875.5 L 2500 1876.5 L 2502 1911 Q 2638.8 1965 2730 2065.5 Q 2783.9 2124.1 2819 2201.5 Q 2834.3 2235.7 2845 2274.5 L 2853 2307.5 L 2858 2335.5 L 2858 2342.5 L 2860 2349.5 L 2860 2351.5 L 2861 2367.5 L 2862 2368.5 L 2862 2379.5 L 2863 2380.5 L 2863 2398.5 L 2864 2399.5 L 2864 2403.5 L 2863 2406.5 L 2864 2407.5 L 2864 2433.5 L 2864 2437.5 Q 2861.4 2445.4 2863 2457.5 L 2862 2458.5 L 2862 2460.5 L 2862 2472.5 L 2861 2473.5 L 2861 2482.5 L 2860 2483.5 L 2860 2491.5 L 2859 2492.5 L 2857 2513.5 L 2845 2573.5 L 2830 2622.5 L 2812 2666.5 Q 2785 2724.5 2749 2773.5 Q 2706.2 2832.2 2653.5 2881 Q 2552.2 2976.7 2411.5 3033 L 2358.5 3051 L 2311.5 3063 L 2307.5 3065 L 2268.5 3074 L 2183.5 3089 L 2175.5 3089 L 2168.5 3091 L 2143.5 3093 L 2142.5 3094 L 2132.5 3094 L 2123.5 3096 L 2100.5 3097 L 2099.5 3098 L 2097.5 3098 L 2086.5 3098 L 2085.5 3099 L 2083.5 3099 L 2068.5 3099 L 2067.5 3100 L 2065.5 3099 L 2064.5 3100 L 2043.5 3100 L 2039.5 3101 L 2035.5 3101 L 1968.5 3101 L 1967.5 3100 L 1943.5 3100 L 1942.5 3099 L 1928.5 3099 L 1927.5 3098 L 1925.5 3098 L 1900.5 3097 L 1899.5 3096 L 1889.5 3096 L 1880.5 3094 L 1878.5 3094 L 1846.5 3091 L 1845.5 3090 L 1807.5 3085 L 1796.5 3082 L 1785.5 3081 Q 1775 3077 1761.5 3076 L 1712.5 3064 L 1636.5 3040 L 1561.5 3009 Q 1413.8 2939.2 1308 2827.5 Q 1200.6 2714.9 1135 2560.5 L 1118 2517.5 L 1100 2464.5 L 1078 2383.5 L 1060 2292.5 L 1060 2286.5 L 1059 2285.5 L 1054 2245.5 L 1053 2244.5 L 1051 2221.5 L 1050 2220.5 L 1048 2193.5 L 1047 2192.5 L 1047 2190.5 L 1045 2159.5 L 1044 2158.5 L 1044 2146.5 L 1043 2145.5 L 1043 2131.5 L 1042 2130.5 L 1041 2092.5 L 1040 2091.5 L 1040 2062.5 L 1039 2061.5 L 1039 1967.5 L 1040 1966.5 L 1040 1942.5 L 1041 1941.5 L 1040 1939.5 L 1040 1937.5 L 1041 1935.5 L 1041 1918.5 L 1042 1917.5 L 1041 1914.5 L 1042 1913.5 L 1042 1899.5 L 1043 1898.5 L 1042 1896.5 L 1043 1895.5 L 1043 1881.5 L 1044 1880.5 L 1044 1869.5 L 1045 1868.5 L 1045 1866.5 L 1045 1854.5 L 1047 1844.5 L 1046 1842.5 L 1047 1841.5 L 1048 1821.5 L 1050 1812.5 L 1050 1810.5 L 1051 1793.5 L 1053 1785.5 L 1053 1777.5 L 1054 1776.5 L 1058 1740.5 L 1060 1733.5 L 1060 1726.5 L 1061 1725.5 L 1066 1690.5 L 1068 1684.5 L 1068 1679.5 L 1070 1674.5 L 1074 1649.5 L 1083 1615.5 L 1083 1611.5 L 1096 1565.5 L 1110 1522.5 L 1140 1445.5 Q 1175.9 1362.9 1222 1290.5 Q 1275.4 1206.4 1344.5 1138 Q 1395.2 1087.7 1456.5 1048 L 1495.5 1025 L 1530.5 1007 L 1601.5 976 L 1683.5 948 L 1770.5 926 L 1790.5 923 L 1801.5 920 L 1806.5 920 L 1812.5 918 L 1818.5 918 L 1824.5 916 L 1857.5 912 L 1858.5 911 L 1866.5 911 L 1867.5 910 L 1900.5 907 L 1901.5 906 L 1936.5 904 L 1937.5 903 L 1952.5 903 L 1954.5 902 L 1956.5 902 L 1974.5 902 L 1975.5 901 Z M 2059 2030 L 2058 2031 L 2037 2031 L 2033 2031 L 2031 2032 L 2019 2032 L 2018 2033 L 2005 2033 L 2003 2033 L 2002 2034 L 1969 2037 L 1940 2042 L 1915 2048 L 1893 2055 Q 1870 2063 1852 2074 Q 1833 2085 1818 2100 Q 1797 2120 1784 2149 L 1776 2173 L 1774 2190 L 1773 2191 L 1773 2204 L 1772 2205 L 1773 2227 L 1774 2228 L 1775 2240 L 1783 2268 Q 1793 2292 1809 2311 Q 1827 2331 1852 2346 L 1896 2368 L 1919 2376 L 1951 2384 L 1975 2387 L 1976 2388 L 1984 2388 L 1985 2389 L 2012 2390 L 2015 2391 L 2016 2390 L 2025 2390 L 2027 2390 L 2029 2391 L 2030 2390 L 2057 2389 L 2058 2388 L 2065 2388 L 2066 2387 L 2084 2385 L 2109 2379 L 2127 2373 Q 2169 2357 2200 2329 Q 2220 2310 2237 2287 Q 2260 2254 2276 2215 L 2290 2175 L 2300 2137 L 2309 2087 L 2312 2055 L 2312 2053 L 2313 2050 L 2279 2043 L 2243 2039 L 2242 2038 L 2235 2038 L 2234 2037 L 2226 2037 L 2225 2036 L 2205 2035 L 2204 2034 L 2191 2034 L 2190 2033 L 2176 2033 L 2175 2032 L 2130 2031 L 2126 2031 L 2121 2030 L 2071 2030 L 2069 2031 L 2067 2031 Q 2060 2033 2059 2030 Z" /></svg>
                        </a>` : ''}

                         ${user.socials.fv ? `<a href="${user.socials.fv.startsWith('http') ? user.socials.fv : 'https://fanvue.com/' + user.socials.fv}" target="_blank" title="Fanvue" style="text-decoration:none; width:30px; height:30px">
                            <svg viewBox="0 0 686 671" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M 390.5 159 L 392.5 159 L 557.5 159 Q 567.5 160.5 572 167.5 L 576 176.5 L 576 184.5 Q 573.5 193 567.5 198 L 558.5 203 L 549.5 205 L 512.5 209 L 496.5 212 L 489.5 212 L 488.5 213 L 481.5 213 L 480.5 214 L 473.5 214 L 472.5 215 L 465.5 215 L 464.5 216 L 434.5 220 L 415.5 225 L 402.5 230 Q 390.8 234.8 383 243.5 L 378 251.5 L 376 259.5 L 377 262.5 Q 378 279 387.5 287 L 406.5 299 L 419.5 304 L 457.5 314 L 471 322.5 Q 476.2 326.8 475 337.5 Q 471.9 347.9 463.5 353 L 442.5 362 L 386.5 375 L 349.5 388 Q 317.9 401.4 297 425.5 Q 269.1 457.1 248 495.5 L 234.5 510 L 223.5 517 L 217.5 519 L 204.5 519 L 195 512.5 L 192 506.5 L 191 498.5 L 204 450.5 L 205 438.5 L 206 437.5 L 206 415.5 Q 203.2 400.8 193.5 393 Q 184.2 384.3 171.5 379 L 154.5 373 L 127.5 366 Q 117.9 363.1 112 356.5 Q 106.8 352.2 108 341.5 Q 110.8 332.3 117.5 327 L 130.5 319 L 138.5 316 L 188.5 304 L 192.5 304 L 228.5 292 Q 265.8 275.8 290 246.5 L 292 243.5 L 311 220.5 L 336 183.5 L 346.5 172 Q 354.2 165.2 365.5 162 L 376.5 160 L 389.5 160 L 390.5 159 Z" /></svg>
                        </a>` : ''}

                    </div>` : ''}
                    
                     ${!isMe ? `<button class="btn" style="margin-top:15px" onclick="window.doFollow('${user.username}')">${store.currentUser?.following?.includes(user.id) ? 'Siguiendo' : 'Seguir'}</button>`
            : `<button class="btn-outline" style="margin-top:15px" onclick="window.openSettings()">⚙️ Configurar Perfil</button>`}
                </div>
            </div>
            <div style="display:flex; gap:20px; border-bottom:1px solid #333">
                <button class="profile-tab ${profileTab === 'creations' ? 'active' : ''}" onclick="window.setProfileTab('creations')">Creaciones</button>
                ${isMe ? `<button class="profile-tab ${profileTab === 'saved' ? 'active' : ''}" onclick="window.setProfileTab('saved')">Guardados</button>` : ''}
            </div>
            </div>
        </div>
    </div>`;
};

// --- TOP CREATORS COMPONENT ---
const renderTopCreators = (details) => {
    // Hide for visitors (no currentUser) or empty details
    if (!store.currentUser || !details || details.length === 0) return '';
    return `
    <div class="top-creators-banner">
        <div class="tc-header">
            <div>
                <div class="tc-title">⭐ Top Creadores</div>
                <div class="tc-subtitle">Cuadro de Honor • Los 10 Mejores</div>
            </div>
        </div>
        <div class="tc-grid">
            ${details.map((u, idx) => {
        const username = u.username || u.name || 'Usuario';
        const avatar = u.avatar || u.avatar_url || `https://robohash.org/${encodeURIComponent(username)}?set=set4`;

        return `
            <div class="tc-card" onclick="window.openUserProfile('${username}')">
                <div class="tc-rank">#${idx + 1}</div>
                <img src="${avatar}" class="tc-avatar" loading="lazy" onerror="this.src='https://robohash.org/${encodeURIComponent(username)}?set=set4'">
                <div class="tc-name">${username}</div>
                <div class="tc-stats" style="background:linear-gradient(90deg, #ccc, #777); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-weight:700; font-size:0.7rem; letter-spacing:0.5px">${u.prompts_count || 0} PROMPTS</div>
                <div class="tc-level">Nivel ${u.level || 0}</div>
            </div>`;
    }).join('')}
        </div>
    </div>`;
};

const loadTopCreators = async () => {

    topCreatorsList = await store.getTopCreators();
    if (currentView === 'home' && filters.source === 'community') render(); // Re-render if on home
};

const Gallery = () => {
    const list = getFilteredPrompts(); // Use shared filtering function
    const isMyProfile = (currentView === 'profile' && profileUser === store.currentUser?.username && profileTab === 'creations');

    if (list.length === 0) {
        if (isMyProfile) {
            return `
            <div class="container" style="padding: 40px 20px; text-align: center;">
                <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 60px 20px; border-radius: 20px; border: 1px dashed #444; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <div style="font-size: 4rem; margin-bottom: 20px;">✨</div>
                    <h2 style="font-size: 2rem; color: #fff; margin-bottom: 10px;">¡Tu galería está lista para brillar!</h2>
                    <p style="color: #888; font-size: 1.1rem; margin-bottom: 30px; max-width: 500px; margin-left: auto; margin-right: auto;">
                        Aún no has compartido ningún prompt. ¡Sé el primero en inspirar a la comunidad con tus creaciones!
                    </p>
                    <button class="btn" onclick="document.getElementById('createModal').style.display = 'flex'" style="padding: 15px 40px; font-size: 1.2rem; border-radius: 50px; background: var(--accent); color: white; border: none; cursor: pointer; transition: transform 0.2s; font-weight: bold; box-shadow: 0 5px 15px var(--accent-alpha);">
                        🚀 Comparte tu primer prompt
                    </button>
                </div>
            </div>`;
        } else if (currentView === 'profile') {
            return `
            <div class="container" style="padding: 80px 20px; text-align: center; color: #666;">
                <div style="font-size: 3rem; margin-bottom: 20px; grayscale: 1; opacity: 0.5;">🏜️</div>
                <h3 style="font-size: 1.5rem; margin-bottom: 10px;">Este usuario aún no ha compartido prompts</h3>
                <p>Vuelve más tarde para ver sus creaciones.</p>
            </div>`;
        }
    }

    return `<div class="container"><div class="gallery-grid">
        ${list.map((p, idx) => {
        const { applyBlur, warningLabel } = getModeration(p);
        const reactions = p.reactions || { like: 0, love: 0, fire: 0, funny: 0 };
        const totalReacts = Object.values(reactions).reduce((a, b) => a + b, 0);

        const card = `<div class="card">
                <div class="card-img-wrap ${p.type !== 'sequence' && applyBlur ? 'card-blurred' : ''}" data-post-id="${p.id}" data-warning="${applyBlur ? warningLabel : ''}" style="height:100%; cursor:pointer">
                    ${renderCollage(p)}
                </div>
                <div class="card-overlay" data-post-id="${p.id}" style="cursor:pointer">
                    <div style="font-weight:700; font-size:0.9rem; margin-bottom:5px">${window.escapeHTML(p.title)}</div>
                    <div style="font-size:0.8rem; opacity:0.8; margin-bottom:10px; cursor:pointer" onclick="event.stopPropagation(); window.openUserProfile('${p.author}')">por @${window.escapeHTML(p.author)}</div>
                    <div class="card-stats" style="font-size:0.75rem; display:flex; gap:8px; flex-wrap:wrap">
                        <span title="Me gusta">👍 ${reactions.like || 0}</span>
                        <span title="Me encanta">❤️ ${reactions.love || 0}</span>
                        <span title="Fuego">🔥 ${reactions.fire || 0}</span>
                        <span title="Divertido">😂 ${reactions.funny || 0}</span>
                        <span title="Dislike">👎 ${reactions.dislike || 0}</span>
                        <span title="Triste">😢 ${reactions.sad || 0}</span>
                        <span title="Copiado" style="color:var(--accent); font-weight:700">📋 ${p.copy_count || 0}</span>
                        <span title="PromptBits Recibidos" onclick="event.stopPropagation(); window.openTip('${p.id}')" style="color:#a29bfe; font-weight:700; cursor:pointer">💎 ${p.tokens_received || 0}</span>
                    </div>
                </div>
                
                 ${(currentView === 'profile' && profileUser === store.currentUser?.username && p.author === store.currentUser?.username) ? `
                 <div style="position:absolute; top:10px; right:10px; display:flex; gap:5px; z-index:10;">
                     ${(store.currentUser?.level >= 4 && !p.is_featured) ? `<button class="btn-icon" style="background:rgba(241,196,15,0.8); padding:5px; width:auto; height:30px; font-size:0.75rem; color:black; font-weight:700" onclick="event.stopPropagation(); window.doPromotePrompt('${p.id}')" title="Destacar por 1 semana (50 PromptBits)">💎 50 PromptBits</button>` : ''}
                     <button class="btn-icon" style="background:rgba(0,0,0,0.6); padding:5px; width:30px; height:30px; font-size:0.9rem" onclick="event.stopPropagation(); window.doEditPrompt('${p.id}')" title="Editar">✏️</button>
                     <button class="btn-icon" style="background:rgba(0,0,0,0.6); padding:5px; width:30px; height:30px; font-size:0.9rem" onclick="event.stopPropagation(); window.doDeletePrompt('${p.id}')" title="Eliminar Post">🗑️</button>
                 </div>` : ''}

                 ${(currentView === 'profile' && profileUser === store.currentUser?.username && profileTab === 'saved') ? `
                 <div style="position:absolute; top:10px; right:10px; display:flex; gap:5px; z-index:10;">
                     <button class="btn-icon" style="background:rgba(0,0,0,0.6); padding:5px; width:30px; height:30px; font-size:0.9rem" onclick="event.stopPropagation(); window.doUnsave('${p.id}')" title="Quitar de Favoritos">❌</button>
                 </div>` : ''}
            </div>`;

        // Insert Top Creators Banner after 12 posts (idx == 11)
        const topCreatorsBanner = (idx === 11 && currentView === 'home' && filters.source === 'community')
            ? `</div>${renderTopCreators(topCreatorsList)}<div class="gallery-grid">`
            : '';

        // Insert ad banner every 12 posts (shifted if top creators is shown)
        // Avoid double banner at index 11 by shifting ad to next slot or skipping
        const adBanner = (idx > 11 && (idx + 1) % 12 === 0) ? `</div><div class="ad-banner"></div><div class="gallery-grid">` : '';
        return card + topCreatorsBanner + adBanner;
    }).join('')}
    </div>
    
    ${!store.currentUser ? `
    <div class="container" style="margin-top: 40px; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 60px 20px; border-radius: 20px; border: 2px solid var(--accent); box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 20px;">🔓</div>
            <h2 style="font-size: 2rem; color: #fff; margin-bottom: 10px;">¡Desbloquea toda la galería!</h2>
            <p style="color: #888; font-size: 1.1rem; margin-bottom: 30px; max-width: 600px; margin-left: auto; margin-right: auto;">
                Has visto los 12 prompts más recientes. Regístrate gratis para acceder a toda la colección, guardar tus favoritos y compartir tus propias creaciones.
            </p>
            <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                <button class="btn" onclick="window.openRegister()" style="padding: 15px 40px; font-size: 1.2rem; border-radius: 50px; background: var(--accent); color: white; border: none; cursor: pointer; font-weight: bold; box-shadow: 0 5px 15px var(--accent-alpha);">
                    🚀 Crear Cuenta Gratis
                </button>
                <button class="btn-outline" onclick="window.openLogin()" style="padding: 15px 40px; font-size: 1.2rem; border-radius: 50px;">
                    🔑 Iniciar Sesión
                </button>
            </div>
        </div>
    </div>
    ` : ''}
    </div></div>`;
};

const TipModal = () => `
<div id="tipModal" class="modal-overlay" style="display:none; z-index:9999999 !important;"><div class="modal-container" style="max-width:400px; text-align:center; position:relative; z-index:9999999">
    <div style="font-size:3rem; margin-bottom:10px">💎</div>
    <h2 id="tipTitle">Enviar Propina</h2>
    <p id="tipSubtitle" style="color:#888; margin-bottom:20px"></p>
    
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px">
        <button class="btn-outline" onclick="window.doSendTip(5)">💎 5 PromptBits</button>
        <button class="btn-outline" onclick="window.doSendTip(10)">💎 10 PromptBits</button>
        <button class="btn-outline" onclick="window.doSendTip(20)">💎 20 PromptBits</button>
        <button class="btn-outline" onclick="window.doSendTip(50)">💎 50 PromptBits</button>
    </div>
    
    <div style="font-size:0.8rem; color:#666; margin-bottom:20px">
        Tu saldo: <span id="tipMyTokens" style="color:#a29bfe; font-weight:700">0</span> PromptBits
    </div>

    <button class="btn-outline" style="width:100%; border:none; color:#666" onclick="window.closeModals()">Cancelar</button>
</div></div>`;

// --- MODALS ---
const AuthModal = () => `
<div id="authModal" class="modal-overlay" style="display:none;"><div class="modal-container">
    <div id="loginForm">
        <h2>Entrar</h2>
        <input type="text" id="logUser" class="form-input" placeholder="Usuario o Email">
        <div style="position:relative">
            <input type="password" id="logPass" class="form-input" placeholder="Pass" style="padding-right:40px">
            <span onclick="window.togglePass('logPass', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:1.2rem; user-select:none">👁️</span>
        </div>
        <button class="btn" style="width:100%" onclick="window.doLoginSubmit()">Login</button>
        <p style="margin-top:10px; font-size:0.9em">
            <a href="#" onclick="window.toggleAuth('rec')" style="color:#666">¿Olvidaste tu contraseña?</a>
        </p>
        <p>¿No tienes cuenta? <a href="#" onclick="window.toggleAuth('reg')">Regístrate</a></p>
    </div>
    <div id="regForm" style="display:none;">
        <h2>Registro</h2>
        <input type="text" id="regEmail" class="form-input" placeholder="Email">
        <input type="text" id="regUser" class="form-input" placeholder="Usuario">
        <div style="position:relative">
            <input type="password" id="regPass" class="form-input" placeholder="Contraseña" style="padding-right:40px">
            <span onclick="window.togglePass('regPass', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:1.2rem; user-select:none">👁️</span>
        </div>
        <button class="btn" style="width:100%" onclick="window.doRegisterSubmit()">Registrar</button>
        <p>¿Ya tienes cuenta? <a href="#" onclick="window.toggleAuth('log')">Login</a></p>
    </div>
    <div id="recoverForm" style="display:none;">
        <h2>Recuperar Pass</h2>
        <p style="margin-bottom:15px; color:#888; font-size:0.85rem">Introduce tu email de registro:</p>
        <input type="email" id="recEmail" class="form-input" placeholder="ejemplo@correo.com" style="margin-bottom:15px">
        <button class="btn" style="width:100%" onclick="window.doRecoverSubmit()">Enviar Instrucciones</button>
        <p style="margin-top:15px; font-size:0.9rem">
            <a href="#" onclick="window.toggleAuth('log')" style="color:#666">Volver al Login</a>
        </p>
    </div>
    <div id="activateForm" style="display:none;">
        <h2>Activar Cuenta</h2>
        <p style="margin-bottom:15px; color:#a29bfe; font-size:0.85rem; font-weight:700">¡Bienvenido! Elige tu nueva contraseña para activar tu perfil.</p>
        <input type="text" id="actUser" class="form-input" placeholder="Usuario o Email">
        <div style="position:relative">
            <input type="password" id="actPass" class="form-input" placeholder="Nueva Contraseña" style="padding-right:40px">
            <span onclick="window.togglePass('actPass', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:1.2rem; user-select:none">👁️</span>
        </div>
        <button class="btn" style="width:100%" onclick="window.doActivateSubmit()">Activar y Entrar</button>
    </div>
    <button class="btn-outline" style="width:100%; border:none; margin-top:10px" onclick="window.closeModals()">Cancelar</button>
</div></div>`;

const CreateModal = () => `
<div id="createModal" class="modal-overlay" style="display:none;"><div class="modal-container">
    <h2>Compartir Prompt</h2>
    
    <div class="form-group">
        <label class="form-label">Tipo de Prompt</label>
        <div style="display:flex; gap:15px; margin-bottom:20px">
            <label class="chk-wrap">
                <input type="radio" name="postType" value="single" checked onchange="window.togglePostType('single')">
                <span>Sencillo (1 imagen)</span>
            </label>
            <label class="chk-wrap">
                <input type="radio" name="postType" value="sequence" onchange="window.togglePostType('sequence')">
                <span>Secuencia (Múltiples) <small style="color:var(--accent); font-weight:bold">[Nivel 1+]</small></span>
            </label>
        </div>
    </div>
    
    <!-- FIX: Form wrapper to prevent autofill -->
    <form autocomplete="off" onsubmit="return false;" style="display:contents">
        <input type="text" name="fakeusernameremembered" style="display:none" autocomplete="username">
        <input type="password" name="fakepasswordremembered" style="display:none" autocomplete="current-password">
    
    <input type="text" id="upTitle" class="form-input" placeholder="Título" style="margin-bottom:15px" autocomplete="off" name="post_title_unique_id">
    
    <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px">
        <label class="form-label" style="font-size:0.75rem; color:#666">HERRAMIENTA</label>
        <select id="upTool" class="form-input" style="margin:0" onchange="window.checkToolConfig()">${TOOLS.map(t => `<option value='${t}'>${t}</option>`).join('')}</select>
    </div>

    <!-- Contenedor para Checkpoint/LoRA/Embedding (Solo para SD/Comfy/Fooocus) -->
    <div id="upExtraConfig" style="display:none; background:#111; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #222">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
            <span style="font-size:0.8rem; font-weight:bold; color:var(--accent)">CONFIGURACIÓN ADICIONAL</span>
            <button class="btn-icon" onclick="window.addExtraRow()" style="background:var(--accent); width:24px; height:24px; font-size:1.2rem; display:flex; align-items:center; justify-content:center">+</button>
        </div>
        <div id="extraRowsContainer"></div>
    </div>
    
    <div id="singleFields">
        <div style="display:flex; align-items:center; margin-bottom:15px">
            <select id="upRating" class="form-input" style="margin:0">${RATINGS.map(r => `<option value='${r}'>${r}</option>`).join('')}</select>
            ${INFO_ICON}
        </div>
        <input type="file" id="upFile" class="form-input" accept="image/*" style="margin-bottom:15px" onchange="window.previewFile(this, 'singlePreview')">
        <div id="singlePreview" style="width:100%; display:none; background:#000; border-radius:8px; margin-bottom:15px; border:1px solid #333; align-items:center; justify-content:center; padding:10px; overflow:hidden">
            <img src="" style="max-width:100%; max-height:350px; display:block; border-radius:4px">
        </div>
        <label class="form-label" style="font-size:0.75rem; color:#666">PROMPT</label>
        <textarea id="upPrompt" class="form-input" placeholder="Prompt positivo..." rows="4" autocomplete="off" style="margin-bottom:10px"></textarea>
        
        <div style="display:flex; justify-content:center; margin-bottom:10px">
            <button class="btn-outline" onclick="window.toggleNeg('singleNeg')" style="padding:4px 12px; font-size:0.85rem; border-color:#ff4444; color:#ff4444; border-radius:20px; font-weight:700">+Añadir Negative Prompt</button>
        </div>
        
        <div id="singleNeg" style="display:none; margin-bottom:15px">
            <label class="form-label" style="font-size:0.75rem; color:#ff4444">NEGATIVE PROMPT</label>
            <textarea id="upNegPrompt" class="form-input" placeholder="Lo que NO quieres en la imagen..." rows="3" style="border-color:#ff4444; background:rgba(255,0,0,0.05)"></textarea>
        </div>
    </div>
    
    <div id="sequenceFields" style="display:none">
        <div id="seqContainer"></div>
        <button class="btn-outline" onclick="window.addSeqStep()" style="width:100%; margin-bottom:15px">+ Añadir Paso</button>
    </div>
    
    <div id="tagSelectorRoot"></div>

    <div style="display:flex; flex-direction:column; gap:5px; margin:15px 0">
        <label class="chk-wrap">
            <input type="checkbox" id="upReference" name="reference_chk_unique">
            <span>📸 Requiere imagen de referencia</span>
        </label>
        <label class="chk-wrap">
            <input type="checkbox" id="upPrivate" name="private_chk_unique">
            <span>🔒 Hacer privado (solo yo puedo verlo)</span>
        </label>
    </div>
    
    </form>
    
    <div style="display:flex; gap:10px">
        <button class="btn" id="pubBtn" onclick="window.doPublish()" style="width:100%; margin-bottom:10px">Publicar</button>
        <button class="btn-outline" onclick="window.closeModals()" style="width:100%">Cerrar</button>
</div></div>`;

const DetailModal = () => `
<div id="viewModal" class="modal-overlay" style="display:none;" onclick="if(event.target === this) window.closeModals()">
    <div class="view-modal-wrapper">
        <div class="view-modal">
            <button class="modal-close-x" onclick="window.closeModals()">✕</button>
            <div class="view-img-side" id="detImgWrap">
                <div id="detCopyBadge" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); padding:4px 10px; border-radius:15px; font-size:0.7rem; color:var(--accent); font-weight:700; border:1px solid var(--accent); display:none; z-index:10">📋 Copiado 0 veces</div>
                <img id="detImg" src="" alt="Post Image">
                <button class="fullscreen-btn" onclick="window.doFullScreen()">🔍 Ver Pantalla Completa</button>
                
                <!-- Navegación de Secuencia Movida Fuera para mejor visibilidad -->
                <div class="seq-nav-btn prev" id="detPrevBtn" onclick="window.prevSeqStep()" style="display:none">❮</div>
                <div class="seq-nav-btn next" id="detNextBtn" onclick="window.nextSeqStep()" style="display:none">❯</div>
                <div class="seq-counter" id="detSeqCount" style="display:none"></div>
            </div>
            
            <div class="view-info-side">
                <div class="view-scroll-content">
                    <div id="detMetaTop" style="font-size:0.65rem; color:#666; font-weight:700; margin-bottom:5px; text-transform:uppercase"></div>
                    <div id="detExtra" style="margin-bottom:10px; font-size:0.85rem"></div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px">
                        <h2 id="detTitle" style="margin:0; flex:1"></h2>
                        <div class="dropdown" style="position:relative">
                            <button class="btn-icon" onclick="window.toggleOptionsMenu()" style="font-size:1.5rem">⋮</button>
                            <div id="optionsMenu" class="dropdown-menu" style="right:0; left:auto; display:none">
                                <div class="dropdown-item" onclick="window.doSavePrompt()">💾 Guardar</div>
                                <div class="dropdown-item" onclick="window.doCopyPrompt()">📋 Copiar Prompt</div>
                                <div class="dropdown-item" id="optReport" onclick="window.doReportPrompt()">⚠️ Reportar</div>
                                <div class="dropdown-item" id="optHide" onclick="window.doHidePrompt()">🚫 Ocultar Post</div>
                                <div class="dropdown-item" id="optBlock" onclick="window.doBlockUser()">👤 Bloquear Usuario</div>
                                <div class="dropdown-item" id="optAdminFeature" style="display:none; color:gold" onclick="window.doAdminFeaturePrompt()">⭐ Destacar (Admin)</div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="detUser" style="font-weight:700; margin-bottom:10px; color:var(--accent); cursor:pointer"></div>
                    <div id="detOrigCreator" style="display:none; align-items:center; gap:5px; font-size:0.85rem; color:#888; margin-bottom:15px">
                        <span>🎨 Creador Original:</span>
                        <a id="detOrigLink" href="#" target="_blank" style="color:var(--accent); text-decoration:none; font-weight:600"></a>
                    </div>
    
                    <div id="detBadges" style="display:flex; gap:8px; margin-bottom:15px; flex-wrap:wrap"></div>
                    <div id="detTags" class="server-tags-display"></div>
                    
                    <div style="position:relative">
                        <div id="detPrompt" class="prompt-area"></div>
                        <div id="detNegPrompt" class="prompt-area" style="display:none; margin-top:10px; border-color:#ff4444; background:rgba(255,0,0,0.05); color:#ff6666"></div>
                        <button class="btn-outline" onclick="window.doCopyPrompt()" style="width:100%; margin-top:10px">📋 Copiar Prompt</button>
                    </div>
                    
                    <div class="reactions-flex" style="margin-top:20px; display:flex; gap:10px; flex-wrap:wrap">
                        <button class="react-btn" id="btn-react-like" onclick="window.doReact('like')">👍 <small id="det-like-count">0</small></button>
                        <button class="react-btn" id="btn-react-love" onclick="window.doReact('love')">❤️ <small id="det-love-count">0</small></button>
                        <button class="react-btn" id="btn-react-fire" onclick="window.doReact('fire')">🔥 <small id="det-fire-count">0</small></button>
                        <button class="react-btn" id="btn-react-funny" onclick="window.doReact('funny')">😂 <small id="det-funny-count">0</small></button>
                        <button class="react-btn" id="btn-react-dislike" onclick="window.doReact('dislike')">👎 <small id="det-dislike-count">0</small></button>
                        <button class="react-btn" id="btn-react-sad" onclick="window.doReact('sad')">😢 <small id="det-sad-count">0</small></button>
                    </div>
                    
                    <div style="margin-top:20px; border-top:1px solid #222; padding-top:15px">
                         <h3 style="font-size:1rem; margin-bottom:10px">Comentarios</h3>
                         <div id="detComments"></div>
                    </div>
                </div>
                
                <div class="view-footer">
                    <!-- Anti-Bot Container -->
                    <div id="commAntiBot" class="comment-anti-bot-container" style="display:none">
                        <div class="crystal-slider-wrapper" id="commSlider">
                            <div class="crystal-slider-track-text">Desliza 💎 para confirmar</div>
                            <div class="crystal-slider-handle" id="commSliderHandle">💎</div>
                        </div>
                        <input type="text" name="b_name" class="hp-field" id="commHoneypot" tabindex="-1" autocomplete="off">
                    </div>

                    <div style="display:flex; gap:10px; margin-top:10px">
                        <input type="text" id="commInput" class="form-input" placeholder="Escribe un comentario..." onfocus="window.showSlider()">
                        <button class="btn" id="commSubmitBtn" onclick="window.postComm()">Enviar</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="ad-bottom"></div>
    </div>
</div>`;

const SettingsModal = () => {
    if (!store.currentUser) return '';
    const u = store.currentUser;
    const soc = u.socials || {};
    const mod = u.moderation || { suggestive: 'ON', nsfw: 'BLUR' };

    return `
<div id="settingsModal" class="modal-overlay" style="display:none;">
    <div class="modal-container" style="max-width:600px">
        <h2>Configuración de Perfil</h2>
        
        <div class="settings-section" style="margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid #333">
            <h3>👤 Cuenta</h3>
            <div style="display:flex; gap:20px; align-items:center; margin-bottom:15px">
                <div class="user-avatar-lg" id="previewAvatar" style="width:80px; height:80px; background-image:url('${u.avatar || 'https://robohash.org/' + u.username}')"></div>
                <div>
                    ${(u.level && u.level >= 2) ? `
                    <button class="btn-outline" onclick="document.getElementById('setAvatarFile').click()">Cambiar Foto</button>
                    ` : `
                    <span style="background:rgba(255,165,0,0.1); color:#ffa500; padding:6px 12px; border-radius:4px; font-size:0.8rem; font-weight:700; border:1px solid rgba(255,165,0,0.3); cursor:not-allowed" title="Necesitas ser Nivel 2 (Principiante) para cambiar tu foto">🔒 Nivel 2 Requerido</span>
                    `}
                    <input type="file" id="setAvatarFile" accept="image/*" style="display:none" onchange="window.previewAvatar(this)">
                </div>
            </div>
            
            <label class="form-label">Nombre de Usuario</label>
            <input type="text" id="setUser" class="form-input" value="${u.username}">
            
            <div style="margin-top:15px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px">
                <button class="btn-outline" onclick="document.getElementById('passSec').style.display = document.getElementById('passSec').style.display === 'none' ? 'block' : 'none'" style="width:100%; text-align:left; display:flex; justify-content:space-between; align-items:center">
                    <span>🔒 Cambiar Contraseña</span>
                    <span>▼</span>
                </button>
                <div id="passSec" style="display:none; margin-top:10px">
                    <label class="form-label">Nueva Contraseña</label>
                    <div style="position:relative">
                        <input type="password" id="newPassInput" class="form-input" placeholder="Mínimo 6 caracteres" style="padding-right:40px">
                        <span onclick="window.togglePass('newPassInput', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:1.2rem; user-select:none">👁️</span>
                    </div>
                    <button class="btn" onclick="window.doChangePassword()" style="margin-top:10px; width:100%; background:#d32f2f">Actualizar Contraseña</button>
                </div>
            </div>

        </div>

        <div class="settings-section" style="margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid #333; position:relative">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
                <h3 style="margin:0">🌐 Redes Sociales</h3>
                ${(u.level && u.level >= 2) ? '' : `<span style="background:rgba(255,165,0,0.1); color:#ffa500; padding:4px 8px; border-radius:4px; font-size:0.7rem; font-weight:700; border:1px solid rgba(255,165,0,0.3)">🔒 Nivel 2 Requerido</span>`}
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; ${(u.level && u.level >= 2) ? '' : 'opacity:0.3; pointer-events:none; filter:grayscale(1)'}">
                <div>
                    <label class="form-label">Instagram</label>
                    <input type="text" id="setIg" class="form-input" placeholder="@usuario" value="${soc.ig || ''}" ${(u.level && u.level >= 2) ? '' : 'disabled'}>
                </div>
                <div>
                    <label class="form-label">Facebook</label>
                    <input type="text" id="setFb" class="form-input" placeholder="URL o usuario" value="${soc.fb || ''}" ${(u.level && u.level >= 2) ? '' : 'disabled'}>
                </div>
                <div>
                    <label class="form-label">X / Twitter</label>
                    <input type="text" id="setX" class="form-input" placeholder="@usuario" value="${soc.x || ''}" ${(u.level && u.level >= 2) ? '' : 'disabled'}>
                </div>
                <div>
                    <label class="form-label">Telegram Channel</label>
                    <input type="text" id="setTg" class="form-input" placeholder="t.me/canal" value="${soc.tg || ''}" ${(u.level && u.level >= 2) ? '' : 'disabled'}>
                </div>
                <div>
                    <label class="form-label">Threads</label>
                    <input type="text" id="setTh" class="form-input" placeholder="@usuario" value="${soc.th || ''}" ${(u.level && u.level >= 2) ? '' : 'disabled'}>
                </div>
                <div>
                    <label class="form-label">Fanvue</label>
                    <input type="text" id="setFv" class="form-input" placeholder="URL Completa" value="${soc.fv || ''}" ${(u.level && u.level >= 2) ? '' : 'disabled'}>
                </div>
            </div>
        </div>

        <div class="settings-section" style="margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid #333">
            <h3>🛡️ Moderación de Contenido</h3>
            
            <div style="margin-bottom:15px">
                <label class="form-label">Contenido Sugestivo</label>
                <select id="setModSugg" class="form-input">
                    <option value="ON" ${mod.suggestive === 'ON' ? 'selected' : ''}>Mostrar</option>
                    <option value="BLUR" ${mod.suggestive === 'BLUR' ? 'selected' : ''}>Difuminar (Blur)</option>
                </select>
            </div>

            <div>
                <label class="form-label">Contenido NSFW / +18</label>
                <select id="setModNsfw" class="form-input">
                    <option value="ON" ${mod.nsfw === 'ON' ? 'selected' : ''}>Mostrar</option>
                    <option value="BLUR" ${mod.nsfw === 'BLUR' ? 'selected' : ''}>Difuminar (Blur)</option>
                    <option value="OFF" ${mod.nsfw === 'OFF' ? 'selected' : ''}>Apagar (No mostrar)</option>
                </select>
            </div>
        </div>

        <div class="settings-section" style="margin-bottom:20px; background:#331111; padding:15px; border-radius:8px; border:1px solid #ff4444">
            <h3 style="color:#ff4444; margin-top:0">⚠️ Zona de Peligro</h3>
            <p style="font-size:0.9rem; color:#faa">Esta acción es irreversible. Se borrarán todos tus posts y datos.</p>
            <button class="btn-outline" onclick="window.doDeleteAccount()" style="border-color:#ff4444; color:#ff4444; width:100%">ELIMINAR MI CUENTA</button>
        </div>

        <div style="display:flex; gap:10px">
            <button class="btn" onclick="window.saveSettings()" style="flex:1">Guardar Cambios</button>
            <button class="btn-outline" onclick="window.closeModals()" style="flex:1">Cancelar</button>
        </div>
    </div>
</div>`;
};

const InfoModal = () => `
<div id="infoModal" class="modal-overlay" style="display:none;"><div class="modal-container">
    <div id="infoContent"></div>
    <button class="btn" style="width:100%; margin-top:20px" onclick="window.closeModals()">OK</button>
</div></div>`;

const ConfirmModal = () => `
<div id="confirmModal" class="modal-overlay" style="display:none; z-index:2147483647;"><div class="modal-container" style="max-width:400px; text-align:center">
    <div id="confirmIcon" style="font-size:3rem; margin-bottom:15px">❓</div>
    <div id="confirmText" style="font-size:1.1rem; margin-bottom:25px; line-height:1.5">¿Estás seguro?</div>
    <div style="display:flex; gap:15px; justify-content:center">
        <button class="btn btn-outline" style="flex:1" onclick="window.confirmResolve(false)">Cancelar</button>
        <button class="btn" style="flex:1" onclick="window.confirmResolve(true)">Aceptar</button>
    </div>
</div></div>`;

const Modals = () => AuthModal() + CreateModal() + DetailModal() + InfoModal() + ConfirmModal();

// --- LOGIC ---
const render = () => {
    app.innerHTML = TopBar() + Header() + HeroCarousel() + ProfileHeader() + Gallery() + Modals() + SettingsModal() + TipModal();
    attachEvents();

    // Restaurar los valores visuales de los filtros
    const selects = document.querySelectorAll('.filters-bar select');
    const fKeys = ['source', 'time', 'sort', 'tool', 'refFilter', 'rating'];
    selects.forEach((sel, idx) => {
        if (fKeys[idx] && filters[fKeys[idx]]) sel.value = filters[fKeys[idx]];
    });
    window.scrollTo(0, 0); // Regresar arriba al cambiar de vista
};
window.render = render;

const attachEvents = () => {
    document.getElementById('searchInput')?.addEventListener('input', (e) => { searchQuery = e.target.value; render(); });
    document.getElementById('addBtn')?.addEventListener('click', () => {
        window.selectedTags.clear();
        window.renderTagSelector();
        document.getElementById('createModal').style.display = 'flex';
    });
    document.getElementById('loginBtn')?.addEventListener('click', () => { document.getElementById('authModal').style.display = 'flex'; });

    // Event delegation para clicks en posts: REMOVED from here to avoid duplication.
    // See global listener below.
};

// Global Listener for Post Clicks (Run once)
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-post-id]');
    if (target) {
        const postId = target.getAttribute('data-post-id');
        if (postId) {
            if (typeof window.openDetail === 'function') {
                window.openDetail(postId);
            } else {
                console.error("window.openDetail is not a function");
                alert("Error crítico: La función de detalle no está cargada.");
            }
        }
    }
});

window.toggleAuth = (m) => {
    document.getElementById('loginForm').style.display = m === 'log' ? 'block' : 'none';
    document.getElementById('regForm').style.display = m === 'reg' ? 'block' : 'none';
    const recForm = document.getElementById('recoverForm');
    if (recForm) recForm.style.display = m === 'rec' ? 'block' : 'none';
    const actForm = document.getElementById('activateForm');
    if (actForm) actForm.style.display = m === 'act' ? 'block' : 'none';
};

window.doLoginSubmit = async () => {
    const res = await store.login(document.getElementById('logUser').value, document.getElementById('logPass').value);
    if (!res.success) alert(res.msg);
};

window.doRegisterSubmit = async () => {
    const res = await store.register(document.getElementById('regEmail').value, document.getElementById('regUser').value, document.getElementById('regPass').value);
    if (!res.success) alert(res.msg);
};

window.doRecoverSubmit = async () => {
    const email = document.getElementById('recEmail').value;
    if (!email) { if (window.toast) window.toast("Por favor introduce tu email.", "warning"); return; }
    const res = await store.recoverPassword(email);
    alert(res.msg);
    if (res.success) window.toggleAuth('log');
};

window.doActivateSubmit = async () => {
    const userOrEmail = document.getElementById('actUser').value;
    const pass = document.getElementById('actPass').value;
    const token = new URLSearchParams(window.location.search).get('token');

    if (!userOrEmail || !pass) { if (window.toast) window.toast("Rellena todos los campos.", "warning"); return; }
    if (!token) return alert("Token de activación no encontrado.");

    const res = await store.confirmResetPassword(token, pass, userOrEmail);
    if (res.success) {
        alert("¡Cuenta activada con éxito! Bienvenido.");
        window.location.href = '/';
    } else {
        alert(res.msg);
    }
};

window.doLogout = () => {
    store.logout();
};

// Funciones para abrir modal de auth desde botones de paywall
window.openLogin = () => {
    document.getElementById('authModal').style.display = 'flex';
    window.toggleAuth('log');
};

window.openRegister = () => {
    document.getElementById('authModal').style.display = 'flex';
    window.toggleAuth('reg');
};

// Función para mostrar celebración de tokens

// --- TOAST SYSTEM ---
window.toast = (message, type = 'info') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `pg-toast ${type}`;

    let icon = '🔔';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">${message}</div>
    `;

    container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// --- CONFIRM SYSTEM ---
let confirmResolver = null;
window.askConfirm = (message, icon = '❓') => {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        if (!modal) return resolve(false);

        // FIX: Mover al body para asegurar que esté sobre el TipModal (z-index issue)
        if (modal.parentNode !== document.body) {
            document.body.appendChild(modal);
        }

        document.getElementById('confirmText').innerText = message;
        document.getElementById('confirmIcon').innerText = icon;
        modal.style.cssText = 'display: flex !important; z-index: 2147483647 !important; visibility: visible !important; opacity: 1 !important;';
        confirmResolver = resolve;
    });
};

window.confirmResolve = (val) => {
    document.getElementById('confirmModal').style.display = 'none';
    if (confirmResolver) confirmResolver(val);
};

window.showTokenCelebration = (amount = 1, subtitle = null) => {
    const celebration = document.createElement('div');
    celebration.className = 'token-celebration';
    celebration.innerHTML = `
        <div class="celebration-emoji">🎉</div>
        <div class="celebration-title">¡FELICIDADES!</div>
        <div class="celebration-token-amount">+${amount} 💎</div>
        <div class="celebration-subtitle">
            ${subtitle || '¡Sigue compartiendo prompts increíbles y ganando PromptBits!'}
        </div>
    `;

    document.body.appendChild(celebration);

    // Auto-cerrar después de 4 segundos
    setTimeout(() => {
        celebration.classList.add('hide');
        setTimeout(() => celebration.remove(), 400);
    }, 4000);
};

window.setProfileView = (username) => {
    window.openUserProfile(username);
};

window.setProfileTab = (tab) => {
    profileTab = tab;
    render();
};


window.doFollow = async (username, fromDetail = false) => {
    if (!store.currentUser) return window.openLogin();
    await store.followUser(username);

    if (fromDetail) {
        const target = null; // Fix: store.users no existe
        const isFollowing = target && store.currentUser.following?.includes(target.id);
        const btn = document.getElementById('detFollowBtn');
        if (btn) btn.innerText = isFollowing ? 'Siguiendo' : 'Seguir';
        if (currentView === 'profile' && profileUser === username) render();
    } else {
        render();
    }
};


window.revealImage = (btn) => {
    const overlay = btn.closest('.blur-overlay');
    if (overlay) {
        // 1. Remove blurred class from parent wrapper
        const wrapper = overlay.parentElement;
        if (wrapper) wrapper.classList.remove('card-blurred');

        // 2. Remove the overlay itself
        overlay.remove();
    }
};

// HELPER: Validate if file is an image
const isImageFile = (file) => {
    if (!file) return false;
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
    return validTypes.includes(file.type);
};

window.submitSupport = () => {
    const name = document.getElementById('supName').value;
    const email = document.getElementById('supEmail').value;
    const msg = document.getElementById('supMsg').value;
    if (!name || !email || !msg) { if (window.toast) window.toast("Por favor completa todos los campos.", "warning"); return; }
    store.addSupportTicket({ name, email, message: msg });
    if (window.toast) window.toast("Ticket enviado correctamente. Te contactaremos pronto.", "success");
    window.closeModals();
};


// --- CREATE POST FUNCTIONS ---
let seqStepCount = 0;

window.togglePostType = (type) => {
    if (type === 'sequence' && (!store.currentUser || (store.currentUser.level || 0) < 1)) {
        alert("⚠️ Función Bloqueda: Necesitas ser Nivel 1 o superior para subir secuencias (aporta al menos 10 prompts sencillos).");
        const singleRadio = document.querySelector('input[name="postType"][value="single"]');
        if (singleRadio) singleRadio.checked = true;
        return;
    }
    document.getElementById('singleFields').style.display = type === 'single' ? 'block' : 'none';
    document.getElementById('sequenceFields').style.display = type === 'sequence' ? 'block' : 'none';
    if (type === 'sequence' && seqStepCount === 0) {
        window.addSeqStep();
    }
};

window.checkToolConfig = () => {
    const tool = document.getElementById('upTool').value;
    const sdTools = ['S.D 1.5', 'S.D 2.0', 'SDXL', 'Fooocus', 'ComfyUI'];
    const panel = document.getElementById('upExtraConfig');
    if (sdTools.includes(tool)) {
        panel.style.display = 'block';
        // Si no hay filas, añadir una por defecto
        if (document.getElementById('extraRowsContainer').children.length === 0) {
            window.addExtraRow();
        }
    } else {
        panel.style.display = 'none';
    }
};

window.addExtraRow = () => {
    const container = document.getElementById('extraRowsContainer');
    const div = document.createElement('div');
    div.className = 'extra-config-row';
    div.style.cssText = 'display:flex; gap:10px; margin-bottom:10px; align-items:center';
    div.innerHTML = `
        <select class="form-input extra-type" style="margin:0; flex:1">
            <option value="CHECKPOINT">CHECKPOINT</option>
            <option value="LORA">LORA</option>
            <option value="EMBEDDING">EMBEDDING</option>
        </select>
        <input type="text" class="form-input extra-val" placeholder="Nombre/Valor..." style="margin:0; flex:2">
        <button class="btn-icon" onclick="this.parentElement.remove()" style="background:#444; width:24px; height:24px; flex-shrink:0">×</button>
    `;
    container.appendChild(div);
};

window.toggleNeg = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.addSeqStep = () => {
    seqStepCount++;
    const container = document.getElementById('seqContainer');
    const stepDiv = document.createElement('div');
    stepDiv.className = 'seq-step';
    stepDiv.style.cssText = 'border:1px solid #333; padding:15px; border-radius:8px; margin-bottom:15px';
    const negId = `seqNeg-${seqStepCount}`;
    stepDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
            <strong>Paso ${seqStepCount}</strong>
            <button class="btn-outline" onclick="this.parentElement.parentElement.remove()" style="padding:5px 10px">Eliminar</button>
        </div>
        <div style="display:flex; align-items:center; margin-bottom:10px">
            <select class="form-input seqRating" style="margin:0">${RATINGS.map(r => `<option value='${r}'>${r}</option>`).join('')}</select>
            ${INFO_ICON}
        </div>
        <input type="file" class="form-input seqFile" accept="image/*" style="margin-bottom:10px" onchange="window.previewFile(this, 'seqPreview-${seqStepCount}')">
        <div id="seqPreview-${seqStepCount}" style="width:100%; display:none; background:#000; border-radius:8px; margin-bottom:10px; border:1px solid #333; align-items:center; justify-content:center; padding:10px; overflow:hidden">
            <img src="" style="max-width:100%; max-height:300px; display:block; border-radius:4px">
        </div>
        
        <label class="form-label" style="font-size:0.7rem; color:#666">PROMPT</label>
        <textarea class="form-input seqPrompt" placeholder="Prompt para este paso" rows="3" style="margin-bottom:10px"></textarea>

        <div style="display:flex; justify-content:center; margin-bottom:10px">
             <button class="btn-outline" onclick="window.toggleNeg('${negId}')" style="padding:3px 10px; font-size:0.75rem; border-color:#ff4444; color:#ff4444; border-radius:20px; font-weight:700">+Añadir Negative Prompt</button>
        </div>
        
        <div id="${negId}" style="display:none; margin-bottom:10px">
            <label class="form-label" style="font-size:0.7rem; color:#ff4444">NEGATIVE PROMPT</label>
            <textarea class="form-input seqNegPrompt" placeholder="Negative prompt para este paso..." rows="2" style="border-color:#ff4444; background:rgba(255,0,0,0.05)"></textarea>
        </div>
    `;
    container.appendChild(stepDiv);
};

window.openLevelProgress = () => {
    console.log("🚀 openLevelProgress triggered (Dynamic Mode)");
    if (!store.currentUser) { if (window.toast) window.toast("Error: No has iniciado sesión.", "error"); return; }

    // Bloquear scroll del fondo
    document.body.style.overflow = 'hidden';

    // Clean old instances
    const oldModal = document.getElementById('levelModalDynamic');
    if (oldModal) oldModal.remove();

    const u = store.currentUser;
    const postsCount = u.prompts_count || 0;
    const copiesCount = u.total_copies || 0;
    const currentLvl = u.level || 0;

    // Find next level requirements
    const nextLvlIdx = Math.min(currentLvl + 1, LEVEL_REQS.length - 1);
    const nextLvlReq = LEVEL_REQS[nextLvlIdx];
    const isMax = currentLvl >= LEVEL_REQS.length - 1;

    // Calcular progreso
    let progressPosts = 0;
    let progressCopies = 0;

    if (!isMax) {
        const prevReqPosts = LEVEL_REQS[currentLvl].posts;
        const nextReqPosts = nextLvlReq.posts;
        progressPosts = Math.min(100, Math.max(0, ((postsCount - prevReqPosts) / (nextReqPosts - prevReqPosts)) * 100));

        if (nextLvlReq.copies > 0) {
            const prevReqCopies = LEVEL_REQS[currentLvl].copies || 0;
            const nextReqCopies = nextLvlReq.copies;
            progressCopies = Math.min(100, Math.max(0, ((copiesCount - prevReqCopies) / (nextReqCopies - prevReqCopies)) * 100));
        } else {
            progressCopies = 100;
        }
    } else {
        progressPosts = 100;
        progressCopies = 100;
    }

    const needsCopies = nextLvlReq.copies > 0;

    const html = `
        <div style="text-align:center; margin-bottom:25px; padding-bottom:15px; border-bottom:1px solid #222">
            <div style="font-size:3.5rem; margin-bottom:10px">${LEVEL_REQS[currentLvl].icon}</div>
            <h2 style="margin:0; font-size:1.8rem; color:#fff">Tu Historial: Nivel ${currentLvl}</h2>
            <p style="color:#aaa; margin-top:5px; font-weight:600; text-transform:uppercase; letter-spacing:1px">${LEVEL_REQS[currentLvl].name}</p>
        </div>

        <div style="background:#000; padding:25px; border-radius:16px; border:1px solid #333; margin-bottom:25px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5)">
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:1rem; font-weight:700">
                <span style="color:#888">${isMax ? 'Rango Ápice Alcanzado' : 'Progreso de Posts'}</span>
                <span style="color:#2563eb">${postsCount} / ${isMax ? '∞' : nextLvlReq.posts}</span>
            </div>
            <div style="width:100%; height:12px; background:#222; border-radius:6px; overflow:hidden; border:1px solid #333; margin-bottom:15px">
                <div style="width:${progressPosts}%; height:100%; background:linear-gradient(90deg, #2563eb, #a29bfe); transition:width 1s ease"></div>
            </div>

            ${needsCopies ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:1rem; font-weight:700">
                <span style="color:#888">Progreso de Copias</span>
                <span style="color:#f1c40f">${copiesCount} / ${nextLvlReq.copies}</span>
            </div>
            <div style="width:100%; height:12px; background:#222; border-radius:6px; overflow:hidden; border:1px solid #333">
                <div style="width:${progressCopies}%; height:100%; background:linear-gradient(90deg, #f1c40f, #e67e22); transition:width 1s ease"></div>
            </div>
            ` : ''}

            ${!isMax ? `
                <p style="font-size:0.85rem; color:#888; margin-top:15px; text-align:center">
                    ${postsCount < nextLvlReq.posts ? `Te faltan <strong>${nextLvlReq.posts - postsCount}</strong> posts. ` : ''}
                    ${needsCopies && copiesCount < nextLvlReq.copies ? `Te faltan <strong>${nextLvlReq.copies - copiesCount}</strong> copias recibidas.` : ''}
                </p>
            ` : ''}
        </div>

        <h3 style="font-size:1.2rem; margin-bottom:18px; color:#fff; display:flex; align-items:center; gap:10px">
            <span>Beneficios y Jerarquía</span>
            <div style="flex:1; height:1px; background:#222"></div>
        </h3>
        
        <div style="display:flex; flex-direction:column; gap:12px">
            ${LEVEL_REQS.map((l, idx) => {
        const isUnlocked = postsCount >= l.posts && copiesCount >= (l.copies || 0);
        const isCurrent = currentLvl === idx;
        return `
                <div style="display:flex; gap:15px; align-items:start; padding:15px; border-radius:12px; border:1px solid ${isCurrent ? '#2563eb' : (isUnlocked ? '#333' : '#1a1a1a')}; background:${isCurrent ? 'rgba(37, 99, 235, 0.1)' : (isUnlocked ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.3)')}; opacity:${isUnlocked ? 1 : 0.4}; transition:0.3s">
                    <div style="font-size:1.6rem; background:#111; min-width:50px; height:50px; border-radius:10px; display:flex; align-items:center; justify-content:center; border:2px solid ${l.color}">${l.icon}</div>
                    <div style="flex:1">
                        <div style="display:flex; justify-content:space-between; align-items:center">
                            <strong style="color:${l.color}; font-size:1.05rem;">Nivel ${idx}: ${l.name}</strong>
                            <span style="font-size:0.75rem; background:#333; color:#fff; padding:3px 10px; border-radius:100px; font-weight:700">${l.posts} Posts ${l.copies > 0 ? `+ ${l.copies} Copias` : ''}</span>
                        </div>
                        <ul style="margin:8px 0 0 0; padding-left:18px; font-size:0.9rem; color:#999; line-height:1.4">
                            ${l.benefits.map(b => `<li>${b}</li>`).join('')}
                        </ul>
                    </div>
                </div>`;
    }).join('')}
        </div>

        <button class="btn" style="width:100%; margin-top:30px; height:54px; font-weight:800; font-size:1.1rem; background:#2563eb; color:white; border:none; border-radius:14px; cursor:pointer; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2)" onclick="window.closeLevelProgress(this)">Entendido</button>
    `;

    window.closeLevelProgress = (btn) => {
        btn.closest('.modal-overlay').remove();
        document.body.style.overflow = '';
    };

    const modalDiv = document.createElement('div');
    modalDiv.id = 'levelModalDynamic';
    modalDiv.className = 'modal-overlay';
    modalDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(12px); display:flex; align-items:center; justify-content:center; z-index:2147483647; padding:20px; color:white; font-family:Inter, sans-serif;';

    modalDiv.onclick = (e) => {
        if (e.target === modalDiv) {
            modalDiv.remove();
            document.body.style.overflow = '';
        }
    };

    modalDiv.innerHTML = `
        <style>
            #levelModalDynamic .modal-container::-webkit-scrollbar { width: 6px; }
            #levelModalDynamic .modal-container::-webkit-scrollbar-track { background: transparent; }
            #levelModalDynamic .modal-container::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
            #levelModalDynamic .modal-container::-webkit-scrollbar-thumb:hover { background: #444; }
        </style>
        <div class="modal-container" style="max-width:550px; background:#111; border:1px solid #333; border-radius:28px; width:100%; padding:35px; max-height:85vh; overflow-y:auto; box-shadow: 0 30px 60px rgba(0,0,0,0.8); position:relative; scroll-behavior: smooth;">
            ${html}
        </div>
    `;

    document.body.appendChild(modalDiv);
    console.log("✅ Dynamic Modal Injected and Stylized");
};

// --- LEVEL UP MODAL ---
window.showLevelUpModal = (newLevel) => {
    const lvlInfo = LEVEL_REQS[newLevel] || LEVEL_REQS[0];

    // Simple Emojis for "Confetti" background
    const bgEmojis = ["✨", "🎉", "💎", "🎊", "🔥", "🚀", "🌟"];
    let bgHtml = '';
    for (let i = 0; i < 30; i++) {
        const left = Math.random() * 100;
        const animDelay = Math.random() * 2;
        const dur = 3 + Math.random() * 3;
        const emoji = bgEmojis[Math.floor(Math.random() * bgEmojis.length)];
        bgHtml += `<div style="position:absolute; top:-10%; left:${left}%; font-size:${1 + Math.random()}rem; animation: fall ${dur}s linear infinite; animation-delay:-${animDelay}s; opacity:0.6; user-select:none;">${emoji}</div>`;
    }

    const modalHtml = `
    <div id="levelUpModalCanvas" onclick="this.remove()">
        <style>
            @keyframes fall {
                0% { transform: translateY(-10vh) rotate(0deg); }
                100% { transform: translateY(110vh) rotate(360deg); }
            }
        </style>
        ${bgHtml}
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:90%; max-width:500px; background:rgba(0,0,0,0.9); border:2px solid gold; border-radius:20px; padding:40px; box-shadow:0 0 50px rgba(255,215,0,0.3); z-index:20;">
            <div class="level-up-content">
                <div class="level-badge-large">${lvlInfo.icon}</div>
                <div class="level-new-title">¡NIVEL DESBLOQUEADO!</div>
                <h2 style="font-size:1.5rem; color:white; margin-bottom:10px">Has alcanzado el Nivel ${newLevel}</h2>
                <h3 style="color:#aaa; text-transform:uppercase; letter-spacing:2px; margin-bottom:20px">${lvlInfo.name}</h3>
                
                <div class="level-benefits-list">
                    <div style="font-weight:bold; margin-bottom:10px; color:white">Nuevos Beneficios:</div>
                    <ul style="padding-left:20px; margin:0">
                        ${lvlInfo.benefits.map(b => `<li>${b}</li>`).join('')}
                    </ul>
                </div>

                <button class="btn" onclick="this.closest('#levelUpModalCanvas').remove()" style="width:100%; font-size:1.2rem; font-weight:bold; background:gold; color:black; border:none; padding:15px; border-radius:10px; cursor:pointer; margin-top:10px; box-shadow:0 5px 15px rgba(255,215,0,0.4)">
                    ¡GENIAL!
                </button>
            </div>
        </div>
    </div>`;

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);

    // Play sound if possible (optional, maybe skip for now to avoid auto-play issues)
};

window.doPublish = () => {
    // Safety redirect for Edit Mode
    if (isEditing) return window.doUpdate();

    const postType = document.querySelector('input[name="postType"]:checked').value;
    const title = document.getElementById('upTitle').value;
    const tool = document.getElementById('upTool').value;
    const isPrivate = document.getElementById('upPrivate').checked;
    const needsReference = document.getElementById('upReference').checked;

    if (!title) { if (window.toast) window.toast("El título es obligatorio", "error"); return; }

    const extraConfig = [];
    document.querySelectorAll('.extra-config-row').forEach(row => {
        const type = row.querySelector('.extra-type').value;
        const val = row.querySelector('.extra-val').value;
        if (val.trim()) {
            extraConfig.push({ type, val: val.trim() });
        }
    });

    if (postType === 'single') {
        const file = document.getElementById('upFile').files[0];
        if (!file) { if (window.toast) window.toast("Imagen obligatoria", "error"); return; }
        const negPrompt = document.getElementById('upNegPrompt').value; // NUEVO
        const reader = new FileReader();
        reader.onload = async () => {
            const res = await store.addPrompt({
                title,
                tool,
                rating: document.getElementById('upRating').value,
                image: reader.result,
                prompt: document.getElementById('upPrompt').value,
                negative_prompt: negPrompt, // NUEVO
                type: 'single',
                isPrivate,
                needsReference,
                isPrivate,
                needsReference,
                extraConfig,
                tags: Array.from(window.selectedTags) // NUEVO
            });
            if (!res.success) alert(res.msg);
            else {
                window.closeModals();
                // Actualizar stats del usuario para ver nuevo nivel/tokens
                await store.loadUsers();
                render();

                // Track Event in GA4
                window.trackEvent('publish_post', {
                    title: title,
                    tool: tool,
                    type: 'single'
                });

                if (res.leveledUp) {
                    setTimeout(() => window.showLevelUpModal(res.newLevel), 500);
                }
            }
        };
        reader.readAsDataURL(file);
    } else {
        // Sequence
        const steps = Array.from(document.querySelectorAll('.seq-step'));
        if (steps.length === 0) { if (window.toast) window.toast("Añade al menos un paso", "warning"); return; }

        const content = [];
        let loaded = 0;

        steps.forEach((step, idx) => {
            const file = step.querySelector('.seqFile').files[0];
            const prompt = step.querySelector('.seqPrompt').value;
            const negPrompt = step.querySelector('.seqNegPrompt').value; // NUEVO
            const rating = step.querySelector('.seqRating').value;
            if (!file) return alert(`Falta imagen en paso ${idx + 1}`);
            if (!isImageFile(file)) return alert(`❌ El archivo en el paso ${idx + 1} no es una imagen válida.`);

            const reader = new FileReader();
            reader.onload = () => {
                content.push({ image: reader.result, prompt, negative_prompt: negPrompt, rating }); // NUEVO
                loaded++;
                if (loaded === steps.length) {
                    store.addPrompt({
                        title,
                        tool,
                        type: 'sequence',
                        content,
                        isPrivate,
                        needsReference,
                        isPrivate,
                        needsReference,
                        extraConfig,
                        tags: Array.from(window.selectedTags) // NUEVO
                    }).then(res => {
                        if (!res.success) {
                            alert("❌ Error: " + res.msg);
                        } else {
                            seqStepCount = 0;
                            window.closeModals();
                            render();

                            // Track Event in GA4
                            window.trackEvent('publish_post', {
                                title: title,
                                tool: tool,
                                type: 'sequence',
                                steps: steps.length
                            });
                        }
                    });
                }
            };
            reader.readAsDataURL(file);
        });
    }
};

let currentId = null;
let currentSeqStep = 0;


window.openDetail = (id) => {
    try {
        // DEBUG: Alertar si el click llega - (Logs removed for cleanliness)
        const pId = String(id);
        const p = store.prompts.find(x => String(x.id) === pId);

        if (!p) {
            console.error("Post no encontrado:", pId);
            alert("Error: Post no encontrado (ID: " + pId + ")");
            return;
        }

        // DEBUG: Dump exact data structure

        if (!p) return;
        currentId = id;
        currentSeqStep = 0;

        // RESET SLIDER ON EVERY OPEN
        window.sliderUnlocked = false;
        const slider = document.getElementById('commSlider');
        const handle = document.getElementById('commSliderHandle');
        const botContainer = document.getElementById('commAntiBot');
        if (slider) slider.classList.remove('unlocked');
        if (handle) {
            handle.style.left = '4px';
            handle.style.transition = 'none';
        }
        if (botContainer) botContainer.style.display = 'none';

        const detTitle = document.getElementById('detTitle');
        if (detTitle) {
            // New logic: Is it manually/paid featured OR in the top engagement list?
            const allVisible = store.prompts.filter(x => !x.isPrivate);

            // Calculate engagement scores for organic featured
            const autoTopIds = allVisible
                .map(p => {
                    const totalReactions = Object.values(p.reactions || {}).reduce((sum, val) => sum + val, 0);
                    const totalComments = (p.comments || []).length;
                    const score = (totalReactions * 2) + (totalComments * 3);
                    return { id: p.id, score };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 12)
                .map(x => x.id);

            const isManual = p.is_featured;
            const isAuto = autoTopIds.includes(p.id);
            const showStar = isManual || isAuto;

            let starTitle = isManual ? "DESTACADO (Manual/Pagado)" : "DESTACADO (Popularidad)";
            if (p.is_featured && p.featured_until) {
                const unt = new Date(p.featured_until);
                starTitle += " - Expira: " + unt.toLocaleDateString();
            }

            detTitle.innerHTML = (showStar ? `<span title="${starTitle}" style="cursor:help; margin-right:8px">⭐</span>` : '') + (p.title || 'Sin Título');
        }

        // Setup Meta Top (Date/Time) and declare detMetaTop
        const detMetaTop = document.getElementById('detMetaTop');
        if (detMetaTop) {
            const d = new Date(p.createdAt || Date.now());
            detMetaTop.innerText = `${p.tool} • ${p.type === 'sequence' ? 'Secuencia' : 'Imagen Única'} • ${d.toLocaleDateString()} - ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        const detExtra = document.getElementById('detExtra');
        if (detExtra) {
            if (p.extraConfig && p.extraConfig.length > 0) {
                detExtra.style.display = 'block';
                detExtra.innerHTML = p.extraConfig.map(ex => `
                    <div style="margin-bottom:2px">
                        <b>${ex.type}:</b> <span style="color:#aaa">${ex.val}</span>
                    </div>
                `).join('');
            } else {
                detExtra.style.display = 'none';
                detExtra.innerHTML = '';
            }
        }

        // Setup User Link
        const userEl = document.getElementById('detUser');
        if (userEl) {
            const u = null; // Fix: store.users no existe
            const isMe = store.currentUser && store.currentUser.username === p.author;
            const isFollowing = (store.currentUser && store.currentUser.following) ? store.currentUser.following.includes(u?.id) : false;

            userEl.innerHTML = `
            <span style="display:flex; align-items:center; gap:10px">
                Por: <span onclick="window.closeModals(); window.openUserProfile('${p.author}')" style="cursor:pointer; text-decoration:underline">${p.author}</span>
                ${!isMe && store.currentUser ? `
                    <button id="detFollowBtn" class="support-btn" style="padding:2px 8px; font-size:0.7rem;" onclick="window.doFollow('${p.author}', true)">
                        ${isFollowing ? 'Siguiendo' : 'Seguir'}
                    </button>
                ` : ''}
            </span>
            `;

            // Insert PromptBits Button RIGHT AFTER the user info
            const oldTipBtn = userEl.parentNode.querySelector('#detTipsButton');
            if (oldTipBtn) oldTipBtn.remove();

            userEl.insertAdjacentHTML('afterend', `
                <div id="detTipsButton" style="margin: 8px 0 10px 0">
                    <button id="tipBtn_${p.id}" style="background:rgba(162, 155, 254, 0.15); border:1px solid rgba(162, 155, 254, 0.4); color:#a29bfe; padding:4px 12px; border-radius:4px; font-size:0.75rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s">
                        💎 ${p.tokens_received || 0} PromptBits
                    </button>
                </div>
            `);

            // Attach click handler
            const tipBtn = document.getElementById(`tipBtn_${p.id}`);
            if (tipBtn) {
                tipBtn.onclick = function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.openTip(p.id);
                };
            }
        }

        // Show/hide options based on ownership
        const optReport = document.getElementById('optReport');
        const optBlock = document.getElementById('optBlock');
        const optHide = document.getElementById('optHide');

        if (optReport) optReport.style.display = 'block';
        if (optBlock) optBlock.style.display = 'block';
        if (optHide) optHide.style.display = 'block';

        // Setup Badges
        const badgesEl = document.getElementById('detBadges');
        if (badgesEl) {
            let bhtml = `<span style="background:#222; border:1px solid #444; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:700">🛠️ ${p.tool || 'Desconocido'}</span>`;
            if (p.type !== 'sequence') {
                const r = p.rating || 'SFW / Apto';
                const icon = r.startsWith('SFW') ? '🟢' : '🔞';
                bhtml += `<span style="background:#222; border:1px solid #444; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:700">${icon} ${r}</span>`;
            }

            const refText = (p.needsReference || p.needs_reference) ? '📸 Requiere imagen de Referencia' : '🚫 No requiere imagen de Referencia';
            bhtml += `<span style="background:#222; border:1px solid #444; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:700">${refText}</span>`;

            badgesEl.innerHTML = bhtml;

            badgesEl.innerHTML = bhtml;

            // Render Tags
            const tagsEl = document.getElementById('detTags');
            if (tagsEl) {
                if (p.tags && p.tags.length > 0) {
                    tagsEl.innerHTML = p.tags.map(t => `<span class="server-tag-pill">${t}</span>`).join('');
                } else {
                    tagsEl.innerHTML = '';
                }
            }
        }

        // Handle sequence vs single
        const prevBtn = document.getElementById('detPrevBtn');
        const nextBtn = document.getElementById('detNextBtn');
        const seqCount = document.getElementById('detSeqCount');
        const detPrompt = document.getElementById('detPrompt');
        const detImg = document.getElementById('detImg');

        if (p.type === 'sequence' && p.content && p.content.length > 0) {
            if (prevBtn) prevBtn.style.display = 'flex';
            if (nextBtn) nextBtn.style.display = 'flex';
            if (seqCount) seqCount.style.display = 'block';
            window.updateSeqDisplay(p);
        } else {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (seqCount) seqCount.style.display = 'none';
            if (detPrompt) detPrompt.innerText = p.prompt || '';
            if (detImg) detImg.src = p.image || '';

            const detNeg = document.getElementById('detNegPrompt');
            if (detNeg) {
                if (p.negative_prompt) {
                    detNeg.style.display = 'block';
                    detNeg.innerText = `NEGATIVE PROMPT: ${p.negative_prompt}`;
                    detNeg.style.backgroundColor = '#331a1a';
                    detNeg.style.color = '#ffaaaa';
                    detNeg.style.padding = '8px';
                    detNeg.style.borderRadius = '4px';
                    detNeg.style.marginTop = '10px';
                } else {
                    detNeg.style.display = 'none';
                }
            }
        }
        // Re-apply blurring logic for single image context
        const detImgWrap = document.getElementById('detImgWrap');
        if (detImgWrap) {
            // IMPORTANT: Clear previous reveal state by removing and re-adding class
            detImgWrap.classList.remove('card-blurred');
            const { applyBlur, warningLabel } = getModeration(p);

            if (applyBlur) {
                detImgWrap.classList.add('card-blurred');
                detImgWrap.dataset.warning = warningLabel;
                // Clean existing overlay to force re-render with button
                const oldOverlay = detImgWrap.querySelector('.blur-overlay');
                if (oldOverlay) oldOverlay.remove();
            } else {
                detImgWrap.dataset.warning = '';
                const oldOverlay = detImgWrap.querySelector('.blur-overlay');
                if (oldOverlay) oldOverlay.remove();
            }
        }

        const detCopyBadge = document.getElementById('detCopyBadge');
        if (detCopyBadge) {
            detCopyBadge.style.display = 'block';
            detCopyBadge.innerText = `📋 Copiado ${p.copy_count || 0} veces`;
        }

        // Setup Comments
        const commentsEl = document.getElementById('detComments');
        if (commentsEl) {
            const currUser = store.currentUser?.username;
            const isPostOwner = currUser === p.author;

            commentsEl.innerHTML = (p.comments && p.comments.length > 0)
                ? p.comments.map(c => {
                    const canDelete = isPostOwner || currUser === c.username;
                    return `<div style="background:#1a1a1a; padding:10px; border-radius:8px; margin-bottom:10px; border-left:3px solid var(--accent); position:relative">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px">
                            <span style="font-weight:700; color:var(--accent); font-size:0.85rem">@${window.escapeHTML(c.username)}</span>
                            <div style="display:flex; align-items:center; gap:8px">
                                <span style="font-size:0.65rem; opacity:0.5">${new Date(c.timestamp).toLocaleDateString()}</span>
                                ${canDelete ? `<button onclick="window.doDeleteComment(${c.id})" style="background:none; border:none; color:#ff4444; cursor:pointer; font-size:0.8rem; padding:0" title="Eliminar comentario">🗑️</button>` : ''}
                            </div>
                        </div>
                        <div style="font-size:0.9rem; color:#eee; word-break:break-word">${window.escapeHTML(c.text)}</div>
                    </div>`;
                }).join('')
                : '<div style="opacity:0.5; font-size:0.9rem">No hay comentarios aún.</div>';
        }

        // Setup Reactions
        const reactions = p.reactions || { like: 0, love: 0, fire: 0, funny: 0 };
        const myReaction = (p.userReactions && store.currentUser) ? p.userReactions[store.currentUser.username] : null;
        ['like', 'love', 'fire', 'funny'].forEach(type => {
            const countEl = document.getElementById(`det-${type}-count`);
            const btnEl = document.getElementById(`btn-react-${type}`);
            if (countEl) countEl.innerText = reactions[type] || 0;
            if (btnEl) {
                if (myReaction === type) btnEl.classList.add('active');
                else btnEl.classList.remove('active');
            }
        });

        const viewModal = document.getElementById('viewModal');
        if (viewModal) {
            // MOVE TO BODY to avoid stacking context issues
            if (viewModal.parentNode !== document.body) {
                document.body.appendChild(viewModal);
            }
            viewModal.style.cssText = 'display: flex !important; z-index: 1000000 !important; visibility: visible !important; opacity: 1 !important; background: rgba(0,0,0,0.95) !important; position: fixed !important; top: 0; left: 0; width: 100%; height: 100%;';
        } else {
            alert("Error crítico: Elemento modal no encontrado en el DOM");
        }
    } catch (err) {
        console.error(err);
        alert("Error al abrir el post: " + err.message);
    }
};

window.updateSeqDisplay = (p) => {
    if (!p || !p.content || p.content.length === 0) return;
    const step = p.content[currentSeqStep];

    // Blurring for current step
    const { applyBlur, warningLabel } = getModeration(p, step.rating);
    const detImgWrap = document.getElementById('detImgWrap');
    if (detImgWrap) {
        // IMPORTANT: Clear previous reveal state when switching steps
        detImgWrap.classList.remove('card-blurred');
        if (applyBlur) {
            detImgWrap.classList.add('card-blurred');
            detImgWrap.dataset.warning = warningLabel;
            // Clean existing overlay to force re-render with button
            const oldOverlay = detImgWrap.querySelector('.blur-overlay');
            if (oldOverlay) oldOverlay.remove();
        } else {
            detImgWrap.dataset.warning = '';
            const oldOverlay = detImgWrap.querySelector('.blur-overlay');
            if (oldOverlay) oldOverlay.remove();
        }
    }

    const detImg = document.getElementById('detImg');
    const detPrompt = document.getElementById('detPrompt');
    const detSeqCount = document.getElementById('detSeqCount');

    // FIX: Show Global Prompt or Step Prompt
    if (detPrompt) {
        let stepPrompt = '';
        if (typeof step === 'object') stepPrompt = step.prompt || '';
        detPrompt.innerText = stepPrompt || p.prompt || '';
    }

    const detNeg = document.getElementById('detNegPrompt');
    if (detNeg) {
        let stepNeg = (step && typeof step === 'object') ? step.negative_prompt : '';
        const finalNeg = stepNeg || p.negative_prompt || '';
        if (finalNeg) {
            detNeg.style.display = 'block';
            detNeg.innerText = `NEGATIVE PROMPT: ${finalNeg}`;
            detNeg.style.backgroundColor = '#331a1a';
            detNeg.style.color = '#ffaaaa';
            detNeg.style.padding = '8px';
            detNeg.style.borderRadius = '4px';
            detNeg.style.marginTop = '10px';
        } else {
            detNeg.style.display = 'none';
        }
    }

    if (detImg) {
        // ROBUST DATA EXTRACTION FOR MODAL
        let imgUrl = '';
        let stepRating = 'SFW';

        if (typeof step === 'string') {
            imgUrl = step;
        } else if (step && typeof step === 'object') {
            imgUrl = step.image || step.url || step.src || '';
            stepRating = step.rating || 'SFW';
        }

        if (detImg) {
            detImg.src = imgUrl;
            const { applyBlur, warningLabel } = getModeration(p, stepRating);
            const container = detImg.parentElement;
            container.className = 'view-img-side' + (applyBlur ? ' card-blurred' : '');
            let blurOverlay = container.querySelector('.blur-overlay');
            if (applyBlur) {
                if (!blurOverlay) {
                    blurOverlay = document.createElement('div');
                    blurOverlay.className = 'blur-overlay';
                    container.appendChild(blurOverlay);
                }
                blurOverlay.innerHTML = `<span>🔞 ${warningLabel}</span><button class="btn" style="margin-top:10px; background: #ff4444; color: white; border:none; padding: 5px 10px; border-radius:4px; cursor:pointer;" onclick="event.stopPropagation(); window.revealImage(this)">👁️ Revelar Imagen</button>`;
            } else if (blurOverlay) {
                blurOverlay.remove();
            }
        }
    }

    const detCopyBadge = document.getElementById('detCopyBadge');
    if (detCopyBadge) {
        detCopyBadge.style.display = 'block';
        detCopyBadge.innerText = `📋 Copiado ${p.copy_count || 0} veces`;
    }

    if (detPrompt) detPrompt.innerText = step.prompt || '';
    if (detSeqCount) detSeqCount.innerText = `${currentSeqStep + 1} / ${p.content.length}`;

    // Update Meta Badges for the current step in sequence
    const badgesEl = document.getElementById('detBadges');
    if (badgesEl) {
        let bhtml = `<span style="background:#222; border:1px solid #444; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:700">🛠️ ${p.tool || 'Desconocido'}</span>`;

        const r = step.rating || 'SFW / Apto';
        const icon = r.startsWith('SFW') ? '🟢' : '🔞';
        bhtml += `<span style="background:#222; border:1px solid #444; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:700">${icon} ${r}</span>`;

        // Referencia (Global del post original)
        const refText = (p.needsReference || p.needs_reference) ? '📸 Requiere imagen de Referencia' : '🚫 No requiere imagen de Referencia';
        bhtml += `<span style="background:#222; border:1px solid #444; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:700">${refText}</span>`;

        badgesEl.innerHTML = bhtml;
    }
};

window.prevSeqStep = () => {
    const p = store.prompts.find(x => x.id === currentId);
    if (!p || !p.content) return;
    currentSeqStep = (currentSeqStep - 1 + p.content.length) % p.content.length;
    window.updateSeqDisplay(p);
};

window.nextSeqStep = () => {
    const p = store.prompts.find(x => x.id === currentId);
    if (!p || !p.content) return;
    currentSeqStep = (currentSeqStep + 1) % p.content.length;
    window.updateSeqDisplay(p);
};

// --- OPTIONS MENU FUNCTIONS ---
window.toggleOptionsMenu = () => {
    const menu = document.getElementById('optionsMenu');
    const isAdmin = store.currentUser && store.currentUser.role === 'admin';
    const optAdmin = document.getElementById('optAdminFeature');

    if (optAdmin) {
        optAdmin.style.display = isAdmin ? 'block' : 'none';
        if (isAdmin) {
            const p = store.prompts.find(x => String(x.id) === String(currentId));
            optAdmin.innerText = (p && p.is_featured) ? '⭐ Quitar Destacado' : '🌟 Marcar Destacado';
        }
    }

    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
};

window.doAdminFeaturePrompt = async () => {
    if (!currentId) return;
    const res = await store.toggleFeatured(currentId);
    if (res.success) {
        alert(res.newState ? "✅ Prompt ahora es Destacado PERMANENTE" : "✅ Destacado removido");
        window.toggleOptionsMenu();
        window.openDetail(currentId); // Refresh modal
        render(); // Refresh gallery
    } else {
        alert("❌ " + res.msg);
    }
};

window.doCopyPrompt = async (idFromMenu) => {
    // Si viene de un menú (como el de opciones), usamos ese ID, si no el currentId
    const targetId = idFromMenu || currentId;
    const p = store.prompts.find(x => String(x.id) === String(targetId));
    if (!p) return;

    let textToCopy = '';
    if (p.type === 'sequence' && p.content) {
        textToCopy = p.content.map((step, idx) => `Paso ${idx + 1}:\n${step.prompt}`).join('\n\n');
    } else {
        textToCopy = p.prompt || '';
    }

    const btn = window.event?.currentTarget;

    try {
        await navigator.clipboard.writeText(textToCopy);

        // Efecto visual en los botones
        if (btn && btn.tagName === 'BUTTON') {
            const oldText = btn.innerText;
            btn.innerText = "✅ ¡Copiado!";
            setTimeout(() => btn.innerText = oldText, 2000);
        }

        // Track Event in GA4
        window.trackEvent('copy_prompt', {
            id: p.id,
            title: p.title,
            author: p.author,
            tool: p.tool
        });

        // Incrementar contador
        await store.incrementCopyCount(targetId);

        // Actualizar Badge si el modal está abierto
        const badge = document.getElementById('detCopyBadge');
        if (badge && String(currentId) === String(targetId)) {
            badge.innerText = `📋 Copiado ${p.copy_count} veces`;
        }

        if (idFromMenu) window.toggleOptionsMenu();
    } catch (err) {
        console.error("Error al copiar:", err);
    }
};

window.doSavePrompt = () => {
    if (!store.currentUser) return alert("Inicia sesión para guardar");
    store.toggleSave(currentId);
    alert('✅ ¡Guardado! Podrás ver este prompt en tu pestaña de "Guardados" en tu perfil.');
    window.toggleOptionsMenu();
};

window.doUnsavePrompt = (id) => {
    if (!store.currentUser) return;
    if (confirm('¿Quieres quitar este prompt de tus guardados?')) {
        store.toggleSave(id);
        render(); // Refresh UI to remove card from view immediately
    }
};

window.doReportPrompt = () => {
    if (!store.currentUser) return alert("Inicia sesión para reportar");
    const p = store.prompts.find(x => x.id === currentId);
    if (p && p.author === store.currentUser.username) return alert("No puedes reportar tu propio post.");

    const reason = prompt("¿Por qué reportas este contenido?\n1. Contenido ilegal\n2. Spam\n3. Acoso\n4. Otro");
    if (reason) {
        store.addReport(currentId, reason, '');
        alert('✅ Reporte enviado');
    }
    window.toggleOptionsMenu();
};

window.doHidePrompt = () => {
    if (!store.currentUser) return alert("Inicia sesión");
    store.hidePrompt(currentId);
    alert('✅ Post ocultado de tu feed');
    window.closeModals();
    render();
};

window.doBlockUser = () => {
    if (!store.currentUser) return alert("Inicia sesión");
    const p = store.prompts.find(x => x.id === currentId);
    if (!p) return;
    if (p.author === store.currentUser.username) return alert("No puedes bloquearte a ti mismo.");

    if (confirm(`¿Bloquear a ${p.author}? No verás más sus posts.`)) {
        store.blockUser(p.author);
        alert('✅ Usuario bloqueado');
        window.closeModals();
        render();
    }
    window.toggleOptionsMenu();
};


let isEditing = false;
let editingId = null;

window.doEditPrompt = (id) => {
    isEditing = true;
    editingId = id;
    const p = store.prompts.find(x => x.id === id);
    if (!p) return;

    // Reuse Create Modal
    document.getElementById('createModal').style.display = 'flex';
    document.getElementById('upTitle').value = p.title;
    document.getElementById('upTool').value = p.tool;
    document.getElementById('upRating').value = p.rating || 'SFW / Apto';
    document.getElementById('upPrompt').value = p.prompt || '';
    document.getElementById('upPrivate').checked = p.isPrivate;
    document.getElementById('upPrivate').checked = p.isPrivate;
    document.getElementById('upReference').checked = p.needsReference || p.needs_reference;

    // Load Tags
    window.selectedTags = new Set(p.tags || []);
    window.renderTagSelector();

    // Handle Type
    if (p.type === 'sequence') {
        document.querySelector('input[name="postType"][value="sequence"]').checked = true;
        window.togglePostType('sequence');
        // Rebuild sequence steps
        const container = document.getElementById('seqContainer');
        container.innerHTML = '';
        seqStepCount = 0;
        if (p.content) {
            p.content.forEach(step => {
                window.addSeqStep();
                const lastStep = container.lastElementChild;
                lastStep.querySelector('.seqPrompt').value = step.prompt;
                lastStep.querySelector('.seqRating').value = step.rating;
                // Add preview/warning about image
                const fileInput = lastStep.querySelector('.seqFile');
                const prev = document.createElement('div');
                prev.innerHTML = `<small>Imagen actual guardada. Subir nueva para reemplazar.</small><br><img src="${step.image}" style="height:50px; border:1px solid #444; margin-top:5px">`;
                fileInput.parentElement.insertBefore(prev, fileInput);
            });
        }
    } else {
        document.querySelector('input[name="postType"][value="single"]').checked = true;
        window.togglePostType('single');
        // Preview existing image for Single
        const fileInput = document.getElementById('upFile');
        // Remove existing preview if any
        const existingPrev = fileInput.parentElement.querySelector('.edit-preview');
        if (existingPrev) existingPrev.remove();

        const prev = document.createElement('div');
        prev.className = 'edit-preview';
        prev.innerHTML = `<div style="margin:10px 0"><small>Imagen actual:</small><br><img src="${p.image}" style="max-height:100px; border:1px solid #555"></div>`;
        fileInput.parentElement.insertBefore(prev, fileInput);
    }

    // Change Button - Force update at the end
    setTimeout(() => {
        const btn = document.getElementById('pubBtn');
        if (btn) {
            btn.innerText = "Actualizar";
            btn.onclick = window.doUpdate;
            console.log("Edit Mode Activated: Button updated to Actualizar");
        } else {
            console.error("Edit Mode Error: Button 'pubBtn' not found!");
        }
    }, 100);

    window.toggleOptionsMenu(); // Close menu
};



window.doUpdate = async () => {
    try {
        const title = document.getElementById('upTitle').value;
        const tool = document.getElementById('upTool').value;
        const isPrivate = document.getElementById('upPrivate').checked;
        const needsReference = document.getElementById('upReference').checked;

        if (!title) return alert("El título es obligatorio");

        const p = store.prompts.find(x => x.id === editingId);
        if (!p) return;

        const data = {
            title, tool, rating: document.getElementById('upRating').value, prompt: document.getElementById('upPrompt').value,
            isPrivate, needsReference, type: p.type,
            tags: Array.from(window.selectedTags) // NUEVO
        };

        // Disable button during update
        const btn = document.getElementById('pubBtn');
        if (btn) btn.innerText = "Guardando...";

        if (p.type === 'single') {
            const file = document.getElementById('upFile').files[0];
            if (file) {
                if (!isImageFile(file)) return alert("❌ El archivo seleccionado no es una imagen válida.");
                const reader = new FileReader();
                reader.onload = async () => {
                    data.image = reader.result;
                    const res = await store.updatePrompt(editingId, data);
                    if (res.success) finishUpdate();
                    else window.toast("Error: " + res.msg, 'error');
                };
                reader.readAsDataURL(file);
            } else {
                data.image = p.image;
                const res = await store.updatePrompt(editingId, data);
                if (res.success) finishUpdate();
                else window.toast("Error: " + res.msg, 'error');
            }
        } else {
            // Sequence Update Logic (Simplified for brevity, assuming standard sequence flow)
            // Note: Full sequence update with async file reading logic needs careful async handling
            // For now, alerting user that sequence editing might be limited in this patch if logic is complex
            alert("Edición de secuencias en mantenimiento. Por favor borra y crea de nuevo si necesitas cambiar imágenes.");
            if (btn) btn.innerText = "Actualizar";
        }
    } catch (e) {
        console.error(e);
        alert("Error inesperado al actualizar: " + e.message);
        const btn = document.getElementById('pubBtn');
        if (btn) btn.innerText = "Actualizar";
    }
};


const finishUpdate = () => {
    alert("✅ Post actualizado");
    isEditing = false;
    editingId = null;

    // Close Modals explicitly
    window.closeModals();
    render();

    const btn = document.getElementById('pubBtn');
    if (btn) {
        btn.innerText = "Publicar";
        btn.onclick = window.doPublish;
    }
};

window.doToggleFeatured = async (id) => {
    const res = await store.toggleFeatured(id);
    if (res.success) {
        render();
    } else {
        alert(res.msg);
    }
};

window.doDeletePrompt = async (passedId) => {
    const idToDelete = passedId || currentId;
    if (!idToDelete) return alert("Error: No se encontró el ID del post");

    if (confirm('¿Eliminar este post permanentemente?')) {
        const res = await store.removePrompt(idToDelete);
        if (res.success) {
            // If we deleted the currently open detail view, close it
            if (idToDelete === currentId) window.closeModals();
            alert('✅ Post eliminado');
            render();
        } else {
            alert('❌ ' + res.msg);
        }
    }
    // Only close options menu if it was open (usually from card view)
    if (!passedId) window.toggleOptionsMenu();
};

// --- SETTINGS FUNCTIONS ---
// --- SETTINGS FUNCTIONS ---
window.openSettings = () => {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        // FIX: Move to body to avoid stacking context/overflow issues
        if (modal.parentNode !== document.body) {
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
        modal.style.zIndex = '9999999'; // Force super top
        console.log("Settings Modal Opened (Moved to Body + Forced Top)");
    } else {
        console.error("Settings Modal NOT FOUND");
    }
};

window.previewAvatar = (input) => {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (!isImageFile(file)) {
            alert("❌ Por favor selecciona una imagen válida para tu avatar.");
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('previewAvatar').style.backgroundImage = `url('${e.target.result}')`;
        }
        reader.readAsDataURL(file);
    }
};

window.saveSettings = () => {
    const username = document.getElementById('setUser').value;

    // Avatar upload
    const avatarFile = document.getElementById('setAvatarFile').files[0];

    const finishSave = (avatarData) => {
        const canEditSocials = store.currentUser && store.currentUser.level >= 2;

        const socials = canEditSocials ? {
            ig: document.getElementById('setIg').value,
            fb: document.getElementById('setFb').value,
            x: document.getElementById('setX').value,
            tg: document.getElementById('setTg').value,
            th: document.getElementById('setTh').value,
            fv: document.getElementById('setFv').value
        } : (store.currentUser.socials || {});

        const moderation = {
            suggestive: document.getElementById('setModSugg').value,
            nsfw: document.getElementById('setModNsfw').value
        };

        const updateData = {
            username,
            socials,
            moderation
        };

        if (avatarData) updateData.avatar = avatarData;

        store.updateUserSettings(updateData);

        // Keep modal open or close? Usually close on success. Store will alert success.
        window.closeModals();
    };

    if (!username) return alert("El nombre de usuario es requerido");

    if (avatarFile) {
        const reader = new FileReader();
        reader.onload = () => finishSave(reader.result);
        reader.readAsDataURL(avatarFile);
    } else {
        finishSave(null);
    }
};

window.doChangePassword = () => {
    const newPass = document.getElementById('newPassInput').value;
    if (!newPass || newPass.length < 6) {
        return alert("La contraseña debe tener al menos 6 caracteres.");
    }
    if (confirm("¿Seguro que quieres cambiar tu contraseña?")) {
        store.changePassword(newPass);
    }
};



window.doDeleteAccount = () => {
    const confirmation = prompt("⚠️ PELIGRO ⚠️\nEscribe 'ELIMINAR' para borrar tu cuenta permanentemente.\nEsta acción NO se puede deshacer.");
    if (confirmation === 'ELIMINAR') {
        store.deleteAccount();
        alert("Tu cuenta ha sido eliminada.");
        window.location.reload();
    }
};

window.doReact = (type) => {
    if (!store.currentUser) return alert("Inicia sesión para reaccionar");
    store.toggleReaction(currentId, type);
    const p = store.prompts.find(x => String(x.id) === String(currentId));
    if (p) {
        const user = store.currentUser?.username;
        const myReaction = (p.userReactions && user) ? p.userReactions[user] : null;
        ['like', 'love', 'fire', 'funny'].forEach(t => {
            const el = document.getElementById(`det-${t}-count`);
            const btn = document.getElementById(`btn-react-${t}`);
            const reactions = p.reactions || {};
            if (el) el.innerText = reactions[t] || 0;
            if (btn) {
                if (myReaction === t) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });
    }
    // No llamamos a render() para evitar cerrar el modal, 
    // y solo actualizamos la galería si es necesario al cerrar.
};

window.doFullScreen = () => {
    const img = document.getElementById('detImg');
    const container = img ? img.parentElement : null;
    const target = container || img; // Use container if possible (for seq nav)

    if (target) {
        if (target.requestFullscreen) {
            target.requestFullscreen();
        } else if (target.webkitRequestFullscreen) { /* Safari */
            target.webkitRequestFullscreen();
        } else if (target.msRequestFullscreen) { /* IE11 */
            target.msRequestFullscreen();
        } else if (img && img.src) {
            window.open(img.src, '_blank');
        }
    }
};

window.doBlockUser = () => {
    if (!store.currentUser) return alert("Debes iniciar sesión para bloquear.");
    const p = store.prompts.find(x => x.id === currentId);
    if (!p) return;
    if (confirm(`¿Estás seguro de que quieres bloquear a @${p.author}? Dejarás de ver todo su contenido.`)) {
        store.blockUser(p.author);
        window.closeModals();
        render();
    }
};
window.doDeleteComment = (commentId) => {
    if (!store.currentUser) return;
    if (confirm("¿Seguro que quieres eliminar este comentario?")) {
        store.removeComment(currentId, commentId);
        window.openDetail(currentId);
    }
};

window.showSlider = () => {
    const botContainer = document.getElementById('commAntiBot');
    if (botContainer && botContainer.style.display === 'none') {
        botContainer.style.display = 'flex';
        window.initCrystalSlider();
    }
};

window.sliderUnlocked = false;
window.initCrystalSlider = () => {
    const slider = document.getElementById('commSlider');
    const handle = document.getElementById('commSliderHandle');
    if (!slider || !handle) return;

    window.sliderUnlocked = false;
    slider.classList.remove('unlocked');
    handle.style.left = '4px';

    let isDragging = false;
    let startX = 0;

    const onStart = (e) => {
        if (window.sliderUnlocked) return;
        isDragging = true;
        startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        handle.style.transition = 'none';
    };

    const onMove = (e) => {
        if (!isDragging || window.sliderUnlocked) return;
        const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const diff = currentX - startX;
        const max = slider.offsetWidth - handle.offsetWidth - 8;

        let move = Math.max(4, Math.min(diff + 4, max));
        handle.style.left = `${move}px`;

        if (move >= max - 2) {
            window.sliderUnlocked = true;
            slider.classList.add('unlocked');
            isDragging = false;
            handle.style.left = `${max}px`;
            window.toast("Gesto verificado", "success");
        }
    };

    const onEnd = () => {
        if (window.sliderUnlocked) return;
        isDragging = false;
        handle.style.transition = 'left 0.3s ease';
        handle.style.left = '4px';
    };

    handle.onmousedown = onStart;
    window.onmousemove = onMove;
    window.onmouseup = onEnd;

    handle.ontouchstart = onStart;
    window.ontouchmove = onMove;
    window.ontouchend = onEnd;
};

window.postComm = async () => {
    if (!store.currentUser) return window.toast("Debes iniciar sesión para comentar", "error");

    const val = document.getElementById('commInput').value.trim();
    const hp = document.getElementById('commHoneypot').value;

    // 1. Basic Validations
    if (!val) return;
    if (val.length < 5) return window.toast("Comentario demasiado corto", "info");

    // 2. Anti-Bot checks
    if (hp) return; // Honeypot filled by bot
    if (!window.sliderUnlocked) {
        return window.toast("Desliza el diamante 💎 para verificar que eres humano", "info");
    }

    // 3. Store call
    const result = await store.addComment(currentId, val);

    if (result.success) {
        window.toast("¡Comentario enviado con éxito!", "success");

        if (result.reward) {
            window.showTokenCelebration(result.reward, '¡Gracias por tu comentario! Sigue participando y ganando PromptBits.');
        }

        document.getElementById('commInput').value = '';
        // Reset slider
        window.sliderUnlocked = false;
        document.getElementById('commSlider').classList.remove('unlocked');
        document.getElementById('commSliderHandle').style.left = '4px';
        document.getElementById('commAntiBot').style.display = 'none';

        window.openDetail(currentId);
        if (window.render) window.render(); // Update header/profile balance
    } else {
        window.toast(result.msg, result.isCooldown ? "info" : "error");
    }
};

window.goHome = () => {
    currentView = 'home';
    profileUser = null;
    // Reset Filters to Community default (Complete Object)
    filters = {
        source: 'community',
        time: 'all',
        sort: 'newest',
        tool: 'all',
        rating: 'all',
        refFilter: 'all'
    };
    render();
};
window.openInfo = (t) => { document.getElementById('infoContent').innerHTML = LEGAL_TEXTS[t]; document.getElementById('infoModal').style.display = 'flex'; };

window.togglePass = (id, btn) => {
    const input = document.getElementById(id);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
};


// --- GLOBAL INTERACTION FUNCTIONS ---
window.revealImage = (btn) => {
    if (!store.currentUser) return alert("Debes iniciar sesión para ver contenido sensible.");
    const overlay = btn.closest('.blur-overlay');
    const wrapper = btn.closest('.card-blurred');
    if (overlay) overlay.style.display = 'none';
    if (wrapper) wrapper.classList.remove('card-blurred');
};

// (Duplicate doFollow removed)

// --- EXPOSING FUNCTIONS TO WINDOW (MODULE FIX) ---
// This is critical because type="module" does not expose functions globally by default.
// All functions used in onclick="" attributes MUST be listed here.

window.render = render;
window.setFilter = (key, value) => {
    if (!store.currentUser && (key === 'source' || key === 'rating')) {
        // Reset UI visually if blocked
        // Note: proper reset requires tracking previous state, but simple alert is MVP
        alert("Debes iniciar sesión para usar este filtro.");
        render();
        return;
    }
    filters[key] = value;
    render();
};
window.setProfileView = setProfileView;
window.setProfileTab = setProfileTab;
window.goHome = () => {
    currentView = 'home';
    searchQuery = '';
    // Reset filters visual
    filters.source = 'community';
    render();
};
window.previewFile = (input, previewId) => {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    const img = preview.querySelector('img');
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (!isImageFile(file)) {
            window.toast("❌ Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP, etc).", 'error');
            input.value = ''; // Limpiar el input
            preview.style.display = 'none';
            if (img) img.src = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            preview.style.display = 'flex';
        }
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
        if (img) img.src = '';
    }
};
window.closeModals = () => {
    console.log("Cerrando modales...");

    // Remove dynamic tip modal if exists
    const dynamicTip = document.getElementById('dynamicTipModal');
    if (dynamicTip) dynamicTip.remove();

    // Close all other overlays
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.style.display = 'none';
    });

    const menu = document.getElementById('optionsMenu');
    if (menu) menu.style.display = 'none';
};

window.toggleAdminSort = (col) => {
    if (window.adminSort.col === col) {
        window.adminSort.dir = window.adminSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        window.adminSort.col = col;
        window.adminSort.dir = 'asc';
    }
    window.openAdmin('users');
};
window.submitSupport = submitSupport;
window.revealImage = revealImage;
window.togglePass = (id, el) => {
    const input = document.getElementById(id);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
        el.innerText = input.type === 'password' ? '👁️' : '🙈';
    }
};
window.prevSeqStep = prevSeqStep;
window.nextSeqStep = nextSeqStep;
window.toggleOptionsMenu = toggleOptionsMenu;




// --- TAGGING SYSTEM LOGIC ---
window.renderTagSelector = () => {
    const root = document.getElementById('tagSelectorRoot');
    if (!root) return;

    const selectedPreview = `
        <div class="selected-tags-preview">
            ${Array.from(window.selectedTags).map(tag => `
                <button class="tag-chip selected" onclick="window.toggleTag('${tag}')" title="Quitar">
                    ${tag} <span style="font-size:0.6rem; opacity:0.6; margin-left:4px">✕</span>
                </button>
            `).join('')}
        </div>
    `;

    const categoriesHTML = Object.entries(TAG_CATEGORIES).map(([category, tags]) => {
        const isOpen = window.openCategory === category;
        return `
            <div class="tag-category">
                <div class="tag-category-header ${isOpen ? 'active' : ''}" onclick="window.toggleTagCategory('${category}')">
                    <span>${category}</span>
                    <span>${isOpen ? '▲' : '▼'}</span>
                </div>
                <div class="tag-category-content" style="${isOpen ? 'display:flex' : 'display:none'}">
                    ${tags.map(tag => {
            const isSelected = window.selectedTags.has(tag);
            return `<button class="tag-chip ${isSelected ? 'selected' : ''}" onclick="window.toggleTag('${tag}')">${tag}</button>`;
        }).join('')}
                </div>
            </div>
        `;
    }).join('');

    root.innerHTML = `
        <div class="tag-selector-container">
            <label class="form-label">ETIQUETAS SELECCIONADAS</label>
            ${selectedPreview}
            <input type="text" class="tag-search-input" placeholder="Buscar etiquetas..." onkeyup="window.filterTags(this.value)">
            <div class="tag-categories" id="tagCategoriesContainer">
                ${categoriesHTML}
            </div>
        </div>
    `;
};

window.toggleTagCategory = (category) => {
    const id = `cat-content-${category.replace(/\s+/g, '-')}`;
    const content = document.getElementById(id);
    if (content) {
        const isClosed = content.style.display === 'none' || content.style.display === '';
        // Close all others
        document.querySelectorAll('.tag-category-content').forEach(el => el.style.display = 'none');
        // Toggle current
        content.style.display = isClosed ? 'flex' : 'none';
        window.openCategory = isClosed ? category : null;
    }
};

window.toggleTag = (tag) => {
    if (window.selectedTags.has(tag)) {
        window.selectedTags.delete(tag);
    } else {
        if (window.selectedTags.size >= 10) {
            window.toast("Máximo 10 etiquetas permitidas", "error");
            return;
        }
        window.selectedTags.add(tag);
    }
    // Re-render chips visual state only (performance optimization)
    window.renderTagSelector();
};

window.filterTags = (query) => {
    const term = query.toLowerCase();
    const container = document.getElementById('tagCategoriesContainer');
    if (!container) return;

    if (!term) {
        window.renderTagSelector();
        return;
    }

    let resultsHTML = '';
    Object.entries(TAG_CATEGORIES).forEach(([category, tags]) => {
        const matches = tags.filter(t => t.toLowerCase().includes(term));
        if (matches.length > 0) {
            resultsHTML += `
                <div class="tag-category" style="margin-bottom:5px">
                    <div style="font-size:0.75rem; color:#666; margin-bottom:4px; margin-left:5px">${category}</div>
                    <div style="display:flex; flex-wrap:wrap; gap:5px">
                        ${matches.map(tag => {
                const isSelected = window.selectedTags.has(tag);
                return `<button class="tag-chip ${isSelected ? 'selected' : ''}" onclick="window.toggleTag('${tag}')">${tag}</button>`;
            }).join('')}
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = resultsHTML || '<div style="color:#666; font-size:0.8rem; padding:10px">No se encontraron etiquetas.</div>';
};

// --- GLOBAL HELPER DEFINITIONS ---
window.openInfo = (page) => {
    console.log("Abriendo Info:", page);
    const modal = document.getElementById('infoModal');
    const content = document.getElementById('infoContent');
    const texts = LEGAL_TEXTS || {};

    if (modal && content && texts[page]) {
        content.innerHTML = texts[page];

        // FIX: Move to body to avoid stacking context issues (Same fix as Detail Modal)
        if (modal.parentNode !== document.body) {
            document.body.appendChild(modal);
        }

        modal.style.cssText = 'display: flex !important; z-index: 2147483647 !important; visibility: visible !important; opacity: 1 !important; background: rgba(0,0,0,0.95) !important; position: fixed !important; top: 0; left: 0; width: 100%; height: 100%;';
    } else {
        alert("Error abriendo info: " + page + ". Textos disponibles: " + Object.keys(texts).length);
    }
};

window.openTip = (postId) => {
    if (!store.currentUser) {
        alert("Debes iniciar sesión para enviar propinas.");
        window.openLogin();
        return;
    }
    const p = store.prompts.find(x => String(x.id) === String(postId));
    if (!p) {
        window.toast("❌ Post no encontrado", 'error');
        return;
    }

    currentTipPostId = postId;

    // Remove any existing dynamic tip modal
    const existingModal = document.getElementById('dynamicTipModal');
    if (existingModal) existingModal.remove();

    // Create modal dynamically
    const overlay = document.createElement('div');
    overlay.id = 'dynamicTipModal';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.95); z-index:9000000; display:flex; align-items:center; justify-content:center;';

    overlay.innerHTML = `
                < div style = "background:#1a1a2e; border:1px solid #333; border-radius:16px; padding:30px; max-width:400px; width:90%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.5);" >
            <div style="font-size:3rem; margin-bottom:10px">💎</div>
            <h2 style="color:#fff; margin:0 0 5px 0">Enviar a @${p.author}</h2>
            <p style="color:#888; margin-bottom:20px">Apoya el post "${p.title}"</p>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px">
                <button onclick="window.doSendTip(5)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 5</button>
                <button onclick="window.doSendTip(10)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 10</button>
                <button onclick="window.doSendTip(20)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 20</button>
                <button onclick="window.doSendTip(50)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 50</button>
            </div>
            
            <div style="font-size:0.85rem; color:#666; margin-bottom:20px">
                Tu saldo: <span style="color:#a29bfe; font-weight:700">${store.currentUser.tokens || 0}</span> PromptBits
            </div>
            
            <button onclick="document.getElementById('dynamicTipModal').remove()" style="background:transparent; border:none; color:#666; padding:10px 20px; cursor:pointer; font-size:0.9rem">Cancelar</button>
        </div >
                `;

    // Click on overlay (outside modal) to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    // Add to body
    document.body.appendChild(overlay);
};

window.doSendTip = async (amount) => {
    if (!currentTipPostId) return;
    if (await window.askConfirm(`¿Enviar ${amount} PromptBits a este autor ? `, '💎')) {
        // Immediate feedback
        window.toast("Enviando PromptBits...", "info");

        const res = await store.sendTip(currentTipPostId, amount);
        if (res.success) {
            window.toast(res.msg, 'success');
            window.closeModals();
            if (window.render) window.render();
        } else {
            window.toast("❌ " + res.msg, 'error');
        }
    }
};

let currentTipPostId = null;

// Initial Render
if (MAINTENANCE_MODE) {
    renderMaintenance();
} else {
    try {
        store.init().then(() => {
            render();
            console.log("MAIN JS INIT SUCCESS");
        });
    } catch (e) {
        // ... err handling
    }
}

// Handle browser back button basic simulation
window.onpopstate = () => {
    if (currentView !== 'home') {
        window.goHome();
    }
};



window.startMigration = async () => {
    const statusEl = document.getElementById('migrateStatus');
    const barEl = document.getElementById('migrateBar');
    const progContainer = document.getElementById('migrateProgress');
    const btn = document.getElementById('btnStartMigrate');

    btn.disabled = true;
    btn.innerText = "⏳ Migrando...";
    progContainer.style.display = 'block';

    let keepGoing = true;
    let sessionIgnored = [];
    let initialCount = -1;
    let totalMigrated = 0;

    while (keepGoing) {
        statusEl.innerText = "🔍 Analizando base de datos...";

        const result = await store.migrateOldImages((current, batchTotal, title, totalPending) => {
            if (initialCount === -1 && totalPending) {
                initialCount = totalPending;
                console.log(`📊 Total a migrar: ${initialCount} posts`);
            }

            let pct = 0;
            if (initialCount > 0) {
                const done = initialCount - totalPending;
                pct = (done / initialCount) * 100;
            }

            statusEl.innerText = `📥 Migrando "${title}"... (Quedan ${totalPending})`;
            barEl.style.width = `${Math.min(pct, 100)}%`;
        }, sessionIgnored);

        if (result.fatal) {
            statusEl.innerText = "❌ Error Crítico: " + result.fatal;
            alert("Error crítico en la migración:\\n" + result.fatal);
            keepGoing = false;
        } else if (result.done || result.totalPending === 0) {
            keepGoing = false;
            statusEl.innerText = "✅ ¡Migración Completada!";
            barEl.style.width = '100%';

            const summary = `✅ Migración Finalizada\n\n` +
                `Total migrado: ${totalMigrated + result.count} posts\n` +
                (sessionIgnored.length > 0 ? `Ignorados(errores): ${sessionIgnored.length} \n` : '') +
                `\nTodos tus posts están ahora en Cloudinary.`;

            alert(summary);

            setTimeout(() => {
                window.closeModals();
                window.location.reload();
            }, 1000);
        } else {
            totalMigrated += result.count;

            if (result.failedIds && result.failedIds.length > 0) {
                sessionIgnored = [...sessionIgnored, ...result.failedIds];
                console.warn(`⚠️ ${result.failedIds.length} posts fallaron en este lote`);
            }

            statusEl.innerText = `✅ Lote completado(${result.count} migrados).Continuando...`;
            await new Promise(r => setTimeout(r, 500));
        }
    }

    btn.disabled = false;
    btn.innerText = "🚀 Iniciar Migración";
};

// --- INIT TOP CREATORS ---
setTimeout(() => {
    loadTopCreators();
}, 1000);

// --- PASSWORD RESET TOKEN DETECTION ---
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // Si el usuario viene con un token de reset, abrimos el modal de actvación
    if (token) {
        console.log("🔐 Token de activación detectado. Abriendo modal...");
        setTimeout(() => {
            if (document.getElementById('authModal')) {
                document.getElementById('authModal').style.display = 'flex';
                window.toggleAuth('act');
            }
        }, 800);
    }
});
