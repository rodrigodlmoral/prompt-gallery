import { store, LEVEL_REQS } from '../../store-final.js';
import { toast } from '../../utils/ui-helpers.js';
import { pb } from '../../pocketbase.js';
import { LevelSystem } from '../../lib/LevelSystem.js';

export const setupLevelModals = () => {
    const levelSystem = new LevelSystem(pb);

    // --- LEVEL UP MODAL (Success Celebration) ---
    window.showLevelUpModal = (newLevel) => {
        // ... existing showLevelUpModal content (lines 7-52)
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
            <div id="levelUpModalCanvas" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:2147483647; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                <style>
                    @keyframes fall {
                        0% { transform: translateY(-10vh) rotate(0deg); }
                        100% { transform: translateY(110vh) rotate(360deg); }
                    }
                    .level-up-card {
                        position:relative; width:90%; max-width:500px; background:rgba(0,0,0,0.95); 
                        border:2px solid gold; border-radius:24px; padding:40px; 
                        box-shadow:0 0 80px rgba(255,215,0,0.4); text-align:center; 
                        animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    }
                    @keyframes popIn {
                        from { transform: scale(0.8); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                </style>
                ${bgHtml}
                <div class="level-up-card" onclick="event.stopPropagation()">
                    
                    <!-- Botón X de Cierre -->
                    <button onclick="document.getElementById('levelUpModalCanvas').remove()" style="position:absolute; top:20px; right:20px; background:transparent; border:none; color:rgba(255,255,255,0.5); font-size:2rem; cursor:pointer; line-height:1; padding:10px; transition:color 0.2s" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.5)'">×</button>

                    <div class="level-up-content">
                        <div style="font-size:5rem; margin-bottom:20px; filter: drop-shadow(0 0 10px gold)">${lvlInfo.icon}</div>
                        <div style="color:gold; font-weight:900; letter-spacing:4px; font-size:0.8rem; margin-bottom:10px">¡NIVEL DESBLOQUEADO!</div>
                        <h2 style="font-size:2.2rem; color:white; margin-bottom:10px; font-weight:800">Has alcanzado el Nivel ${newLevel}</h2>
                        <h3 style="color:#fff; text-transform:uppercase; letter-spacing:2px; margin-bottom:25px; opacity:0.7">${lvlInfo.name}</h3>

                        <div style="background:rgba(255,255,255,0.05); padding:20px; border-radius:16px; margin-bottom:30px; text-align:left; border:1px solid rgba(255,255,255,0.1)">
                            <div style="font-weight:bold; margin-bottom:15px; color:gold; font-size:0.9rem; text-transform:uppercase">Nuevos Beneficios:</div>
                            <ul style="padding-left:20px; margin:0; color:#ccc; line-height:1.6; font-size:0.95rem">
                                ${lvlInfo.benefits.map(b => `<li style="margin-bottom:8px">${b}</li>`).join('')}
                            </ul>
                        </div>

                        <button class="btn" onclick="document.getElementById('levelUpModalCanvas').remove()" style="width:100%; font-size:1.2rem; font-weight:900; background:linear-gradient(135deg, #ffd700, #ffae00); color:black; border:none; padding:18px; border-radius:14px; cursor:pointer; box-shadow:0 10px 25px rgba(255,215,0,0.4); transition:transform 0.2s" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            ¡GENIAL! ✨
                        </button>
                    </div>
                </div>
            </div>`;

        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
    };

    window.openLevelProgress = async () => {
        console.log("🚀 openLevelProgress triggered (Enhanced Mode)");
        if (!store.currentUser) { toast("Error: No has iniciado sesión.", "error"); return; }

        // Get detailed info (wait for it to ensure fresh data)
        const lvlData = await levelSystem.getUserLevelInfo(store.currentUser.id);
        const { current, stats, next } = lvlData;

        const isEligible = next && stats.totalPosts >= next.requirements.posts && stats.totalCopies >= next.requirements.copies;
        const isMax = !next;

        // Bloquear scroll
        document.body.style.overflow = 'hidden';

        const oldModal = document.getElementById('levelModalDynamic');
        if (oldModal) oldModal.remove();

        const html = `
            <div style="text-align:center; margin-bottom:25px; padding-bottom:15px; border-bottom:1px solid #222">
                <div style="font-size:3.5rem; margin-bottom:10px">${current.icon}</div>
                <h2 style="margin:0; font-size:1.8rem; color:#fff">Tu Historial: Nivel ${current.level}</h2>
                <p style="color:#aaa; margin-top:5px; font-weight:600; text-transform:uppercase; letter-spacing:1px">${current.name}</p>
            </div>

            <div style="background:#000; padding:25px; border-radius:16px; border:1px solid #333; margin-bottom:25px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5)">
                ${!isMax ? `
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:1rem; font-weight:700">
                    <span style="color:#888">Progreso de Posts</span>
                    <span style="color:#2563eb">${stats.totalPosts} / ${next.requirements.posts}</span>
                </div>
                <div style="width:100%; height:12px; background:#222; border-radius:6px; overflow:hidden; border:1px solid #333; margin-bottom:15px">
                    <div style="width:${Math.min(100, (stats.totalPosts / next.requirements.posts) * 100)}%; height:100%; background:linear-gradient(90deg, #2563eb, #a29bfe); transition:width 1s ease"></div>
                </div>

                ${next.requirements.copies > 0 ? `
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:1rem; font-weight:700">
                    <span style="color:#888">Progreso de Copias</span>
                    <span style="color:#f1c40f">${stats.totalCopies} / ${next.requirements.copies}</span>
                </div>
                <div style="width:100%; height:12px; background:#222; border-radius:6px; overflow:hidden; border:1px solid #333">
                    <div style="width:${Math.min(100, (stats.totalCopies / next.requirements.copies) * 100)}%; height:100%; background:linear-gradient(90deg, #f1c40f, #e67e22); transition:width 1s ease"></div>
                </div>
                ` : ''}

                <p style="font-size:0.85rem; color:#888; margin-top:15px; text-align:center">
                    ${stats.totalPosts < next.requirements.posts ? `Te faltan <strong>${next.requirements.posts - stats.totalPosts}</strong> posts. ` : ''}
                    ${next.requirements.copies > 0 && stats.totalCopies < next.requirements.copies ? `Te faltan <strong>${next.requirements.copies - stats.totalCopies}</strong> copias recibidas.` : ''}
                </p>
                ` : `
                <div style="text-align:center; padding:20px">
                    <span style="font-size:2rem">🏆</span>
                    <h3 style="color:gold; margin-top:10px">¡HAS LLEGADO A LA CIMA!</h3>
                    <p style="color:#888; font-size:0.9rem">Eres un Maestro Prompter. No hay más niveles por ahora.</p>
                </div>
                `}
            </div>

            ${isEligible ? `
            <div style="background:linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.05)); padding:25px; border-radius:20px; border:2px solid gold; margin-bottom:25px; text-align:center; animation: glow 2s infinite">
                <h3 style="color:#fff; margin-bottom:15px; font-size:1.3rem">¡NUEVO RANGO DISPONIBLE!</h3>
                <p style="color:#ccc; font-size:0.9rem; margin-bottom:20px">Cumples todos los requisitos para convertirte en <strong>${next.name}</strong>.</p>
                <button class="btn" style="width:100%; height:54px; font-weight:900; background:gold; color:black; border:none; border-radius:14px; cursor:pointer; box-shadow:0 10px 20px rgba(255,215,0,0.3)" onclick="window.doLevelUp()">
                    ✨ RECLAMAR NIVEL ${next.level} & BONO ✨
                </button>
            </div>
            ` : ''}

            <h3 style="font-size:1.2rem; margin-bottom:18px; color:#fff; display:flex; align-items:center; gap:10px">
                <span>Beneficios y Jerarquía</span>
                <div style="flex:1; height:1px; background:#222"></div>
            </h3>

            <div style="display:flex; flex-direction:column; gap:12px">
                ${LEVEL_REQS.map((l, idx) => {
            const isUnlocked = stats.totalPosts >= l.posts && stats.totalCopies >= (l.copies || 0);
            const isCurrent = current.level === idx;
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

            <button class="btn" style="width:100%; margin-top:30px; height:54px; font-weight:800; font-size:1.1rem; background:#333; color:white; border:none; border-radius:14px; cursor:pointer" onclick="window.closeLevelProgress(this)">Volver</button>
            `;

        window.doLevelUp = async () => {
            const btn = event.target;
            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = "PROCESANDO...";

            try {
                const result = await levelSystem.executeLevelUp(store.currentUser.id);
                if (result.success) {
                    // Close current modal
                    const modal = document.getElementById('levelModalDynamic');
                    if (modal) modal.remove();
                    document.body.style.overflow = '';

                    // Reload local store to sync balance and level info
                    if (store._loadUserProfile) await store._loadUserProfile(store.currentUser.id);

                    // Show celebration
                    window.showLevelUpModal(result.newLevel);
                    toast(`🎉 ${result.msg} (+${result.bonus} 💎)`, "success");

                    // Trigger global render to update profile badge
                    if (window.render) window.render();
                } else {
                    toast(result.msg, "error");
                    btn.disabled = false;
                    btn.innerText = originalText;
                }
            } catch (err) {
                console.error("Critical level up error:", err);
                toast("Error al procesar el nivel superior.", "error");
                btn.disabled = false;
                btn.innerText = originalText;
            }
        };

        window.closeLevelProgress = (btn) => {
            btn.closest('.modal-overlay').remove();
            document.body.style.overflow = '';
        };

        const modalDiv = document.createElement('div');
        modalDiv.id = 'levelModalDynamic';
        modalDiv.className = 'modal-overlay';
        modalDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(12px); display:flex; align-items:center; justify-content:center; z-index:2147483647; padding:20px; color:white; font-family:Inter, sans-serif;';

        // Prevent background click from closing if eligible for animation focus
        modalDiv.onclick = (e) => {
            if (e.target === modalDiv) {
                modalDiv.remove();
                document.body.style.overflow = '';
            }
        };

        modalDiv.innerHTML = `
            <style>
                @keyframes glow { 0% { box-shadow: 0 0 10px gold; } 50% { box-shadow: 0 0 30px gold; } 100% { box-shadow: 0 0 10px gold; } }
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
    };
};
