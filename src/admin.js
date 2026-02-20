import './style.css'
import './admin_fix.css'
import { store } from './store-final.js'
import { pb } from './pocketbase.js'
import './utils/LevelDebug.js'; // Load Debug Tools

const app = document.getElementById('app');

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

const RATINGS = ['SFW / Apto', 'Sugestivo', 'NSFW / +18'];

// --- STATE ---
window.adminSort = { col: 'username', dir: 'asc' };
window.adminFilterChar = null;
let currentTab = 'users';

// --- SECURITY CHECK ---
const checkAdmin = async () => {

    await store.init();
    if (!store.currentUser || (store.currentUser.role !== 'admin' && store.currentUser.username !== 'rodrigodlmoral' && store.currentUser.username !== 'rodridomrock')) {
        console.error("Acceso denegado: No eres administrador.");
        alert("Acceso denegado. Serás redirigido a la página principal.");
        window.location.href = '/';
        return false;
    }
    return true;
};

// --- UI COMPONENTS ---
const AdminLayout = () => `
    <div class="admin-page-container" style="padding: 20px; max-width: 1200px; margin: 0 auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
            <div style="display:flex; align-items:center; gap:15px">
                <span style="font-size:2.5rem">👑</span>
                <div>
                    <h1 style="color:gold; margin:0; font-size:1.8rem">Panel de Administración</h1>
                    <p style="color:#666; margin:5px 0 0 0">Gestión total de Prompt Gallery (v4.7.1 🚀)</p>
                </div>
            </div>
            <a href="/" class="btn-outline" style="text-decoration:none; padding:10px 20px">Volver a la Galería</a>
        </div>
        
        <div style="display:flex; gap:10px; margin-bottom:25px; background: #111; padding: 10px; border-radius: 12px; border: 1px solid #222;">
            <button class="profile-tab ${currentTab === 'users' ? 'active' : ''}" onclick="window.switchAdminTab('users')">👥 Usuarios</button>
            <button class="profile-tab ${currentTab === 'content' ? 'active' : ''}" onclick="window.switchAdminTab('content')">Moderación</button>
            <button class="profile-tab ${currentTab === 'logs' ? 'active' : ''}" onclick="window.switchAdminTab('logs')">📜 Actividad</button>
            <button class="profile-tab ${currentTab === 'broadcast' ? 'active' : ''}" onclick="window.switchAdminTab('broadcast')">📢 Broadcast</button>
            <button class="profile-tab ${currentTab === 'fb-queue' ? 'active' : ''}" onclick="window.switchAdminTab('fb-queue')" style="border-color:#1877F2; color:#1877F2">📘 Autopost</button>
            <button class="profile-tab ${currentTab === 'economy' ? 'active' : ''}" onclick="window.switchAdminTab('economy')" style="border-color:#a29bfe; color:#a29bfe">💰 Economía</button>
        </div>

        <!-- Sub-modal de Gestión de Usuario (Compacto) -->
        <div id="adminUserEditBox" style="display:none; background:#111; border:1px solid gold; border-radius:12px; padding:15px; margin-bottom:20px; box-shadow:0 0 20px rgba(255,215,0,0.2)">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
                <h3 id="editUserName" style="margin:0; color:gold; font-size:1rem">Gestionar Usuario</h3>
                <button class="btn-icon" onclick="document.getElementById('adminUserEditBox').style.display='none'" style="background:#333; width:20px; height:20px; font-size:0.8rem">×</button>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1.5fr 2fr; gap:15px; align-items:end">
                <div>
                    <label class="form-label" style="font-size:0.75rem">Nivel</label>
                    <select id="editUserLevel" class="form-input" style="padding:6px; font-size:0.8rem">
                        <option value="0">0 - Explorador</option>
                        <option value="1">1 - Iniciado</option>
                        <option value="2">2 - Principiante</option>
                        <option value="3">3 - Contribuidor</option>
                        <option value="4">4 - Autor</option>
                        <option value="5">5 - COLABORADOR</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" style="font-size:0.75rem">Medalla</label>
                    <select id="editUserBadge" class="form-input" style="padding:6px; font-size:0.8rem">
                        <option value="none">Sin Medalla</option>
                        <option value="creator_founder">CREADOR FUNDADOR</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" style="font-size:0.75rem">Rol</label>
                    <select id="editUserRole" class="form-input" style="padding:6px; font-size:0.8rem">
                        <option value="user">Usuario (User)</option>
                        <option value="admin">Administrador (Admin)</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" style="font-size:0.75rem">Regalar Bits (Desde tu saldo)</label>
                    <div style="display:flex; gap:5px">
                        <input type="number" id="giftBitsAmount" class="form-input" placeholder="Cant..." min="1" style="padding:6px; font-size:0.8rem">
                        <button class="btn" style="padding:0 12px; font-size:0.8rem" onclick="window.adminSubmitGift()">Regalar</button>
                    </div>
                </div>
            </div>
            <button class="btn" style="width:100%; margin-top:12px; background:var(--accent); font-size:0.85rem; padding:8px" onclick="window.adminSubmitUserUpdate()">Guardar Nivel/Medalla</button>
        </div>

        <div id="admin-main-content">
            <!-- Dynamic Content Here -->
        </div>
    </div>
`;

window.switchAdminTab = async (tab) => {
    currentTab = tab;
    await renderAdmin();
};

const renderAdmin = async () => {
    const isAllowed = await checkAdmin();
    if (!isAllowed) return;

    app.innerHTML = AdminLayout();
    const container = document.getElementById('admin-main-content');

    if (currentTab === 'users') {
        await renderUsersTab(container);
    } else if (currentTab === 'content') {
        await renderContentTab(container);
    } else if (currentTab === 'logs') {
        await renderLogsTab(container);
    } else if (currentTab === 'broadcast') {
        await renderBroadcastTab(container);
    } else if (currentTab === 'fb-queue') {
        await renderFbQueueTab(container);
    } else if (currentTab === 'economy') {
        await renderEconomyTab(container);
    }
};

