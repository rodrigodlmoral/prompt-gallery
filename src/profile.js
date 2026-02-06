import './style.css'
import { store, LEVEL_REQS, TOOLS, RATINGS, RATING_INFO, INFO_ICON } from './store-final.js'

const app = document.getElementById('profile-app');

// --- STATE ---
let profileUser = new URLSearchParams(window.location.search).get('u') || '';
let profileTab = 'creations';
let searchQuery = '';
let currentId = null;
let currentSeqStep = 0;
let currentTipPostId = null;
window.sliderUnlocked = false;
let seqStepCount = 0;
let isEditing = false;
let editingId = null;

// --- SAFETY CHECK: Ensure NSFW Reveal Buttons always exist in Detail View ---
setInterval(() => {
    document.querySelectorAll('.card-blurred').forEach(wrapper => {
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
            if (!hasButton) {
                overlay.innerHTML = `<span>🔞 ${warningLabel}</span><button class="btn" style="margin-top:10px; background: #ff4444; color: white; border:none; padding: 5px 10px; border-radius:4px; font-weight:700; cursor:pointer;" onclick="event.stopPropagation(); window.revealImage(this)">👁️ Revelar Imagen</button>`;
            }
        } else {
            if (hasButton || !hasLabel) {
                overlay.innerHTML = `<span>🔞 ${warningLabel}</span>`;
            }
        }
    });
}, 500);

// --- CONSTANTS ---
// Constants imported from store-final.js

