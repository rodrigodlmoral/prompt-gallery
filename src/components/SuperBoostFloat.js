/**
 * SuperBoostFloat.js
 * 
 * Componente placeholder para la ventana flotante de SUPERBOOST.
 * Se muestra al entrar al dashboard si hay Super Boosts activos.
 */

export const initSuperBoostFloat = (store) => {
    // Verificar si hay Super Boosts activos
    const superBoostIds = store.activeBoosts?.super || [];
    if (superBoostIds.length === 0) return;

    // Resolve objects
    const superBoosts = superBoostIds.map(id => store.allPrompts?.find(p => p.id === id)).filter(Boolean);
    if (superBoosts.length === 0) return;

    // Crear el contenedor si no existe
    let floatContainer = document.getElementById('superboost-float-overlay');
    if (!floatContainer) {
        floatContainer = document.createElement('div');
        floatContainer.id = 'superboost-float-overlay';
        floatContainer.className = 'superboost-float-modal';
        document.body.appendChild(floatContainer);
    }

    floatContainer.innerHTML = superBoosts.map(promoted => `
        <div class="superboost-float-content">
            <button class="close-float" onclick="this.closest('.superboost-float-content').remove()">✕</button>
            <div class="float-tag">SUPERBOOST</div>
            <div class="float-body">
                <div class="float-image">
                    <img src="${promoted.image}" alt="${promoted.title?.substring(0, 20)}">
                </div>
                <div class="float-info">
                    <h4>${promoted.title}</h4>
                    <p>Elegido por un creador con SUPERBOOST</p>
                    <button class="btn-view-prompt" onclick="window.openDetail('${promoted.id}')">Ver Detalle</button>
                </div>
            </div>
        </div>
    `).join('') + `
        <style>
            #superboost-float-overlay {
                position: fixed;
                bottom: 30px;
                right: 30px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 15px;
                animation: floatUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
            .superboost-float-content {
                background: #0f172a;
                border: 2px solid #a855f7;
                border-radius: 20px;
                width: 350px;
                padding: 15px;
                position: relative;
                box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 20px rgba(168, 85, 247, 0.2);
            }
            .close-float {
                position: absolute;
                top: -10px;
                right: -10px;
                background: #a855f7;
                border: none;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            }
            .float-tag {
                position: absolute;
                top: 10px;
                left: 10px;
                background: #a855f7;
                color: white;
                font-size: 0.65rem;
                font-weight: 800;
                padding: 2px 8px;
                border-radius: 4px;
                letter-spacing: 1px;
            }
            .float-body {
                display: flex;
                gap: 15px;
                margin-top: 10px;
            }
            .float-image img {
                width: 100px;
                height: 100px;
                object-fit: cover;
                border-radius: 12px;
            }
            .float-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            .float-info h4 {
                margin: 0;
                font-size: 1rem;
                color: white;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 180px;
            }
            .float-info p {
                margin: 5px 0 10px 0;
                font-size: 0.75rem;
                color: #64748b;
            }
            .btn-view-prompt {
                background: #1e293b;
                border: 1px solid #334155;
                color: white;
                padding: 6px 12px;
                border-radius: 8px;
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            .btn-view-prompt:hover {
                background: #a855f7;
                border-color: #a855f7;
            }
            @keyframes floatUp {
                from { opacity: 0; transform: translateY(50px) scale(0.9); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
        </style>
    `;
};