// --- BROADCAST TAB ---
const renderBroadcastTab = async (container) => {
    // 1. Initial Loading State
    container.innerHTML = `<div style="text-align:center; padding:50px; color:#666"><div class="loading-spinner"></div> Cargando usuarios para broadcast...</div>`;

    // 2. Fetch Users
    await store.adminLoadAllUsers();
    let users = store.getAllUsers().filter(u => u.email && u.email.includes('@')); // Basic validation

    // Default Sort: Created Date (Newest First)
    users.sort((a, b) => new Date(b.created) - new Date(a.created));
    window.broadcastUsers = users; // Store for sorting/filtering
    window.selectedBroadcastUsers = new Set(users.map(u => u.id)); // Default: Select All

    // 3. Render UI
    const renderTable = () => {
        const tbody = document.getElementById('broadcastUserTableBody');
        if (!tbody) return;

        const countEl = document.getElementById('selectedCount');
        if (countEl) countEl.innerText = window.selectedBroadcastUsers.size;

        tbody.innerHTML = window.broadcastUsers.map(u => {
            const isSelected = window.selectedBroadcastUsers.has(u.id);
            const date = new Date(u.created).toLocaleDateString();

            // Fix "undefined" username - User clarified it's "name"
            let displayName = u.name;
            if (!displayName || displayName === 'undefined') displayName = u.username;
            if (!displayName || displayName === 'undefined') displayName = u.email ? u.email.split('@')[0] : 'Usuario';

            return `
                <tr style="border-bottom:1px solid #333; ${isSelected ? 'background:rgba(0,255,0,0.05)' : ''}">
                    <td style="text-align:center">
                        <input type="checkbox" onchange="window.toggleBroadcastUser('${u.id}', this.checked)" ${isSelected ? 'checked' : ''}>
                    </td>
                    <td style="color:${isSelected ? '#fff' : '#888'}; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${u.email}">
                        <div style="font-weight:bold; overflow:hidden; text-overflow:ellipsis">${displayName}</div>
                        <div style="font-size:0.7rem; color:#666; overflow:hidden; text-overflow:ellipsis">${u.email}</div>
                    </td>
                    <td style="font-size:0.75rem; color:#aaa; white-space:nowrap; text-align:right; padding-right:10px">${date}</td>
                    <td style="font-size:0.75rem; text-align:center">Lvl ${u.level || 0}</td>
                </tr>
            `;
        }).join('');
    };

    container.innerHTML = `
        <div style="max-width: 1100px; margin: 0 auto; display:grid; grid-template-columns: 1fr 400px; gap:20px;">
            
            <!-- LEFT: EMAIL COMPOSER -->
            <div style="background:#1a1a1a; padding:20px; border-radius:12px; border:1px solid #333">
                <h2 style="color:gold; margin-top:0">📢 Redactar Correo</h2>
                
                <div class="form-group" style="margin-bottom:15px">
                    <label class="form-label">Asunto</label>
                    <input type="text" id="broadcastSubject" class="form-input" placeholder="Ej: ¡Noticias de Prompt Gallery!">
                </div>

                <div class="form-group" style="margin-bottom:15px">
                    <label class="form-label">Contenido HTML</label>
                    <textarea id="broadcastHtml" class="form-textarea" style="height:300px; width:100% !important; box-sizing:border-box; font-family:monospace; font-size:0.75rem; resize:vertical" placeholder="<h1>Hola!</h1>..."></textarea>
                    <div style="margin-top:5px; display:flex; gap:10px">
                        <button class="btn-outline" onclick="window.previewBroadcast()" style="font-size:0.8rem">👁️ Previsualizar</button>
                    </div>
                </div>

                <div id="broadcastPreview" style="background:white; color:black; padding:20px; border-radius:8px; margin-bottom:20px; display:none; max-height:300px; overflow-y:auto; border:2px dashed #444; width:100%; box-sizing:border-box"></div>

                <!-- PROGRESS & LOGS -->
                <div id="broadcastProgress" style="display:none; margin-top:20px; background:#111; padding:15px; border-radius:8px; border:1px solid #333">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.9rem">
                        <span id="progressText">Enviando: 0/0</span>
                        <span id="progressPercent">0%</span>
                    </div>
                    <div style="width:100%; height:10px; background:#333; border-radius:5px; overflow:hidden">
                        <div id="progressBar" style="width:0%; height:100%; background:gold; transition:width 0.3s"></div>
                    </div>
                    <div id="progressLog" style="margin-top:10px; height:150px; overflow-y:auto; font-family:monospace; font-size:0.75rem; color:#888; background:#000; padding:5px"></div>
                </div>
                
                <!-- ACTIONS -->
                <div id="broadcastControls" style="margin-top:20px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #333; padding-top:20px">
                    <button class="btn-outline" onclick="window.sendTestEmail()">🧪 Enviar Prueba (A mí)</button>
                    <button class="btn" style="background:gold; color:black; font-weight:bold" onclick="window.startBroadcast()">🚀 ENVIAR A SELECCIONADOS (<span id="btnSelCount">${users.length}</span>)</button>
                </div>
            </div>

            <!-- RIGHT: USER SELECTION -->
            <div style="background:#1a1a1a; padding:20px; border-radius:12px; border:1px solid #333; display:flex; flex-direction:column; height:fit-content; max-height:800px">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
                    <h3 style="color:#ccc; margin:0; font-size:1rem">Destinatarios</h3>
                    <span style="background:#333; padding:4px 8px; border-radius:4px; font-size:0.8rem; color:white">
                        <span id="selectedCount">${users.length}</span> / ${users.length}
                    </span>
                </div>

                <div style="display:flex; gap:5px; margin-bottom:10px">
                    <button class="btn-sm" onclick="window.broadcastSelectAll(true)" style="flex:1; font-size:0.7rem">Todos</button>
                    <button class="btn-sm" onclick="window.broadcastSelectAll(false)" style="flex:1; font-size:0.7rem">Ninguno</button>
                </div>
                
                <div style="display:flex; gap:5px; margin-bottom:10px">
                    <button class="btn-sm" onclick="window.sortBroadcastUsers('date')" style="flex:1; font-size:0.7rem">📅 Fecha</button>
                    <button class="btn-sm" onclick="window.sortBroadcastUsers('level')" style="flex:1; font-size:0.7rem">🏆 Nivel</button>
                </div>

                <div style="flex:1; overflow-y:auto; border:1px solid #333; border-radius:8px; background:#111">
                    <table style="width:100%; border-collapse:collapse; font-size:0.8rem; table-layout:fixed">
                        <thead style="background:#222; position:sticky; top:0; z-index:10">
                            <tr>
                                <th style="padding:8px; width:30px">✅</th>
                                <th style="padding:8px; text-align:left">Usuario</th>
                                <th style="padding:8px; width:70px; text-align:right">Fecha</th>
                                <th style="padding:8px; width:40px; text-align:center">Lvl</th>
                            </tr>
                        </thead>
                        <tbody id="broadcastUserTableBody">
                            <!-- Rows -->
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    `;

    // Initial Render
    renderTable();

    // Helper: Sort
    window.sortBroadcastUsers = (criteria) => {
        if (criteria === 'date') {
            window.broadcastUsers.sort((a, b) => new Date(b.created) - new Date(a.created));
        } else if (criteria === 'level') {
            window.broadcastUsers.sort((a, b) => (b.level || 0) - (a.level || 0));
        }
        renderTable();
    };

    // Helper: Select Logic
    window.toggleBroadcastUser = (id, checked) => {
        if (checked) window.selectedBroadcastUsers.add(id);
        else window.selectedBroadcastUsers.delete(id);

        document.getElementById('selectedCount').innerText = window.selectedBroadcastUsers.size;
        document.getElementById('btnSelCount').innerText = window.selectedBroadcastUsers.size;
        // Re-render row style only? Or full table? Full table is safer for highlight sync
        renderTable();
    };

    window.broadcastSelectAll = (select) => {
        if (select) window.selectedBroadcastUsers = new Set(window.broadcastUsers.map(u => u.id));
        else window.selectedBroadcastUsers.clear();
        renderTable();
        document.getElementById('btnSelCount').innerText = window.selectedBroadcastUsers.size;
    };
};