// --- HELPERS ---
window.openUserProfile = (username) => {
    window.location.href = `/profile.html?u=${encodeURIComponent(username)}`;
};

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
// LEVEL_REQS imported from store-final.js

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
            <div class="collage-item ${applyBlur ? 'card-blurred' : ''}" data-warning="${applyBlur ? warningLabel : ''}" style="${spanStyle}">
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
                <button class="btn" onclick="window.openCreate()">Compartir Prompt</button>
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
    console.log(`[PROFILE] ProfileHeader: profileUser="${profileUser}"`);
    if (!profileUser) return '';
    let user = (store.currentUser && (store.currentUser.username === profileUser || store.currentUser.name === profileUser))
        ? store.currentUser
        : (store.users.find(u => u.username === profileUser || u.name === profileUser) || store.usersCache[profileUser]);

    console.log(`[PROFILE] ProfileHeader: user encontrado?`, user ? user.username : 'NO');

    if (!user) {
        // Si ya pasó un tiempo razonable y sigue sin cargar, asumimos error
        if (window.initDone) {
            return `
             <div style="height:40vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#666; font-family:sans-serif">
                 <div style="font-size:3rem">🤷‍♂️</div>
                 <p style="margin-top:20px; letter-spacing:1px; font-size:0.9rem">USUARIO NO ENCONTRADO</p>
                 <button class="btn-outline" onclick="window.location.href='/'" style="margin-top:20px">Volver al Inicio</button>
             </div>`;
        }
        return `
        <div style="height:40vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#666; font-family:sans-serif">
            <div style="font-size:3rem; animation: pulse 1s infinite">✨</div>
            <p style="margin-top:20px; letter-spacing:1px; font-size:0.9rem">CARGANDO PERFIL...</p>
        </div>`;
    }

    const isMe = store.currentUser && store.currentUser.id === user.id;
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
                        ${(user.username === 'rodrigodlmoral' || user.username === 'rodridomrock' || user.name === 'rodrigodlmoral') ? `
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
                        <div class="token-display" 
                             ${!isMe ? `onclick="window.openDirectTip('${user.id}', '${user.username}')" style="cursor:pointer" title="Regalar PromptBits a @${user.username}"` : ''}>
                            💎 ${user.tokens || 0} PromptBits
                        </div>
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
            : `
            <div style="display:flex; gap:10px; margin-top:15px; flex-wrap:wrap">
                <button class="btn-outline" onclick="window.openActivity()">📜 Actividad</button>
                <button class="btn-outline" onclick="window.openSettings()">⚙️ Configurar</button>
                ${(isMe && user.role === 'admin') ? `<button class="btn-sm" onclick="window.open('/admin.html', '_blank')" style="background:gold; color:black; font-weight:bold; box-shadow:0 0 10px gold; border:none">👑 PANEL ADMIN</button>` : ''}
                ${(isMe && user.role === 'admin') ? `<button class="btn-sm" onclick="window.doClaimGhosts()" style="background:#ff4444; color:white; font-weight:bold; border:none">👻 FIX POSTS</button>` : ''}
            </div>
            `}
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
    const user = (store.currentUser && (store.currentUser.username === profileUser || store.currentUser.name === profileUser))
        ? store.currentUser
        : (store.users.find(u => u.username === profileUser || u.name === profileUser) || store.usersCache[profileUser]);

    console.log(`[PROFILE] Gallery: user encontrado?`, user ? user.username : 'NO');

    if (!user) return '<div class="container" style="padding:40px 0; color:#666">Cargando galería...</div>';

    let list = [...store.prompts].filter(p => {
        if (p.is_private && (!store.currentUser || store.currentUser.id !== p.author_id)) return false;
        // FIX v4.6: Compare ID with ID (p.author was username)
        return profileTab === 'creations' ? p.author_id === user.id : p.savedBy?.includes(user.id);
    });

    if (list.length === 0) return `<div class="container" style="padding:100px; text-align:center; color:#666">No hay prompts aquí todavía.</div>`;

    return `
    <div class="container gallery-grid" style="margin-top:20px">
        ${list.map(p => {
        const { applyBlur, warningLabel } = getModeration(p);
        const reactions = p.reactions || { like: 0 };
        return `
            <div class="card">
                <div class="card-img-wrap ${applyBlur ? 'card-blurred' : ''}" data-post-id="${p.id}" data-warning="${applyBlur ? warningLabel : ''}" style="height:100%; cursor:pointer">
                    ${renderCollage(p)}
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

                ${(store.currentUser?.username === profileUser && p.author === store.currentUser?.username) ? `
                <div style="position:absolute; top:10px; right:10px; display:flex; gap:5px; z-index:10;">
                    ${(store.currentUser?.level >= 4 && !p.is_featured) ? `<button class="btn-icon" style="background:rgba(241,196,15,0.8); padding:5px; width:auto; height:30px; font-size:0.75rem; color:black; font-weight:700" onclick="event.stopPropagation(); window.doPromotePrompt('${p.id}')" title="Destacar por 1 semana (50 PromptBits)">💎 50 PromptBits</button>` : ''}
                    <button class="btn-icon" style="background:rgba(0,0,0,0.6); padding:5px; width:30px; height:30px; font-size:0.9rem" onclick="event.stopPropagation(); window.doEditPrompt('${p.id}')" title="Editar">✏️</button>
                    <button class="btn-icon" style="background:rgba(0,0,0,0.6); padding:5px; width:30px; height:30px; font-size:0.9rem" onclick="event.stopPropagation(); window.doDeletePrompt('${p.id}')" title="Eliminar Post">🗑️</button>
                </div>` : ''}
            </div>`;
    }).join('')}
    </div>`;
};

// --- ACTION FUNCTIONS ---
window.doEditPrompt = (id) => {
    isEditing = true;
    editingId = id;
    const p = store.prompts.find(x => String(x.id) === String(id));
    if (!p) return;

    // Reuse Create Modal
    document.getElementById('createModal').style.display = 'flex';
    document.getElementById('upTitle').value = p.title;
    document.getElementById('upTool').value = p.tool;
    document.getElementById('upRating').value = p.rating || 'SFW / Apto';
    document.getElementById('upPrompt').value = p.prompt || '';
    if (document.getElementById('upNegPrompt')) {
        document.getElementById('upNegPrompt').value = p.negative_prompt || '';
    }
    document.getElementById('upPrivate').checked = p.isPrivate;
    document.getElementById('upReference').checked = p.needsReference || p.needs_reference;

    // Handle Creator
    if (p.origCreator) {
        document.querySelector('input[name="origCreator"][value="other"]').checked = true;
        window.toggleOrigCreator('other');
        document.getElementById('upOrigName').value = p.origCreator.name;
        document.getElementById('upOrigUrl').value = p.origCreator.url;
    } else {
        document.querySelector('input[name="origCreator"][value="me"]').checked = true;
        window.toggleOrigCreator('me');
    }

    // Handle Type
    if (p.type === 'sequence') {
        document.querySelector('input[name="postType"][value="sequence"]').checked = true;
        window.togglePostType('sequence');
        const container = document.getElementById('seqContainer');
        container.innerHTML = '';
        seqStepCount = 0;
        if (p.content) {
            p.content.forEach(step => {
                window.addSeqStep();
                const lastStep = container.lastElementChild;
                lastStep.querySelector('.seqPrompt').value = step.prompt;
                lastStep.querySelector('.seqRating').value = step.rating;
                const fileInput = lastStep.querySelector('.seqFile');
                const prev = document.createElement('div');
                prev.innerHTML = `<small>Imagen actual guardada.</small><br><img src="${step.image}" style="height:50px; border:1px solid #444; margin-top:5px">`;
                fileInput.parentElement.insertBefore(prev, fileInput);
            });
        }
    } else {
        document.querySelector('input[name="postType"][value="single"]').checked = true;
        window.togglePostType('single');
        const fileInput = document.getElementById('upFile');
        const existingPrev = fileInput.parentElement.querySelector('.edit-preview');
        if (existingPrev) existingPrev.remove();
        const prev = document.createElement('div');
        prev.className = 'edit-preview';
        prev.innerHTML = `<div style="margin:10px 0"><small>Imagen actual:</small><br><img src="${p.image}" style="max-height:100px; border:1px solid #555"></div>`;
        fileInput.parentElement.insertBefore(prev, fileInput);
    }

    const btn = document.getElementById('pubBtn');
    if (btn) {
        btn.innerText = "Actualizar";
        btn.onclick = window.doUpdate;
    }
};

window.doUpdate = async () => {
    try {
        const title = document.getElementById('upTitle').value;
        const tool = document.getElementById('upTool').value;
        if (!title) { if (window.toast) window.toast("El título es obligatorio", "error"); return; }

        const p = store.prompts.find(x => String(x.id) === String(editingId));
        if (!p) return;

        const data = {
            title, tool, rating: document.getElementById('upRating').value,
            prompt: document.getElementById('upPrompt').value,
            negative_prompt: document.getElementById('upNegPrompt')?.value || '',
            isPrivate: document.getElementById('upPrivate').checked,
            needsReference: document.getElementById('upReference').checked,
            type: p.type
        };

        const btn = document.getElementById('pubBtn');
        if (btn) btn.innerText = "Guardando...";

        if (p.type === 'single') {
            const file = document.getElementById('upFile').files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async () => {
                    data.image = reader.result;
                    const res = await store.updatePrompt(editingId, data);
                    if (res.success) finishUpdate();
                    else if (window.toast) window.toast("Error: " + res.msg, "error");
                };
                reader.readAsDataURL(file);
            } else {
                data.image = p.image;
                const res = await store.updatePrompt(editingId, data);
                if (res.success) finishUpdate();
                else if (window.toast) window.toast("Error: " + (res.msg || "Error desconocido"), "error");
            }
        } else {
            if (window.toast) window.toast("Edición de secuencias en mantenimiento en perfil. Por favor borra y crea de nuevo.", "error");
            if (btn) { btn.innerText = "Actualizar"; }
        }
    } catch (e) { console.error(e); }
};

const finishUpdate = () => {
    if (window.toast) window.toast("✅ Post actualizado", "success");
    isEditing = false;
    editingId = null;
    window.closeModals();
    render();
    const btn = document.getElementById('pubBtn');
    if (btn) {
        btn.innerText = "Publicar";
        btn.onclick = window.doPublish;
    }
};

window.doDeletePrompt = async (id) => {
    if (await window.askConfirm('¿Eliminar este post permanentemente?', '🗑️')) {
        const res = await store.removePrompt(id);
        if (res.success) {
            if (id === currentId) window.closeModals();
            render();
        } else {
            alert(res.msg);
        }
    }
};

window.doPromotePrompt = async (id) => {
    if (await window.askConfirm('¿Destacar este prompt por 1 semana (Costo: 50 PromptBits)?', '💎')) {
        const res = await store.promotePrompt(id);
        if (res.success) {
            if (window.toast) window.toast("🚀 ¡Prompt destacado con éxito!", "success");
            render();
        } else {
            alert(res.msg);
        }
    }
};

const DetailModalTemplate = () => `
<div id="viewModal" class="modal-overlay" style="display:none;" onclick="if(event.target === this) window.closeModals()">
    <div class="view-modal-wrapper">
        <div class="view-modal">
            <button class="modal-close-x" onclick="window.closeModals()">✕</button>
            <div class="view-img-side" id="detImgWrap">
                <div id="detCopyBadge" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); padding:4px 10px; border-radius:15px; font-size:0.7rem; color:var(--accent); font-weight:700; border:1px solid var(--accent); display:none; z-index:10">📋 Copiado 0 veces</div>
                <img id="detImg" src="" alt="Post Image">
                <button class="fullscreen-btn" onclick="window.doFullScreen()">🔍 Ver Pantalla Completa</button>
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
                            </div>
                        </div>
                    </div>
                    
                    <div id="detUser" style="font-weight:700; margin-bottom:10px; color:var(--accent);"></div>
                    
                    <div id="detBadges" style="display:flex; gap:8px; margin-bottom:15px; flex-wrap:wrap"></div>
                    
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
    
    <form autocomplete="off" onsubmit="return false;" style="display:contents">
        <input type="text" name="fakeusernameremembered" style="display:none" autocomplete="username">
        <input type="password" name="fakepasswordremembered" style="display:none" autocomplete="current-password">
    
    <input type="text" id="upTitle" class="form-input" placeholder="Título" style="margin-bottom:15px" autocomplete="off" name="post_title_unique_id">
    
    <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px">
        <label class="form-label" style="font-size:0.75rem; color:#666">HERRAMIENTA</label>
        <select id="upTool" class="form-input" style="margin:0" onchange="window.checkToolConfig()">${TOOLS.map(t => `<option value='${t}'>${t}</option>`).join('')}</select>
    </div>

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
    
    <div class="form-group" style="margin-bottom:15px">
        <label class="form-label">¿QUIEN ES EL CREADOR ORIGINAL?</label>
        <div style="display:flex; gap:15px; margin-bottom:10px">
            <label class="chk-wrap">
                <input type="radio" name="origCreator" value="me" checked onchange="window.toggleOrigCreator('me')">
                <span>Yo</span>
            </label>
            <label class="chk-wrap">
                <input type="radio" name="origCreator" value="other" onchange="window.toggleOrigCreator('other')">
                <span>Otro Creador</span>
            </label>
        </div>
        <div id="otherCreatorFields" style="display:none; gap:10px; flex-direction:column">
            <input type="text" id="upOrigName" class="form-input" placeholder="Nombre del Creador">
            <input type="text" id="upOrigUrl" class="form-input" placeholder="URL Red Social (https://...)" autocomplete="off">
        </div>
    </div>
    
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
    </div>
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


