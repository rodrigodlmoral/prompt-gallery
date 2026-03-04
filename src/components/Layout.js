import { store, LEVEL_REQS } from '../store-final.js';
import { renderCollage } from './Collage.js';

export const TopBar = () => `<div class="top-bar"> <div class="container top-bar-inner"><div class="top-bar-links"><span onclick="window.openInfo('tos')">Términos</span><span onclick="window.openInfo('privacy')">Privacidad</span><span onclick="window.openInfo('safety')">Seguridad</span><span onclick="window.openInfo('faq')">Preguntas</span></div><button class="support-btn" onclick="window.openInfo('support')">💬 Soporte</button></div></div> `;

export const Header = ({ currentUser, filters, searchQuery }) => `
    <header style = "height:auto; display:flex; flex-direction:column">
    <div class="container" style="height:72px; border-bottom:1px solid #222">
        <div class="logo" onclick="window.goHome()" style="cursor:pointer; ${!currentUser ? 'position: absolute; left: 50%; transform: translateX(-50%); font-size: 1.76rem; z-index: 10;' : ''}">
            <span style="-webkit-text-fill-color: initial; text-shadow: 0 0 10px rgba(255,255,255,0.2);">💎</span>
            <span style="background: linear-gradient(135deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">PROMPT-GALLERY</span>
        </div>
        
        <!-- Desktop Search -->
        ${currentUser ? `
        <div class="search-bar search-desktop" style="position:relative">
            <!-- Trap for Chrome Autofill -->
            <input type="password" style="display:none" autocomplete="new-password">
            <input type="text" class="search-input" id="searchInput" autocomplete="chrome-off-v2" spellcheck="false" placeholder="Buscar en TODA la galería... 🌎" value="${searchQuery}" name="gall_find_v${Date.now()}">
            <div id="search-suggestions-mount"></div>
        </div>
        ` : ''}

        <!-- Mobile Search & Menu Toggle -->
        ${currentUser ? `
        <div style="display:flex; align-items:center; gap:10px">
            <div class="search-mobile-btn" onclick="document.querySelector('.search-mobile-overlay').classList.add('active'); document.getElementById('searchMobileInput').focus()">🔍</div>
            <button class="mobile-menu-btn" onclick="window.toggleMobileNav()">☰</button>
        </div>
        ` : ''}

        <nav>
            ${currentUser ? `
                <button class="btn" id="addBtn">Compartir Prompt</button>
                <div class="user-info" onclick="window.openUserProfile('${currentUser.username}')" style="cursor:pointer">
                    <div class="user-avatar-sm" style="background-image:url('${currentUser.avatar || 'https://robohash.org/' + currentUser.username}')"></div>
                    <span>${currentUser.username}</span>
                </div>
                <button class="btn-outline" onclick="window.doLogout()">Salir</button>
            ` : ''}
        </nav>
    </div>

    <!-- Secondary Tabs Row (Image / Text) - HIDDEN until Text Gallery is ready -->
    <!-- ${currentUser ? `
    <div class="container" style="display:flex; justify-content:flex-end; padding: 10px 0; padding-right: 15px;">
        <div style="background: rgba(0,0,0,0.4); border-radius: 20px; padding: 4px; display:flex; gap: 5px; border: 1px solid rgba(255,255,255,0.1);">
            <button style="background: rgba(255,255,255,0.1); color: white; border: none; padding: 6px 16px; border-radius: 16px; font-weight: 600; cursor: pointer; font-size: 13px;">🖼️ IMÁGENES</button>
            <button style="background: transparent; color: #888; border: none; padding: 6px 16px; border-radius: 16px; font-weight: 600; cursor: pointer; font-size: 13px; transition: 0.2s;" onclick="window.location.href='/text-prompts.html'" onmouseover="this.style.color='white'" onmouseout="this.style.color='#888'">📝 TEXTO</button>
        </div>
    </div>
    ` : ''} -->

    <!-- Mobile Navigation Overlay (Unified Menu) -->
    <div class="mobile-nav-overlay" id="mobileNavOverlay">
        ${currentUser ? `
        <div class="mobile-nav-item" onclick="window.openUserProfile('${currentUser.username}'); window.toggleMobileNav();">
            <i>👤</i> PERFIL
        </div>
        <div class="mobile-nav-item" onclick="window.openCreate(); window.toggleMobileNav();">
            <i>🚀</i> COMPARTIR PROMPT
        </div>
        <div class="mobile-nav-divider"></div>
        <div class="mobile-nav-item" onclick="window.openInfo('tos'); window.toggleMobileNav();">
            <i>📄</i> TÉRMINOS
        </div>
        <div class="mobile-nav-item" onclick="window.openInfo('privacy'); window.toggleMobileNav();">
            <i>🔒</i> PRIVACIDAD
        </div>
        <div class="mobile-nav-item" onclick="window.openInfo('safety'); window.toggleMobileNav();">
            <i>🛡️</i> SEGURIDAD
        </div>
        <div class="mobile-nav-item" onclick="window.openInfo('support'); window.toggleMobileNav();">
            <i>💬</i> SOPORTE
        </div>
        <div class="mobile-nav-divider"></div>
        <div class="mobile-nav-item" onclick="window.doLogout(); window.toggleMobileNav();" style="color:#ff6b6b">
            <i>🚪</i> SALIR O CERRAR SESIÓN
        </div>
        ` : ''}
    </div>

    <div class="search-mobile-overlay">
        <div class="container" style="display:flex; flex-direction:column; gap:10px; height:100%; padding-top:20px">
            <div style="display:flex; align-items:center; gap:10px; width:100%">
                <button class="btn-icon" onclick="document.querySelector('.search-mobile-overlay').classList.remove('active')" style="font-size:1.2rem; color:#fff">✕</button>
                <div class="search-bar" style="flex:1; max-width:none; position:relative">
                    <input type="password" style="display:none" autocomplete="new-password">
                    <input type="text" class="search-input" id="searchMobileInput" placeholder="Buscar..." value="${searchQuery}" autocomplete="chrome-off-v2" spellcheck="false" name="mgall_find_v${Date.now()}" oninput="window.handleSearchTypingMobile(this.value)" onkeydown="if(event.key === 'Enter'){ window.handleSearch(this.value); document.querySelector('.search-mobile-overlay').classList.remove('active'); }">
                </div>
            </div>
            <div id="search-mobile-suggestions-mount" style="flex:1; overflow-y:auto; margin-top:10px"></div>
        </div>
    </div>
</header> `;