// --- FB QUEUE TAB (OAUTH CONNECT v4.5) ---
const renderFbQueueTab = async (container) => {
    container.innerHTML = `<div style="text-align:center; padding:50px; color:#666"><div class="loading-spinner"></div> Cargando cola de Facebook...</div>`;

    // 1. Check Connection Status
    let fbSettings = null;
    try {
        const settingsList = await pb.collection('fb_settings').getList(1, 1, {
            filter: 'status="active"',
            // sort: '-created', // REMOVED CAUSE 400 ERROR IN PB v0.23+
            $autoCancel: false
        });
        if (settingsList.items.length > 0) {
            fbSettings = settingsList.items[0];
        }
    } catch (e) {
        console.warn('Could not fetch fb_settings:', e);
    }

    // 2. Setup FB SDK (Idempotent)
    if (window.FB) {
        window.FB.init({
            appId: '1230045182005480',
            cookie: true,
            xfbml: true,
            version: 'v24.0'
        });
    }

    // 3. Load Queue Data
    const queue = await store.adminGetFbQueue();
    window.fbQueueCache = queue;

    // Subscription logic remains...
    store.unsubscribeFromFbQueue();
    store.subscribeToFbQueue(({ action, record }) => {
        const queueList = document.getElementById('fbQueueList');
        const queueCount = document.getElementById('fbQueueCount');
        if (!queueList) return;

        if (action === 'create') {
            const newItem = {
                id: record.id,
                status: record.status,
                created: record.created,
                prompt: record.expand?.prompt ? {
                    id: record.expand.prompt.id,
                    title: record.expand.prompt.title,
                    image: record.expand.prompt.image,
                    author: record.expand.prompt.expand?.author?.username || record.expand.prompt.author || 'Usuario'
                } : null
            };
            window.fbQueueCache.push(newItem);
        } else if (action === 'update') {
            const idx = window.fbQueueCache.findIndex(i => i.id === record.id);
            if (idx !== -1) {
                window.fbQueueCache[idx].status = record.status;
                if (record.expand?.prompt) {
                    window.fbQueueCache[idx].prompt.title = record.expand.prompt.title;
                }
            }
        } else if (action === 'delete') {
            window.fbQueueCache = window.fbQueueCache.filter(i => i.id !== record.id);
        }

        window.fbQueueCache.sort((a, b) => new Date(a.created) - new Date(b.created));
        queueList.innerHTML = renderFbQueueItems(window.fbQueueCache);
        if (queueCount) queueCount.innerText = window.fbQueueCache.length;
    });

    // Load source pool (all prompts)
    if (!store.prompts || store.prompts.length === 0) await store.loadPrompts(true);
    let sourcePrompts = store.allPrompts && store.allPrompts.length > 0 ? store.allPrompts : store.prompts;
    sourcePrompts = sourcePrompts.filter(p => p.rating !== 'NSFW / +18');

    // 4. Render Layout
    container.innerHTML = `
        <div style="max-width:1200px; margin:0 auto; display:flex; flex-direction:column; height:1400px; gap:20px">
            
            <!-- CONNECT HEADER -->
            <div style="background:#111; border:1px solid #333; padding:15px; border-radius:12px; display:flex; justify-content:space-between; align-items:center">
                <div style="display:flex; align-items:center; gap:15px">
                    <span style="font-size:2rem">📘</span>
                    <div>
                        <h2 style="margin:0; color:white; font-size:1.2rem">Conexión con Facebook</h2>
                        <p style="margin:0; color:#888; font-size:0.8rem">
                            ${fbSettings ? `✅ Conectado a: <strong style="color:#1877F2">${fbSettings.page_name}</strong>` : '⚠️ No hay página conectada. Los posts pueden fallar.'}
                        </p>
                    </div>
                </div>
                <div>
                    ${fbSettings
            ? `<button onclick="window.disconnectFacebook('${fbSettings.id}')" class="btn" style="background:#333; border:1px solid #555">❌ Desconectar</button>`
            : `<button onclick="window.connectFacebook()" class="btn" style="background:#1877F2; font-weight:bold">🔗 Conectar Página</button>`
        }
                </div>
            </div>

            <!-- INSTAGRAM STATUS -->
            <div id="igStatusBox" style="background:#111; border:1px solid #333; padding:12px 15px; border-radius:12px; display:flex; align-items:center; gap:15px">
                <span style="font-size:1.8rem">📸</span>
                <div>
                    <h3 style="margin:0; color:white; font-size:1rem">Conexión con Instagram</h3>
                    <p id="igStatusText" style="margin:0; color:#888; font-size:0.8rem">⏳ Detectando cuenta...</p>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; flex:1; min-height:0">
                
                <!-- LEFT: SOURCE (Discovery) -->
                <div style="background:#1a1a1a; border:1px solid #333; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; height:1100px">
                    <div style="padding:15px; border-bottom:1px solid #333; background:#222">
                        <h3 style="margin:0; color:#ccc; display:flex; align-items:center; gap:10px">
                            <span>🗂️ Fuente de Prompts</span>
                            <span style="font-size:0.7rem; background:#333; padding:2px 6px; border-radius:4px">${sourcePrompts.length}</span>
                        </h3>
                        <div style="display:flex; gap:8px; margin-top:10px; align-items:center">
                            <input type="text" id="fbSourceSearch" placeholder="🔍 Buscar por título..." class="form-input" style="flex:1; padding:6px; font-size:0.8rem" oninput="window.filterFbSource()">
                            <button id="btnBatchAddSource" class="btn-sm" onclick="window.batchAddToQueue()" style="background:#22c55e; color:white; padding:6px 10px; font-size:0.7rem; white-space:nowrap; display:none">➕ Añadir seleccionados</button>
                        </div>
                        <label style="display:flex; align-items:center; gap:6px; margin-top:8px; font-size:0.75rem; color:#888; cursor:pointer">
                            <input type="checkbox" id="cbSelectAllSource" onchange="window.toggleSelectAllSource(this.checked)" style="accent-color:#3b82f6">
                            Seleccionar todos
                        </label>
                    </div>
                    <div id="fbSourceList" style="flex:1; overflow-y:auto; padding:10px">
                        ${renderFbSourceItems(sourcePrompts, queue)}
                    </div>
                </div>

                <!-- RIGHT: QUEUE (Scheduled) -->
                <div style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; height:1100px">
                    <div style="padding:15px; border-bottom:1px solid #1e293b; background:#1e293b; display:flex; justify-content:space-between; align-items:center">
                        <div>
                            <h3 style="margin:0; color:#3b82f6; display:flex; align-items:center; gap:10px">
                                <span>📘 Cola de Publicación</span>
                                <span id="fbQueueCount" style="font-size:0.7rem; background:#0f172a; padding:2px 8px; border-radius:10px; border:1px solid #3b82f6">${queue.length}</span>
                            </h3>
                            <div id="fbNextRun" style="font-size:0.75rem; color:#64748b; margin-top:4px">⏸️ Esperando inicio...</div>
                        </div>
                        <div style="display:flex; gap:6px; align-items:center">
                            <button id="btnStartSmartQueue" class="btn" onclick="window.startSmartQueue()" style="background:#3b82f6; font-size:0.8rem; padding:6px 12px">▶️ Iniciar</button>
                            <button id="btnPauseSmartQueue" class="btn" onclick="window.pauseSmartQueue()" style="background:#eab308; font-size:0.8rem; padding:6px 12px; display:none">⏸️ Pausar</button>
                            <button id="btnStopSmartQueue" class="btn" onclick="window.stopSmartQueue()" style="background:#ef4444; font-size:0.8rem; padding:6px 12px; display:none">⏹️ Detener</button>
                        </div>
                    </div>
                    <div style="padding:8px 15px; border-bottom:1px solid #1e293b; background:#172033; display:flex; gap:8px; align-items:center">
                        <label style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:#888; cursor:pointer">
                            <input type="checkbox" id="cbSelectAllQueue" onchange="window.toggleSelectAllQueue(this.checked)" style="accent-color:#ef4444">
                            Seleccionar todos
                        </label>
                        <button id="btnBatchRemoveQueue" class="btn-sm" onclick="window.batchRemoveFromQueue()" style="background:#ef4444; color:white; padding:4px 10px; font-size:0.7rem; display:none">🗑️ Quitar seleccionados</button>
                    </div>
                    <div id="fbQueueList" style="flex:1; overflow-y:auto; padding:10px; background:#0f172a">
                        ${renderFbQueueItems(queue)}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Detect Instagram account (async, non-blocking)
    if (fbSettings) {
        fetch('/api/ig-detect').then(r => r.json()).then(igData => {
            const igStatusText = document.getElementById('igStatusText');
            if (!igStatusText) return;
            if (igData.connected) {
                const username = igData.username ? `@${igData.username}` : `ID: ${igData.id}`;
                igStatusText.innerHTML = `✅ Conectado: <strong style="color:#E1306C">${username}</strong>`;
            } else {
                igStatusText.innerHTML = `⚠️ No vinculada (${igData.reason || 'desconocido'})`;
            }
        }).catch(() => {
            const igStatusText = document.getElementById('igStatusText');
            if (igStatusText) igStatusText.innerHTML = '❌ Error detectando cuenta';
        });
    }
};

// --- FB CONNECTION HANDLERS ---
window.connectFacebook = () => {
    if (!window.FB) return alert('Facebook SDK no cargó. Recarga la página.');

    // SDK requires a synchronous callback
    window.FB.login((response) => {
        handleFbLoginResponse(response);
    }, { scope: 'pages_manage_posts,pages_read_engagement,business_management,instagram_basic,instagram_content_publish' });
};

const handleFbLoginResponse = async (response) => {
    if (response.authResponse) {
        console.log('FB Login Success. Token:', response.authResponse.accessToken);
        const userToken = response.authResponse.accessToken;

        try {
            if (window.showToast) window.showToast("Obteniendo páginas...", "info");

            const res = await fetch('/api/fb-connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shortUserToken: userToken })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Error al obtener páginas');

            // Show Page Selection Modal
            renderPageSelectionModal(data.pages);

        } catch (err) {
            console.error(err);
            alert('Error conectando: ' + err.message);
        }
    } else {
        console.log('User cancelled login or did not fully authorize.');
    }
};

window.disconnectFacebook = async (settingsId) => {
    if (!confirm('¿Desconectar página? Los posts automáticos podrían fallar.')) return;
    try {
        // Use server-side endpoint to bypass RLS restrictions
        const res = await fetch('/api/fb-disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settingsId })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        window.switchAdminTab('fb-queue'); // Refresh
    } catch (e) {
        alert('Error: ' + e.message);
    }
};

const renderPageSelectionModal = (pages) => {
    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center`;

    let pagesHtml = pages.map(p => {
        const igSection = p.instagram
            ? `<div style="display:flex; align-items:center; gap:8px">
                    <img src="${p.instagram.picture || ''}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; background:#333; border:2px solid #E1306C" onerror="this.style.display='none'">
                    <div>
                        <div style="font-size:0.8rem; color:#E1306C; font-weight:600">📸 @${p.instagram.username || 'IG'}</div>
                        <div style="font-size:0.65rem; color:#888">${p.instagram.name || ''}</div>
                    </div>
                </div>`
            : `<div style="display:flex; align-items:center; gap:8px; opacity:0.4">
                    <div style="width:36px; height:36px; border-radius:50%; background:#333; display:flex; align-items:center; justify-content:center; border:2px dashed #555">📷</div>
                    <div style="font-size:0.75rem; color:#666">Sin IG vinculado</div>
                </div>`;

        const fbSection = `<div style="display:flex; align-items:center; gap:8px">
                <img src="${p.fb_picture || ''}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; background:#333; border:2px solid #1877F2" onerror="this.style.display='none'">
                <div>
                    <div style="font-size:0.8rem; color:#1877F2; font-weight:600">📘 ${p.name}</div>
                    <div style="font-size:0.65rem; color:#888">${p.category || 'Página'}</div>
                </div>
            </div>`;

        return `
            <div onclick="window.selectPage('${p.id}', '${p.name.replace(/'/g, "\\'")}', '${p.access_token}')" 
                 style="background:#1a1a1a; padding:14px 18px; margin-bottom:10px; border-radius:10px; cursor:pointer; border:1px solid #333; display:flex; align-items:center; gap:12px; transition:all 0.2s; hover:border-color:gold"
                 onmouseover="this.style.borderColor='gold'; this.style.background='#222'" onmouseout="this.style.borderColor='#333'; this.style.background='#1a1a1a'">
                ${igSection}
                <div style="font-size:1.2rem; color:#666; flex-shrink:0; margin:0 4px">→</div>
                ${fbSection}
                <div style="margin-left:auto; flex-shrink:0">
                    <button class="btn" style="background:#3b82f6; padding:6px 14px; font-size:0.75rem; font-weight:bold; pointer-events:none">Seleccionar</button>
                </div>
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div style="background:#111; padding:25px; border-radius:16px; width:650px; max-width:95%; border:1px solid gold; box-shadow:0 0 40px rgba(0,0,0,0.6)">
            <h3 style="color:gold; margin-top:0; font-size:1.2rem">📡 Cuentas vinculadas a tu perfil</h3>
            <p style="color:#bbb; font-size:0.85rem; margin-bottom:15px">Selecciona la combinación Instagram ↔ Facebook donde quieres publicar:</p>
            <div style="max-height:450px; overflow-y:auto; margin:15px 0; padding-right:5px">
                ${pagesHtml.length > 0 ? pagesHtml : '<div style="color:#666; text-align:center; padding:20px">No se encontraron páginas administrables. Asegúrate de haber otorgado permisos.</div>'}
            </div>
            <button onclick="document.body.removeChild(this.parentElement.parentElement)" class="btn" style="width:100%; background:#333; padding:12px; margin-top:5px">Cancelar</button>
        </div>
    `;
    modal.id = 'fbPageSelectModal';
    document.body.appendChild(modal);
};

window.selectPage = async (id, name, token) => {
    try {
        if (window.showToast) window.showToast("Guardando conexión...", "info");

        // Remove modal
        // Remove modal by ID first, fallback to selector
        const modalById = document.getElementById('fbPageSelectModal');
        if (modalById) modalById.remove();
        else {
            const modal = document.querySelector('div[style*="z-index:9999"]');
            if (modal) modal.remove();
        }

        // Call backend to save
        const res = await fetch('/api/fb-save-page', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pageId: id,
                pageName: name,
                pageAccessToken: token,
                userId: store.currentUser?.id
            })
        });

        const data = await res.json();
        if (!data.success) {
            // Log full diagnostic data to console
            console.error('[FB_SAVE] Server diagnostic:', data);
            if (data.steps) console.table(data.steps);

            const stepsInfo = data.steps ? '\n\nDiagnóstico:\n' + data.steps.join('\n') : '';
            throw new Error((data.error || 'Unknown error') + stepsInfo);
        }

        alert(`✅ Conectado exitosamente a: ${name}`);
        window.switchAdminTab('fb-queue'); // Refresh

    } catch (e) {
        alert('Error guardando página: ' + e.message);
    }
};

