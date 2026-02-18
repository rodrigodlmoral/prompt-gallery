
import { pb } from '../pocketbase.js';
import { store } from '../store-final.js';
import { toast } from '../utils/ui-helpers.js';
import './LiveChat.css';

/**
 * Live Chat Component v1.0
 * Real-time global chat using PocketBase SSE
 */
export const initLiveChat = () => {
    // 0. Comprobación de Usuario (Solo visible para usuarios logueados)
    if (!store.currentUser) {
        console.log('🕵️‍♂️ Visitante detectado: Chat Global oculto.');
        return;
    }

    // 1. Create HTML Structure
    const chatContainer = document.createElement('div');
    chatContainer.id = 'live-chat-container';
    chatContainer.innerHTML = `
        <div class="live-chat-launcher" id="chatLauncher" title="Chat Global">
            <span>💬</span>
            <div class="online-badge" id="chatOnlineBadge">NEW</div>
        </div>

        <div class="live-chat-window" id="chatWindow">
            <div class="chat-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <h3>💬 CHAT GLOBAL</h3>
                    <span id="chatOnlineCount" class="online-count" title="Usuarios Online">1</span>
                </div>
                <button class="chat-close" id="chatClose">×</button>
            </div>
            
            <div class="chat-messages" id="chatMessages">
                <!-- Messages will appear here -->
                <div class="chat-msg system">
                    <div class="chat-content">¡Bienvenido al canal global! Sé amable.</div>
                </div>
            </div>

            <div class="chat-footer">
                <div class="chat-input-wrapper">
                    <input type="text" class="chat-input" id="chatInput" placeholder="Escribe un mensaje..." maxlength="500">
                    <button class="chat-send" id="chatSend" disabled>🚀</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(chatContainer);

    // 2. Elements Cache
    const launcher = document.getElementById('chatLauncher');
    const windowEl = document.getElementById('chatWindow');
    const closeBtn = document.getElementById('chatClose');
    const messagesEl = document.getElementById('chatMessages');
    const inputEl = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSend');
    const badge = document.getElementById('chatOnlineBadge');
    const messageCache = new Set(); // Evitar duplicados
    let lastMsgTime = 0;
    let lastMsgContent = '';

    let isOpen = false;
    let presenceRecordId = null;
    let presenceInterval = null;
    let lastPresenceCount = 1;

    // 3. UI Handlers
    const toggleChat = () => {
        isOpen = !isOpen;
        windowEl.classList.toggle('active', isOpen);
        if (isOpen) {
            badge.style.display = 'none';
            inputEl.focus();
            scrollToBottom();
            loadInitialMessages(); // Cargar al abrir para mayor seguridad
        }
    };

    launcher.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    inputEl.addEventListener('input', () => {
        sendBtn.disabled = inputEl.value.trim().length === 0;
    });

    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !sendBtn.disabled) {
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    // --- SISTEMA DE PRESENCIA ---

    async function initPresence() {
        console.log('🌱 Inicializando presencia...');
        updatePresence(); // Primer latido
        presenceInterval = setInterval(updatePresence, 30000); // Latido cada 30s
        fetchOnlineCount(); // Conteo inicial

        // Suscribirse a cambios en presencia para actualizar el contador
        pb.collection('chat_presence').subscribe('*', () => {
            fetchOnlineCount();
        });
    }

    async function updatePresence() {
        if (!store.currentUser) return;
        try {
            const data = {
                user: store.currentUser.id,
                last_seen: new Date().toISOString()
            };

            // Intentar recuperar ID si no lo tenemos (ej. tras recarga)
            if (!presenceRecordId) {
                const existing = await pb.collection('chat_presence').getList(1, 1, {
                    filter: `user = "${store.currentUser.id}"`,
                    requestKey: null
                });
                if (existing.items.length > 0) {
                    presenceRecordId = existing.items[0].id;
                }
            }

            if (presenceRecordId) {
                await pb.collection('chat_presence').update(presenceRecordId, data);
            } else {
                const record = await pb.collection('chat_presence').create(data);
                presenceRecordId = record.id;
            }

            // Refrescar conteo tras latido exitoso
            fetchOnlineCount();
        } catch (err) {
            // Silenciamos logs de error 404/403 si la sesión expiró o similar
            if (err.status !== 404 && err.status !== 403) {
                console.warn('⚠️ Error en heartbeat de presencia:', err);
                if (err.data) {
                    console.error('--- DETALLE ERROR PRESENCIA ---');
                    console.error(JSON.stringify(err.data, null, 2));
                }
            }
        }
    }

    async function fetchOnlineCount() {
        try {
            // Aumentamos margen a 5 minutos para evitar fallos por clock drift entre cliente y servidor
            const fiveMinutesAgo = new Date(Date.now() - (5 * 60000)).toISOString();
            const result = await pb.collection('chat_presence').getList(1, 1, {
                filter: `last_seen > "${fiveMinutesAgo}"`,
                requestKey: null // Evitar cancelaciones automáticas
            });

            const count = result.totalItems || 1;
            const countEl = document.getElementById('chatOnlineCount');
            if (countEl) {
                countEl.textContent = count;
                // Pequeña animación si cambia
                if (count !== lastPresenceCount) {
                    countEl.classList.add('pulse-count');
                    setTimeout(() => countEl.classList.remove('pulse-count'), 500);
                }
                lastPresenceCount = count;
            }
            console.log(`[PRESENCE] Online Count Updated: ${count} (Threshold: 5min)`);
        } catch (err) {
            console.warn('⚠️ Error al obtener contador online:', err);
        }
    }

    // 4. Data Logic
    async function loadInitialMessages() {
        try {
            const records = await pb.collection('global_chat').getList(1, 100, {
                sort: '-created',
                expand: 'user'
            });
            renderHistory(records.items, true);
        } catch (err) {
            try {
                const records = await pb.collection('global_chat').getList(1, 100, {
                    sort: '-created',
                    expand: 'user'
                });
                renderHistory(records.items, true);
            } catch (err2) {
                try {
                    const records = await pb.collection('global_chat').getList(1, 100, {
                        expand: 'user'
                    });
                    const needsReverse = records.items.length > 1 &&
                        new Date(records.items[0].created) > new Date(records.items[records.items.length - 1].created);
                    renderHistory(records.items, needsReverse);
                } catch (err3) {
                    messagesEl.innerHTML += `
                        <div class="chat-msg system">
                            <div class="chat-content" style="color: #ff4444;">
                                ❌ Error de permisos.<br>
                                <small>Activa "List" en 'global_chat'.</small>
                            </div>
                        </div>`;
                }
            }
        }
    }

    function renderHistory(items, needsReverse) {
        messagesEl.innerHTML = '<div class="chat-msg system"><div class="chat-content">¡Bienvenido al canal global! Sé amable.</div></div>';
        messageCache.clear();
        const ordered = needsReverse ? [...items].reverse() : items;
        ordered.forEach(record => appendMessage(record));
        scrollToBottom();
    }

    async function sendMessage() {
        if (!store.currentUser) {
            toast('Debes iniciar sesión para chatear', 'warning');
            return;
        }

        const msg = inputEl.value.trim();
        if (!msg) return;

        // --- SISTEMA ANTI-SPAM ---
        const isAdmin = store.currentUser.role === 'admin';

        if (!isAdmin) {
            const now = Date.now();
            const cooldown = 3000; // 3 segundos

            // 1. Cooldown de tiempo
            if (now - lastMsgTime < cooldown) {
                const wait = Math.ceil((cooldown - (now - lastMsgTime)) / 1000);
                toast(`Espera ${wait}s para enviar otro mensaje`, 'warning');
                return;
            }

            // 2. Bloqueo de repetición
            if (msg === lastMsgContent) {
                toast('No puedes enviar el mismo mensaje dos veces seguidas', 'warning');
                return;
            }
        }

        inputEl.value = '';
        sendBtn.disabled = true;

        try {
            await pb.collection('global_chat').create({
                user: store.currentUser.id,
                message: msg,
                type: 'TEXT'
            });

            // Actualizar estado de anti-spam tras éxito
            lastMsgTime = Date.now();
            lastMsgContent = msg;

        } catch (err) {
            console.error('Error sending message:', err);
            toast('Error al enviar mensaje', 'error');
            sendBtn.disabled = false;
        }
    }

    function appendMessage(record) {
        if (messageCache.has(record.id)) return;
        messageCache.add(record.id);

        // --- IDENTIDAD BLINDADA (v1.1) ---
        const myId = pb.authStore.model?.id;
        const msgUserId = record.user?.id || record.user;
        const isMe = myId && String(msgUserId) === String(myId);

        // Datos del Remitente Real
        const userRecord = record.expand?.user;
        let username = userRecord?.username || userRecord?.name || (isMe ? 'Yo' : 'Explorador');
        let avatar = `https://robohash.org/${encodeURIComponent(username)}?set=set4`;

        if (userRecord && userRecord.avatar) {
            avatar = pb.files.getURL(userRecord, userRecord.avatar);
        } else if (isMe && pb.authStore.model?.avatar) {
            avatar = pb.files.getURL(pb.authStore.model, pb.authStore.model.avatar);
        }

        // Badges: ÚNICAMENTE del remitente real (userRecord para otros, authStore para mí si expand falla)
        const badgesHtml = renderUserBadges(userRecord || (isMe ? pb.authStore.model : null));

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${isMe ? 'me' : ''} ${record.type === 'SYSTEM' ? 'system' : ''} ${record.type === 'PROMPT_SHARE' ? 'share' : ''}`;

        if (record.type === 'SYSTEM') {
            msgDiv.innerHTML = `<div class="chat-content">${record.message}</div>`;
        } else if (record.type === 'PROMPT_SHARE') {
            const meta = record.metadata || {};
            // PRIORIDAD: meta.thumb (URL estática) > fallback dinámico
            const thumbUrl = meta.thumb || 'https://via.placeholder.com/300x200?text=Cargando...';

            msgDiv.innerHTML = `
                <div class="chat-avatar" style="background-image: url('${avatar}')"></div>
                <div style="flex: 1; min-width: 0;">
                    <div class="chat-user-row">
                        <span class="chat-user">${username}</span>
                        ${badgesHtml}
                    </div>
                    <div class="chat-content share-card" id="chat-share-${record.id}">
                        <div class="share-title">🖼️ COMPARTIÓ UN PROMPT</div>
                        <div class="share-thumb-wrap">
                            <img src="${thumbUrl}" class="share-thumb" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                        </div>
                        <div class="share-name">${meta.title || 'Untitled Prompt'}</div>
                        <div class="share-click-hint">Click para ver detalle</div>
                    </div>
                </div>
            `;

            // Listener de clic diferido para asegurar que el elemento exista en el DOM
            setTimeout(() => {
                const card = document.getElementById(`chat-share-${record.id}`);
                if (card && store.openDetail) {
                    card.addEventListener('click', () => store.openDetail(meta.promptId));
                }
            }, 0);
        } else {
            msgDiv.innerHTML = `
                <div class="chat-avatar" style="background-image: url('${avatar}')"></div>
                <div style="flex: 1; min-width: 0;">
                    <div class="chat-user-row">
                        <span class="chat-user">${username}</span>
                        ${badgesHtml}
                    </div>
                    <div class="chat-content">${escapeHTML(record.message || '')}</div>
                </div>
            `;
        }

        messagesEl.appendChild(msgDiv);
        scrollToBottom();
    }

    // --- API PARA COMPARTIR ---
    window.sharePromptInChat = async (promptId) => {
        if (!store.currentUser) {
            toast('Inicia sesión para compartir', 'warning');
            return;
        }

        const p = store.findPrompt(promptId);
        if (!p) return;

        try {
            // Feedback inicial
            toast('Compartiendo prompt...', 'info');

            await pb.collection('global_chat').create({
                user: store.currentUser.id,
                message: `Compartió: ${p.title}`,
                type: 'PROMPT_SHARE',
                metadata: {
                    promptId: p.id,
                    title: p.title,
                    // CORRECCIÓN: Usar p.image ya que contiene la URL procesada (Cloudinary o Raw) que funciona en el resto de la app
                    thumb: p.type === 'sequence' ? (p.content[0]?.image || p.image) : p.image
                }
            });

            toast('¡Prompt compartido con éxito! 🚀', 'success');
            if (!isOpen) toggleChat();
        } catch (err) {
            console.error('Error sharing:', err);
            toast('Error al compartir', 'error');
        }
    };

    function renderUserBadges(user) {
        if (!user) return '';
        let html = '';

        // 👑 CORONA DE ADMINISTRADOR POR ROL (Sin fondo circular)
        if (user.role === 'admin') {
            html += `<span class="chat-admin-crown" title="Administrador Fundador / C.E.O">👑</span>`;
        }

        if (user.unique_badges && user.unique_badges.length > 0) {
            html += user.unique_badges.map(badgeText => {
                const upper = badgeText.toUpperCase();

                // Evitar duplicar el icono de corona si el rol ya la puso
                if (user.role === 'admin' && (upper.includes('ADMIN') || upper.includes('C.E.O'))) return '';

                let badgeClass = 'chat-badge-blue';
                if (upper.includes('FUNDADOR') || upper.includes('C.E.O') || upper.includes('CREADOR')) {
                    badgeClass = 'chat-badge-gold';
                } else if (upper.includes('V.I.P') || upper.includes('VIP')) {
                    badgeClass = 'chat-badge-purple';
                } else if (upper.includes('MODERADOR') || upper.includes('STAFF')) {
                    badgeClass = 'chat-badge-red';
                }

                let icon = '🎖️';
                if (upper.includes('C.E.O') || upper.includes('ADMIN')) icon = '👑';
                if (upper.includes('FUNDADOR')) icon = '✨';
                if (upper.includes('CREADOR')) icon = '🎨';
                if (upper.includes('V.I.P')) icon = '💎';
                if (upper.includes('MODERADOR')) icon = '🛡️';
                if (upper.includes('VERIFICADO')) icon = '✅';

                return `<span class="chat-unique-badge ${badgeClass}" title="${badgeText}">${icon}</span>`;
            }).join('');
        }
        return html;
    }

    function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function escapeHTML(str) {
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }

    // 5. SSE Subscription
    pb.collection('global_chat').subscribe('*', (e) => {
        if (e.action === 'create') {
            appendMessage(e.record);

            if (!isOpen) {
                badge.style.display = 'block';
                badge.innerText = 'NUEVO';
            }
        }
    }, { expand: 'user' });

    // 6. Init
    initPresence();
    loadInitialMessages();
    console.log('🚀 Live Chat Initialized (Real-time Presence Active)');
};