export const FilterBar = ({ currentUser, filters }) => {
    if (!currentUser) return '';
    return `
    <div class="container filters-bar" style="padding:10px 20px; display:flex; gap:8px; overflow-x:auto; background:rgba(0,0,0,0.3); align-items:center; justify-content: flex-end; border-radius:12px; margin-top:10px">
        <select id="sourceFilter" onchange="window.setFilter('source', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem">
            <option value="community" ${filters.source === 'community' ? 'selected' : ''}>👥 Comunidad</option>
            <option value="following" ${filters.source === 'following' ? 'selected' : ''}>⭐ Siguiendo</option>
            <option value="user" ${filters.source === 'user' ? 'selected' : ''}>👤 Tus Prompts / Usuario</option>
        </select>
        <select onchange="window.setFilter('time', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem">
            <option value="all" ${filters.time === 'all' ? 'selected' : ''}>📅 Todo el tiempo</option>
            <option value="today" ${filters.time === 'today' ? 'selected' : ''}>Hoy</option>
            <option value="week" ${filters.time === 'week' ? 'selected' : ''}>Esta Semana</option>
            <option value="month" ${filters.time === 'month' ? 'selected' : ''}>Este Mes</option>
        </select>
        <select onchange="window.setFilter('sort', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem">
            <option value="newest" ${filters.sort === 'newest' ? 'selected' : ''}>🔥 Más Recientes</option>
            <option value="popular" ${filters.sort === 'popular' ? 'selected' : ''}>❤️ Más Populares</option>
            <option value="commented" ${filters.sort === 'commented' ? 'selected' : ''}>💬 Más Comentados</option>
            <option value="oldest" ${filters.sort === 'oldest' ? 'selected' : ''}>👴 Más Antiguos</option>
        </select>

        <button class="btn-outline" onclick="window.toggleAdvancedFilters()" style="padding: 6px 12px; font-size: 0.85rem; display: flex; align-items:center; gap:8px; white-space:nowrap; border-radius:8px">
            🔍 Filtros Avanzados ${(filters.tools.length + filters.ratings.length + filters.tags.length + (filters.refFilter !== 'all' ? 1 : 0)) > 0 ? `<span style="background:#0070ba; color:white; border-radius:10px; padding:0 6px; font-size:0.7rem">${filters.tools.length + filters.ratings.length + filters.tags.length + (filters.refFilter !== 'all' ? 1 : 0)}</span>` : ''}
        </button>
    </div>`;
};

