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
window.openBoostSelector = async (type) => {
    if (!window.store.currentUser) return;

    // UI Feedback
    window.toast('Cargando tus creaciones...', 'info');

    // Get user prompts
    const prompts = await window.store.boostSystem.getUserPrompts(window.store.currentUser.id);

    if (prompts.length === 0) {
        return alert("¡Aún no tienes prompts públicos de imagen! El Marketplace por el momento solo soporta Boosts para tus creaciones de imágenes. Comparte una imagen primero para continuar.");
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(10px);';

    const boostName = { daily: 'TOP DIARIO', weekly: 'TOP SEMANAL', super: 'SUPERBOOST' }[type];
    const price = window.store.boostSystem.calculatePrice(type, window.store.currentUser.level);

    overlay.innerHTML = `
        <div style="background:#0f172a; border:1px solid #1e293b; border-radius:24px; width:100%; max-width:700px; padding:2.5rem; position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                <div>
                    <h3 style="margin:0; font-size:1.75rem; color:#fff;">Selecciona un Prompt</h3>
                    <p style="color:#64748b; margin-top:0.25rem;">Estás comprando: <strong>${boostName}</strong> (💎 ${price})</p>
                </div>
                <button onclick="this.closest('.modal-overlay').remove()" style="background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer;">✕</button>
            </div>

            <div class="prompt-selector-grid">
                ${prompts.map(p => `
                    <div class="prompt-sel-card" onclick="window.confirmBoostPurchase('${type}', '${p.id}', '${p.title.replace(/'/g, "\\'")}')">
                        <img src="${p.image}" alt="${p.title}">
                        <div class="prompt-sel-info">
                            <div class="prompt-sel-name">${p.title}</div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top:20px; text-align:center; color:#475569; font-size:0.9rem;">
                Haz clic en una imagen para confirmar la compra.
            </div>
        </div>
    `;

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
