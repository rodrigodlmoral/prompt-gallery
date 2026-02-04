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
    let user = store.users.find(u => u.username === profileUser);
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
                        <span class="level-badge tier-${user.level || 0}" title="Nivel ${user.level || 0}">
                            ${lvlInfo.icon} NIVEL ${user.level || 0} - ${lvlInfo.name}
                        </span>
                    </div>
                    <div style="display:flex; gap:20px; color:#888; font-size:0.9rem; align-items:center">
                        <div class="token-display">💎 ${user.tokens || 0} PromptBits</div>
                        <span>|</span>
                        <span>${user.followers?.length || 0} Seguidores</span>
                        <span>${user.following?.length || 0} Siguiendo</span>
                    </div>
                    ${!isMe ? `<button class="btn" style="margin-top:15px" onclick="window.doFollow('${user.username}')">${store.currentUser?.following?.includes(user.id) ? 'Siguiendo' : 'Seguir'}</button>`
            : `<button class="btn-outline" style="margin-top:15px" onclick="window.location.href='/?settings=true'">⚙️ Configurar Perfil</button>`}
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

// --- LOGIC ---
const render = () => {
    app.innerHTML = Header() + ProfileHeader() + Gallery() + DetailModalTemplate();
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
    const modal = document.getElementById('viewModal');
    if (modal) modal.style.display = 'none';
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

const init = async () => {
    await store.init();
    if (profileUser) {
        await store.fetchUserProfileByUsername(profileUser);
    }
    render();
};

init();