// --- RENDER HELPERS ---
const renderFbSourceItems = (prompts, queue) => {
    const queuedIds = new Set(queue.map(q => q.prompt?.id));

    return prompts.map(p => {
        const isQueued = queuedIds.has(p.id);
        if (isQueued) return '';

        return `
            <div class="fb-source-item" data-title="${p.title.toLowerCase()}" data-prompt-id="${p.id}" style="display:flex; gap:10px; padding:10px; border-bottom:1px solid #333; align-items:center">
                <input type="checkbox" class="cb-source-item" data-id="${p.id}" onchange="window.updateSourceSelection()" style="accent-color:#3b82f6; flex-shrink:0">
                <img src="${p.image || (p.content && p.content[0] ? p.content[0].image : '')}" style="width:50px; height:50px; border-radius:6px; object-fit:cover; background:#000">
                <div style="flex:1; overflow:hidden">
                    <div style="font-weight:600; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis" title="${p.title}">
                        ${(p.content && p.content.length > 1) ? '<span title="Secuencia/Carrusel">📚</span> ' : ''}${p.title} ${(p.image_hd || (p.content && p.content[0] && p.content[0].image_hd)) ? '<span style="background:#16a34a;color:#fff;font-size:0.6rem;padding:1px 5px;border-radius:4px;vertical-align:middle;font-weight:bold" title="Tiene versión HD">📀HD</span>' : '<span style="background:#78716c;color:#fff;font-size:0.6rem;padding:1px 5px;border-radius:4px;vertical-align:middle;font-weight:bold" title="Sin versión HD">⚠️SD</span>'}
                    </div>
                    <div style="font-size:0.75rem; color:#666">@${p.author} • ${new Date(p.createdAt).toLocaleDateString()}</div>
                </div>
                <button class="btn-icon-pro btn-add" onclick="window.addToFbQueue('${p.id}')" title="Añadir a la Cola">➕</button>
            </div>
        `;
    }).join('');
};