export const ProfileHeader = ({ currentView, profileUser, currentUser, profileTab }) => {
    if (currentView !== 'profile' || !profileUser) return '';

    // PRIORIDAD: Si es mi propio perfil, usar currentUser (prop) para ver cambios de saldo al instante
    let user = (currentUser && currentUser.username === profileUser)
        ? currentUser
        : null; // Fix: store.users no existe

    // ULTIMATE FALLBACK: Skeleton User
    // If we have profileUser string (from URL/click) but no full user object, create a fake one
    if (!user && profileUser) {
        user = {
            username: profileUser,
            avatar: null, // RoboHash will handle this in the template
            followers: [],
            following: [],
            socials: {},
            isSkeleton: true
        };
    }

    if (!user) return `<div class="container" style = "padding:40px; text-align:center">
        <h2>Usuario no encontrado</h2>
        <p>El usuario @${profileUser} no existe o no ha cargado.</p>
        <button class="btn" onclick="window.location.reload()">Recargar</button>
    </div> `;

    const isMe = currentUser && currentUser.username.toLowerCase() === user.username.toLowerCase();


    const getLevelInfo = (lvl) => {
        return LEVEL_REQS[lvl] || LEVEL_REQS[0];
    };

    const lvlInfo = getLevelInfo(user.level || 0);

    return `
    <div class="profile-header">
        <div class="container" style="padding: 40px 0 0 0;">
            <div style="display:flex; gap:30px; align-items:center; margin-bottom:30px">
                <div class="user-avatar-lg" style="background-image:url('${user.avatar || 'https://robohash.org/' + user.username}')"></div>
                <div>
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px">
                        <h1 style="font-size:2.5rem; margin:0">${window.escapeHTML(user.username)}</h1>

                        <!-- Level Badge -->
                        <span class="level-badge tier-${user.level || 0}"
                            title="${isMe ? 'Haz clic para ver tu progreso' : 'Nivel ' + (user.level || 0)}"
                            style="${isMe ? 'cursor:pointer' : ''}"
                            ${isMe ? 'onclick="window.openLevelProgress()"' : ''}>
                            ${lvlInfo.icon} NIVEL ${user.level || 0} - ${lvlInfo.name}
                        </span>
                    </div>

                    <!-- Badges Container -->
                    <div class="badge-container">
                        <!-- Founder Badge (Hardcoded for specific users) -->
                        ${(user.username === 'rodrigodlmoral' || user.username === 'rodridomrock') ? `
                        <div class="founder-badge">
                            <span class="badge-text">👑 Administrador - Fundador</span>
                        </div>
                        ` : ''}

                        <!-- Dynamic Badges from DB -->
                        ${(user.badges || []).map(b => {
        if (b.type === 'creator_founder') {
            return `
                                <div class="creator-founder-badge">
                                    <span class="badge-text">✨ CREADOR FUNDADOR</span>
                                </div>`;
        }
        return '';
    }).join('')}
                    </div>

                    <div style="display:flex; gap:20px; color:#888; font-size:0.9rem; align-items:center">
                        <div class="token-display" title="PromptBits (Tu saldo actual)">💎 ${user.tokens || 0} PromptBits</div>
                        <span>|</span>
                        <span>${user.followers?.length || 0} Seguidores</span>
                        <span>${user.following?.length || 0} Siguiendo</span>
                    </div>

                    ${user.socials ? `
                    <div style="display:flex; gap:15px; margin-top:10px; align-items:center">
                        ${user.socials.ig ? `<a href="${user.socials.ig.startsWith('http') ? user.socials.ig : 'https://instagram.com/' + user.socials.ig.replace('@', '')}" target="_blank" title="Instagram" style="text-decoration:none; width:24px; height:24px">
                            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </a>` : ''}
                        
                        ${user.socials.fb ? `<a href="${user.socials.fb.startsWith('http') ? user.socials.fb : 'https://facebook.com/' + user.socials.fb}" target="_blank" title="Facebook" style="text-decoration:none; width:24px; height:24px">
                            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>` : ''}
                        
                        ${user.socials.x ? `<a href="${user.socials.x.startsWith('http') ? user.socials.x : 'https://x.com/' + user.socials.x.replace('@', '')}" target="_blank" title="X / Twitter" style="text-decoration:none; width:22px; height:22px">
                            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>` : ''}
                        
                        ${user.socials.tg ? `<a href="${user.socials.tg.startsWith('http') ? user.socials.tg : 'https://t.me/' + user.socials.tg.replace('t.me/', '')}" target="_blank" title="Telegram" style="text-decoration:none; width:24px; height:24px">
                            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                        </a>` : ''}
                        
                        ${user.socials.th ? `<a href="${user.socials.th.startsWith('http') ? user.socials.th : 'https://threads.net/' + user.socials.th.replace('@', '')}" target="_blank" title="Threads" style="text-decoration:none; width:30px; height:30px">
                            <svg viewBox="0 0 4001 4001" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M 1975.5 901 L 1979.5 902 L 1980.5 901 L 2066.5 901 L 2068.5 901 L 2071.5 902 L 2087.5 902 L 2088.5 903 L 2092.5 903 L 2106.5 903 L 2107.5 904 L 2142.5 906 L 2150.5 908 L 2160.5 908 L 2161.5 909 L 2190.5 912 L 2191.5 913 L 2220.5 917 L 2231.5 920 L 2236.5 920 L 2281.5 931 L 2285.5 931 L 2330.5 943 L 2387.5 961 L 2461.5 990 Q 2622.5 1061.5 2734 1182.5 Q 2816.6 1271.4 2876 1383.5 Q 2903.9 1435.6 2926 1493.5 L 2948 1558.5 L 2956 1587.5 L 2959 1605 L 2928.5 1611 L 2923.5 1611 L 2918.5 1613 L 2908.5 1614 L 2877.5 1621 L 2872.5 1621 L 2862.5 1624 L 2852.5 1625 L 2775 1641 L 2763 1596.5 L 2746 1549.5 Q 2722.5 1491 2692 1439.5 Q 2637.3 1346.2 2560.5 1275 Q 2515.4 1233.6 2461.5 1201 Q 2411.7 1171.3 2354.5 1149 L 2293.5 1128 L 2254.5 1117 L 2250.5 1117 L 2242.5 1114 L 2238.5 1114 L 2207.5 1106 L 2176.5 1101 L 2170.5 1099 L 2163.5 1099 L 2162.5 1098 L 2141.5 1096 L 2133.5 1094 L 2123.5 1094 L 2122.5 1093 L 2101.5 1092 L 2100.5 1091 L 2086.5 1091 L 2085.5 1090 L 2070.5 1090 L 2069.5 1089 L 2067.5 1090 L 2066.5 1089 L 1981.5 1089 L 1979.5 1090 L 1977.5 1090 L 1961.5 1090 L 1960.5 1091 L 1958.5 1091 L 1933.5 1092 L 1932.5 1093 L 1922.5 1093 L 1921.5 1094 L 1879.5 1098 L 1810.5 1110 L 1738.5 1128 L 1706.5 1138 L 1665.5 1153 Q 1608.1 1175.6 1558.5 1206 Q 1502.4 1242.4 1458 1290.5 Q 1404.7 1348.2 1364 1418.5 Q 1325.8 1484.3 1297 1559.5 L 1273 1630.5 L 1260 1679.5 L 1253 1713.5 L 1253 1718.5 L 1250 1729.5 L 1250 1735.5 L 1246 1754.5 L 1243 1781.5 L 1242 1782.5 L 1240 1805.5 L 1239 1806.5 L 1236 1842.5 L 1235 1843.5 L 1235 1853.5 L 1234 1854.5 L 1233 1876.5 L 1232 1877.5 L 1232 1889.5 L 1231 1890.5 L 1231 1892.5 L 1231 1905.5 L 1230 1906.5 L 1230 1908.5 L 1230 1921.5 L 1229 1922.5 L 1229 1926.5 L 1229 1943.5 L 1228 1944.5 L 1229 1947.5 L 1228 1949.5 L 1228 1985.5 L 1227 1986.5 L 1227 1988.5 L 1227 2041.5 L 1228 2042.5 L 1228 2044.5 L 1227 2049.5 L 1228 2051.5 L 1228 2053.5 L 1228 2079.5 L 1229 2080.5 L 1229 2101.5 L 1230 2104.5 L 1230 2106.5 L 1230 2119.5 L 1231 2120.5 L 1231 2122.5 L 1231 2134.5 L 1232 2136.5 L 1232 2138.5 L 1233 2159.5 L 1234 2160.5 L 1234 2170.5 L 1235 2171.5 L 1235 2173.5 L 1238 2208.5 L 1239 2209.5 L 1246 2264.5 L 1261 2340.5 L 1263 2344.5 L 1268 2368.5 L 1281 2413.5 L 1307 2484.5 Q 1364.5 2622.5 1464.5 2718 Q 1559 2808.5 1692.5 2860 L 1760.5 2882 L 1796.5 2891 L 1836.5 2899 L 1842.5 2899 L 1869.5 2904 L 1892.5 2906 L 1893.5 2907 L 1912.5 2908 L 1913.5 2909 L 1938.5 2910 L 1939.5 2911 L 1956.5 2911 L 1957.5 2912 L 1979.5 2912 L 1980.5 2913 L 1983.5 2912 L 1986.5 2913 L 1989.5 2912 L 1991.5 2913 L 2019.5 2913 L 2021.5 2912 L 2023.5 2912 L 2053.5 2912 L 2055.5 2911 L 2057.5 2911 L 2073.5 2911 L 2074.5 2910 L 2076.5 2910 L 2086.5 2910 L 2087.5 2909 L 2089.5 2909 L 2112.5 2908 L 2113.5 2907 L 2121.5 2907 L 2138.5 2904 L 2140.5 2904 L 2167.5 2901 L 2168.5 2900 L 2203.5 2895 L 2209.5 2893 L 2214.5 2893 L 2279.5 2878 L 2337.5 2860 L 2373.5 2845 Q 2473.5 2797.5 2546 2722.5 Q 2574.6 2693.1 2599 2659.5 Q 2624.8 2623.8 2644 2581.5 L 2657 2547.5 L 2666 2513.5 L 2666 2508.5 L 2672 2479.5 L 2674 2454.5 L 2675 2453.5 L 2675 2442.5 L 2676 2441.5 L 2675 2439.5 L 2676 2438.5 L 2676 2398.5 L 2675 2396.5 L 2675 2394.5 L 2674 2374.5 L 2667 2334.5 L 2656 2298.5 L 2647 2276.5 Q 2617.7 2213.8 2569.5 2170 Q 2535.9 2138.3 2494 2116 L 2486 2162.5 L 2472 2219.5 L 2458 2262.5 L 2436 2315.5 Q 2397.1 2398.6 2335.5 2459 Q 2275.4 2518.9 2187.5 2551 L 2145.5 2564 L 2103.5 2573 L 2075.5 2576 L 2074.5 2577 L 2065.5 2577 L 2064.5 2578 L 2052.5 2578 L 2051.5 2579 L 2011.5 2580 L 2010.5 2579 L 1986.5 2579 L 1985.5 2578 L 1962.5 2577 L 1961.5 2576 L 1946.5 2575 L 1916.5 2569 L 1911.5 2569 L 1868.5 2558 L 1820.5 2541 Q 1734.3 2505.2 1675 2442.5 Q 1631.7 2397.3 1607 2333.5 L 1595 2295.5 L 1588 2260.5 L 1587 2245.5 L 1586 2244.5 L 1586 2234.5 L 1585 2233.5 L 1585 2183.5 L 1586 2182.5 L 1586 2172.5 L 1588 2164.5 L 1588 2162.5 L 1591 2139.5 L 1598 2111.5 Q 1607.6 2079.1 1622 2051.5 Q 1649.6 2000.1 1690.5 1962 Q 1745.2 1910.7 1821.5 1881 L 1866.5 1866 L 1898.5 1858 L 1943.5 1850 L 1967.5 1848 L 1968.5 1847 L 1977.5 1847 L 1978.5 1846 L 1990.5 1846 L 1992.5 1845 L 1994.5 1845 L 2029.5 1844 L 2030.5 1843 L 2063.5 1843 L 2064.5 1842 L 2127.5 1842 L 2128.5 1843 L 2155.5 1843 L 2156.5 1844 L 2160.5 1844 L 2177.5 1844 L 2178.5 1845 L 2180.5 1844 L 2181.5 1845 L 2194.5 1845 L 2195.5 1846 L 2197.5 1846 L 2222.5 1847 L 2223.5 1848 L 2232.5 1848 L 2242.5 1850 L 2252.5 1850 L 2253.5 1851 L 2276.5 1853 L 2277.5 1854 L 2297.5 1856 L 2307 1858 L 2304 1836.5 L 2294 1797.5 L 2276 1749.5 Q 2251.4 1695.6 2209.5 1659 Q 2183.5 1636.5 2149.5 1622 L 2120.5 1612 L 2080.5 1604 L 2078.5 1604 L 2054.5 1603 L 2053.5 1602 L 2011.5 1602 L 2009.5 1602 L 2007.5 1603 L 1983.5 1604 L 1982.5 1605 L 1976.5 1605 L 1975.5 1606 L 1969.5 1606 L 1946.5 1610 L 1922.5 1616 L 1896.5 1625 Q 1840.3 1647.8 1803 1689.5 L 1777.5 1724 L 1643.5 1643 L 1617 1625.5 Q 1648.3 1575.8 1690.5 1537 Q 1742.1 1489.1 1810.5 1458 Q 1843.3 1443.3 1880.5 1433 L 1924.5 1423 L 1955.5 1419 L 1956.5 1418 L 1958.5 1418 L 1974.5 1417 L 1975.5 1416 L 1987.5 1416 L 1988.5 1415 L 2003.5 1415 L 2004.5 1414 L 2010.5 1414 L 2061.5 1414 L 2062.5 1415 L 2078.5 1415 L 2079.5 1416 L 2107.5 1418 L 2151.5 1426 L 2205.5 1442 Q 2303.9 1479.6 2368 1551.5 Q 2430.5 1620 2465 1716.5 L 2480 1764.5 L 2492 1818.5 L 2496 1849.5 L 2497 1850.5 L 2497 1857.5 L 2498 1858.5 L 2499 1875.5 L 2500 1876.5 L 2502 1911 Q 2638.8 1965 2730 2065.5 Q 2783.9 2124.1 2819 2201.5 Q 2834.3 2235.7 2845 2274.5 L 2853 2307.5 L 2858 2335.5 L 2858 2342.5 L 2860 2349.5 L 2860 2351.5 L 2861 2367.5 L 2862 2368.5 L 2862 2379.5 L 2863 2380.5 L 2863 2398.5 L 2864 2399.5 L 2864 2403.5 L 2863 2406.5 L 2864 2407.5 L 2864 2433.5 L 2864 2437.5 Q 2861.4 2445.4 2863 2457.5 L 2862 2458.5 L 2862 2460.5 L 2862 2472.5 L 2861 2473.5 L 2861 2482.5 L 2860 2483.5 L 2860 2491.5 L 2859 2492.5 L 2857 2513.5 L 2845 2573.5 L 2830 2622.5 L 2812 2666.5 Q 2785 2724.5 2749 2773.5 Q 2706.2 2832.2 2653.5 2881 Q 2552.2 2976.7 2411.5 3033 L 2358.5 3051 L 2311.5 3063 L 2307.5 3065 L 2268.5 3074 L 2183.5 3089 L 2175.5 3089 L 2168.5 3091 L 2143.5 3093 L 2142.5 3094 L 2132.5 3094 L 2123.5 3096 L 2100.5 3097 L 2099.5 3098 L 2097.5 3098 L 2086.5 3098 L 2085.5 3099 L 2083.5 3099 L 2068.5 3099 L 2067.5 3100 L 2065.5 3099 L 2064.5 3100 L 2043.5 3100 L 2039.5 3101 L 2035.5 3101 L 1968.5 3101 L 1967.5 3100 L 1943.5 3100 L 1942.5 3099 L 1928.5 3099 L 1927.5 3098 L 1925.5 3098 L 1900.5 3097 L 1899.5 3096 L 1889.5 3096 L 1880.5 3094 L 1878.5 3094 L 1846.5 3091 L 1845.5 3090 L 1807.5 3085 L 1796.5 3082 L 1785.5 3081 Q 1775 3077 1761.5 3076 L 1712.5 3064 L 1636.5 3040 L 1561.5 3009 Q 1413.8 2939.2 1308 2827.5 Q 1200.6 2714.9 1135 2560.5 L 1118 2517.5 L 1100 2464.5 L 1078 2383.5 L 1060 2292.5 L 1060 2286.5 L 1059 2285.5 L 1054 2245.5 L 1053 2244.5 L 1051 2221.5 L 1050 2220.5 L 1048 2193.5 L 1047 2192.5 L 1047 2190.5 L 1045 2159.5 L 1044 2158.5 L 1044 2146.5 L 1043 2145.5 L 1043 2131.5 L 1042 2130.5 L 1041 2092.5 L 1040 2091.5 L 1040 2062.5 L 1039 2061.5 L 1039 1967.5 L 1040 1966.5 L 1040 1942.5 L 1041 1941.5 L 1040 1939.5 L 1040 1937.5 L 1041 1935.5 L 1041 1918.5 L 1042 1917.5 L 1041 1914.5 L 1042 1913.5 L 1042 1899.5 L 1043 1898.5 L 1042 1896.5 L 1043 1895.5 L 1043 1881.5 L 1044 1880.5 L 1044 1869.5 L 1045 1868.5 L 1045 1866.5 L 1045 1854.5 L 1047 1844.5 L 1046 1842.5 L 1047 1841.5 L 1048 1821.5 L 1050 1812.5 L 1050 1810.5 L 1051 1793.5 L 1053 1785.5 L 1053 1777.5 L 1054 1776.5 L 1058 1740.5 L 1060 1733.5 L 1060 1726.5 L 1061 1725.5 L 1066 1690.5 L 1068 1684.5 L 1068 1679.5 L 1070 1674.5 L 1074 1649.5 L 1083 1615.5 L 1083 1611.5 L 1096 1565.5 L 1110 1522.5 L 1140 1445.5 Q 1175.9 1362.9 1222 1290.5 Q 1275.4 1206.4 1344.5 1138 Q 1395.2 1087.7 1456.5 1048 L 1495.5 1025 L 1530.5 1007 L 1601.5 976 L 1683.5 948 L 1770.5 926 L 1790.5 923 L 1801.5 920 L 1806.5 920 L 1812.5 918 L 1818.5 918 L 1824.5 916 L 1857.5 912 L 1858.5 911 L 1866.5 911 L 1867.5 910 L 1900.5 907 L 1901.5 906 L 1936.5 904 L 1937.5 903 L 1952.5 903 L 1954.5 902 L 1956.5 902 L 1974.5 902 L 1975.5 901 Z M 2059 2030 L 2058 2031 L 2037 2031 L 2033 2031 L 2031 2032 L 2019 2032 L 2018 2033 L 2005 2033 L 2003 2033 L 2002 2034 L 1969 2037 L 1940 2042 L 1915 2048 L 1893 2055 Q 1870 2063 1852 2074 Q 1833 2085 1818 2100 Q 1797 2120 1784 2149 L 1776 2173 L 1774 2190 L 1773 2191 L 1773 2204 L 1772 2205 L 1773 2227 L 1774 2228 L 1775 2240 L 1783 2268 Q 1793 2292 1809 2311 Q 1827 2331 1852 2346 L 1896 2368 L 1919 2376 L 1951 2384 L 1975 2387 L 1976 2388 L 1984 2388 L 1985 2389 L 2012 2390 L 2015 2391 L 2016 2390 L 2025 2390 L 2027 2390 L 2029 2391 L 2030 2390 L 2057 2389 L 2058 2388 L 2065 2388 L 2066 2387 L 2084 2385 L 2109 2379 L 2127 2373 Q 2169 2357 2200 2329 Q 2220 2310 2237 2287 Q 2260 2254 2276 2215 L 2290 2175 L 2300 2137 L 2309 2087 L 2312 2055 L 2312 2053 L 2313 2050 L 2279 2043 L 2243 2039 L 2242 2038 L 2235 2038 L 2234 2037 L 2226 2037 L 2225 2036 L 2205 2035 L 2204 2034 L 2191 2034 L 2190 2033 L 2176 2033 L 2175 2032 L 2130 2031 L 2126 2031 L 2121 2030 L 2071 2030 L 2069 2031 L 2067 2031 Q 2060 2033 2059 2030 Z" /></svg>
                        </a>` : ''}

                    </div>` : ''}

                    ${!isMe ? `<button class="btn" style="margin-top:15px" onclick="window.doFollow('${user.username}')">${currentUser?.following?.includes(user.id) ? 'Siguiendo' : 'Seguir'}</button>`
            : `<button class="btn-outline" style="margin-top:15px" onclick="window.openSettings()">⚙️ Configurar Perfil</button>`}
                </div>
            </div>
            ${user.isSkeleton ? '' : `
            <div style="display:flex; gap:20px; border-bottom:1px solid #333">
                <button class="profile-tab ${profileTab === 'creations' ? 'active' : ''}" onclick="window.setProfileTab('creations')">Creaciones</button>
                ${isMe ? `<button class="profile-tab ${profileTab === 'saved' ? 'active' : ''}" onclick="window.setProfileTab('saved')">Guardados</button>` : ''}
            </div>`}
        </div>
    </div> `;
};