// --- LOGIC ---
const render = () => {
    app.innerHTML = Header() + ProfileHeader() + Gallery() + DetailModalTemplate() + SettingsModal() + CreateModal() + ConfirmModal() + ActivityModal();
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
    const p = store.prompts.find(x => String(x.id) === String(id));
    if (!p) return;
    currentId = id;
    currentSeqStep = 0;
    window.sliderUnlocked = false;

    const modal = document.getElementById('viewModal');
    if (!modal) return;

    // UI Resets
    const slider = document.getElementById('commSlider');
    const handle = document.getElementById('commSliderHandle');
    const botContainer = document.getElementById('commAntiBot');
    if (slider) slider.classList.remove('unlocked');
    if (handle) { handle.style.left = '4px'; handle.style.transition = 'none'; }
    if (botContainer) botContainer.style.display = 'none';

    document.getElementById('detTitle').innerText = p.title || 'Sin Título';

    const detMetaTop = document.getElementById('detMetaTop');
    if (detMetaTop) {
        const d = new Date(p.createdAt || Date.now());
        detMetaTop.innerText = `${p.tool} • ${p.type === 'sequence' ? 'Secuencia' : 'Imagen Única'} • ${d.toLocaleDateString()}`;
    }

    const userEl = document.getElementById('detUser');
    if (userEl) {
        userEl.innerHTML = `
            <span style="display:flex; align-items:center; gap:10px">
                Por: <span onclick="window.location.href='/profile.html?u=${p.author}'" style="cursor:pointer; text-decoration:underline">${p.author}</span>
            </span>
            <div id="detTipsButton" style="margin: 8px 0 10px 0">
                <button style="background:rgba(162, 155, 254, 0.15); border:1px solid rgba(162, 155, 254, 0.4); color:#a29bfe; padding:4px 12px; border-radius:4px; font-size:0.75rem; font-weight:700; cursor:pointer;" onclick="window.openTip('${p.id}')">
                    💎 ${p.tokens_received || 0} PromptBits
                </button>
            </div>`;
    }

    const badgesEl = document.getElementById('detBadges');
    if (badgesEl) {
        let bhtml = `<span style="background:#222; border:1px solid #444; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:700">🛠️ ${p.tool || 'Desconocido'}</span>`;

        // Add Rating Badge
        const r = p.rating || 'SFW / Apto';
        const icon = r.startsWith('SFW') ? '🟢' : '🔞';
        bhtml += `<span style="background:#222; border:1px solid #444; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:700">${icon} ${r}</span>`;

        const refText = (p.needsReference || p.needs_reference) ? '📸 Requiere imagen de Referencia' : '🚫 No requiere imagen de Referencia';
        bhtml += `<span style="background:#222; border:1px solid #444; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:700">${refText}</span>`;

        badgesEl.innerHTML = bhtml;
    }

    // Sequence vs Single
    const prevBtn = document.getElementById('detPrevBtn');
    const nextBtn = document.getElementById('detNextBtn');
    const seqCount = document.getElementById('detSeqCount');
    const detImg = document.getElementById('detImg');
    const detPrompt = document.getElementById('detPrompt');

    if (p.type === 'sequence' && p.content && p.content.length > 0) {
        if (prevBtn) prevBtn.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'flex';
        if (seqCount) seqCount.style.display = 'block';
        window.updateSeqDisplay(p);
    } else {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (seqCount) seqCount.style.display = 'none';
        if (detImg) detImg.src = p.image || '';
        if (detPrompt) detPrompt.innerText = p.prompt || '';
    }

    // Blurring
    const detImgWrap = document.getElementById('detImgWrap');
    if (detImgWrap) {
        detImgWrap.classList.remove('card-blurred');
        const { applyBlur, warningLabel } = getModeration(p);
        if (applyBlur) {
            detImgWrap.classList.add('card-blurred');
            detImgWrap.dataset.warning = warningLabel;
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

    // Comments
    const commentsEl = document.getElementById('detComments');
    if (commentsEl) {
        const currUser = store.currentUser?.username;
        const isPostOwner = currUser === p.author;
        commentsEl.innerHTML = (p.comments && p.comments.length > 0)
            ? p.comments.map(c => `
                <div style="background:#1a1a1a; padding:10px; border-radius:8px; margin-bottom:10px; border-left:3px solid var(--accent); position:relative">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px">
                        <span style="font-weight:700; color:var(--accent); font-size:0.85rem">@${window.escapeHTML(c.username)}</span>
                        ${(isPostOwner || currUser === c.username) ? `<button onclick="window.doDeleteComment(${c.id})" style="background:none; border:none; color:#ff4444; cursor:pointer; font-size:0.8rem; padding:0">🗑️</button>` : ''}
                    </div>
                    <div style="font-size:0.9rem; color:#eee">${window.escapeHTML(c.text)}</div>
                </div>`).join('')
            : '<div style="opacity:0.5; font-size:0.9rem">No hay comentarios aún.</div>';
    }

    // Reactions
    const reactions = p.reactions || { like: 0, love: 0, fire: 0, funny: 0, dislike: 0, sad: 0 };
    const myReaction = (p.userReactions && store.currentUser) ? p.userReactions[store.currentUser.username] : null;
    ['like', 'love', 'fire', 'funny', 'dislike', 'sad'].forEach(type => {
        const countEl = document.getElementById(`det-${type}-count`);
        const btnEl = document.getElementById(`btn-react-${type}`);
        if (countEl) countEl.innerText = reactions[type] || 0;
        if (btnEl) {
            if (myReaction === type) btnEl.classList.add('active');
            else btnEl.classList.remove('active');
        }
    });

    modal.style.display = 'flex';
};

window.updateSeqDisplay = (p) => {
    const step = p.content[currentSeqStep];
    if (!step) return;

    // Blurring for current step
    const { applyBlur, warningLabel } = getModeration(p, step.rating);
    const detImgWrap = document.getElementById('detImgWrap');
    if (detImgWrap) {
        detImgWrap.classList.remove('card-blurred');
        if (applyBlur) {
            detImgWrap.classList.add('card-blurred');
            detImgWrap.dataset.warning = warningLabel;
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
    const seqCount = document.getElementById('detSeqCount');
    if (detImg) detImg.src = step.image;
    if (detPrompt) detPrompt.innerText = step.prompt || '';
    if (seqCount) seqCount.innerText = `Imagen ${currentSeqStep + 1} de ${p.content.length}`;
};

window.prevSeqStep = () => {
    const p = store.prompts.find(x => String(x.id) === String(currentId));
    if (!p || p.type !== 'sequence') return;
    currentSeqStep = (currentSeqStep - 1 + p.content.length) % p.content.length;
    window.updateSeqDisplay(p);
};

window.nextSeqStep = () => {
    const p = store.prompts.find(x => String(x.id) === String(currentId));
    if (!p || p.type !== 'sequence') return;
    currentSeqStep = (currentSeqStep + 1) % p.content.length;
    window.updateSeqDisplay(p);
};

window.toggleOptionsMenu = () => {
    const menu = document.getElementById('optionsMenu');
    if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
};

window.doSavePrompt = async () => {
    if (!store.currentUser) { if (window.toast) window.toast("Inicia sesión para guardar.", "warning"); return; }
    await store.savePrompt(currentId);
    render();
    window.toggleOptionsMenu();
    window.toast("Prompt Guardado", "success");
};

window.doCopyPrompt = async () => {
    const p = store.prompts.find(x => String(x.id) === String(currentId));
    if (!p) return;
    const text = p.type === 'sequence' ? p.content[currentSeqStep]?.prompt : p.prompt;
    await navigator.clipboard.writeText(text || '');
    await store.incrementCopyCount(currentId);

    // Track Event in GA4
    window.trackEvent('copy_prompt', {
        id: p.id,
        title: p.title,
        author: p.author,
        tool: p.tool
    });

    window.toast("¡Copiado!", "success");
    render();
};

window.doReportPrompt = () => { window.toast("Post Reportado", "info"); window.toggleOptionsMenu(); };
window.doHidePrompt = () => { window.toast("Post Oculto", "info"); window.toggleOptionsMenu(); };

window.doBlockUser = async () => {
    const p = store.prompts.find(x => x.id === currentId);
    if (!p) return;
    if (confirm(`¿Bloquear a @${p.author}?`)) {
        await store.blockUser(p.author);
        window.closeModals();
        render();
    }
};

window.doReact = async (type) => {
    if (!store.currentUser) { if (window.toast) window.toast("Inicia sesión para reaccionar.", "warning"); return; }
    await store.toggleReaction(currentId, type);
    const p = store.prompts.find(x => String(x.id) === String(currentId));
    window.openDetail(currentId); // Refresh modal
};

window.doFullScreen = () => {
    const side = document.querySelector('.view-img-side');
    if (side.requestFullscreen) side.requestFullscreen();
};

window.revealImage = (btn) => {
    const overlay = btn.closest('.blur-overlay');
    if (overlay) {
        overlay.parentElement.classList.remove('card-blurred');
        overlay.remove();
    }
};

window.doDeleteComment = async (cid) => {
    if (confirm("¿Eliminar comentario?")) {
        await store.deleteComment(currentId, cid);
        window.openDetail(currentId);
    }
};

window.showSlider = () => {
    const bot = document.getElementById('commAntiBot');
    if (bot && bot.style.display === 'none') {
        bot.style.display = 'flex';
        window.initCrystalSlider();
    }
};

window.initCrystalSlider = () => {
    const track = document.getElementById('commSlider');
    const handle = document.getElementById('commSliderHandle');
    if (!track || !handle) return;

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
        const max = track.offsetWidth - handle.offsetWidth - 8;
        const pos = Math.max(0, Math.min(diff, max));
        handle.style.left = (pos + 4) + 'px';

        if (pos >= max - 5) {
            window.sliderUnlocked = true;
            isDragging = false;
            track.classList.add('unlocked');
            handle.style.left = 'calc(100% - 44px)';
        }
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        if (!window.sliderUnlocked) {
            handle.style.transition = 'left 0.3s';
            handle.style.left = '4px';
        }
    };

    handle.onmousedown = onStart;
    handle.ontouchstart = onStart;
    window.onmousemove = onMove;
    window.ontouchmove = onMove;
    window.onmouseup = onEnd;
    window.ontouchend = onEnd;
};

window.postComm = async () => {
    if (!store.currentUser) { if (window.toast) window.toast("Inicia sesión.", "warning"); return; }
    if (!window.sliderUnlocked) return alert("Desliza el diamante 💎 para comentar.");
    const text = document.getElementById('commInput').value;
    if (!text) return;

    const res = await store.addComment(currentId, text);
    if (res.success) {
        document.getElementById('commInput').value = '';
        window.sliderUnlocked = false;
        window.openDetail(currentId);
    } else {
        alert(res.msg);
    }
};

window.openTip = (postId) => {
    if (!store.currentUser) { if (window.toast) window.toast("Inicia sesión para enviar propinas.", "warning"); return; }
    currentTipPostId = postId;
    const p = store.prompts.find(x => String(x.id) === String(postId));

    const existing = document.getElementById('dynamicTipModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'dynamicTipModal';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = 999999;
    overlay.innerHTML = `
        <div class="modal-container" style="max-width:400px; text-align:center">
            <div style="font-size:3rem; margin-bottom:10px">💎</div>
            <h2>Enviar a @${p.author}</h2>
            <p style="color:#888; margin-bottom:20px">Apoya el post "${p.title}"</p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px">
                <button class="btn-outline" onclick="window.doSendTip(5)">💎 5</button>
                <button class="btn-outline" onclick="window.doSendTip(10)">💎 10</button>
                <button class="btn-outline" onclick="window.doSendTip(20)">💎 20</button>
                <button class="btn-outline" onclick="window.doSendTip(50)">💎 50</button>
            </div>
            <div style="font-size:0.85rem; margin-bottom:20px">Saldo: ${store.currentUser.tokens || 0} bits</div>
            <button class="btn-outline" onclick="document.getElementById('dynamicTipModal').remove()">Cancelar</button>
        </div>`;
    document.body.appendChild(overlay);
};

window.doSendTip = async (amount) => {
    if (await window.askConfirm(`¿Enviar ${amount} bits?`, '💎')) {
        const res = await store.sendTip(currentTipPostId, amount);
        if (res.success) {
            window.toast("¡Enviado!", "success");
            const dtm = document.getElementById('dynamicTipModal');
            if (dtm) dtm.remove();
            window.openDetail(currentId);
        } else {
            alert(res.msg);
        }
    }
};

window.toast = (msg, type) => {
    alert(msg); // Placeholder for toast system if needed
};

let confirmResolver = null;
window.askConfirm = (msg, icon) => {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmText').innerText = msg;
        document.getElementById('confirmIcon').innerText = icon || '❓';
        modal.style.display = 'flex';
        confirmResolver = resolve;
    });
};

window.confirmResolve = (val) => {
    document.getElementById('confirmModal').style.display = 'none';
    if (confirmResolver) confirmResolver(val);
};

window.openCreate = () => {
    if (!store.currentUser) {
        if (window.toast) window.toast("Debes iniciar sesión para compartir prompts.", "warning");
        window.location.href = '/';
        return;
    }
    seqStepCount = 0;
    const modal = document.getElementById('createModal');
    if (modal) {
        modal.style.display = 'flex';
        // Reset single preview
        const sp = document.getElementById('singlePreview');
        if (sp) sp.style.display = 'none';
        // Reset sequence container
        const sc = document.getElementById('seqContainer');
        if (sc) sc.innerHTML = '';
        // Ensure single fields are visible by default
        window.togglePostType('single');
    }
};

window.togglePostType = (type) => {
    if (type === 'sequence' && (!store.currentUser || (store.currentUser.level || 0) < 1)) {
        alert("⚠️ Función Bloquedada: Necesitas ser Nivel 1 o superior para subir secuencias (aporta al menos 10 prompts sencillos).");
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

window.toggleOrigCreator = (type) => {
    document.getElementById('otherCreatorFields').style.display = type === 'other' ? 'flex' : 'none';
};

window.checkToolConfig = () => {
    const tool = document.getElementById('upTool').value;
    const sdTools = ['SD 1.5', 'SD 2.0', 'SDXL', 'Fooocus', 'ComfyUI'];
    const panel = document.getElementById('upExtraConfig');
    if (sdTools.includes(tool)) {
        panel.style.display = 'block';
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

window.previewFile = (input, previewId) => {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = preview.querySelector('img');
            if (img) img.src = e.target.result;
            preview.style.display = 'flex';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.doPublish = () => {
    if (isEditing) return; // Not implemented for profile edit yet

    const postType = document.querySelector('input[name="postType"]:checked').value;
    const title = document.getElementById('upTitle').value;
    const tool = document.getElementById('upTool').value;
    const isPrivate = document.getElementById('upPrivate').checked;
    const needsReference = document.getElementById('upReference').checked;
    const origCreatorType = document.querySelector('input[name="origCreator"]:checked').value;
    const origCreator = origCreatorType === 'other' ? {
        name: document.getElementById('upOrigName').value,
        url: document.getElementById('upOrigUrl').value
    } : null;

    if (!title) return alert("El título es obligatorio");
    if (origCreatorType === 'other' && !origCreator.name) return alert("Falta el nombre del creador original");

    const extraConfig = [];
    document.querySelectorAll('.extra-config-row').forEach(row => {
        const type = row.querySelector('.extra-type').value;
        const val = row.querySelector('.extra-val').value;
        if (val.trim()) {
            extraConfig.push({ type, val: val.trim() });
        }
    });

    const pubBtn = document.getElementById('pubBtn');
    if (pubBtn) {
        pubBtn.disabled = true;
        pubBtn.innerText = "Publicando...";
    }

    if (postType === 'single') {
        const file = document.getElementById('upFile').files[0];
        if (!file) {
            if (pubBtn) { pubBtn.disabled = false; pubBtn.innerText = "Publicar"; }
            if (window.toast) window.toast("Imagen obligatoria", "error"); return;
        }
        const negPrompt = document.getElementById('upNegPrompt').value;
        const reader = new FileReader();
        reader.onload = async () => {
            const res = await store.addPrompt({
                title,
                tool,
                rating: document.getElementById('upRating').value,
                image: reader.result,
                prompt: document.getElementById('upPrompt').value,
                negative_prompt: negPrompt,
                type: 'single',
                isPrivate,
                needsReference,
                origCreator,
                extraConfig
            });
            if (!res.success) {
                alert(res.msg);
                if (pubBtn) { pubBtn.disabled = false; pubBtn.innerText = "Publicar"; }
            } else {
                window.closeModals();
                await store.init(); // Refresh data
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
        const steps = Array.from(document.querySelectorAll('.seq-step'));
        if (steps.length === 0) {
            if (pubBtn) { pubBtn.disabled = false; pubBtn.innerText = "Publicar"; }
            return alert("Añade al menos un paso");
        }

        const content = [];
        let loaded = 0;

        steps.forEach((step, idx) => {
            const file = step.querySelector('.seqFile').files[0];
            const prompt = step.querySelector('.seqPrompt').value;
            const negPrompt = step.querySelector('.seqNegPrompt').value;
            const rating = step.querySelector('.seqRating').value;
            if (!file) {
                if (pubBtn) { pubBtn.disabled = false; pubBtn.innerText = "Publicar"; }
                return alert(`Falta imagen en paso ${idx + 1}`);
            }

            const reader = new FileReader();
            reader.onload = async () => {
                content.push({ image: reader.result, prompt, negative_prompt: negPrompt, rating });
                loaded++;
                if (loaded === steps.length) {
                    const res = await store.addPrompt({
                        title,
                        tool,
                        type: 'sequence',
                        content,
                        isPrivate,
                        needsReference,
                        origCreator,
                        extraConfig
                    });
                    if (!res.success) {
                        alert("❌ Error: " + res.msg);
                        if (pubBtn) { pubBtn.disabled = false; pubBtn.innerText = "Publicar"; }
                    } else {
                        seqStepCount = 0;
                        window.closeModals();
                        await store.init();
                        render();

                        // Track Event in GA4
                        window.trackEvent('publish_post', {
                            title: title,
                            tool: tool,
                            type: 'sequence',
                            steps: steps.length
                        });
                    }
                }
            };
            reader.readAsDataURL(file);
        });
    }
};

window.showLevelUpModal = (newLevel) => {
    const lvlInfo = LEVEL_REQS[newLevel] || LEVEL_REQS[0];
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
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:90%; max-width:500px; background:rgba(0,0,0,0.9); border:2px solid gold; border-radius:20px; padding:40px; box-shadow:0 0 50px rgba(255,215,0,0.3); z-index:10000000;">
            <div class="level-up-content" style="text-align:center">
                <div style="font-size:4rem; margin-bottom:10px">${lvlInfo.icon}</div>
                <div style="font-size:1.5rem; font-weight:800; color:gold; margin-bottom:10px">¡NIVEL DESBLOQUEADO!</div>
                <h2 style="font-size:1.5rem; color:white; margin-bottom:5px">Has alcanzado el Nivel ${newLevel}</h2>
                <h3 style="color:#aaa; text-transform:uppercase; letter-spacing:2px; margin-bottom:20px">${lvlInfo.name}</h3>
                
                <div style="text-align:left; background:rgba(255,255,255,0.05); padding:15px; border-radius:10px">
                    <div style="font-weight:bold; margin-bottom:10px; color:white">Nuevos Beneficios:</div>
                    <ul style="padding-left:20px; margin:0; color:#ddd">
                        ${lvlInfo.benefits.map(b => `<li>${b}</li>`).join('')}
                    </ul>
                </div>

                <button class="btn" onclick="this.closest('#levelUpModalCanvas').remove()" style="width:100%; font-size:1.2rem; font-weight:bold; background:gold; color:black; border:none; padding:15px; border-radius:10px; cursor:pointer; margin-top:20px; box-shadow:0 5px 15px rgba(255,215,0,0.4)">
                    ¡GENIAL!
                </button>
            </div>
        </div>
    </div>`;

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);
};

window.closeModals = () => {
    const modals = ['viewModal', 'settingsModal', 'confirmModal', 'createModal'];
    modals.forEach(m => {
        const el = document.getElementById(m);
        if (el) el.style.display = 'none';
    });
    const dtm = document.getElementById('dynamicTipModal');
    if (dtm) dtm.remove();
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

window.openSettings = () => {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'flex';
};

window.previewAvatar = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('previewAvatar').style.backgroundImage = `url('${e.target.result}')`;
        }
        reader.readAsDataURL(input.files[0]);
    }
};

window.saveSettings = async () => {
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
        if (res.success) { render(); window.closeModals(); }
        else alert(res.msg);
    };

    if (avatarFile) {
        const reader = new FileReader();
        reader.onload = () => finishSave(reader.result);
        reader.readAsDataURL(avatarFile);
    } else finishSave(null);
};

window.doChangePassword = () => {
    const np = document.getElementById('newPassInput').value;
    if (np.length < 6) { if (window.toast) window.toast("Mínimo 6 chars", "error"); return; }
    store.changePassword(np);
};

window.doDeleteAccount = async () => {
    if (await window.askConfirm('⚠️ PELIGRO ⚠️\n¿Eliminar tu cuenta permanentemente?\nEsta acción NO se puede deshacer.', '🔥')) {
        const confirmation = prompt("Escribe 'ELIMINAR' para confirmar borrado total:");
        if (confirmation === 'ELIMINAR') {
            store.deleteAccount();
            window.location.href = '/';
        }
    }
};

window.togglePass = (id, btn) => {
    const el = document.getElementById(id);
    if (el.type === 'password') { el.type = 'text'; btn.innerText = '🙈'; }
    else { el.type = 'password'; btn.innerText = '👁️'; }
};

window.openLevelProgress = () => {

    if (!store.currentUser) { alert("Error: No has iniciado sesión."); return; }

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
            progressCopies = 100; // Si no pide copias, está al 100%
        }
    } else {
        progressPosts = 100;
        progressCopies = 100;
    }

    // El progreso real es el MÍNIMO de ambos (el que falte más)
    const totalProgress = isMax ? 100 : (progressPosts + progressCopies) / 2;
    // O mejor, mostrar ambas barras si el nivel pide ambas
    const needsCopies = nextLvlReq.copies > 0;

    const html = `
        <div style="text-align:center; margin-bottom:25px; padding-bottom:15px; border-bottom:1px solid #222">
            <div style="font-size:3.5rem; margin-bottom:10px">${LEVEL_REQS[currentLvl].icon}</div>
            <h2 style="margin:0; font-size:1.8rem; color:#fff">Nivel ${currentLvl}</h2>
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
};



// --- CONFIRMATION & TOAST SYSTEM ---

window.askConfirm = (msg, icon = '❓') => {
    return new Promise((resolve) => {
        let modal = document.getElementById('confirmModal');
        // If modal doesn't exist, try to find it in DOM or fallback
        if (!modal) {
            if (confirm(msg)) resolve(true);
            else resolve(false);
            return;
        }

        const text = document.getElementById('confirmText');
        const ico = document.getElementById('confirmIcon');

        // Define cleanup function
        const cleanup = (val) => {
            modal.style.display = 'none';
            resolve(val);
        };

        window.confirmResolve = cleanup;

        if (modal && text) {
            text.innerText = msg;
            if (ico) ico.innerText = icon;
            modal.style.display = 'flex';
        }
    });
};

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
    }, 3000);
};



window.openDirectTip = (recipientId, username) => {
    if (!store.currentUser) {
        alert("Debes iniciar sesión para enviar propinas.");
        return;
    }

    // Remove any existing dynamic tip modal
    const existingModal = document.getElementById('dynamicTipModal');
    if (existingModal) existingModal.remove();

    // Create modal dynamically
    const overlay = document.createElement('div');
    overlay.id = 'dynamicTipModal';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.95); z-index:9000000; display:flex; align-items:center; justify-content:center;';

    overlay.innerHTML = `
        <div style="background:#1a1a2e; border:1px solid #333; border-radius:16px; padding:30px; max-width:400px; width:90%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="font-size:3rem; margin-bottom:10px">💎</div>
            <h2 style="color:#fff; margin:0 0 5px 0">Apoyar a @${username}</h2>
            <p style="color:#888; margin-bottom:20px">Regala PromptBits directamente a este creador</p>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px">
                <button onclick="window.doSendDirectTip('${recipientId}', 5)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 5</button>
                <button onclick="window.doSendDirectTip('${recipientId}', 10)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 10</button>
                <button onclick="window.doSendDirectTip('${recipientId}', 20)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 20</button>
                <button onclick="window.doSendDirectTip('${recipientId}', 50)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 50</button>
            </div>
            
            <div style="font-size:0.85rem; color:#666; margin-bottom:20px">
                Tu saldo: <span style="color:#a29bfe; font-weight:700">${store.currentUser.tokens || 0}</span> PromptBits
            </div>
            
            <button onclick="document.getElementById('dynamicTipModal').remove()" style="background:transparent; border:none; color:#666; padding:10px 20px; cursor:pointer; font-size:0.9rem">Cancelar</button>
        </div>
    `;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
};

window.doSendDirectTip = async (recipientId, amount) => {
    if (await window.askConfirm(`¿Enviar ${amount} PromptBits a este creador?`, '💎')) {
        window.toast("Enviando PromptBits...", "info");
        const res = await store.sendTip(null, amount, recipientId);
        if (res.success) {
            window.toast(res.msg, 'success');
            const dtm = document.getElementById('dynamicTipModal');
            if (dtm) dtm.remove();
            render();
        } else {
            window.toast("❌ " + res.msg, 'error');
        }
    }
};

const init = async () => {
    // Normal initialization
    setTimeout(() => { if (window.toast) window.toast("v8.4: Data Fix", "success"); }, 1000);

    await store.init();
    if (profileUser) {
        await store.fetchUserProfileByUsername(profileUser);
    }
    window.initDone = true;
    render();
};

// --- USER ACTIVITY LOGS ---

const ActivityModal = () => `
<div id="activityModal" class="modal-overlay" style="display:none;" onclick="if(event.target === this) { document.getElementById('activityModal').style.display='none'; store.unsubscribeUserLogs(); }">
    <div class="modal-container" style="max-width:500px; height:80vh; display:flex; flex-direction:column">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px">
            <h2 style="margin:0">📜 Mi Actividad</h2>
            <button class="modal-close-x" onclick="document.getElementById('activityModal').style.display='none'; store.unsubscribeUserLogs();" style="position:static">✕</button>
        </div>
        <div id="activityList" style="flex:1; overflow-y:auto; padding-right:5px">
            <div style="text-align:center; padding:20px; color:#666">Cargando...</div>
        </div>
    </div>
</div>`;

window.openActivity = async () => {
    const modal = document.getElementById('activityModal');
    if (!modal) return;
    modal.style.display = 'flex';

    // Initial fetch
    const logs = await store.getUserActivityLogs();
    renderActivityLogs(logs);

    // Realtime subscription
    store.subscribeToUserLogs((newLog) => {
        // Prepend new log to current list (visual only)
        const container = document.getElementById('activityList');
        if (container) {
            // Remove "No activity" or "Loading" msg if exists
            const emptyMsg = container.querySelector('.empty-state');
            if (emptyMsg) emptyMsg.remove();

            // Render single log and prepend
            const logHtml = createLogItemHtml(newLog);
            container.insertAdjacentHTML('afterbegin', logHtml);
        }
    });
};

const createLogItemHtml = (log) => {
    let icon = '📝';
    let title = 'Acción';
    let detail = '';
    let color = '#888';

    // Details extraction
    const d = log.details || {};

    switch (log.action) {
        case 'login': icon = '🔑'; title = 'Iniciaste Sesión'; color = '#a29bfe'; break;
        case 'signup': icon = '👋'; title = 'Bienvenido a Prompt Gallery'; color = '#a29bfe'; break;
        case 'publish': icon = '🖼️'; title = 'Publicaste un Post'; detail = d.title || ''; color = '#00cec9'; break;
        case 'comment': icon = '💬'; title = 'Comentaste'; detail = `en ${d.postTitle || 'un post'}`; break;
        case 'like': icon = '👍'; title = 'Te gustó'; detail = `${d.postTitle || 'un post'}`; break;
        case 'love': icon = '❤️'; title = 'Te encantó'; detail = `${d.postTitle || 'un post'}`; break;
        case 'fire': icon = '🔥'; title = 'Diste fuego'; detail = `${d.postTitle || 'un post'}`; break;
        case 'funny': icon = '😂'; title = 'Te divirtió'; detail = `${d.postTitle || 'un post'}`; break;
        case 'sad': icon = '😢'; title = 'Te entristeció'; detail = `${d.postTitle || 'un post'}`; break;
        case 'dislike': icon = '👎'; title = 'No te gustó'; detail = `${d.postTitle || 'un post'}`; break;
        case 'follow': icon = '👤'; title = 'Seguiste a un usuario'; detail = `@${d.target || 'usuario'}`; break;
        case 'tip': // Valid for legacy logs
        case 'tip_sent':
            icon = '💎';
            color = '#fdcb6e';
            title = `Enviaste ${d.amount} PromptBits`;
            detail = `a @${d.recipient || 'usuario'}`;
            break;
        case 'tip_received':
            icon = '🎁';
            color = '#00b894'; // Green for receiving
            title = `Recibiste ${d.amount} PromptBits`;
            detail = `de @${d.sender || 'un usuario'}`;
            break;
        case 'level_up':
            icon = '🆙';
            color = '#e17055';
            title = `¡Subiste de Nivel!`;
            detail = `Alcanzaste el Nivel ${d.newLevel}`;
            break;
    }

    const time = new Date(log.created_at).toLocaleString('es-MX', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
    <div style="display:flex; gap:15px; padding:15px; background:rgba(255,255,255,0.03); border-radius:8px; margin-bottom:10px; align-items:center; border-left:3px solid ${color}; animation: fadeIn 0.5s ease">
        <div style="font-size:1.5rem">${icon}</div>
        <div style="flex:1">
            <div style="font-weight:600; font-size:0.9rem; color:#eee">${title}</div>
            ${detail ? `<div style="font-size:0.8rem; color:#aaa">${detail}</div>` : ''}
        </div>
        <div style="font-size:0.75rem; color:#666; white-space:nowrap">${time}</div>
    </div>`;
};

const renderActivityLogs = (logs) => {
    const container = document.getElementById('activityList');
    if (!container) return;

    if (!logs || logs.length === 0) {
        container.innerHTML = `<div class="empty-state" style="text-align:center; padding:40px; color:#666">
            <div style="font-size:2rem; margin-bottom:10px">📭</div>
            No hay actividad reciente.
        </div>`;
        return;
    }

    container.innerHTML = logs.map(createLogItemHtml).join('');
};

// --- ADMIN ACTIONS ---
window.doClaimGhosts = async () => {
    if (!confirm("Esto buscará todos los posts antiguos con tu nombre y actualizará su ID al actual. ¿Continuar?")) return;
    if (window.toast) window.toast("Iniciando reparación...", "info");

    try {
        const res = await store.claimGhostPosts();
        if (res.success) {
            if (window.toast) window.toast(res.msg, "success");
            setTimeout(() => window.location.reload(), 1500);
        } else {
            if (window.toast) window.toast(res.msg, "error");
            else alert(res.msg);
        }
    } catch (err) {
        console.error("Claim handler error:", err);
        alert("Error crítico en la reparación");
    }
};

init();
