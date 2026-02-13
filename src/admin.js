import './style.css'
import './admin_fix.css'
import { store } from './store-final.js'
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
                    <p style="color:#666; margin:5px 0 0 0">Gestión total de Prompt Gallery</p>
                </div>
            </div>
            <a href="/" class="btn-outline" style="text-decoration:none; padding:10px 20px">Volver a la Galería</a>
        </div>
        
        <div style="display:flex; gap:10px; margin-bottom:25px; background: #111; padding: 10px; border-radius: 12px; border: 1px solid #222;">
            <button class="profile-tab ${currentTab === 'users' ? 'active' : ''}" onclick="window.switchAdminTab('users')">👥 Usuarios</button>
            <button class="profile-tab ${currentTab === 'content' ? 'active' : ''}" onclick="window.switchAdminTab('content')">Moderación</button>
            <button class="profile-tab ${currentTab === 'logs' ? 'active' : ''}" onclick="window.switchAdminTab('logs')">📜 Actividad</button>
            <button class="profile-tab ${currentTab === 'broadcast' ? 'active' : ''}" onclick="window.switchAdminTab('broadcast')">📢 Broadcast</button>
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

            // Fix "undefined" username
            let displayName = u.username;
            if (!displayName || displayName === 'undefined') displayName = u.name;
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

// --- BROADCAST HANDLERS ---
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


// --- INIT ---
renderAdmin();