const renderFbQueueItems = (queue) => {
    if (queue.length === 0) return `<div style="text-align:center; padding:40px; color:#475569; font-style:italic">La cola está vacía.<br>Añade prompts desde la izquierda.</div>`;

    return queue.map((item, idx) => {
        const p = item.prompt || { title: 'Eliminado', image: '' };
        let statusColor = '#94a3b8'; // Pending
        if (item.status === 'processing') statusColor = '#eab308';
        if (item.status === 'published') statusColor = '#22c55e';
        if (item.status === 'failed') statusColor = '#ef4444';

        return `
            <div style="display:flex; gap:10px; padding:12px; margin-bottom:8px; background:#1e293b; border-radius:8px; border-left:4px solid ${statusColor}; align-items:center; position:relative">
                <input type="checkbox" class="cb-queue-item" data-id="${item.id}" onchange="window.updateQueueSelection()" style="accent-color:#ef4444; flex-shrink:0">
                <div style="position:absolute; top:4px; right:8px; font-size:0.65rem; color:#64748b; font-weight:bold">Pos: ${idx + 1}</div>
                <img src="${p.image || (p.content && p.content[0] ? p.content[0].image : '')}" style="width:60px; height:60px; border-radius:6px; object-fit:cover; background:#000">
                <div style="flex:1; overflow:hidden">
                    <div style="font-weight:bold; font-size:0.9rem; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
                         ${(p.content && p.content.length > 1) ? '<span title="Secuencia/Carrusel">📚</span> ' : ''}${p.title} ${(p.image_hd || (p.content && p.content[0] && p.content[0].image_hd)) ? '<span style="background:#16a34a;color:#fff;font-size:0.6rem;padding:1px 5px;border-radius:4px;vertical-align:middle;font-weight:bold" title="Tiene versión HD">📀HD</span>' : '<span style="background:#78716c;color:#fff;font-size:0.6rem;padding:1px 5px;border-radius:4px;vertical-align:middle;font-weight:bold" title="Sin versión HD">⚠️SD</span>'}
                    </div>
                    <div style="font-size:0.75rem; color:#94a3b8">
                        Status: <span style="color:${statusColor}; text-transform:uppercase; font-weight:bold">${item.status}</span>
                        ${item.error ? `<br><span style="color:#ef4444">Error: ${item.error}</span>` : ''}
                    </div>
                </div>
                <div style="display:flex; flex-direction:row; gap:6px; align-items:center">
                    ${item.status === 'pending' || item.status === 'failed' ? `
                        <button class="btn-icon-pro btn-publish" onclick="window.processFbItem('${item.id}', '${p.id}')" title="Publicar Ahora">🚀</button>
                        <button class="btn-icon-pro btn-delete" onclick="window.removeFromFbQueue('${item.id}')" title="Eliminar de la Cola">🗑️</button>
                    ` : ''}
                    ${item.status === 'published' ? `<button class="btn-icon-pro btn-clear" onclick="window.removeFromFbQueue('${item.id}')" title="Limpiar de la lista">✨</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
};

// --- FB QUEUE LOGIC ---
window.filterFbSource = () => {
    const term = document.getElementById('fbSourceSearch').value.toLowerCase();
    const list = document.getElementById('fbSourceList');
    const items = list.getElementsByClassName('fb-source-item');
    for (let item of items) {
        const title = item.getAttribute('data-title');
        item.style.display = title.includes(term) ? 'flex' : 'none';
    }
};

window.addToFbQueue = async (promptId) => {
    const res = await store.adminAddToFbQueue(promptId);
    if (res.success) {
        // Refresh Tab
        await renderFbQueueTab(document.getElementById('admin-main-content'));
    } else alert("Error: " + res.msg);
};

window.removeFromFbQueue = async (queueId) => {
    if (!confirm("¿Quitar de la cola?")) return;
    const res = await store.adminRemoveFromFbQueue(queueId);
    if (res.success) await renderFbQueueTab(document.getElementById('admin-main-content'));
    else alert("Error: " + res.msg);
};

window.processFbItem = async (queueId, promptId) => {
    if (!confirm("🚀 ¿Publicar INMEDIATAMENTE en Facebook?")) return;

    // Find prompt data
    const item = window.fbQueueCache.find(i => i.id === queueId);
    if (!item || !item.prompt) return alert("Error: Datos corruptos");

    const res = await store.adminProcessFbQueueItem(queueId, item.prompt);
    if (res.success) {
        alert("✅ ¡Publicado en Facebook correctamente!");
        await renderFbQueueTab(document.getElementById('admin-main-content'));
    } else {
        alert("❌ Error publicando: " + res.msg);
        await renderFbQueueTab(document.getElementById('admin-main-content'));
    }
};

// --- SMART RUNNER (CLIENT SIDE) ---
window.smartQueueInterval = null;
window.smartTimerDisplay = null;
window.nextRunTime = 0;
window.smartQueuePaused = false;

window.startSmartQueue = () => {
    const btnStart = document.getElementById('btnStartSmartQueue');
    const btnPause = document.getElementById('btnPauseSmartQueue');
    const btnStop = document.getElementById('btnStopSmartQueue');
    const status = document.getElementById('fbNextRun');

    btnStart.style.display = 'none';
    btnPause.style.display = 'inline-block';
    btnStop.style.display = 'inline-block';
    status.style.color = '#22c55e';
    window.smartQueuePaused = false;

    runSmartCycle();
};

window.pauseSmartQueue = () => {
    const btnPause = document.getElementById('btnPauseSmartQueue');
    const status = document.getElementById('fbNextRun');

    if (window.smartQueuePaused) {
        // RESUME
        window.smartQueuePaused = false;
        btnPause.innerHTML = '⏸️ Pausar';
        btnPause.style.background = '#eab308';
        status.innerHTML = '▶️ Reanudando...';
        status.style.color = '#22c55e';
        runSmartCycle();
    } else {
        // PAUSE
        window.smartQueuePaused = true;
        clearTimeout(window.smartQueueInterval);
        clearInterval(window.smartTimerDisplay);
        window.smartQueueInterval = null;
        btnPause.innerHTML = '▶️ Reanudar';
        btnPause.style.background = '#22c55e';
        status.innerHTML = '⏸️ Pausado (cola activa, esperando reanudar)';
        status.style.color = '#eab308';
    }
};

window.stopSmartQueue = () => {
    if (!confirm('⏹️ ¿Detener completamente el auto-post?')) return;

    clearTimeout(window.smartQueueInterval);
    clearInterval(window.smartTimerDisplay);
    window.smartQueueInterval = null;
    window.smartQueuePaused = false;

    const btnStart = document.getElementById('btnStartSmartQueue');
    const btnPause = document.getElementById('btnPauseSmartQueue');
    const btnStop = document.getElementById('btnStopSmartQueue');
    const status = document.getElementById('fbNextRun');

    if (btnStart) btnStart.style.display = 'inline-block';
    if (btnPause) { btnPause.style.display = 'none'; btnPause.innerHTML = '⏸️ Pausar'; btnPause.style.background = '#eab308'; }
    if (btnStop) btnStop.style.display = 'none';
    if (status) { status.innerHTML = '⏹️ Detenido'; status.style.color = '#64748b'; }
};

// Keep legacy toggle as alias
window.toggleSmartQueue = window.startSmartQueue;

const runSmartCycle = async () => {
    const status = document.getElementById('fbNextRun');
    if (!status) return;
    if (window.smartQueuePaused) return;

    const queue = await store.adminGetFbQueue();
    const pending = queue.filter(q => q.status === 'pending');

    if (pending.length === 0) {
        status.innerHTML = '💤 Cola vacía. Revisando en 1 min...';
        window.smartQueueInterval = setTimeout(runSmartCycle, 60000);
        return;
    }

    const nextItem = pending[0];
    status.innerHTML = `🚀 Publicando: ${nextItem.prompt?.title.substring(0, 20)}...`;

    await store.adminProcessFbQueueItem(nextItem.id, nextItem.prompt);

    const container = document.getElementById('admin-main-content');
    if (container) await renderFbQueueTab(container);

    // Re-show controls after refresh
    const btnStart = document.getElementById('btnStartSmartQueue');
    const btnPause = document.getElementById('btnPauseSmartQueue');
    const btnStop = document.getElementById('btnStopSmartQueue');
    if (btnStart) btnStart.style.display = 'none';
    if (btnPause) { btnPause.style.display = 'inline-block'; btnPause.innerHTML = '⏸️ Pausar'; btnPause.style.background = '#eab308'; }
    if (btnStop) btnStop.style.display = 'inline-block';

    const minTime = 20 * 60 * 1000;
    const maxTime = 45 * 60 * 1000;
    const delay = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;

    window.nextRunTime = Date.now() + delay;

    if (window.smartTimerDisplay) clearInterval(window.smartTimerDisplay);
    window.smartTimerDisplay = setInterval(() => {
        const now = Date.now();
        const diff = window.nextRunTime - now;

        const statusEl = document.getElementById('fbNextRun');
        if (!statusEl) { clearInterval(window.smartTimerDisplay); return; }

        if (diff <= 0) {
            statusEl.innerHTML = '⚡ Preparando siguiente...';
        } else {
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            statusEl.innerHTML = `⏳ Siguiente post en: ${mins}m ${secs}s`;
        }
    }, 1000);

    window.smartQueueInterval = setTimeout(runSmartCycle, delay);
};

// --- BATCH SELECTION LOGIC ---
window.selectedSourceIds = new Set();
window.selectedQueueIds = new Set();

window.updateSourceSelection = () => {
    window.selectedSourceIds.clear();
    document.querySelectorAll('.cb-source-item:checked').forEach(cb => window.selectedSourceIds.add(cb.dataset.id));
    const btn = document.getElementById('btnBatchAddSource');
    if (btn) btn.style.display = window.selectedSourceIds.size > 0 ? 'inline-block' : 'none';
    if (btn) btn.textContent = `➕ Añadir ${window.selectedSourceIds.size} seleccionados`;
};

window.updateQueueSelection = () => {
    window.selectedQueueIds.clear();
    document.querySelectorAll('.cb-queue-item:checked').forEach(cb => window.selectedQueueIds.add(cb.dataset.id));
    const btn = document.getElementById('btnBatchRemoveQueue');
    if (btn) btn.style.display = window.selectedQueueIds.size > 0 ? 'inline-block' : 'none';
    if (btn) btn.textContent = `🗑️ Quitar ${window.selectedQueueIds.size} seleccionados`;
};

window.toggleSelectAllSource = (checked) => {
    document.querySelectorAll('.cb-source-item').forEach(cb => {
        // Only toggle visible items
        if (cb.closest('.fb-source-item').style.display !== 'none') cb.checked = checked;
    });
    window.updateSourceSelection();
};

window.toggleSelectAllQueue = (checked) => {
    document.querySelectorAll('.cb-queue-item').forEach(cb => cb.checked = checked);
    window.updateQueueSelection();
};

window.batchAddToQueue = async () => {
    if (window.selectedSourceIds.size === 0) return;
    const ids = [...window.selectedSourceIds];
    if (!confirm(`¿Añadir ${ids.length} prompts a la cola?`)) return;

    if (window.showToast) window.showToast(`Añadiendo ${ids.length} prompts...`, 'info');
    let ok = 0;
    for (const id of ids) {
        const res = await store.adminAddToFbQueue(id);
        if (res.success) ok++;
    }
    if (window.showToast) window.showToast(`✅ ${ok}/${ids.length} añadidos a la cola`, 'success');
    window.selectedSourceIds.clear();
    await renderFbQueueTab(document.getElementById('admin-main-content'));
};

window.batchRemoveFromQueue = async () => {
    if (window.selectedQueueIds.size === 0) return;
    const ids = [...window.selectedQueueIds];
    if (!confirm(`¿Quitar ${ids.length} items de la cola?`)) return;

    if (window.showToast) window.showToast(`Quitando ${ids.length} items...`, 'info');
    let ok = 0;
    for (const id of ids) {
        const res = await store.adminRemoveFromFbQueue(id);
        if (res.success) ok++;
    }
    if (window.showToast) window.showToast(`✅ ${ok}/${ids.length} removidos de la cola`, 'success');
    window.selectedQueueIds.clear();
    await renderFbQueueTab(document.getElementById('admin-main-content'));
};
window.previewBroadcast = () => {
    const html = document.getElementById('broadcastHtml').value;
    const preview = document.getElementById('broadcastPreview');
    preview.innerHTML = html;
    preview.style.display = 'block';
};



window.sendTestEmail = async () => {
    const subject = document.getElementById('broadcastSubject').value;
    const html = document.getElementById('broadcastHtml').value;

    if (!subject || !html) return alert("Completa asunto y contenido HTML");

    // Send to custom email (defaulting to rodridom.rock@gmail.com)
    let testEmail = prompt("Ingresa el correo para la prueba:", "rodridom.rock@gmail.com");
    if (!testEmail) return;

    try {
        const res = await fetch('/api/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: testEmail,
                subject: '[TEST] ' + subject,
                html: html
            })
        });
        const data = await res.json();
        if (data.success) alert("✅ Prueba enviada a: " + testEmail);
        else alert("❌ Error: " + data.error);
    } catch (e) {
        alert("❌ Error de conexión: " + e.message);
    }
};


