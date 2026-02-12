
// --- UI HELPERS ---

export const toast = (msg, type = 'info') => {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerText = msg;
    // Estilos inline básicos para asegurar funcionamiento si falta CSS
    el.style.position = 'fixed';
    el.style.bottom = '20px';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%) translateY(100px)';
    el.style.background = type === 'error' ? '#ff4444' : (type === 'warning' ? '#ffbb33' : '#00C851');
    el.style.color = '#fff';
    el.style.padding = '12px 24px';
    el.style.borderRadius = '30px';
    el.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
    el.style.zIndex = '100000';
    el.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    el.style.fontWeight = '600';
    el.style.fontSize = '0.95rem';
    el.style.textAlign = 'center';
    el.style.minWidth = '200px';

    document.body.appendChild(el);

    // Animación de entrada
    requestAnimationFrame(() => {
        el.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Auto-remove
    setTimeout(() => {
        el.style.transform = 'translateX(-50%) translateY(100px)';
        setTimeout(() => el.remove(), 300);
    }, 3000);
};

export const showTokenCelebration = (amount) => {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.inset = '0';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '999999';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.overflow = 'hidden';

    el.innerHTML = `
        <div style="font-size: 4rem; animation: popUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; text-align:center;">
            💎 +${amount}
            <div style="font-size:1.5rem; color:#fff; text-shadow:0 2px 4px rgba(0,0,0,0.5)">PromptBits Ganados</div>
        </div>
        <style>
            @keyframes popUp {
                0% { transform: scale(0); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
        </style>
    `;

    document.body.appendChild(el);
    setTimeout(() => {
        el.style.transition = 'opacity 0.5s';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 500);
    }, 2000);
};

// Promesa global para confirmación
let resolveConfirm = null;

export const askConfirm = (msg) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const txt = document.getElementById('confirmText');
        if (!modal || !txt) {
            // Fallback si no existe el modal
            return resolve(confirm(msg));
        }

        txt.innerText = msg;
        modal.style.display = 'flex';

        // Guardamos la función resolve para llamarla desde los botones
        resolveConfirm = resolve;
    });
};

// Esta función debe asignarse a window.confirmResolve en el main
// o ser importada y usada por los botones
export const handleConfirmResolve = (val) => {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.style.display = 'none';
    if (resolveConfirm) {
        resolveConfirm(val);
        resolveConfirm = null;
    }
};
