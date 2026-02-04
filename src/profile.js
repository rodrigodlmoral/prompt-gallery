import './style.css'
import { store } from './store.js'

const app = document.getElementById('profile-app');

// --- STATE ---
let profileUser = new URLSearchParams(window.location.search).get('u') || '';
let profileTab = 'creations';
let searchQuery = '';
let currentId = null;
let currentSeqStep = 0;

// --- HELPERS ---
window.escapeHTML = (str) => {
    if (!str) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const isImageFile = (file) => {
    if (!file) return false;
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
    return validTypes.includes(file.type);
};

// --- MODERATION LOGIC ---
const getModeration = (p, forcedRating) => {
    let rating = forcedRating || p.rating || 'SFW / Apto';
    if (!forcedRating && p.type === 'sequence' && p.content && p.content.length > 0) {
        rating = p.content[0].rating || 'SFW / Apto';
    }
    const mod = store.currentUser?.moderation || { suggestive: 'ON', nsfw: 'BLUR' };
    let applyBlur = false; let warningLabel = '';
    if (rating === 'Sugestivo' && mod.suggestive === 'BLUR') { applyBlur = true; warningLabel = 'SUGESTIVO'; }
    if (rating === 'NSFW / +18' && mod.nsfw === 'BLUR') { applyBlur = true; warningLabel = 'NSFW'; }
    return { applyBlur, warningLabel };
};

// --- CONSTANTS ---
const LEVEL_REQS = [
    { posts: 0, name: 'Explorador', benefits: ['Comentar en prompts', 'Guardar favoritos', 'Enviar PromptBits'], icon: '🛡️', color: '#888' },
    { posts: 10, name: 'Iniciado', benefits: ['Publicar Secuencias (Multi-imagen)', 'Acceso a retos semanales'], icon: '🎖️', color: '#4caf50' },
    { posts: 25, name: 'Principiante', benefits: ['Cambiar foto de perfil', 'Añadir redes sociales al perfil'], icon: '🏅', color: '#2196f3' },
    { posts: 50, name: 'Contribuidor', benefits: ['Sin cooldown en comentarios', 'Medalla especial de plata'], icon: '🥇', color: '#ff9800' },
    { posts: 100, name: 'Autor', benefits: ['Destacar tus propios posts (Self-Promo)', 'Panel de estadísticas avanzado'], icon: '💎', color: '#9c27b0' },
    { posts: 250, name: 'COLABORADOR', benefits: ['Herramientas de moderación básica', 'Soporte prioritario 24/7'], icon: '✨', color: 'gold' }
];

const renderCollage = (p) => {
    if (p.type !== 'sequence' || !p.content || p.content.length === 0) {
        return `<img src="${p.image || ''}" loading="lazy">`;
    }
    const items = p.content.slice(0, 6);
    const count = items.length;
    let gridStyle = '';
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
        if (count === 3 && idx === 0) spanStyle = 'grid-column: span 2;';
        if (count === 5) {
            if (idx < 2) spanStyle = 'grid-column: span 3;';
            else spanStyle = 'grid-column: span 2;';
        }
        return `
            <div class="collage-item ${applyBlur ? 'card-blurred' : ''}" style="${spanStyle}">
                <img src="${step.image}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
            </div>`;
    }).join('')}
    </div>`;
};

// --- COMPONENTS ---
const Header = () => `
<header style="height:auto; display:flex; flex-direction:column">
    <div class="container" style="height:72px; border-bottom:1px solid #222">
        <div class="logo" onclick="window.location.href='/'" style="cursor:pointer">✨ Prompt Gallery</div>
        <div class="search-bar search-desktop">
            <input type="search" class="search-input" id="searchInput" placeholder="Buscar..." value="${searchQuery}" readonly>
        </div>
        <nav>
            ${store.currentUser ? `
                ${store.currentUser.role === 'admin' ? `<a href="/admin.html" class="btn-outline" style="border-color:gold; color:gold; text-decoration:none; padding: 10px 15px; border-radius: 8px; font-weight: 600;">👑 Admin</a>` : ''}
                <button class="btn" onclick="window.location.href='/'">Compartir Prompt</button>
                <div class="user-info" onclick="window.location.href='/profile.html?u=${store.currentUser.username}'" style="cursor:pointer">
                    <div class="user-avatar-sm" style="background-image:url('${store.currentUser.avatar || 'https://robohash.org/' + store.currentUser.username}')"></div>
                    <span>${store.currentUser.username}</span>
                </div>
                <button class="btn-outline" onclick="window.doLogout()">Salir</button>
            ` : `<button class="btn" onclick="window.location.href='/'">Iniciar Sesión</button>`}
        </nav>
    </div>