window.isBroadcasting = false;

window.stopBroadcast = () => {
    if (!window.isBroadcasting) return;
    if (confirm("⚠️ ¿Detener el envío masivo? Se pausará después del envío actual.")) {
        window.isBroadcasting = false;
        const statusEl = document.getElementById('broadcastStatus');
        if (statusEl) statusEl.innerHTML = '<span style="color:red">🛑 DETENIENDO... (Espera a que termine el ciclo actual)</span>';
    }
};

window.startBroadcast = async () => {
    // 1. Validate Content
    const subject = document.getElementById('broadcastSubject').value;
    const html = document.getElementById('broadcastHtml').value;
    if (!subject || !html) return alert("Completa asunto y contenido HTML");

    // 2. Validate Selection
    if (!window.broadcastUsers || !window.selectedBroadcastUsers || window.selectedBroadcastUsers.size === 0) {
        return alert("⚠️ No has seleccionado ningún usuario.");
    }

    // 3. Prepare Queue
    // We only send to SELECTED users who have valid emails
    const queue = window.broadcastUsers.filter(u => window.selectedBroadcastUsers.has(u.id) && u.email && u.email.includes('@'));

    if (queue.length === 0) return alert("⚠️ Ninguno de los usuarios seleccionados tiene un email válido.");

    // Estimate: 25 seconds average per user
    const totalSeconds = queue.length * 25;
    const totalMinutes = Math.round(totalSeconds / 60);

    if (!confirm(`⚠️ CONFIRMACIÓN DE ENVÍO\n\n📧 Destinatarios: ${queue.length}\n⏳ Tiempo Est.: ${totalMinutes} min\n\n¿Iniciar envío masivo ahora?`)) return;

    // 4. UI Setup
    document.getElementById('broadcastProgress').style.display = 'block';
    const logEl = document.getElementById('progressLog');
    logEl.innerHTML = `<div style="color:gold">🚀 Iniciando envío a ${queue.length} usuarios...</div>`;

    // Swap Buttons for Status/Stop
    const controlsDiv = document.getElementById('broadcastControls');
    if (controlsDiv) {
        controlsDiv.innerHTML = `
            <div id="broadcastStatus" style="color:gold; font-weight:bold; margin-right:auto; align-self:center">✅ ENVIANDO (0/${queue.length})... NO CIERRES.</div>
            <button class="btn" style="background:red; color:white; font-weight:bold" onclick="window.stopBroadcast()">🛑 DETENER ENVÍO</button>
        `;
    }

    const updateUI = (i, total) => {
        const pct = Math.round((i / total) * 100);
        document.getElementById('progressText').innerText = `Enviando: ${i}/${total}`;
        document.getElementById('progressPercent').innerText = `${pct}%`;
        document.getElementById('progressBar').style.width = `${pct}%`;
        const statusEl = document.getElementById('broadcastStatus');
        if (statusEl) statusEl.innerText = `✅ ENVIANDO (${i}/${total})... NO CIERRES.`;
    };

    window.isBroadcasting = true;
    let successCount = 0;
    let failCount = 0;

    // 5. Processing Loop
    for (let i = 0; i < queue.length; i++) {
        // STOP CHECK
        if (!window.isBroadcasting) {
            logEl.innerHTML += `<div style="color:red; font-weight:bold; margin-top:10px">⛔ ENVÍO DETENIDO POR EL USUARIO</div>`;
            if (document.getElementById('broadcastStatus'))
                document.getElementById('broadcastStatus').innerHTML = '<span style="color:red">⛔ ENVÍO DETENIDO</span>';

            alert(`🛑 Broadcast Detenido.\n\n✅ Enviados: ${successCount}\n❌ Fallos: ${failCount}`);

            // Restore Start Button
            if (controlsDiv) {
                controlsDiv.innerHTML = `
                    <button class="btn-outline" onclick="window.sendTestEmail()">🧪 Enviar Prueba (A mí)</button>
                    <button class="btn" style="background:gold; color:black; font-weight:bold" onclick="window.startBroadcast()">🚀 ENVIAR A SELECCIONADOS (<span id="btnSelCount">${window.selectedBroadcastUsers.size}</span>)</button>
                `;
            }
            return;
        }

        const user = queue[i];

        // Send
        try {
            const res = await fetch('/api/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: user.email,
                    subject: subject,
                    html: html
                })
            });
            const data = await res.json();

            if (data.success) {
                successCount++;
                logEl.innerHTML += `<div>✅ ${user.email} (Enviado)</div>`;
            } else {
                failCount++;
                logEl.innerHTML += `<div style="color:red">❌ ${user.email}: ${data.error}</div>`;
            }
        } catch (e) {
            failCount++;
            logEl.innerHTML += `<div style="color:red">❌ ${user.email}: Error de red</div>`;
        }

        // Auto-Scroll Log
        logEl.scrollTop = logEl.scrollHeight;
        updateUI(i + 1, queue.length);

        // DELAY: 20-30 Seconds (Randomized)
        if (i < queue.length - 1) {
            const delay = Math.floor(Math.random() * 10000) + 20000;
            let remaining = Math.round(delay / 1000);

            const timerId = `timer-${Date.now()}`;
            const timerDiv = document.createElement('div');
            timerDiv.id = timerId;
            timerDiv.style.color = '#666';
            timerDiv.style.fontSize = '0.8rem';
            timerDiv.innerText = `⏳ Esperando sig. envío... ${remaining}s`;
            logEl.appendChild(timerDiv);
            logEl.scrollTop = logEl.scrollHeight;

            const interval = setInterval(() => {
                if (!window.isBroadcasting) { clearInterval(interval); return; }
                remaining--;
                if (document.getElementById(timerId)) document.getElementById(timerId).innerText = `⏳ Esperando sig. envío... ${remaining}s`;
                if (remaining <= 0) clearInterval(interval);
            }, 1000);

            await new Promise(r => setTimeout(r, delay));
            clearInterval(interval);
        }
    }

    alert(`🏁 Broadcast Finalizado.\n\n✅ Éxitos: ${successCount}\n❌ Fallos: ${failCount}`);

    // Restore UI
    window.isBroadcasting = false;
    if (controlsDiv) {
        controlsDiv.innerHTML = `
            <button class="btn-outline" onclick="window.sendTestEmail()">🧪 Enviar Prueba (A mí)</button>
            <button class="btn" style="background:gold; color:black; font-weight:bold" onclick="window.startBroadcast()">🚀 ENVIAR A SELECCIONADOS (<span id="btnSelCount">${window.selectedBroadcastUsers.size}</span>)</button>
        `;
    }
};

