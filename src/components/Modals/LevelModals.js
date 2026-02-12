import { store, LEVEL_REQS } from '../../store-final.js';
import { toast } from '../../utils/ui-helpers.js';

export const setupLevelModals = () => {
    // --- LEVEL UP MODAL ---
    window.showLevelUpModal = (newLevel) => {
        const lvlInfo = LEVEL_REQS[newLevel] || LEVEL_REQS[0];

        // Simple Emojis for "Confetti" background
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
                        0 % { transform: translateY(-10vh) rotate(0deg); }
                100% {transform: translateY(110vh) rotate(360deg); }
            }
                </style>
                ${bgHtml}
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:90%; max-width:500px; background:rgba(0,0,0,0.9); border:2px solid gold; border-radius:20px; padding:40px; box-shadow:0 0 50px rgba(255,215,0,0.3); z-index:20;">
                    <div class="level-up-content">
                        <div class="level-badge-large">${lvlInfo.icon}</div>
                        <div class="level-new-title">¡NIVEL DESBLOQUEADO!</div>
                        <h2 style="font-size:1.5rem; color:white; margin-bottom:10px">Has alcanzado el Nivel ${newLevel}</h2>
                        <h3 style="color:#aaa; text-transform:uppercase; letter-spacing:2px; margin-bottom:20px">${lvlInfo.name}</h3>

                        <div class="level-benefits-list">
                            <div style="font-weight:bold; margin-bottom:10px; color:white">Nuevos Beneficios:</div>
                            <ul style="padding-left:20px; margin:0">
                                ${lvlInfo.benefits.map(b => `<li>${b}</li>`).join('')}
                            </ul>
                        </div>

                        <button class="btn" onclick="this.closest('#levelUpModalCanvas').remove()" style="width:100%; font-size:1.2rem; font-weight:bold; background:gold; color:black; border:none; padding:15px; border-radius:10px; cursor:pointer; margin-top:10px; box-shadow:0 5px 15px rgba(255,215,0,0.4)">
                            ¡GENIAL!
                        </button>
                    </div>
                </div>
            </div>`;

        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
    };

    window.openLevelProgress = () => {
        console.log("🚀 openLevelProgress triggered (Dynamic Mode)");
        if (!store.currentUser) { toast("Error: No has iniciado sesión.", "error"); return; }

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
                progressCopies = 100;
            }
        } else {
            progressPosts = 100;
            progressCopies = 100;
        }

        const needsCopies = nextLvlReq.copies > 0;

        const html = `
            <div style="text-align:center; margin-bottom:25px; padding-bottom:15px; border-bottom:1px solid #222">
                <div style="font-size:3.5rem; margin-bottom:10px">${LEVEL_REQS[currentLvl].icon}</div>
                <h2 style="margin:0; font-size:1.8rem; color:#fff">Tu Historial: Nivel ${currentLvl}</h2>
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
                #levelModalDynamic .modal-container::-webkit-scrollbar {width: 6px; }
                #levelModalDynamic .modal-container::-webkit-scrollbar-track {background: transparent; }
                #levelModalDynamic .modal-container::-webkit-scrollbar-thumb {background: #333; border-radius: 10px; }
                #levelModalDynamic .modal-container::-webkit-scrollbar-thumb:hover {background: #444; }
            </style>
            <div class="modal-container" style="max-width:550px; background:#111; border:1px solid #333; border-radius:28px; width:100%; padding:35px; max-height:85vh; overflow-y:auto; box-shadow: 0 30px 60px rgba(0,0,0,0.8); position:relative; scroll-behavior: smooth;">
                ${html}
            </div>
            `;

        document.body.appendChild(modalDiv);
        console.log("✅ Dynamic Modal Injected and Stylized");
    };
};