</header>`;

const ProfileHeader = () => {
    if (!profileUser) return '';
    let user = (store.currentUser && store.currentUser.username === profileUser)
        ? store.currentUser
        : store.users.find(u => u.username === profileUser);

    if (!user) return `<div class="container" style="padding:100px; text-align:center"><h2>Cargando perfil...</h2></div>`;

    const isMe = store.currentUser && store.currentUser.username === user.username;
    const getLevelInfo = (lvl) => LEVEL_REQS[lvl] || LEVEL_REQS[0];
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
                        ${(user.username === 'rodrigodlmoral' || user.username === 'rodridomrock') ? `
                        <div class="founder-badge">
                            <span class="badge-text">👑 Administrador - Fundador</span>
                        </div>
                        ` : ''}

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
                        <div class="token-display">💎 ${user.tokens || 0} PromptBits</div>
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
    </div>`;
};

const Gallery = () => {
    let list = [...store.prompts].filter(p => {
        if (p.isPrivate && (!store.currentUser || store.currentUser.username !== p.author)) return false;
        return profileTab === 'creations' ? p.author === profileUser : p.savedBy?.includes(profileUser);
    });

    if (list.length === 0) return `<div class="container" style="padding:100px; text-align:center; color:#666">No hay prompts aquí todavía.</div>`;

    return `
    <div class="container gallery-grid" style="margin-top:20px">
        ${list.map(p => {
        const { applyBlur, warningLabel } = getModeration(p);
        const reactions = p.reactions || { like: 0 };
        return `
            <div class="card">
                <div class="card-img-wrap ${applyBlur ? 'card-blurred' : ''}" data-post-id="${p.id}" style="height:100%; cursor:pointer">
                    ${renderCollage(p)}
                    ${applyBlur ? `<div class="blur-overlay"><span>🔞 ${warningLabel}</span></div>` : ''}
                </div>
                <div class="card-overlay" data-post-id="${p.id}" style="cursor:pointer">
                    <div style="font-weight:700; font-size:0.9rem; margin-bottom:5px">${window.escapeHTML(p.title)}</div>
                    <div style="font-size:0.8rem; opacity:0.8; margin-bottom:10px">por @${window.escapeHTML(p.author)}</div>
                    <div class="card-stats" style="font-size:0.75rem; display:flex; gap:8px; flex-wrap:wrap">
                        <span title="Me gusta">👍 ${reactions.like || 0}</span>
                        <span title="Copiado" style="color:var(--accent); font-weight:700">📋 ${p.copy_count || 0}</span>
                        <span style="color:#a29bfe; font-weight:700">💎 ${p.tokens_received || 0}</span>
                    </div>
                </div>
            </div>`;
    }).join('')}
    </div>`;
};

const DetailModalTemplate = () => `
<div id="viewModal" class="modal-overlay" style="display:none;" onclick="if(event.target === this) window.closeModals()">
    <div class="view-modal-wrapper">
        <div class="view-modal">
            <button class="modal-close-x" onclick="window.closeModals()">✕</button>
            <div class="view-img-side">
                <img id="detImg" src="" alt="Post Image">
            </div>
            <div class="view-info-side">
                <div class="view-scroll-content">
                    <h2 id="detTitle" style="margin-bottom:10px"></h2>
                    <div id="detUser" style="font-weight:700; margin-bottom:15px; color:var(--accent)"></div>
                    <div id="detPrompt" class="prompt-area" style="white-space:pre-wrap; background:#000; padding:15px; border-radius:8px; border:1px solid #333; margin-bottom:15px"></div>
                    <button class="btn" style="width:100%" onclick="window.doCopyPrompt()">📋 Copiar Prompt</button>
                    <div id="detComments" style="margin-top:20px"></div>
                </div>
            </div>
        </div>
    </div>
</div>`;