const renderUsersTab = async (container) => {
    await store.adminLoadAllUsers();
    let users = [...(store.getAllUsers() || [])];

    // Alphabet Filter
    const filterHtml = `
        < div id = "adminAlphabetFilter" style = "margin-bottom:15px; display:flex; gap:4px; flex-wrap:wrap; justify-content:center" >
        <button class="btn-sm ${!window.adminFilterChar ? 'active' : ''}" onclick="window.setAdminFilter('')" style="padding:2px 8px">ALL</button>
            ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(char => `
                <button class="btn-sm ${window.adminFilterChar === char ? 'active' : ''}" onclick="window.setAdminFilter('${char}')" style="padding:2px 8px">${char}</button>
            `).join('')
        }
        </div >
        `;

    if (window.adminFilterChar) {
        users = users.filter(u => (u.username || '').toUpperCase().startsWith(window.adminFilterChar));
    }

    const { col, dir } = window.adminSort;
    users.sort((a, b) => {
        let valA = a[col];
        let valB = b[col];
        if (['level', 'tokens', 'comments_count', 'prompts_count'].includes(col)) {
            valA = parseInt(valA) || 0;
            valB = parseInt(valB) || 0;
        } else {
            valA = (valA || '').toString().toLowerCase();
            valB = (valB || '').toString().toLowerCase();
        }
        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
    });

    container.innerHTML = `
        ${filterHtml}
    < div class= "admin-table-container" >
    <table class="admin-table">
        <thead>
            <tr>
                <th onclick="window.toggleAdminSort('username')">Usuario ${col === 'username' ? (dir === 'asc' ? '↑' : '↓') : ''}</th>
                <th onclick="window.toggleAdminSort('email')">Email ${col === 'email' ? (dir === 'asc' ? '↑' : '↓') : ''}</th>
                <th onclick="window.toggleAdminSort('role')">Rol ${col === 'role' ? (dir === 'asc' ? '↑' : '↓') : ''}</th>
                <th onclick="window.toggleAdminSort('level')">Nivel ${col === 'level' ? (dir === 'asc' ? '↑' : '↓') : ''}</th>
                <th onclick="window.toggleAdminSort('tokens')">Bits ${col === 'tokens' ? (dir === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            ${users.map(u => `
                        <tr>
                            <td style="display:flex; align-items:center; gap:8px">
                                <div class="user-avatar-sm" style="background-image:url('${u.avatar || 'https://robohash.org/' + u.username}')"></div>
                                <span style="font-weight:600">${u.username}</span>
                            </td>
                            <td style="color:#888; font-size:0.8rem">${u.email}</td>
                            <td style="color:${u.role === 'admin' ? 'gold' : '#888'}; font-weight:${u.role === 'admin' ? 'bold' : 'normal'}">${u.role || 'user'}</td>
                            <td style="text-align:center">Lvl ${u.level || 0}</td>
                            <td style="text-align:center; color:#a29bfe; font-weight:bold">💎 ${u.tokens || 0}</td>
                            <td>
                                <div style="display:flex; gap:5px">
                                    <button class="btn-outline" style="padding:4px 8px; font-size:0.7rem; border-color:gold; color:gold" onclick="window.adminOpenUserMgmt('${u.id}', '${u.username}', ${u.level || 0}, '${u.role || 'user'}')">Gestionar</button>
                                    ${(u.id !== store.currentUser?.id && u.id !== 'MASTER_ADMIN_ID') ? `<button class="btn-outline" style="padding:4px 8px; font-size:0.7rem; border-color:#ff4444; color:#ff4444" onclick="window.adminDeleteUser('${u.id}')">Borrar</button>` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
        </tbody>
    </table>
        </div >
        `;
};

const renderContentTab = async (container) => {
    const prompts = [...store.prompts].sort((a, b) => b.createdAt - a.createdAt);
    container.innerHTML = `
        < div class= "admin-table-container" >
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Vista</th>
                    <th>Título / Autor</th>
                    <th>Rating</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${prompts.map(p => `
                        <tr>
                            <td style="padding:10px">
                                <img src="${p.type === 'sequence' ? p.content[0].image : p.image}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                            </td>
                            <td>
                                <div style="font-weight:700">${p.title}</div>
                                <div style="font-size:0.75rem; color:#888">por @${p.author}</div>
                            </td>
                            <td>
                                <select class="form-input" style="padding:4px; font-size:0.75rem" onchange="window.adminChangeRating('${p.id}', this.value)">
                                    ${RATINGS.map(r => `<option value="${r}" ${p.rating === r ? 'selected' : ''}>${r}</option>`).join('')}
                                </select>
                            </td>
                            <td>
                                <button class="btn-outline" style="padding:4px 8px; font-size:0.75rem; border-color:#ff4444; color:#ff4444" onclick="window.adminDeletePrompt('${p.id}')">Borrar</button>
                            </td>
                        </tr>
                    `).join('')}
            </tbody>
        </table>
        </div >
        `;
};


const renderLogsTab = async (container) => {
    container.innerHTML = `< div style = "text-align:center; padding:50px; color:#aaa" > <div class="loading-spinner" style="margin-bottom:15px"></div>Cargando actividad reciente...</div > `;

    let logs = [];
    try {
        logs = await store.getActivityLogs();
    } catch (e) {
        console.error("Error loading logs tab:", e);
        container.innerHTML = `< div style = "color:#ff4444; padding:20px; border:1px solid #ff4444; border-radius:8px" >❌ Error cargando logs: ${e.message}</div > `;
        return;
    }

    const renderLogRow = (l) => {
        const date = new Date(l.created_at).toLocaleString();
        let detailsStr = "";
        try {
            const d = l.details || {};
            if (l.action === 'tip') detailsStr = `Envió ${d.amount} 💎 a @${d.recipient}(${d.postId})`;
            else if (l.action === 'publish') detailsStr = `Publicó: ${d.postId}(${d.type})`;
            else if (l.action === 'levelup') detailsStr = `Subió de nivel: Lvl ${d.old} ➔ ${d.new}`;
            else if (l.action === 'reaction') detailsStr = `Reaccionó con ${d.type} en ${d.postId}`;
            else if (l.action === 'comment') detailsStr = `Comentó en ${d.postId}`;
            else detailsStr = JSON.stringify(d);
        } catch (e) { detailsStr = "Error en detalles"; }

        let badgeColor = "#888";
        if (l.action === 'tip') badgeColor = "#a29bfe";
        if (l.action === 'publish') badgeColor = "#4ade80";
        if (l.action === 'levelup') badgeColor = "gold";
        if (l.action === 'reaction') badgeColor = "#f87171";

        return `
    < tr style = "border-bottom:1px solid #222;" >
                <td style="font-size:0.75rem; color:#888; white-space:nowrap">${date}</td>
                <td style="font-weight:600">@${l.username}</td>
                <td><span class="badge" style="background:${badgeColor}; color:#000; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold">${l.action.toUpperCase()}</span></td>
                <td style="font-size:0.8rem; color:#aaa">${detailsStr}</td>
            </tr >
        `;
    };

    container.innerHTML = `
        < div style = "display:flex; justify-content:space-between; align-items:center; margin-bottom:15px" >
             <h3 style="color: gold; margin:0">📜 Log de Actividad Reciente</h3>
             <button class="btn-sm" onclick="window.switchAdminTab('logs')" style="font-size:0.75rem; padding:6px 12px;">🔄 Refrescar</button>
        </div >
        <div class="admin-table-container">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Usuario</th>
                        <th>Acción</th>
                        <th>Detalles</th>
                    </tr>
                </thead>
                <tbody id="adminLogsList">
                    ${!logs || logs.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px; color:#666">No hay actividad registrada aún.</td></tr>' : logs.map(l => renderLogRow(l)).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Realtime subscription
    try {
        store.subscribeToLogs((newLog) => {
            const list = document.getElementById('adminLogsList');
            if (list) {
                if (list.innerHTML.includes('No hay actividad')) list.innerHTML = '';
                list.insertAdjacentHTML('afterbegin', renderLogRow(newLog));
            }
        });
    } catch (e) {
        console.warn("Realtime logs error:", e);
    }
};

// --- HANDLERS ---
window.setAdminFilter = (char) => {
    if (char === '') window.adminFilterChar = null;
    else window.adminFilterChar = (window.adminFilterChar === char) ? null : char;
    renderAdmin();
};

window.toggleAdminSort = (col) => {
    if (window.adminSort.col === col) {
        window.adminSort.dir = window.adminSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        window.adminSort = { col, dir: 'asc' };
    }
    renderAdmin();
};

window.adminOpenUserMgmt = (id, name, level, role) => {
    window.editingUserId = id;
    document.getElementById('editUserName').innerText = `Gestionar @${name}`;
    document.getElementById('editUserLevel').value = level || 0;
    document.getElementById('editUserBadge').value = 'none';
    document.getElementById('editUserRole').value = role || 'user';
    document.getElementById('adminUserEditBox').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.adminSubmitUserUpdate = async () => {
    const level = parseInt(document.getElementById('editUserLevel').value);
    const badge = document.getElementById('editUserBadge').value;
    const role = document.getElementById('editUserRole').value;
    const res = await store.adminUpdateUser(window.editingUserId, { level, badge, role });
    if (res.success) {
        alert("✅ Usuario actualizado");
        document.getElementById('adminUserEditBox').style.display = 'none';
        renderAdmin();
    } else alert("❌ Error: " + res.msg);
};

window.adminSubmitGift = async () => {
    const amount = parseInt(document.getElementById('giftBitsAmount').value);
    if (!amount || amount < 1) return alert("Monto inválido");
    if (!confirm(`¿Regalar ${amount} Bits a este usuario desde tu saldo ? `)) return;

    const res = await store.giftTokens(window.editingUserId, amount);
    if (res.success) {
        alert(`✅ Has regalado ${amount} Bits`);
        document.getElementById('giftBitsAmount').value = '';
        renderAdmin();
    } else alert("❌ " + res.msg);
};

window.adminDeleteUser = async (id) => {
    if (confirm("¿ESTÁS TOTALMENTE SEGURO? Esta acción es irreversible y borrará todo el contenido de este usuario.")) {
        const res = await store.adminDeleteUser(id);
        if (res.success) {
            alert("✅ Usuario eliminado");
            renderAdmin();
        } else alert("❌ Error: " + res.msg);
    }
};

window.adminChangeRating = async (id, rating) => {
    const res = await store.adminUpdatePrompt(id, { rating });
    if (res.success) console.log("Rating updated");
    else alert("Error actualizando rating: " + res.msg);
};

window.adminDeletePrompt = async (id) => {
    if (confirm("¿Eliminar este post definitivamente?")) {
        const res = await store.removePrompt(id);
        if (res.success) {
            alert("✅ Post eliminado");
            renderAdmin();
        } else alert("❌ Error: " + res.msg);
    }
};


// === ECONOMY TAB ===
const renderEconomyTab = async (container) => {
    container.innerHTML = `<div style="text-align:center; padding:50px; color:#666"><div class="loading-spinner"></div> Calculando economía global...</div>`;

    try {
        const res = await fetch('/api/economy-audit');
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();

        const s = data.summary;
        const discColor = s.discrepancy === 0 ? '#16a34a' : (Math.abs(s.discrepancy) < 100 ? '#eab308' : '#ef4444');
        const discIcon = s.discrepancy === 0 ? '✅' : '⚠️';
        const discExpl = s.discrepancy > 0
            ? `Hay ${s.discrepancy} 💎 más en billeteras de usuario que lo registrado en el Ledger. Probable causa: bonos de registro anteriores al sistema de Ledger.`
            : s.discrepancy < 0
                ? `Hay ${Math.abs(s.discrepancy)} 💎 menos en billeteras de lo esperado. Posible error contable.`
                : 'La contabilidad cuadra perfectamente. Todo en orden.';

        // --- TYPE BREAKDOWN TABLE ---
        const typeLabels = {
            POST_REWARD: '🖼️ Recompensa por Post',
            LEVEL_UP: '✨ Bono de Nivel',
            TIP: '💌 Propinas (P2P)',
            COPY_MILESTONE: '🏆 Milestone de Copias',
            REGISTRATION_BONUS: '🎁 Bono de Registro',
            GIFT: '🎀 Regalos Admin',
            PURCHASE: '🛒 Migración (Legacy)',
            MIGRACIÓN: '📦 Migración Sistema',
            BOOST: '🚀 Boosts',
            FEE: '💸 Comisiones',
            DAILY_LOGIN: '📅 Login Diario',
            DEPOSIT: '💳 Depósitos'
        };

        const breakdownRows = Object.entries(data.breakdown)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([type, info]) => `
                <tr style="border-bottom:1px solid #333">
                    <td style="padding:8px 12px; font-size:0.85rem">${typeLabels[type] || type}</td>
                    <td style="padding:8px 12px; text-align:center; color:#888">${info.count}</td>
                    <td style="padding:8px 12px; text-align:right; font-weight:bold; color:#a29bfe">${info.total.toLocaleString()} 💎</td>
                </tr>
            `).join('');

        // --- TOP HOLDERS TABLE ---
        const holdersRows = data.topHolders.map((u, i) => `
            <tr style="border-bottom:1px solid #333">
                <td style="padding:6px 10px; font-size:0.85rem; color:#888">${i + 1}</td>
                <td style="padding:6px 10px; font-weight:bold">@${window.escapeHTML(u.username)}</td>
                <td style="padding:6px 10px; text-align:center; font-size:0.8rem">Lvl ${u.level}</td>
                <td style="padding:6px 10px; text-align:right; color:#a29bfe; font-weight:bold">${u.tokens.toLocaleString()} 💎</td>
            </tr>
        `).join('');

        // --- MONTHLY CHART (simple bar chart) ---
        const maxMonthly = Math.max(...data.monthlyData.map(m => m.amount), 1);
        const monthlyBars = data.monthlyData.map(m => {
            const pct = Math.max(2, (m.amount / maxMonthly) * 100);
            const label = m.month.substring(5); // MM only
            return `
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
                    <span style="width:35px; text-align:right; font-size:0.75rem; color:#888">${label}</span>
                    <div style="flex:1; background:#222; border-radius:4px; overflow:hidden; height:20px">
                        <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, #6c5ce7, #a29bfe); border-radius:4px; display:flex; align-items:center; justify-content:flex-end; padding-right:6px">
                            <span style="font-size:0.65rem; color:#fff; font-weight:bold">${m.amount}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div style="max-width:1100px; margin:0 auto">
                <h2 style="color:#a29bfe; margin-bottom:20px">💰 Economía Global — PromptBits</h2>

                <!-- SUMMARY CARDS -->
                <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:15px; margin-bottom:25px">
                    <div style="background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:20px; text-align:center">
                        <div style="font-size:0.75rem; color:#888; margin-bottom:5px">📤 Total Emitidos</div>
                        <div style="font-size:1.8rem; font-weight:bold; color:#16a34a">${s.totalMinted.toLocaleString()}</div>
                        <div style="font-size:0.65rem; color:#555">${s.totalLedgerEntries} registros en Ledger</div>
                    </div>
                    <div style="background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:20px; text-align:center">
                        <div style="font-size:0.75rem; color:#888; margin-bottom:5px">💰 En Circulación</div>
                        <div style="font-size:1.8rem; font-weight:bold; color:#a29bfe">${s.totalInCirculation.toLocaleString()}</div>
                        <div style="font-size:0.65rem; color:#555">${s.totalUsersWithTokens} de ${s.totalUsers} usuarios</div>
                    </div>
                    <div style="background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:20px; text-align:center">
                        <div style="font-size:0.75rem; color:#888; margin-bottom:5px">🔥 Total Quemados</div>
                        <div style="font-size:1.8rem; font-weight:bold; color:#ef4444">${s.totalBurned.toLocaleString()}</div>
                        <div style="font-size:0.65rem; color:#555">Boosts, compras, fees</div>
                    </div>
                    <div style="background:#1a1a1a; border:1px solid ${discColor}; border-radius:12px; padding:20px; text-align:center">
                        <div style="font-size:0.75rem; color:#888; margin-bottom:5px">${discIcon} Validación</div>
                        <div style="font-size:1.8rem; font-weight:bold; color:${discColor}">${s.discrepancy === 0 ? 'OK' : (s.discrepancy > 0 ? '+' : '') + s.discrepancy.toLocaleString()}</div>
                        <div style="font-size:0.65rem; color:#555">Circulación vs Ledger</div>
                    </div>
                </div>

                <!-- VALIDATION BANNER -->
                <div style="background:${discColor}15; border:1px solid ${discColor}; border-radius:8px; padding:12px 16px; margin-bottom:25px; font-size:0.85rem; color:${discColor}">
                    ${discIcon} <strong>Auditoría Contable:</strong> ${discExpl}
                </div>

                <!-- TWO COLUMN LAYOUT -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:25px">

                    <!-- LEFT: TYPE BREAKDOWN -->
                    <div style="background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:20px">
                        <h3 style="color:#ccc; margin-top:0; font-size:1rem">📊 Desglose por Tipo</h3>
                        <table style="width:100%; border-collapse:collapse">
                            <thead><tr style="border-bottom:2px solid #444">
                                <th style="text-align:left; padding:8px 12px; font-size:0.75rem; color:#888">Tipo</th>
                                <th style="text-align:center; padding:8px 12px; font-size:0.75rem; color:#888">Txns</th>
                                <th style="text-align:right; padding:8px 12px; font-size:0.75rem; color:#888">Total</th>
                            </tr></thead>
                            <tbody>${breakdownRows || '<tr><td colspan="3" style="padding:20px; text-align:center; color:#666">Sin datos</td></tr>'}</tbody>
                        </table>
                    </div>

                    <!-- RIGHT: TOP HOLDERS -->
                    <div style="background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:20px">
                        <h3 style="color:#ccc; margin-top:0; font-size:1rem">🏅 Top 10 Holders</h3>
                        <table style="width:100%; border-collapse:collapse">
                            <thead><tr style="border-bottom:2px solid #444">
                                <th style="padding:6px 10px; font-size:0.75rem; color:#888">#</th>
                                <th style="text-align:left; padding:6px 10px; font-size:0.75rem; color:#888">Usuario</th>
                                <th style="text-align:center; padding:6px 10px; font-size:0.75rem; color:#888">Nivel</th>
                                <th style="text-align:right; padding:6px 10px; font-size:0.75rem; color:#888">Saldo</th>
                            </tr></thead>
                            <tbody>${holdersRows || '<tr><td colspan="4" style="padding:20px; text-align:center; color:#666">Sin datos</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>

                <!-- MONTHLY CHART -->
                <div style="background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:20px; margin-bottom:25px">
                    <h3 style="color:#ccc; margin-top:0; font-size:1rem">📈 Emisión Mensual</h3>
                    ${data.monthlyData.length > 0 ? monthlyBars : '<div style="padding:20px; text-align:center; color:#666">Sin datos mensuales aún</div>'}
                </div>

                <!-- FOOTER -->
                <div style="text-align:right; font-size:0.7rem; color:#555; margin-top:10px">
                    Última actualización: ${new Date(data.timestamp).toLocaleString()}
                </div>
            </div>
        `;

    } catch (err) {
        console.error('[ECONOMY TAB] Error:', err);
        container.innerHTML = `
            <div style="text-align:center; padding:50px">
                <div style="font-size:3rem; margin-bottom:15px">❌</div>
                <h3 style="color:#ef4444">Error al cargar datos de economía</h3>
                <p style="color:#888">${window.escapeHTML(err.message)}</p>
                <button class="btn" onclick="window.switchAdminTab('economy')" style="margin-top:15px">🔄 Reintentar</button>
            </div>
        `;
    }
};

// --- INIT ---
renderAdmin();
