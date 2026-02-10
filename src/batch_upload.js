import { pb } from './pocketbase.js';
import { store, TOOLS, RATINGS } from './store-final.js';
import './style.css';

// Componente Header (simplificado o reusado si fuera posible, pero lo recreamos para consistencia inmediata)
const Header = () => `
<header class="header">
    <div class="header-container">
        <div class="logo-area" style="cursor:pointer" onclick="window.location.href='index.html'">
            <span class="logo-text">PROMPT GALLERY <small style="font-size:0.5em; opacity:0.6">BATCH</small></span>
        </div>
        <div class="user-area">
            <button class="btn btn-secondary" onclick="window.location.href='index.html'">Volver a Galería</button>
        </div>
    </div>
</header>
`;

class BatchUploadApp {
    constructor() {
        this.rows = [];
        this.isUploading = false;
        this.container = null;
        this.addRow(); // Iniciar con una fila
    }

    addRow() {
        if (this.rows.length >= 50) {
            alert("Límite máximo de 50 filas alcanzado.");
            return;
        }
        const id = Date.now() + Math.random();
        this.rows.push({
            id: String(id),
            title: '',
            tool: TOOLS[0],
            rating: RATINGS[0],
            prompt: '',
            negative_prompt: '',
            image: null,
            needs_reference: false,
            is_private: false,
            status: 'idle',
            error: '',
            extraConfig: [] // [{type, val}]
        });
        this.render();
    }

    removeRow(id) {
        if (this.rows.length <= 1) return;
        this.rows = this.rows.filter(r => String(r.id) !== String(id));
        this.render();
    }

    updateRow(id, field, value) {
        const row = this.rows.find(r => String(r.id) === String(id));
        if (row) {
            row[field] = value;
            this.render();
        }
    }

    addExtraConfig(id) {
        const row = this.rows.find(r => String(r.id) === String(id));
        if (row) {
            row.extraConfig.push({ type: 'CHECKPOINT', val: '' });
            this.render();
        }
    }

    removeExtraConfig(rowId, configIdx) {
        const row = this.rows.find(r => String(r.id) === String(rowId));
        if (row && row.extraConfig[configIdx]) {
            row.extraConfig.splice(configIdx, 1);
            this.render();
        }
    }

    updateExtraConfig(rowId, configIdx, field, value) {
        const row = this.rows.find(r => String(r.id) === String(rowId));
        if (row && row.extraConfig[configIdx]) {
            row.extraConfig[configIdx][field] = value;
            // No renderizamos en cada pulsación de tecla para evitar perder el foco, 
            // pero el estado queda actualizado.
        }
    }

    handleImage(id, file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const row = this.rows.find(r => String(r.id) === String(id));
            if (row) {
                row.image = e.target.result;
                this.render();
            }
        };
        reader.readAsDataURL(file);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    async handleDrop(e, id, field) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        const file = e.dataTransfer.files[0];
        if (!file) return;