const SettingsModal = () => {
    if (!store.currentUser) return '';
    const u = store.currentUser;
    const soc = u.socials || {};
    const mod = u.moderation || { suggestive: 'ON', nsfw: 'BLUR' };

    return `
<div id="settingsModal" class="modal-overlay" style="display:none;" onclick="if(event.target === this) window.closeModals()">
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


// --- LOGIC ---
const render = () => {
    app.innerHTML = Header() + ProfileHeader() + Gallery() + DetailModalTemplate() + SettingsModal();
    attachEvents();
};

const attachEvents = () => {
    document.querySelectorAll('[data-post-id]').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-post-id');
            window.openDetail(id);
        });
    });
};

window.openDetail = (id) => {
    const p = store.prompts.find(x => x.id === id);
    if (!p) return;
    currentId = id;
    const modal = document.getElementById('viewModal');
    document.getElementById('detTitle').innerText = p.title;
    document.getElementById('detUser').innerText = `@${p.author}`;
    document.getElementById('detPrompt').innerText = p.prompt || '';
    document.getElementById('detImg').src = p.image;
    modal.style.display = 'flex';
};

window.closeModals = () => {
    const vModal = document.getElementById('viewModal');
    if (vModal) vModal.style.display = 'none';
    const sModal = document.getElementById('settingsModal');
    if (sModal) sModal.style.display = 'none';
};

window.doCopyPrompt = async () => {
    const p = store.prompts.find(x => x.id === currentId);
    if (!p) return;
    await navigator.clipboard.writeText(p.prompt || '');
    alert("¡Copiado!");
};

window.doLogout = () => {
    store.logout();
    window.location.href = '/';
};

window.doFollow = async (username) => {
    if (!store.currentUser) return window.location.href = '/';
    await store.followUser(username);
    render();
};

window.setProfileTab = (tab) => {
    profileTab = tab;
    render();
};

// --- SETTINGS LOGIC ---
window.openSettings = () => {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'flex';
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
    const avatarFile = document.getElementById('setAvatarFile').files[0];

    const finishSave = async (avatarData) => {
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

        const updateData = { username, socials, moderation };
        if (avatarData) updateData.avatar = avatarData;

        const res = await store.updateUserSettings(updateData);
        if (res.success) {
            window.closeModals();
            render();
        } else {
            alert(res.msg);
        }
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
    if (!newPass || newPass.length < 6) return alert("La contraseña debe tener al menos 6 caracteres.");
    if (confirm("¿Seguro que quieres cambiar tu contraseña?")) {
        store.changePassword(newPass);
    }
};

window.doDeleteAccount = () => {
    const confirmation = prompt("⚠️ PELIGRO ⚠️\nEscribe 'ELIMINAR' para borrar tu cuenta permanentemente.\nEsta acción NO se puede deshacer.");
    if (confirmation === 'ELIMINAR') {
        store.deleteAccount();
        alert("Tu cuenta ha sido eliminada.");
        window.location.href = '/';
    }
};

window.togglePass = (id, btn) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'password') {
        el.type = 'text';
        btn.innerText = '🙈';
    } else {
        el.type = 'password';
        btn.innerText = '👁️';
    }
};

// --- LEVEL PROGRESS LOGIC ---
window.openLevelProgress = () => {
    if (!store.currentUser) { alert("Error: No has iniciado sesión."); return; }
    document.body.style.overflow = 'hidden';
    const oldModal = document.getElementById('levelModalDynamic');
    if (oldModal) oldModal.remove();

    const u = store.currentUser;
    const count = u.prompts_count || 0;
    const currentLvl = u.level || 0;

    const nextLvlReq = LEVEL_REQS.find(l => l.posts > count) || LEVEL_REQS[LEVEL_REQS.length - 1];
    const isMax = count >= LEVEL_REQS[LEVEL_REQS.length - 1].posts;

    let progressPercent = 0;
    if (isMax) {
        progressPercent = 100;
    } else {
        const prevReq = LEVEL_REQS[currentLvl].posts;
        const nextReq = nextLvlReq.posts;
        progressPercent = Math.min(100, Math.max(0, ((count - prevReq) / (nextReq - prevReq)) * 100));
    }

    const html = `
        <div style="text-align:center; margin-bottom:25px; padding-bottom:15px; border-bottom:1px solid #222">
            <div style="font-size:3.5rem; margin-bottom:10px">${LEVEL_REQS[currentLvl].icon}</div>
            <h2 style="margin:0; font-size:1.8rem; color:#fff">Tu Historial: Nivel ${currentLvl}</h2>
            <p style="color:#aaa; margin-top:5px; font-weight:600; text-transform:uppercase; letter-spacing:1px">${LEVEL_REQS[currentLvl].name}</p>
        </div>
        <div style="background:#000; padding:25px; border-radius:16px; border:1px solid #333; margin-bottom:25px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5)">
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:1rem; font-weight:700">
                <span style="color:#888">${isMax ? 'Rango Ápice Alcanzado' : 'Hacia Nivel ' + (currentLvl + 1)}</span>
                <span style="color:#2563eb">${count} / ${isMax ? '∞' : nextLvlReq.posts} Posts</span>
            </div>
            <div style="width:100%; height:16px; background:#222; border-radius:8px; overflow:hidden; border:1px solid #333">
                <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, #2563eb, #a29bfe); transition:width 1.5s cubic-bezier(0.19, 1, 0.22, 1)"></div>
            </div>
            ${!isMax ? `<p style="font-size:0.9rem; color:#888; margin-top:12px; text-align:center">¡Sigue así! Te faltan <strong>${nextLvlReq.posts - count}</strong> publicaciones para subir de rango.</p>` : ''}
        </div>
        <h3 style="font-size:1.2rem; margin-bottom:18px; color:#fff; display:flex; align-items:center; gap:10px">
            <span>Beneficios y Jerarquía</span>
            <div style="flex:1; height:1px; background:#222"></div>
        </h3>
        <div style="display:flex; flex-direction:column; gap:12px">
            ${LEVEL_REQS.map((l, idx) => {
        const isUnlocked = count >= l.posts;
        const isCurrent = currentLvl === idx;
        return `
                <div style="display:flex; gap:15px; align-items:start; padding:15px; border-radius:12px; border:1px solid ${isCurrent ? '#2563eb' : (isUnlocked ? '#333' : '#1a1a1a')}; background:${isCurrent ? 'rgba(37, 99, 235, 0.1)' : (isUnlocked ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.3)')}; opacity:${isUnlocked ? 1 : 0.4}; transition:0.3s">
                    <div style="font-size:1.6rem; background:#111; min-width:50px; height:50px; border-radius:10px; display:flex; align-items:center; justify-content:center; border:2px solid ${l.color}">${l.icon}</div>
                    <div style="flex:1">
                        <div style="display:flex; justify-content:space-between; align-items:center">
                            <strong style="color:${l.color}; font-size:1.05rem;">Nivel ${idx}: ${l.name}</strong>
                            <span style="font-size:0.75rem; background:#333; color:#fff; padding:3px 10px; border-radius:100px; font-weight:700">${l.posts} Posts</span>
                        </div>
                        <ul style="margin:8px 0 0 0; padding-left:18px; font-size:0.9rem; color:#999; line-height:1.4">
                            ${l.benefits.map(b => `<li>${b}</li>`).join('')}
                        </ul>
                    </div>
                </div>`;
    }).join('')}
        </div>
        <button class="btn" style="width:100%; margin-top:30px; height:54px; font-weight:800; font-size:1.1rem; background:#2563eb; color:white; border:none; border-radius:14px; cursor:pointer;" onclick="window.closeLevelProgress(this)">Entendido</button>
    `;

    window.closeLevelProgress = (btn) => {
        const modal = btn ? btn.closest('.modal-overlay') : document.getElementById('levelModalDynamic');
        if (modal) modal.remove();
        document.body.style.overflow = '';
    };

    const modalDiv = document.createElement('div');
    modalDiv.id = 'levelModalDynamic';
    modalDiv.className = 'modal-overlay';
    modalDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(12px); display:flex; align-items:center; justify-content:center; z-index:2147483647; padding:20px; color:white; font-family:Inter, sans-serif;';
    modalDiv.onclick = (e) => { if (e.target === modalDiv) window.closeLevelProgress(); };
    modalDiv.innerHTML = `
        <style>
            #levelModalDynamic .modal-container::-webkit-scrollbar { width: 6px; }
            #levelModalDynamic .modal-container::-webkit-scrollbar-track { background: transparent; }
            #levelModalDynamic .modal-container::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        </style>
        <div class="modal-container" style="max-width:550px; background:#111; border:1px solid #333; border-radius:28px; width:100%; padding:35px; max-height:85vh; overflow-y:auto; box-shadow: 0 30px 60px rgba(0,0,0,0.8); position:relative;">
            ${html}
        </div>`;
    document.body.appendChild(modalDiv);
};

const init = async () => {
    await store.init();
    if (profileUser) {
        await store.fetchUserProfileByUsername(profileUser);
    }
    render();
};

init();
