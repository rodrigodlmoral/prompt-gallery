export const MarketplaceTab = (store) => {
    const urlParams = new URLSearchParams(window.location.search);
    const uParam = (urlParams.get('u') || '').toLowerCase();
    const isMe = store.currentUser && (
        (store.currentUser.username || '').toLowerCase() === uParam ||
        (store.currentUser.name || '').toLowerCase() === uParam
    );

    if (!isMe) {
        return `
            <div class="marketplace-container" style="text-align:center; padding:100px 20px;">
                <div style="font-size:4rem; margin-bottom:20px;">🛍️</div>
                <h2 style="color:#fff;">Mercado de Influencia</h2>
                <p style="color:#666; max-width:500px; margin:0 auto 20px auto;">
                    Solo el propietario del perfil puede gestionar los Boosts. ¡Regresa a tu perfil para ver qué puedes comprar!
                </p>
            </div>
        `;
    }

    const level = store.currentUser?.level || 0;
    const tokens = store.currentUser?.tokens || 0;

    // Helper to check if user can buy
    const getBoostStatus = (type) => {
        if (!store.boostSystem) return { locked: true, reason: 'Iniciando sistema...' };
        const check = store.boostSystem.canPurchaseBoost(store.currentUser, type);
        return { locked: !check.canBuy, reason: check.reasons[0] || '' };
    };

    const dailyStatus = getBoostStatus('daily');
    const weeklyStatus = getBoostStatus('weekly');
    const superStatus = getBoostStatus('super');

    return `
        <div class="marketplace-container">
            <div style="margin-bottom:3rem; border-bottom:1px solid #222; padding-bottom:2rem;">
                <h2 style="font-size:2.5rem; font-weight:900; margin-bottom:0.5rem;">Marketplace de Prompts</h2>
                <p style="color:#64748b; font-size:1.1rem;">Usa tus 💎 PromptBits para destacar tus creaciones y llegar a más personas.</p>
            </div>

            <div class="boost-grid">
                <!-- Super Boost -->
                <div class="boost-card boost-super ${superStatus.locked ? 'locked' : ''}">
                    <div class="boost-header">
                        <span class="boost-icon">🚀</span>
                        <div>
                            <h4>SUPERBOOST</h4>
                            <span class="boost-badge-mini">24 Horas</span>
                        </div>
                    </div>
                    <p class="boost-description">Visibilidad Máxima. Tu prompt aparecerá en una ventana flotante especial cada vez que un usuario entre al dashboard.</p>
                    <div class="boost-price">
                        <span class="price">${store.boostSystem?.calculatePrice('super', level) || 350}</span>
                        <span class="currency">💎</span>
                    </div>
                    <button class="btn-boost" 
                            onclick="window.openBoostSelector('super')" 
                            ${superStatus.locked ? 'disabled' : ''}>
                        ${superStatus.locked ? superStatus.reason : 'Comprar Boost'}
                    </button>
                </div>

                <!-- Daily Boost -->
                <div class="boost-card boost-daily ${dailyStatus.locked ? 'locked' : ''}">
                    <div class="boost-header">
                        <span class="boost-icon">⚡</span>
                        <div>
                            <h4>TOP DIARIO</h4>
                            <span class="boost-badge-mini">24 Horas</span>
                        </div>
                    </div>
                    <p class="boost-description">Tu prompt aparecerá rotando en el carrusel principal durante todo un día. Ideal para visibilidad rápida.</p>
                    <div class="boost-price">
                        <span class="price">${store.boostSystem?.calculatePrice('daily', level) || 50}</span>
                        <span class="currency">💎</span>
                    </div>
                    <button class="btn-boost" 
                            onclick="window.openBoostSelector('daily')" 
                            ${dailyStatus.locked ? 'disabled' : ''}>
                        ${dailyStatus.locked ? dailyStatus.reason : 'Comprar Boost'}
                    </button>
                </div>

                <!-- Weekly Boost -->
                <div class="boost-card boost-weekly ${weeklyStatus.locked ? 'locked' : ''}">
                    <div class="boost-header">
                        <span class="boost-icon">🌟</span>
                        <div>
                            <h4>TOP SEMANAL</h4>
                            <span class="boost-badge-mini">7 Días</span>
                        </div>
                    </div>
                    <p class="boost-description">Destaca en la sección semanal durante 7 días. Consigue seguidores constantes y visibilidad premium.</p>
                    <div class="boost-price">
                        <span class="price">${store.boostSystem?.calculatePrice('weekly', level) || 200}</span>
                        <span class="currency">💎</span>
                    </div>
                    <button class="btn-boost" 
                            onclick="window.openBoostSelector('weekly')" 
                            ${weeklyStatus.locked ? 'disabled' : ''}>
                        ${weeklyStatus.locked ? weeklyStatus.reason : 'Comprar Boost'}
                    </button>
                </div>
            </div>

            <div id="active-boosts-section" class="active-boosts">
                <!-- Se llenará dinámicamente -->
                <div style="text-align:center; padding:40px; color:#444;">Buscando tus boosts activos...</div>
            </div>
        </div>
    `;
};

