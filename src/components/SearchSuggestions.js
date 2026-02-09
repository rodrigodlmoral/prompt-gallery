export const SearchSuggestions = (results) => {
    const { users, prompts, tags } = results;

    // Si no hay resultados y hay búsqueda, mostrar "sin resultados"
    const hasAny = users.length > 0 || prompts.length > 0 || tags.length > 0 || (results.contentMatches && results.contentMatches.length > 0);

    if (!hasAny) {
        return `<div class="search-suggestions-panel empty">No se encontraron resultados</div>`;
    }

    return `
    <div class="search-suggestions-panel custom-premium-scroll">
        ${users.length > 0 ? `
            <div class="search-cat">
                <div class="cat-header">👤 Usuarios</div>
                <div class="cat-list">
                    ${users.map(u => `
                        <div class="search-item" onclick="window.openUserProfile('${u.username}')">
                            <div class="search-avatar" style="background-image:url('${u.avatar || 'https://robohash.org/' + u.username}')"></div>
                            <span>${u.username}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        ${prompts.length > 0 ? `
            <div class="search-cat">
                <div class="cat-header">📝 Prompts (Título)</div>
                <div class="cat-list">
                    ${prompts.map(p => `
                        <div class="search-item" onclick="window.openDetail('${p.id}')">
                            <img src="${p.image}" class="search-thumb">
                            <span class="text-truncate">${p.title}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        ${results.contentMatches && results.contentMatches.length > 0 ? `
            <div class="search-cat">
                <div class="cat-header">📜 Contenido del Prompt</div>
                <div class="cat-list">
                    ${results.contentMatches.map(p => `
                        <div class="search-item" onclick="window.openDetail('${p.id}')">
                            <img src="${p.image}" class="search-thumb">
                            <div style="display:flex; flex-direction:column; overflow:hidden">
                                <span class="text-truncate" style="font-weight:600; font-size:0.85rem">${p.title}</span>
                                <span class="text-truncate" style="font-size:0.75rem; color:#888; font-family:monospace italic">"...${p.matchSnippet}..."</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        ${tags.length > 0 ? `
            <div class="search-cat">
                <div class="cat-header">🏷️ Etiquetas</div>
                <div class="cat-list">
                    ${tags.map(t => `
                        <div class="search-item tag-item" onclick="window.handleTagSearch('${t}')">
                            <span># ${t}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    </div>

    <style>
        .search-suggestions-panel {
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            max-height: 450px;
            background: rgba(13, 13, 13, 0.9);
            backdrop-filter: blur(28px);
            -webkit-backdrop-filter: blur(28px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-top: none;
            border-bottom-left-radius: 16px;
            border-bottom-right-radius: 16px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.7);
            z-index: 10000;
            margin-top: 5px;
            overflow-y: auto;
            animation: slideInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .search-suggestions-panel.empty {
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 0.9rem;
        }

        .search-cat {
            padding: 12px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .search-cat:last-child {
            border-bottom: none;
        }

        .cat-header {
            padding: 4px 16px;
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 800;
            color: var(--accent);
            margin-bottom: 6px;
        }

        .search-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 16px;
            cursor: pointer;
            transition: all 0.2s;
            color: #ccc;
        }
        .search-item:hover {
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
        }

        .search-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-size: cover;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .search-thumb {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            object-fit: cover;
        }

        .text-truncate {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 0.9rem;
        }

        .tag-item {
            color: #888;
            font-weight: 500;
        }
        .tag-item span {
            font-family: monospace;
        }

        @keyframes slideInUp {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
    `;
};
