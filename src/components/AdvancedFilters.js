import { TOOLS, RATINGS } from '../store-final.js';
import { TAG_CATEGORIES } from '../data/tags.js';

export const AdvancedFilters = (filters, onApply, onClear) => {
    const isToolSelected = (t) => filters.tools.includes(t);
    const isRatingSelected = (r) => filters.ratings.includes(r);
    const isTagSelected = (tag) => filters.tags.includes(tag);

    return `
    <div class="adv-filter-panel" id="advFilterPanel">
        <div class="adv-filter-header">
            <h3>🔍 Filtros Avanzados</h3>
            <button class="modal-close-x" onclick="document.getElementById('advFilterPanel').classList.remove('active')" style="position:static; width:32px; height:32px; font-size:1.1rem">✕</button>
        </div>
        
        <div class="adv-filter-content custom-premium-scroll">
            <!-- TOOLS SECTION -->
            <div class="filter-section">
                <h4>🛠️ Herramientas</h4>
                <div class="chip-grid">
                    ${TOOLS.map(t => `
                        <div class="chip premium-chip ${isToolSelected(t) ? 'active' : ''}" onclick="window.toggleFilter('tools', '${t}')">${t}</div>
                    `).join('')}
                </div>
            </div>

            <!-- RATING SECTION -->
            <div class="filter-section">
                <h4>🔞 Clasificación</h4>
                <div class="chip-grid">
                    ${RATINGS.map(r => `
                        <div class="chip premium-chip ${isRatingSelected(r) ? 'active' : ''}" onclick="window.toggleFilter('ratings', '${r}')">${r.split(' / ')[0]}</div>
                    `).join('')}
                </div>
            </div>

            <!-- REFERENCE SECTION -->
            <div class="filter-section">
                <h4>📸 Referencia</h4>
                <div class="chip-grid">
                    <div class="chip premium-chip ${filters.refFilter === 'all' ? 'active' : ''}" onclick="window.setFilter('refFilter', 'all')">Todos</div>
                    <div class="chip premium-chip ${filters.refFilter === 'withRef' ? 'active' : ''}" onclick="window.setFilter('refFilter', 'withRef')">Con Referencia</div>
                    <div class="chip premium-chip ${filters.refFilter === 'noRef' ? 'active' : ''}" onclick="window.setFilter('refFilter', 'noRef')">Sin Referencia</div>
                </div>
            </div>

            <!-- CATEGORIES & TAGS -->
            <div class="filter-section">
                <h4>🏷️ Categorías y Etiquetas</h4>
                <div style="display:flex; flex-direction:column; gap:8px">
                    ${Object.entries(TAG_CATEGORIES).map(([cat, tags]) => `
                        <div class="premium-category-block">
                            <div class="category-trigger" onclick="this.parentElement.classList.toggle('expanded')">
                                <span>${cat}</span>
                                <span class="arrow">▾</span>
                            </div>
                            <div class="tag-grid-premium">
                                ${tags.map(tag => `
                                    <div class="chip premium-chip chip-sm ${isTagSelected(tag) ? 'active' : ''}" onclick="window.toggleFilter('tags', '${tag}')">${tag}</div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="adv-filter-footer">
            <button class="btn-outline" style="flex:1; border-radius:12px; font-size:0.85rem; padding:12px" onclick="window.clearAllFilters()">Limpiar todo</button>
            <button class="btn" style="flex:2; border-radius:12px; font-weight:700; padding:12px" onclick="document.getElementById('advFilterPanel').classList.remove('active')">Cerrar</button>
        </div>
    </div>
    <style>
        .adv-filter-panel {
            position: fixed;
            top: 0;
            right: -420px;
            width: 400px;
            height: 100vh;
            background: rgba(13, 13, 13, 0.85);
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            border-left: 1px solid rgba(255, 255, 255, 0.08);
            z-index: 10001; /* Above modal overlay */
            display: flex;
            flex-direction: column;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: -20px 0 50px rgba(0,0,0,0.6);
        }
        .adv-filter-panel.active {
            right: 0;
        }
        .adv-filter-header {
            padding: 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .adv-filter-header h3 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 800;
            letter-spacing: -0.5px;
            background: linear-gradient(135deg, #fff 0%, #aaa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .adv-filter-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
        }
        .filter-section {
            margin-bottom: 30px;
        }
        .filter-section h4 {
            margin-bottom: 14px;
            color: #666;
            font-size: 0.75rem;
            text-transform: uppercase;
            font-weight: 800;
            letter-spacing: 1.5px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .chip-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .premium-chip {
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            font-size: 0.85rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            color: #999;
            user-select: none;
        }
        .premium-chip:hover {
            background: rgba(255, 255, 255, 0.07);
            border-color: rgba(255, 255, 255, 0.2);
            color: #fff;
            transform: translateY(-1px);
        }
        .premium-chip.active {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            border-color: #3b82f6;
            color: white;
            font-weight: 700;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .chip-sm {
            padding: 5px 12px;
            font-size: 0.75rem;
            border-radius: 8px;
        }
        
        /* Premium Category Blocks */
        .premium-category-block {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
        }
        .premium-category-block:hover {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.1);
        }
        .category-trigger {
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85rem;
            font-weight: 600;
            color: #ccc;
        }
        .category-trigger .arrow {
            transition: transform 0.3s ease;
            opacity: 0.5;
        }
        .premium-category-block.expanded .arrow {
            transform: rotate(180deg);
        }
        .tag-grid-premium {
            padding: 0 16px 16px 16px;
            display: none;
            flex-wrap: wrap;
            gap: 6px;
        }
        .premium-category-block.expanded .tag-grid-premium {
            display: flex;
            animation: slideDown 0.3s ease-out;
        }
        
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .adv-filter-footer {
            padding: 24px;
            background: rgba(0, 0, 0, 0.2);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            gap: 12px;
        }
        
        /* Custom Premium Scrollbar */
        .custom-premium-scroll::-webkit-scrollbar {
            width: 6px;
        }
        .custom-premium-scroll::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-premium-scroll::-webkit-scrollbar-thumb {
            background: #444;
            border-radius: 10px;
            border: 2px solid transparent;
            background-clip: content-box;
            transition: all 0.2s;
        }
        .custom-premium-scroll::-webkit-scrollbar-thumb:hover {
            background: var(--accent);
            background-clip: content-box;
        }

        @media (max-width: 450px) {
            .adv-filter-panel {
                width: 100%;
                right: -100%;
                border-left: none;
            }
        }
    </style>
    `;
};