// Functions to handle Marketplace logic
// Functions to handle Marketplace logic
window.openBoostSelector = async (type) => {
    if (!window.store.currentUser) return;

    // UI Feedback
    window.toast('Cargando tus creaciones...', 'info');

    // Get user prompts
    const allPrompts = await window.store.boostSystem.getUserPrompts(window.store.currentUser.id);

    if (allPrompts.length === 0) {
        return alert("¡Aún no tienes prompts públicos! Comparte algo primero para poder usar el Marketplace.");
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(10px);';

    const boostName = { daily: 'TOP DIARIO', weekly: 'TOP SEMANAL', super: 'SUPERBOOST' }[type];
    const price = window.store.boostSystem.calculatePrice(type, window.store.currentUser.level);

    // Initial State for Selector
    let currentTab = 'images';
    let currentSort = 'newest';

    const renderSelectorContent = () => {
        // Filter and Sort local data
        let filtered = allPrompts.filter(p => currentTab === 'images' ? !p.isText : p.isText);

        filtered.sort((a, b) => {
            const timeA = new Date(a.created_at_custom || a.created).getTime();
            const timeB = new Date(b.created_at_custom || b.created).getTime();
            return currentSort === 'newest' ? timeB - timeA : timeA - timeB;
        });

        return filtered.map(p => `
            <div class="prompt-sel-card ${p.isText ? 'is-text-card' : ''}" onclick="window.confirmBoostPurchase('${type}', '${p.id}', '${p.title.replace(/'/g, "\\'")}')">
                ${p.isText ? `
                    <div class="prompt-sel-placeholder">
                        <span class="placeholder-icon">📝</span>
                    </div>
                ` : `
                    <img src="${p.displayImage}" alt="${p.title}" style="object-fit: cover;">
                `}
                <div class="prompt-sel-info">
                    <div class="prompt-sel-name" title="${p.title}">${p.title}</div>
                </div>
            </div>
        `).join('') || `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #475569;">No se encontraron ${currentTab === 'images' ? 'imágenes' : 'textos'} en esta vista.</div>`;
    };

    overlay.innerHTML = `
        <div style="background:#0f172a; border:1px solid #1e293b; border-radius:32px; width:100%; max-width:800px; padding:2.5rem; position:relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:2rem;">
                <div>
                    <h3 style="margin:0; font-size:1.75rem; color:#fff; font-weight:900;">Selecciona un Prompt</h3>
                    <p style="color:#64748b; margin-top:0.25rem;">Estás comprando: <strong style="color:#3b82f6;">${boostName}</strong> (💎 ${price})</p>
                </div>
                <button onclick="this.closest('.modal-overlay').remove()" style="background:rgba(255,255,255,0.05); border:none; color:#fff; width:40px; height:40px; border-radius:12px; font-size:1.2rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.2s;">✕</button>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; gap:15px; flex-wrap:wrap;">
                <div class="sel-tabs" style="display:flex; background:rgba(0,0,0,0.2); padding:4px; border-radius:12px; border:1px solid #1e293b;">
                    <button class="sel-tab-btn active" data-tab="images" style="padding:8px 16px; border:none; border-radius:8px; background:transparent; color:#64748b; font-weight:600; cursor:pointer; transition:0.2s;">IMÁGENES</button>
                    <button class="sel-tab-btn" data-tab="texts" style="padding:8px 16px; border:none; border-radius:8px; background:transparent; color:#64748b; font-weight:600; cursor:pointer; transition:0.2s;">TEXTOS</button>
                </div>

                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="color:#64748b; font-size:0.85rem;">Ordenar por:</span>
                    <select id="sel-sort" style="background:#1e293b; border:1px solid #334155; color:#fff; padding:6px 12px; border-radius:8px; cursor:pointer; outline:none;">
                        <option value="newest">Más Recientes</option>
                        <option value="oldest">Más Antiguos</option>
                    </select>
                </div>
            </div>

            <div id="sel-grid-container" class="prompt-selector-grid" style="max-height: 450px; overflow-y: auto; padding-right: 5px;">
                ${renderSelectorContent()}
            </div>

            <div style="margin-top:25px; text-align:center; color:#475569; font-size:0.85rem; padding-top:20px; border-top:1px solid #1e293b;">
                Selecciona la creación que deseas destacar en el Marketplace.
            </div>
        </div>
        <style>
            .sel-tab-btn.active { background: #3b82f6 !important; color: #fff !important; }
            .prompt-sel-card { transition: transform 0.2s, border-color 0.2s; border: 2px solid transparent; border-radius: 16px; overflow: hidden; background: #1e293b; cursor: pointer; }
            .prompt-sel-card:hover { transform: translateY(-4px); border-color: #3b82f6; }
            .prompt-sel-placeholder { width: 100%; aspect-ratio: 16/10; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); display: flex; align-items: center; justify-content: center; position: relative; }
            .placeholder-icon { font-size: 2.5rem; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
            .is-text-card .prompt-sel-name { font-weight: 700; color: #94a3b8; }
            .prompt-sel-info { padding: 12px; background: rgba(0,0,0,0.3); }
            .prompt-sel-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.9rem; color: #fff; }
            
            #sel-grid-container::-webkit-scrollbar { width: 6px; }
            #sel-grid-container::-webkit-scrollbar-track { background: transparent; }
            #sel-grid-container::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        </style>
    `;

    // Listeners for Interactive Elements
    const gridContainer = overlay.querySelector('#sel-grid-container');

    overlay.querySelectorAll('.sel-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.querySelectorAll('.sel-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            gridContainer.innerHTML = renderSelectorContent();
        });
    });

    overlay.querySelector('#sel-sort').addEventListener('change', (e) => {
        currentSort = e.target.value;
        gridContainer.innerHTML = renderSelectorContent();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
};

window.confirmBoostPurchase = async (type, promptId, title) => {
    const boostName = { daily: 'TOP DIARIO', weekly: 'TOP SEMANAL', super: 'SUPERBOOST' }[type];
    const price = window.store.boostSystem.calculatePrice(type, window.store.currentUser.level);

    if (await window.askConfirm(`¿Confirmas la compra de ${boostName} para "${title}" por 💎 ${price}?`, '🚀')) {
        try {
            document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
            window.toast('Procesando compra...', 'info');

            const res = await window.store.boostSystem.purchaseBoost(window.store.currentUser.id, promptId, type);

            if (res.success) {
                window.toast(`¡Boost activado! Vence el ${new Date(res.expiresAt).toLocaleString()}`, 'success');
                // Re-render
                if (window.render) window.render();
                // Update active section locally
                window.loadActiveBoosts();
                // Update global store feed state
                if (window.store.refreshActiveBoosts) {
                    await window.store.refreshActiveBoosts();
                }
            }
        } catch (error) {
            window.toast(error.message || 'Error en la compra', 'error');
        }
    }
};

window.loadActiveBoosts = async () => {
    const section = document.getElementById('active-boosts-section');
    if (!section || !window.store.currentUser || !window.store.boostSystem) return;

    try {
        const boosts = await window.store.boostSystem.getActiveBoosts(window.store.currentUser.id);

        if (boosts.length === 0) {
            section.innerHTML = `
                <h3>Boosts Activos</h3>
                <div style="background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.1); border-radius:20px; padding:40px; text-align:center; color:#475569;">
                    No tienes boosts activos actualmente. ¡Destaca un prompt para verlo aquí!
                </div>
            `;
            return;
        }

        section.innerHTML = `
            <h3>Boosts Activos (${boosts.length})</h3>
            ${boosts.map(b => `
                <div class="active-boost-item">
                    <div class="boost-info">
                        <img src="${b.expand?.prompt?.image || ''}" class="boost-thumb">
                        <div>
                            <div class="prompt-title-boost">${b.expand?.prompt?.title || 'Prompt'}</div>
                            <div class="boost-badge-mini" style="--boost-color-1: ${getBoostColor(b.type)}">
                                ${getBoostName(b.type)}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 2.5rem;">
                        <div class="boost-stats" style="gap: 1.5rem;">
                            <div class="stat-group">
                                <span class="stat-value">${b.views_count || 0}</span>
                                <span class="stat-label">Vistas</span>
                            </div>
                            <div class="stat-group">
                                <span class="stat-value">${b.clicks_count || 0}</span>
                                <span class="stat-label">Clicks</span>
                            </div>
                        </div>

                        <div class="expiry-box">
                            <div class="expiry-label">Vence en:</div>
                            <div class="expiry-time" id="timer-${b.id}">${formatTimeLeft(b.expires_at)}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;

        // Start countdowns
        boosts.forEach(b => {
            const timer = setInterval(() => {
                const el = document.getElementById(`timer-${b.id}`);
                if (!el) { clearInterval(timer); return; }
                const left = formatTimeLeft(b.expires_at);
                if (left === 'EXPIRADO') {
                    el.innerText = 'EXPIRADO';
                    el.style.color = '#ef4444';
                    clearInterval(timer);
                } else {
                    el.innerText = left;
                }
            }, 1000);
        });

    } catch (e) {
        console.error(e);
        section.innerHTML = '<div style="color:red">Error cargando boosts activos</div>';
    }
};

// Utils for the tab
function getBoostColor(type) {
    if (type === 'daily') return '#3b82f6';
    if (type === 'weekly') return '#f59e0b';
    return '#a855f7';
}

function getBoostName(type) {
    if (type === 'daily') return 'TOP DIARIO';
    if (type === 'weekly') return 'TOP SEMANAL';
    return 'SUPERBOOST';
}

function formatTimeLeft(expiry) {
    const diff = new Date(expiry) - new Date();
    if (diff <= 0) return 'EXPIRADO';

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    return `${h}h ${m}m ${s}s`;
}