        // Solo procesar si es un archivo de texto o tiene extensión .txt
        if (file.type === "text/plain" || file.name.endsWith(".txt")) {
            const text = await file.text();
            this.updateRow(id, field, text);
            if (window.toast) window.toast("✅ Texto cargado desde archivo", "success");
        } else {
            alert("Por favor, suelta un archivo .txt válido");
        }
    }

    async processBatch() {
        if (this.isUploading) return;
        if (!store.currentUser) {
            alert("Debes iniciar sesión para subir contenido.");
            return;
        }

        const confirmUpload = confirm(`¿Estás seguro de subir ${this.rows.length} posts? El proceso será lento para evitar errores.`);
        if (!confirmUpload) return;

        this.isUploading = true;
        this.render();

        for (let row of this.rows) {
            if (row.status === 'success') continue;

            row.status = 'loading';
            this.render();

            try {
                await new Promise(r => setTimeout(r, 1500));

                const result = await store.addPrompt({
                    title: row.title || 'Untitled Batch Post',
                    prompt: row.prompt,
                    negative_prompt: row.negative_prompt,
                    image: row.image,
                    type: 'single',
                    tool: row.tool,
                    rating: row.rating,
                    needsReference: row.needs_reference,
                    isPrivate: row.is_private,
                    extraConfig: row.extraConfig // Pasamos la configuración adicional
                });

                if (result.success) {
                    row.status = 'success';
                } else {
                    row.status = 'error';
                    row.error = result.msg;
                }
            } catch (err) {
                row.status = 'error';
                row.error = err.message;
            }
            this.render();
        }

        this.isUploading = false;
        alert("Proceso de Batch completado.");
        this.render();
    }

    render() {
        if (!this.container) {
            document.getElementById('app').innerHTML = `
                ${Header()}
                <main class="batch-main" style="padding: 20px; max-width: 1400px; margin: 0 auto;">
                    <section class="batch-header" style="margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center">
                        <div>
                            <h2 style="color:white; margin:0">Batch Upload Center 🚀</h2>
                            <p style="color:#aaa; margin:5px 0 0 0">Sube múltiples posts de forma segura y secuencial.</p>
                        </div>
                        <div class="batch-actions">
                            <button class="btn btn-primary" id="start-batch" ${this.isUploading ? 'disabled' : ''}>
                                ${this.isUploading ? 'PROCESANDO...' : 'INICIAR CARGA MASIVA'}
                            </button>
                        </div>
                    </section>

                    <div id="batch-table-container" style="background: var(--bg-card); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5)">
                        <table style="width: 100%; border-collapse: collapse; color: white;">
                            <thead style="background: rgba(255,255,255,0.1); text-align: left; font-size: 0.85em; text-transform: uppercase; letter-spacing: 1px;">
                                <tr>
                                    <th style="padding:15px; border-bottom: 1px solid rgba(255,255,255,0.1)">Imagen</th>
                                    <th style="padding:15px; border-bottom: 1px solid rgba(255,255,255,0.1)">Contenido (Título & Prompts)</th>
                                    <th style="padding:15px; border-bottom: 1px solid rgba(255,255,255,0.1); width: 320px">Configuración</th>
                                    <th style="padding:15px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: center;">Estado/Acción</th>
                                </tr>
                            </thead>
                            <tbody id="batch-rows"></tbody>
                        </table>
                    </div>

                    <div style="margin-top: 20px; display: flex; justify-content: center;">
                        <button class="btn btn-secondary" id="add-row-btn" style="width: 100%; max-width: 400px; border-style: dashed; opacity: 0.8">
                            + AÑADIR OTRA FILA
                        </button>
                    </div>
                </main>
            `;
            this.container = document.getElementById('batch-rows');
            document.getElementById('add-row-btn').onclick = () => this.addRow();
            document.getElementById('start-batch').onclick = () => this.processBatch();
        }

        const sdTools = ['SD 1.5', 'SD 2.0', 'SDXL', 'Fooocus', 'ComfyUI'];

        this.container.innerHTML = this.rows.map(row => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); background: ${row.status === 'success' ? 'rgba(74, 175, 80, 0.05)' : 'transparent'}; transition: background 0.3s">
                <!-- COL 1: MEDIA -->
                <td style="padding:12px; width: 140px; vertical-align: middle;">
                    <div class="row-image-preview" style="width:120px; min-height:80px; background:${row.image ? 'transparent' : '#0a0a0a'}; border-radius:10px; overflow:hidden; position:relative; display:flex; align-items:center; justify-content:center; border: 1px dashed #444; box-shadow: 0 4px 10px rgba(0,0,0,0.3)">
                        ${row.image ? `<img src="${row.image}" style="width:100%; height:auto; display:block; border-radius:8px">` : '<span style="font-size:0.7em; color:#666; text-align:center">CLICK PARA<br>SUBIR IMG</span>'}
                        <input type="file" accept="image/*" style="position:absolute; inset:0; opacity:0; cursor:pointer" onchange="window.app.handleImage('${row.id}', this.files[0])">
                    </div>
                </td>

                <!-- COL 2: CORE DATA (TITLE & PROMPTS) -->
                <td style="padding:12px; vertical-align: top;">
                    <input type="text" class="input-field" placeholder="Título del Post (Ej: Cyberpunk Samurai)" value="${row.title}" oninput="window.app.updateRow('${row.id}', 'title', this.value)" style="margin-bottom:10px; font-weight:600; font-size:1em; border-color: rgba(255,255,255,0.15)">
                    <textarea class="input-field" placeholder="Prompt principal... (Arrastra un .txt para cargar)" style="height:65px; font-size:0.9em; margin-bottom:10px; resize: none;" 
                        oninput="window.app.updateRow('${row.id}', 'prompt', this.value)"
                        ondragover="window.app.handleDragOver(event)"
                        ondragleave="window.app.handleDragLeave(event)"
                        ondrop="window.app.handleDrop(event, '${row.id}', 'prompt')">${row.prompt}</textarea>
                    <textarea class="input-field" placeholder="Negative Prompt... (Arrastra un .txt para cargar)" style="height:45px; font-size:0.85em; opacity: 0.8; resize: none;" 
                        oninput="window.app.updateRow('${row.id}', 'negative_prompt', this.value)"
                        ondragover="window.app.handleDragOver(event)"
                        ondragleave="window.app.handleDragLeave(event)"
                        ondrop="window.app.handleDrop(event, '${row.id}', 'negative_prompt')">${row.negative_prompt}</textarea>
                </td>

                <!-- COL 3: CONFIG & TOOLS -->
                <td style="padding:12px; width: 320px; vertical-align: top;">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div style="display:flex; flex-direction:column; gap:4px">
                            <label style="font-size:0.75rem; color:#888; text-transform:uppercase; font-weight:bold">Herramienta</label>
                            <select class="input-field" style="font-size:0.85em; height:35px" onchange="window.app.updateRow('${row.id}', 'tool', this.value)">
                                ${TOOLS.map(t => `<option value="${t}" ${row.tool === t ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px">
                            <label style="font-size:0.75rem; color:#888; text-transform:uppercase; font-weight:bold">Rating</label>
                            <select class="input-field" style="font-size:0.85em; height:35px" onchange="window.app.updateRow('${row.id}', 'rating', this.value)">
                                ${RATINGS.map(r => `<option value="${r}" ${row.rating === r ? 'selected' : ''}>${r}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- EXTRA CONFIG PANEL (Only for SD Tools) -->
                    ${sdTools.includes(row.tool) ? `
                        <div style="background: rgba(37, 99, 235, 0.05); padding: 10px; border-radius: 8px; border: 1px solid rgba(37, 99, 235, 0.2); margin-bottom: 12px">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
                                <span style="font-size:0.75rem; font-weight:bold; color:#60a5fa">🔗 CONFIG ADICIONAL</span>
                                <button class="btn-icon" onclick="window.app.addExtraConfig('${row.id}')" style="background:#2563eb; width:20px; height:20px; font-size:1.1rem; border-radius:4px; display:flex; align-items:center; justify-content:center">+</button>
                            </div>
                            <div id="extra-rows-${row.id}">
                                ${row.extraConfig.map((cfg, idx) => `
                                    <div style="display:flex; gap:5px; margin-bottom:5px; align-items:center">
                                        <select class="input-field" style="font-size:0.75rem; padding:4px; height:28px; flex:1" onchange="window.app.updateExtraConfig('${row.id}', ${idx}, 'type', this.value)">
                                            <option value="CHECKPOINT" ${cfg.type === 'CHECKPOINT' ? 'selected' : ''}>CHK</option>
                                            <option value="LORA" ${cfg.type === 'LORA' ? 'selected' : ''}>LORA</option>
                                            <option value="EMBEDDING" ${cfg.type === 'EMBEDDING' ? 'selected' : ''}>EMB</option>
                                        </select>
                                        <input type="text" class="input-field" placeholder="Nombre..." value="${cfg.val}" style="font-size:0.75rem; padding:4px; height:28px; flex:2" oninput="window.app.updateExtraConfig('${row.id}', ${idx}, 'val', this.value)">
                                        <button class="btn-icon" onclick="window.app.removeExtraConfig('${row.id}', ${idx})" style="background:#444; width:20px; height:20px; font-size:0.8rem">×</button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05)">
                        <div style="display:flex; gap:15px; margin-bottom: 10px;">
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.8em">
                                <input type="checkbox" style="width:16px; height:16px" ${row.needs_reference ? 'checked' : ''} onchange="window.app.updateRow('${row.id}', 'needs_reference', this.checked)"> Ref. Img
                            </label>
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.8em">
                                <input type="checkbox" style="width:16px; height:16px" ${row.is_private ? 'checked' : ''} onchange="window.app.updateRow('${row.id}', 'is_private', this.checked)"> Privado
                            </label>
                        </div>
                        <button class="btn btn-secondary" style="width:100%; padding:8px; font-size:0.85em; background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); color: #60a5fa" onclick="alert('Funcionalidad de AutoTag en desarrollo...')">
                            ✨ Generar Auto-Tags con IA
                        </button>
                    </div>
                </td>

                <!-- COL 4: STATUS & ACTIONS -->
                <td style="padding:12px; width: 110px; vertical-align: middle; text-align: center; border-left: 1px solid rgba(255,255,255,0.05)">
                    <div style="display:flex; flex-direction:column; align-items:center; gap:15px">
                        <div style="font-size:0.85em; font-weight:600">
                            ${this.getStatusIcon(row)}
                        </div>
                        <button class="btn-delete" title="Eliminar Fila" onclick="window.app.removeRow('${row.id}')" style="background: rgba(244, 67, 54, 0.1); color: #f44336; border: 1px solid rgba(244, 67, 54, 0.2); border-radius: 50%; width: 35px; height: 35px; display: flex; align-items:center; justify-content:center; cursor:pointer; transition: all 0.2s">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Actualizar el estado del botón principal
        const startBtn = document.getElementById('start-batch');
        if (startBtn) {
            startBtn.disabled = this.isUploading;
            startBtn.innerText = this.isUploading ? 'PROCESANDO...' : 'INICIAR CARGA MASIVA';
        }
    }

    getStatusIcon(row) {
        if (row.status === 'idle') return '<span style="color:#666">Pendiente</span>';
        if (row.status === 'loading') return '<div class="spinner-small" style="width:20px; height:20px; border:2px solid #333; border-top:2px solid gold; border-radius:50%; animation: spin 1s linear infinite; margin:0 auto"></div>';
        if (row.status === 'success') return '<span style="color:#4caf50" title="Subido OK">✅ OK</span>';
        if (row.status === 'error') return `<span style="color:#f44336" title="${row.error}">❌ Error</span>`;
        return '';
    }
}

// Inicialización global con control de acceso
async function init() {
    // Mostrar estado de carga inicial
    document.getElementById('app').innerHTML = `
        <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#0a0a0a; color:white; font-family:sans-serif">
            <div class="spinner-small" style="width:40px; height:40px; border:3px solid #333; border-top:3px solid #60a5fa; border-radius:50%; animation: spin 1s linear infinite; margin-bottom:20px"></div>
            <div style="font-weight:700; letter-spacing:1px; color:#888; text-transform:uppercase; font-size:0.8rem">Verificando Acceso Exclusivo...</div>
        </div>
    `;

    await store.init();

    // 1. Redirigir si no hay sesión
    if (!store.currentUser) {
        console.warn("[ACCESS] No user session found. Redirecting...");
        window.location.href = 'index.html';
        return;
    }

    // 2. Redirigir si no tiene permiso de batch (batch_access column)
    // Nota: El usuario debe crear esta columna en PocketBase manualmente
    if (store.currentUser.batch_access !== true) {
        console.warn("[ACCESS] User does not have batch_access permission. Redirecting...");
        alert("⚠️ Acceso Restringido: No tienes permisos para usar el Batch Upload.");
        window.location.href = 'index.html';
        return;
    }

    // Acceso concedido
    window.app = new BatchUploadApp();
    window.app.render();
}

init();

// Estilos dinámicos para el spinner si no están en style.css
const styleNode = document.createElement('style');
styleNode.innerHTML = `
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .btn-delete:hover { background: rgba(244, 67, 54, 0.2) !important; transform: scale(1.1); }
    .btn-delete:active { transform: scale(0.9); }
    tr:hover { background: rgba(255,255,255,0.02) !important; }

    /* Estilos de campos restaurados */
    #batch-table-container select, 
    #batch-table-container input[type="text"], 
    #batch-table-container textarea {
        background: rgba(0, 0, 0, 0.3) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: white !important;
        padding: 8px 12px !important;
        border-radius: 8px !important;
        width: 100% !important;
        transition: all 0.2s ease !important;
        font-family: inherit !important;
        box-sizing: border-box !important;
    }
    #batch-table-container input:focus, 
    #batch-table-container textarea:focus,
    #batch-table-container select:focus {
        border-color: #60a5fa !important;
        outline: none !important;
        background: rgba(0, 0, 0, 0.5) !important;
        box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2) !important;
    }
    #batch-table-container ::placeholder {
        color: #555 !important;
    }
    .input-field.drag-over {
        border-color: #60a5fa !important;
        background: rgba(96, 165, 250, 0.1) !important;
        box-shadow: 0 0 15px rgba(96, 165, 250, 0.3) !important;
        transform: scale(1.02);
    }
`;
document.head.appendChild(styleNode);
