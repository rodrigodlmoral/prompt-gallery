import { pb } from './pocketbase.js';
import { uploadToCloudinary, uploadToCloudinaryHD } from './uploadService.js';
import { LevelSystem } from './lib/LevelSystem.js';
import { checkCopyMilestone, getNextMilestone } from './lib/CopyBonusSystem.js';
import { LedgerService } from './lib/LedgerService.js';

// --- GOOGLE ANALYTICS HELPER ---
window.trackEvent = (name, params = {}) => {
    if (typeof window.gtag === 'function') {
        window.gtag('event', name, params);
        console.log(`[GA4] Event tracked: ${name}`, params);
    }
};

window.normalizeProfile = (p) => {
    if (!p) return p;
    const username = p.name || p.username || 'Usuario';

    let avatarUrl = p.avatar_url;
    if (!avatarUrl && p.avatar) {
        // PocketBase standard file URL
        avatarUrl = pb.files.getURL(p, p.avatar);
    }

    if (!avatarUrl) {
        avatarUrl = `https://robohash.org/${encodeURIComponent(username)}?set=set4`;
    }

    return {
        ...p,
        username,
        avatar: avatarUrl,
        avatar_url: avatarUrl
    };
};

export const LEVEL_REQS = [
    {
        posts: 0,
        copies: 0,
        name: 'Explorador',
        benefits: [
            'Welcome Bonus: +50 💎 al registro +50 💎 primer prompt',
            'Acceso completo a galería y filtros',
            'Publicar prompts: 3 diarios máximo',
            'Seguir usuarios y copiar prompts'
        ],
        icon: '🛡️',
        color: '#22c55e'
    },
    {
        posts: 5,
        copies: 0,
        name: 'Novato',
        benefits: [
            'Level Up Bonus: +10 💎',
            'Publicar prompts: 5 diarios máximo',
            'Comentar y guardar favoritos',
            'Enviar/Recibir PromptBits',
            'Destacar posts (coste estándar)'
        ],
        icon: '🌱',
        color: '#3b82f6'
    },
    {
        posts: 25,
        copies: 0,
        name: 'Creador Jr',
        benefits: [
            'Level Up Bonus: +20 💎',
            'Publicar prompts: 10 diarios máximo',
            'Cambiar foto de perfil',
            'Publicar secuencias multi-imagen',
            'Destacar posts (descuento nivel 2)'
        ],
        icon: '🎨',
        color: '#a855f7'
    },
    {
        posts: 50,
        copies: 100,
        name: 'Creador Elite',
        benefits: [
            'Level Up Bonus: +30 💎',
            'Publicar prompts: 20 diarios máximo',
            'Añadir redes sociales y bio',
            'Ultraboost 24hrs (próximamente)',
            'Destacar posts (descuento nivel 3)'
        ],
        icon: '🏆',
        color: '#f97316'
    },
    {
        posts: 100,
        copies: 200,
        name: 'Artista Prompter',
        benefits: [
            'Level Up Bonus: +40 💎',
            'Publicar prompts: 30 diarios máximo',
            'Badge visual destacado',
            'Early access a herramientas',
            'Destacar posts (descuento nivel 4)'
        ],
        icon: '💎',
        color: '#ef4444'
    },
    {
        posts: 250,
        copies: 500,
        name: 'Maestro Prompter',
        benefits: [
            'Level Up Bonus: +50 💎',
            'Publicar prompts: 50 diarios máximo',
            'Programa de Creadores (Monetización)',
            'Perfil Verificado',
            'Analytics Avanzados'
        ],
        icon: '👑',
        color: '#eab308'
    }
];

export const TOOLS = ['ChatGPT', 'Gemini', 'Grok', 'Meta', 'DIGEN AI', 'SD 1.5', 'SD 2.0', 'SDXL', 'Flux', 'Midjourney', 'Whisk', 'Huggingface', 'Fooocus', 'ComfyUI', 'Perchance', 'Otro'];
export const RATINGS = ['SFW / Apto', 'Sugestivo', 'NSFW / +18'];

export const RATING_INFO = `SFW / Apto (Safe for Work): Imágenes aptas para todo público. No contienen violencia, desnudez ni contenido sexual.

Sugestivo: Imágenes que insinúan, pero no muestran desnudez explícita ni actos sexuales. Puede incluir ropa reveladora, lenceria, ropa interior o posturas insinuantes. Se considera inapropiado para el trabajo pero no adulto en su totalidad.

NSFW / +18 (No Safe for Work): La categoría máxima. Imágenes que muestran desnudez total, actos sexuales, pornografía. No apto para menores.`;

export const INFO_ICON = `<span title='${RATING_INFO}' style="text-decoration:none; color:white; background:#0070ba; width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; margin-left:8px; font-weight:bold; cursor:default; font-size:12px">¡</span>`;

// STORE (Estado global simple)
const store = {
    prompts: [],
    allPrompts: [], // LISTA MAESTRA GLOBAL (Calculando tops, semanales, diarios)
    userAllPrompts: [], // LISTA MAESTRA DEL PERFIL (Para stats del usuario que se está viendo)
    currentUser: null,
    usersCache: {}, // { username: { ...profileData } }
    users: [],      // Admin list
    nuclearCache: { items: [], lastFetch: 0 },
    stats: { users: 0, prompts: 0, visits: 0 },

    // --- INFINITE SCROLL STATE (PAGINACIÓN MANUAL) ---
    currentPage: 1,
    hasMore: true,
    isLoadingMore: false,
    batchSize: 60,
    isInitialized: false,

    async init() {
        if (pb.authStore.isValid && pb.authStore.model) {
            // Carga de perfil no bloquea el inicio
            this._loadUserProfile(pb.authStore.model.id);
        }

        console.log("[STORE] ⚡ Iniciando Carga Optimizada...");

        // Lanzamos procesos en paralelo
        const [galleryResult, analysisResult] = await Promise.allSettled([
            this.loadPrompts(true), // Prioridad 1: Que el usuario vea posts
            this.loadAllPromptsForAnalysis() // Prioridad 2: Cálculo de Tops en background
        ]);

        if (galleryResult.status === 'rejected') console.error("❌ Gallery Load Error:", galleryResult.reason);
        if (analysisResult.status === 'rejected') console.warn("⚠️ Analysis Load Error:", analysisResult.reason);

        await this.getPublicStats();
        this.trackVisit();
        this.isInitialized = true;
    },

    async loadAllPromptsForAnalysis() {
        try {
            console.log("[STORE] 🧠 Cargando Lista Maestra para Análisis (Calculando Tops...)");
            const all = await pb.collection('prompts').getFullList({
                sort: '-created_at_custom',
                expand: 'author',
                $autoCancel: false
            });
            this.allPrompts = this._mapPrompts(all);
            console.log(`[STORE] ✅ Lista Maestra cargada: ${this.allPrompts.length} items detectados.`);
        } catch (err) {
            console.error("[STORE] Error cargando lista de análisis:", err);
            this.allPrompts = [];
        }
    },

    async _loadUserProfile(userId) {
        try {
            const record = await pb.collection('users').getOne(userId);
            if (record) {
                const profile = window.normalizeProfile ? window.normalizeProfile(record) : record;
                await this.syncUserStats(userId, profile);
                this.currentUser = profile;
            }
        } catch (error) {
            console.warn("Perfil no encontrado o error:", error);
            if (pb.authStore.model) {
                this.currentUser = {
                    ...pb.authStore.model,
                    username: pb.authStore.model.name || 'Usuario',
                    level: 0, xp: 0, tokens: 0, prompts_count: 0, total_copies: 0
                };
            }
        }
        return this.currentUser;
    },

    async syncUserStats(userId, profile) {
        if (!userId || !profile) return;
        try {
            // 1. Contar posts reales
            const stats = await pb.collection('prompts').getList(1, 1, {
                filter: `author = "${userId}"`,
                fields: 'id'
            });
            const realPosts = stats.totalItems || 0;

            // 2. Calcular copias totales reales
            const allPrompts = await pb.collection('prompts').getFullList({
                filter: `author = "${userId}"`,
                fields: 'copy_count'
            });
            const realCopies = allPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

            const needsUpdate = (profile.prompts_count !== realPosts) ||
                (profile.total_copies !== realCopies);

            if (needsUpdate) {
                console.log(`[STORE] 🔄 Sincronizando memoria para ${profile.username}: Posts ${realPosts}, Copies ${realCopies}`);

                // Actualización optimista: primero en memoria para la UI
                profile.prompts_count = realPosts;
                profile.total_copies = realCopies;

                // Intento de persistencia silencioso
                try {
                    await pb.collection('users').update(userId, {
                        prompts_count: realPosts,
                        total_copies: realCopies
                    });
                    console.log("[STORE] ✅ Persistencia exitosa.");
                } catch (pe) {
                    console.warn("[STORE] ⚠️ Error persistiendo (permisos?), pero la UI está OK localmente.");
                }
            }
        } catch (e) {
            console.warn("[STORE] Sync stats error:", e);
        }
    },

    async loadPrompts(reset = false, customFilter = '') {
        if (this.isLoadingMore || (!this.hasMore && !reset)) return [];

        try {
            this.isLoadingMore = true;
            if (reset) {
                this.currentPage = 1;
                this.hasMore = true;
                this.prompts = [];
            }

            console.log(`[STORE] 📦 Loading Batch (Filter: ${customFilter || 'none'}): Page ${this.currentPage} (Size ${this.batchSize})`);

            let records;
            try {
                // EL ÚNICO MAESTRO ES created_at_custom
                records = await pb.collection('prompts').getList(this.currentPage, this.batchSize, {
                    sort: '-created_at_custom',
                    filter: customFilter || '',
                    expand: 'author',
                    $autoCancel: false
                });
            } catch (sortErr) {
                console.error("[STORE] ❌ Error crítico: created_at_custom falló.", sortErr);
                records = { items: [], totalItems: 0 };
            }

            const newPrompts = this._mapPrompts(records.items);

            let result = [];
            let filteredNew = [];
            if (reset) {
                this.prompts = newPrompts;
                window._isIncrementalRender = false;
                result = newPrompts;
            } else {
                // Evitar duplicados por ID de forma estricta
                const existingIds = new Set(this.prompts.map(p => p.id));
                filteredNew = newPrompts.filter(p => !existingIds.has(p.id));
                this.prompts = [...this.prompts, ...filteredNew];
                window._isIncrementalRender = true; // Prevenir scroll a arriba
                result = filteredNew;
            }

            console.log(`[STORE] ✅ Batch Loaded (Page ${this.currentPage}): ${records.items.length} items. New: ${result.length}. Total In-Memory: ${this.prompts.length}`);

            this.hasMore = records.items.length === this.batchSize;
            if (this.hasMore) this.currentPage++;

            if (window.render && reset) window.render();
            return result;
        } catch (error) {
            console.error("Error loading prompts batch:", error);
            if (reset) this.prompts = [];
            this.hasMore = false;
            return [];
        } finally {
            this.isLoadingMore = false;
        }
    },

    async loadUserPromptsForAnalysis(userId) {
        try {
            console.log(`[STORE] 🧠 Cargando Lista Maestra del Perfil (ID: ${userId}) para Análisis...`);
            const records = await pb.collection('prompts').getFullList({
                filter: `author = "${userId}"`,
                expand: 'author',
                $autoCancel: false
            });

            this.userAllPrompts = this._mapPrompts(records);
            // Ordenamos en cliente para asegurar el maestro
            this.userAllPrompts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            console.log(`[STORE] ✅ Lista Maestra de Perfil cargada: ${this.userAllPrompts.length} items.`);
            return this.userAllPrompts;
        } catch (error) {
            console.error("[STORE] Error cargando lista de perfil:", error);
            this.userAllPrompts = [];
            return [];
        }
    },

    // Helper centralizado para buscar un prompt en cualquier lista de memoria
    findPrompt(id) {
        if (!id) return null;
        const targetId = String(id);
        return (this.prompts || []).find(p => String(p.id) === targetId) ||
            (this.allPrompts || []).find(p => String(p.id) === targetId) ||
            (this.userAllPrompts || []).find(p => String(p.id) === targetId);
    },

    // Helper para no repetir el mapeo
    _mapPrompts(items) {
        return items.map(p => ({
            id: p.id,
            title: p.title,
            prompt: p.prompt,
            negative_prompt: p.negative_prompt,
            image: this.getThumbnail(p.image_url || p.image),
            image_raw: p.image_url || p.image, // URL original para detalle
            image_hd: p.image_hd || '', // PERSIST HD URL FOR UI/QUEUES
            author: p.author_name || p.expand?.author?.username || p.expand?.author?.name || 'Explorador',
            author_id: p.author,
            createdAt: (() => {
                const val = (p.created_at_custom && p.created_at_custom !== 'N/A') ? p.created_at_custom : (p.created || p.created_at_original);
                const d = new Date(val);
                return isNaN(d.getTime()) ? 0 : d.getTime();
            })(),
            created_at: (p.created_at_custom && p.created_at_custom !== 'N/A') ? p.created_at_custom : p.created,
            reactions: p.reactions || { like: 0, love: 0, fire: 0, funny: 0, dislike: 0, sad: 0 },
            userReactions: (p.reactions && p.reactions._u) ? p.reactions._u : {},
            comments: p.comments || [],
            savedBy: p.saved_by || [],
            saved_by: p.saved_by || [],
            type: p.type || 'single',
            content: (p.content || []).map(step => ({
                ...step,
                image: this.getThumbnail(step.image),
                image_raw: step.image
            })),
            tokens_received: p.tokens_received || 0,
            rating: p.rating || 'SFW / Apto',
            is_private: p.is_private === true || p.isPrivate === true,
            copy_count: p.copy_count || 0,
            needs_reference: p.needs_reference || false,
            needsReference: p.needs_reference || false,
            admin_featured: p.admin_featured || false,
            is_featured: p.is_featured || false,
            featured_until: p.featured_until || null,
            tool: p.tool || 'ChatGPT',
            extraConfig: p.extra_config || [],
            tags: p.tags || [],
            profiles: p.expand?.author ? {
                username: p.expand.author.username,
                avatar_url: p.expand.author.avatar ? pb.files.getURL(p.expand.author, p.expand.author.avatar) : null,
                level: p.expand.author.level
            } : null
        }));
    },

    // --- CLOUDINARY THUMBNAIL HELPER ---
    getThumbnail(url) {
        if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return url;
        // Transform: w_400,c_scale,q_auto,f_auto
        if (url.includes('/upload/')) {
            return url.replace('/upload/', '/upload/w_500,c_fill,g_auto,q_auto,f_auto/');
        }
        return url;
    },

    async getPublicStats() {
        const _fetchStats = async () => {
            // 1. Contar usuarios registrados
            const usersRes = await pb.collection('users').getList(1, 1, { fields: 'id', requestKey: null });
            this.stats.users = usersRes.totalItems || 0;

            // 2. Contar prompts totales
            const promptsRes = await pb.collection('prompts').getList(1, 1, { fields: 'id', requestKey: null });
            this.stats.prompts = promptsRes.totalItems || 0;

            // 3. Obtener visitas totales desde app_stats
            try {
                const statsRec = await pb.collection('app_stats').getFirstListItem('', { requestKey: null });
                if (statsRec) this.stats.visits = statsRec.total_visits || 0;
            } catch (e) {
                console.warn("app_stats record not found or inaccessible.");
            }
        };

        try {
            await _fetchStats();
        } catch (err) {
            console.warn("⚠️ Stats fetch failed, retrying in 2s...", err.message);
            // Retry once after 2 seconds
            try {
                await new Promise(r => setTimeout(r, 2000));
                await _fetchStats();
            } catch (retryErr) {
                console.error("❌ Stats retry also failed:", retryErr.message);
                // Keep defaults (0, 0, 0) - UI won't crash
            }
        }

        return this.stats;
    },

    async trackVisit() {
        // Solo contar una vez por sesión de navegador
        if (sessionStorage.getItem('pg_visited')) return;

        try {
            const statsRec = await pb.collection('app_stats').getFirstListItem('');
            if (statsRec) {
                await pb.collection('app_stats').update(statsRec.id, {
                    'total_visits+': 1
                });
                sessionStorage.setItem('pg_visited', 'true');
                this.stats.visits = (statsRec.total_visits || 0) + 1;
            }
        } catch (err) {
            console.warn("Failed to track visit. Ensure 'app_stats' collection exists and has public update permission for total_visits field.");
        }
    },

    async fetchUserProfileByUsername(rawUsername) {
        if (!rawUsername) return null;
        const query = rawUsername.trim().replace(/['"]/g, "");
        const lowerQuery = query.toLowerCase();

        // 1. Check Cache (Normalized) with 60s TTL
        // NOTE: We do NOT rely solely on cache if we need to force a refresh, but for profile view it's fine.
        if (this.usersCache[lowerQuery] && (Date.now() - this.usersCache[lowerQuery]._fetchedAt < 60000)) {
            return this.usersCache[lowerQuery];
        }

        try {
            let found = null;

            // STRATEGY 1: Direct Filter (Fastest) - Check 'username' (system) and 'name' (custom)
            try {
                const res = await pb.collection('users').getList(1, 1, {
                    filter: `username="${query}" || name="${query}"`
                });
                if (res.items.length > 0) found = res.items[0];
            } catch (e) {
                console.warn("[ST_DEBUG] Direct filter error, continuing...");
            }

            // STRATEGY 2: Dragnet (Latest 100 users) - Case Insensitive
            if (!found) {
                console.log("[ST_DEBUG] Engaging DRAGNET search...");
                try {
                    const dragnet = await pb.collection('users').getList(1, 100, { $autoCancel: false });
                    found = dragnet.items.find(u =>
                        (u.name && u.name.toLowerCase() === lowerQuery) ||
                        (u.username && u.username.toLowerCase() === lowerQuery)
                    );
                } catch (e) {
                    console.warn("[ST_DEBUG] Dragnet failed, continuing...");
                }
            }

            // STRATEGY 3: ID Check (If looks like PB ID)
            if (!found && query.length === 15) {
                try {
                    found = await pb.collection('users').getOne(query);
                } catch (e) { }
            }

            // STRATEGY 4: NUCLEAR FALLBACK (Total Registry)
            if (!found) {
                console.log("[ST_DEBUG] Engaging NUCLEAR search...");
                const items = await this.loadGlobalUsers(); // REFACTORED: Use shared method

                found = items.find(u =>
                    (u.name && u.name.toLowerCase() === lowerQuery) ||
                    (u.username && u.username.toLowerCase() === lowerQuery)
                );
            }

            if (found) {
                const userId = found.id;
                const finalName = found.name || found.username;

                // --- REPAIR & SYNC ---
                try {
                    // Reconectar huérfanos (v16)
                    const ghosts = await pb.collection('prompts').getFullList({
                        filter: `author != "${userId}" && author_name = "${finalName}"`
                    });
                    if (ghosts.length > 0) {
                        console.log(`[REPAIR] 👻 Reconectando ${ghosts.length} posts para @${finalName}...`);
                        for (const p of ghosts) await pb.collection('prompts').update(p.id, { author: userId });
                    }
                    // Sync Stats
                    await this.syncUserStats(userId, found);
                } catch (e) {
                    console.warn("[REPAIR/SYNC] Error:", e);
                }

                return this._cacheUser(lowerQuery, found);
            }

        } catch (err) {
            console.error(`[CRITICAL] Error fetching profile for ${query}: ${err.message}`);
        }
        return null;
    },

    async loadGlobalUsers() {
        const CACHE_TTL = 300000; // 5 Minutes
        if (this.nuclearCache.items.length > 0 && (Date.now() - this.nuclearCache.lastFetch < CACHE_TTL)) {
            return this.nuclearCache.items;
        }

        try {
            console.log("[STORE] 🌍 Loading Global Users (Nuclear Cache)...");
            const res = await pb.collection('users').getList(1, 1000, { $autoCancel: false });
            this.nuclearCache.items = res.items;
            this.nuclearCache.lastFetch = Date.now();
            return res.items;
        } catch (err) {
            console.error("[STORE] ❌ Error loading global users:", err);
            return [];
        }
    },

    _cacheUser(key, record) {
        const normalized = window.normalizeProfile ? window.normalizeProfile(record) : record;
        this.usersCache[key] = normalized;
        this.usersCache[key]._fetchedAt = Date.now();
        console.log(`[ST_DEBUG] Cached: ${key}`);
        return normalized;
    },

    async logActivity(action, details = {}) {
        if (!this.currentUser) return;
        try {
            // Verificamos si la colección existe (intento silencioso)
            await pb.collection('activity_logs').create({
                user: this.currentUser.id,
                action: action,
                details: details
            });
            window.trackEvent(action, details);
        } catch (err) {
            // Silenciar error 404/403 si la colección no existe o no hay permisos
            if (err.status === 404 || err.status === 403) {
                // Si falla en DB, al menos intentamos trackear en GA4
                window.trackEvent(`${action}_fallback`, details);
            } else {
                console.warn("Failed to log activity:", err);
            }
        }
    },

    async getActivityLogs() {
        try {
            const records = await pb.collection('activity_logs').getList(1, 100, {
                sort: '-created',
                expand: 'user'
            });
            // Adaptar para el admin.js
            return records.items.map(l => ({
                ...l,
                username: l.expand?.user?.username || 'Desconocido',
                created_at: l.created
            }));
        } catch (err) {
            console.error("Error fetching logs:", err);
            return [];
        }
    },

    async getUserActivityLogs() {
        if (!this.currentUser) return [];
        try {
            const records = await pb.collection('activity_logs').getList(1, 50, {
                filter: `user = "${this.currentUser.id}"`,
                sort: '-created'
            });
            return records.items.map(l => ({ ...l, created_at: l.created }));
        } catch (err) {
            console.error("Error fetching user logs:", err);
            return [];
        }
    },

    async _bridgeToFacebook(promptRecord) {
        if (!promptRecord) return;

        // Solo intentar si es SFW (Sugestivo excluido por petición del usuario)
        const allowed = ['SFW / Apto'];
        if (!allowed.includes(promptRecord.rating)) return;

        console.log('[FB_SYNC] 🚧 Desviando a Cola de Publicación Automatizada...');

        // --- Resolver imágenes HD para TODOS los tipos de post ---
        let hdImages = [];
        const isSequence = promptRecord.type === 'sequence' && promptRecord.content && promptRecord.content.length > 1;

        if (isSequence) {
            // Multi-image: extraer HD de cada item del content
            hdImages = promptRecord.content
                .map(item => (item.image_hd && item.image_hd.startsWith('http')) ? item.image_hd : item.image)
                .filter(url => url && url.startsWith('http'));
        } else {
            // Single post: priorizar image_hd de la RAÍZ del record
            const bestImage = (promptRecord.image_hd && promptRecord.image_hd.startsWith('http'))
                ? promptRecord.image_hd
                : promptRecord.image;
            if (bestImage && bestImage.startsWith('http')) {
                hdImages = [bestImage];
            }
        }

        console.log(`[FB_SYNC] HD Images resolved: ${hdImages.length} (type: ${isSequence ? 'sequence' : 'single'})`);

        try {
            await pb.collection('facebook_queue').create({
                prompt: promptRecord.id,
                status: 'pending',
                allImages: hdImages,
                added_by: promptRecord.author || this.currentUser?.id
            });
            console.log(`[FB_SYNC] ✅ Añadido a la cola correctamente: ${promptRecord.title}`);
        } catch (error) {
            console.error('[FB_SYNC] ❌ Error al encolar:', error);
        }
    },

    userLogSubscription: null,
    subscribeToUserLogs(callback) {
        if (!this.currentUser) return;
        this.unsubscribeUserLogs();
        pb.collection('activity_logs').subscribe('*', (e) => {
            if (e.action === 'create' && e.record.user === this.currentUser.id) {
                callback({ ...e.record, created_at: e.record.created });
            }
        });
        this.userLogSubscription = true;
    },

    unsubscribeUserLogs() {
        if (this.userLogSubscription) {
            pb.collection('activity_logs').unsubscribe('*');
            this.userLogSubscription = null;
        }
    },

    privateLogSubscription: null,
    subscribeToLogs(callback) {
        if (!this.currentUser || this.currentUser.role !== 'admin') return;
        this.unsubscribeLogs();
        pb.collection('activity_logs').subscribe('*', (e) => {
            if (e.action === 'create') {
                callback({ ...e.record, created_at: e.record.created, username: e.record.author_name || 'Admin UI' });
            }
        });
        this.privateLogSubscription = true;
    },

    unsubscribeLogs() {
        if (this.privateLogSubscription) {
            pb.collection('activity_logs').unsubscribe('*');
            this.privateLogSubscription = null;
        }
    },

    // === PHASE 5: Economy Stats (Server-Side Optimized) ===
    async getEconomyStats(userId = null) {
        const uid = userId || this.currentUser?.id;
        if (!uid) return null;

        let currentBalance = 0;
        let totalEarned = 0;
        let totalSpent = 0;
        let totalReceived = 0;
        let totalBonuses = 0;
        let transactionCount = 0;
        let transactions = [];

        // 1. Get User Stats (Reliable)
        try {
            let user = this.currentUser;
            if (uid !== this.currentUser?.id) {
                user = await pb.collection('users').getOne(uid);
            }
            if (user) {
                currentBalance = user.tokens || 0;
                totalEarned = user.total_earned || 0;
                totalSpent = user.total_spent || 0;

                // Estimates based on available data
                totalReceived = Math.max(0, totalEarned - (user.total_rewards || 0)); // Simplified
                transactionCount = (user.prompts_count || 0) + (user.total_copies || 0); // Placeholder if no real count
            }
        } catch (e) {
            console.error('[ECONOMY] Error getting user stats:', e);
        }

        // 2. Fetch Transaction History via Secure API (Bypasses ACLs)
        // 2. Fetch Transaction History (Hybrid Strategy: API Proxy -> Native Fallback)
        let fetchedViaApi = false;
        try {
            // Priority: Use Secure API Proxy (Bypasses ACLs on Vercel)
            const token = pb.authStore.token;
            if (token) {
                // Add timestamp to bypass browser cache
                const res = await fetch(`/api/history?v=${Date.now()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.items && Array.isArray(data.items)) {
                        // Pre-process items to ensure consistent icons even if API is older
                        transactions = data.items.map(tx => {
                            if (!tx.icon) {
                                if (tx.type === 'sent') tx.icon = '📤';
                                else if (tx.type === 'received') tx.icon = '📥';
                                else if (tx.type === 'bonus') tx.icon = '🏆';
                                else tx.icon = tx.amount >= 0 ? '📈' : '📉';
                            }
                            return tx;
                        });
                        fetchedViaApi = true;
                    }
                }
            }
        } catch (err) {
            console.warn('[ECONOMY] API Proxy failed, falling back to native fetch:', err);
        }

        if (!fetchedViaApi) {
            // Fallback: Native Fetch (Works if ACLs are fixed by server hook)
            console.log('[ECONOMY] Using native fetch fallback...');
            try {
                // A) Ledger (Native Fallback)
                // Removed 'expand' to avoid 400 Bad Request if relation data is inconsistent
                // Removed 'sort' as it caused 400 Bad Request in backfill logs previously
                // Sorting is handled client-side anyway.
                const ledgerRecords = await pb.collection('ledger').getList(1, 40, {
                    filter: `from_user="${uid}" || to_user="${uid}"`,
                    sort: '-updated',
                    $autoCancel: false
                });

                const ledgerTxs = ledgerRecords.items
                    // Phase C: Filter double-entry TIPs to avoid duplicates
                    .filter(rec => {
                        // Legacy records (no entry_type) always pass through
                        if (!rec.entry_type) return true;
                        // For TIPs with double-entry: show DEBIT to sender, CREDIT to receiver
                        if (rec.type === 'TIP' || rec.type === 'PURCHASE' || rec.type === 'FEE') {
                            if (rec.from_user === uid) return rec.entry_type === 'DEBIT';
                            if (rec.to_user === uid) return rec.entry_type === 'CREDIT';
                        }
                        // System rewards (CREDIT) always pass through
                        return true;
                    })
                    .map(rec => {
                        const isSender = rec.from_user === uid;
                        const txDate = rec.created || rec.updated;
                        if (rec.type === 'TIP' || rec.type === 'PURCHASE') {
                            if (isSender) {
                                return { type: 'sent', amount: -rec.amount, description: rec.description || `Enviado`, date: txDate, icon: '📤', id: rec.id };
                            } else {
                                return { type: 'received', amount: rec.amount, description: rec.description || `Recibido`, date: txDate, icon: '📥', id: rec.id };
                            }
                        }
                        if (rec.type === 'POST_REWARD') {
                            return { type: 'income', amount: rec.amount, description: rec.description || 'Publicación', date: txDate, icon: '🖼️', id: rec.id };
                        }
                        if (rec.type === 'LEVEL_UP') {
                            return { type: 'income', amount: rec.amount, description: rec.description || 'Bono de Nivel', date: txDate, icon: '✨', id: rec.id };
                        }
                        if (rec.type === 'COPY_MILESTONE') {
                            return { type: 'bonus', amount: rec.amount, description: rec.description || 'Bono de Copias', date: txDate, icon: '🏆', id: rec.id };
                        }
                        return { type: isSender ? 'expense' : 'income', amount: isSender ? -rec.amount : rec.amount, description: rec.description || 'Transacción', date: txDate, icon: isSender ? '📉' : '📈', id: rec.id };
                    });
                transactions = [...transactions, ...ledgerTxs];

                // B) Activity Logs (Bonuses)
                // Simplified client-side filter
                // Removed 'sort' to prevent 400 Bad Request
                const logRecords = await pb.collection('activity_logs').getList(1, 40, {
                    filter: `user="${uid}" || details.recipientId="${uid}"`,
                    sort: '-updated',
                    $autoCancel: false
                });

                const logTxs = logRecords.items.map(log => {
                    const details = log.details || {};
                    const logDate = log.created || log.updated;
                    if (log.action === 'copy_milestone_bonus') {
                        return { type: 'bonus', amount: details.bonus || 0, description: `🎉 Milestone: ${details.copies} copias`, date: logDate, icon: '🏆', id: log.id };
                    }
                    if (log.action === 'send_tip') {
                        const isSender = log.user === uid;
                        if (isSender) return { type: 'sent', amount: -(details.amount || 0), description: `Enviado a @${details.recipient || 'Usuario'}`, date: logDate, icon: '📤', id: log.id };
                        else return { type: 'received', amount: details.amount || 0, description: `Recibido de @${log.expand?.user?.username || 'Usuario'}`, date: logDate, icon: '📥', id: log.id };
                    }
                    return null;
                }).filter(Boolean);
                transactions = [...transactions, ...logTxs];

            } catch (nativeErr) {
                console.error('[ECONOMY] Native fetch failed too:', nativeErr);
            }
        }

        // Final Sort & Dedupe (by ID)
        const seenIds = new Set();
        transactions = transactions.filter(tx => {
            if (tx.id && seenIds.has(tx.id)) return false;
            if (tx.id) seenIds.add(tx.id);
            return true;
        });

        // Transactions are already sorted and formatted by the API

        // 4. Sort and Dedupe (Simple ID check if possible, otherwise just sort)
        // We sort descending by date
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        transactions = transactions.slice(0, 20);

        return {
            currentBalance,
            totalEarned,
            totalSpent,
            netFlow: totalEarned - totalSpent,
            totalReceived,   // Fixed: Added
            totalBonuses,    // Fixed: Added (default 0 for now)
            transactionCount, // Fixed: Added
            transactions
        };
    },

    async getTopCreators() {
        try {
            // Unico criterio: Cantidad de prompts creados (DESC)
            const records = await pb.collection('users').getList(1, 10, {
                sort: '-prompts_count'
            });
            return records.items.map(p => window.normalizeProfile ? window.normalizeProfile(p) : p);
        } catch (err) {
            return [];
        }
    },

    // --- ANALYTICAL RANKING (CEREBRO) ---

    _getPopularityScore(p) {
        // Simple but effective score: copies are worth 2, reactions are worth 1
        const reactions = p.reactions || {};
        const reactionCount = Object.keys(reactions)
            .filter(k => k !== '_u')
            .reduce((sum, key) => sum + (reactions[key] || 0), 0);

        return (p.copy_count * 2) + reactionCount;
    },

    getTopWeeklyPrompts() {
        if (!this.allPrompts || this.allPrompts.length === 0) return [];

        const now = Date.now();
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

        // 1. Prioritize explicitly "featured" prompts that haven't expired
        const featured = this.allPrompts.filter(p =>
            !p.is_private &&
            (p.is_featured || p.admin_featured) &&
            (!p.featured_until || new Date(p.featured_until) > now)
        ).sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)); // Paid first, then admin

        // 2. Take recent prompts (last 7 days) and sort by score
        const recent = this.allPrompts.filter(p =>
            !p.is_private &&
            !p.is_featured &&
            !p.admin_featured &&
            p.createdAt >= weekAgo
        ).sort((a, b) => this._getPopularityScore(b) - this._getPopularityScore(a));

        // 3. Fallback: If not enough recent, take the all-time best
        const fallbacks = this.allPrompts.filter(p =>
            !p.is_private &&
            !p.is_featured &&
            !p.admin_featured &&
            p.createdAt < weekAgo
        ).sort((a, b) => this._getPopularityScore(b) - this._getPopularityScore(a));

        const result = [...featured, ...recent, ...fallbacks].slice(0, 20);
        console.log(`[CEREBRO] 🧠 Top Semanal calculado: ${result.length} items (Featured: ${featured.length})`);
        return result;
    },

    getTopDailyPrompts() {
        if (!this.allPrompts || this.allPrompts.length === 0) return [];

        const now = Date.now();
        const dayAgo = now - (24 * 60 * 60 * 1000);

        // 1. Prioritize featured prompts (Spotlight)
        const featured = this.allPrompts.filter(p =>
            !p.is_private &&
            (p.is_featured || p.admin_featured) &&
            (!p.featured_until || new Date(p.featured_until) > now)
        ).sort((a, b) => this._getPopularityScore(b) - this._getPopularityScore(a));

        // 2. Take prompts from last 24h sorted by score
        const recent = this.allPrompts.filter(p =>
            !p.is_private &&
            !p.is_featured &&
            !p.admin_featured &&
            p.createdAt >= dayAgo
        ).sort((a, b) => this._getPopularityScore(b) - this._getPopularityScore(a));

        // 3. Fallback: If very few recent, use the top from the week
        if (featured.length + recent.length < 3) {
            const weekly = this.getTopWeeklyPrompts();
            return [...featured, ...recent, ...weekly].slice(0, 5);
        }

        const result = [...featured, ...recent].slice(0, 5);
        console.log(`[CEREBRO] 🔥 Top Diario calculado: ${result.length} items.`);
        return result;
    },

    // --- CONTENT ACTIONS ---

    async addPrompt(data) {
        if (!this.currentUser) return { success: false, msg: "Inicia sesión para publicar" };

        // --- CHECK DAILY POST LIMIT (V3 LEVEL-BASED RESTRICTION) ---
        const isBatchUser = this.currentUser.batch_access === true;

        if (!isBatchUser) {
            const levelSystem = new LevelSystem(pb);
            const userLevel = this.getEffectiveLevel(this.currentUser);
            const levelInfo = levelSystem.getLevelInfo(userLevel);

            // Count posts published today
            const today = new Date().toISOString().split('T')[0];
            const todayStart = `${today} 00:00:00`;
            const todayEnd = `${today} 23:59:59`;

            try {
                const todayPosts = await pb.collection('prompts').getList(1, 1, {
                    filter: `author = "${this.currentUser.id}" && created >= "${todayStart}" && created <= "${todayEnd}"`,
                    fields: 'id'
                });

                const postsToday = todayPosts.totalItems || 0;
                const maxPerDay = levelInfo.benefits.find(b => b.includes('diarios'))?.match(/\d+/)?.[0] || 3;

                if (postsToday >= parseInt(maxPerDay)) {
                    return {
                        success: false,
                        msg: `Has alcanzado tu límite diario de ${maxPerDay} prompts (Nivel ${userLevel}: ${levelInfo.name}). ¡Sube de nivel para publicar más!`
                    };
                }
            } catch (err) {
                console.error('[DAILY LIMIT CHECK] Error:', err);
                // Continue on error (don't block user if check fails)
            }
        } else {
            console.log(`[BATCH] 🚀 Usuario con acceso Batch detectado (@${this.currentUser.username}). Omitiendo límites diarios.`);
        }

        let imageUrl = '';
        const uploadImage = async (base64, isHD = false) => {
            if (isHD) {
                const compressed = await this._compressImageHD(base64);
                // Detectar formato real del dataURL para extensión correcta
                const isPng = compressed.startsWith('data:image/png');
                const ext = isPng ? 'hd_social.png' : 'hd_social.jpg';
                const file = this._dataURLtoFile(compressed, ext);
                return await uploadToCloudinaryHD(file);
            }
            const compressed = await this._compressImage(base64);
            const file = this._dataURLtoFile(compressed, 'upload.webp');
            return await uploadToCloudinary(file);
        };

        let processedContent = [];
        try {
            if (data.image && data.image.startsWith('data:')) {
                imageUrl = await uploadImage(data.image);
                // Generar versión HD automáticamente para TODOS los usuarios
                if (!data.imageHD) {
                    data.image_hd = await uploadImage(data.image, true);
                }
            }
            if (data.imageHD && data.imageHD.startsWith('data:')) {
                data.image_hd = await uploadImage(data.imageHD, true);
            }
            if (data.content && Array.isArray(data.content)) {
                processedContent = await Promise.all(data.content.map(async (step) => {
                    let stepUrl = step.image;
                    let stepUrlHd = step.image_hd || '';

                    if (step.image && step.image.startsWith('data:')) {
                        stepUrl = await uploadImage(step.image);
                        // Auto HD para secuencias — TODOS los usuarios
                        stepUrlHd = await uploadImage(step.image, true);
                    }
                    return { ...step, image: stepUrl, image_hd: stepUrlHd };
                }));
            }
        } catch (err) {
            return { success: false, msg: "Error al subir imágenes: " + err.message };
        }

        try {
            const record = await pb.collection('prompts').create({
                title: data.title,
                prompt: data.prompt,
                negative_prompt: data.negative_prompt,
                image: imageUrl,
                image_hd: data.image_hd || '', // PERSIST HD URL
                author: this.currentUser.id,
                author_name: this.currentUser.username,
                type: data.type || 'single',
                is_private: data.isPrivate || false,
                needs_reference: data.needsReference || false,
                tool: data.tool,
                rating: data.rating,
                content: processedContent,
                tags: data.tags || [],
                created_at_custom: new Date().toISOString(),
                reactions: { like: 0, love: 0, fire: 0, funny: 0 },
                comments: [],
                saved_by: []
            });

            // --- LEVEL UP LOGIC & REWARDS (V3 ECONOMY) ---
            const levelSystem = new LevelSystem(pb);
            const levelCheck = await levelSystem.checkLevelUp(this.currentUser.id);

            if (!levelCheck) {
                console.error('[ECONOMY] Failed to check level up');
                return { success: true, leveledUp: false };
            }

            const { shouldLevelUp, oldLevel, newLevel, levelName } = levelCheck;

            // Define Bonuses
            const LEVEL_UP_BONUSES = [0, 10, 20, 30, 40, 50]; // Index maps to Level 0-5
            const BASE_REWARD = (oldLevel >= 5) ? 2 : 1;      // +2 for Maestro, +1 for others

            let tokensToAdd = BASE_REWARD;

            if (shouldLevelUp) {
                // Add the specific bonus for the NEW level reached
                const bonus = LEVEL_UP_BONUSES[newLevel] || 10;
                tokensToAdd += bonus;

                console.log(`[ECONOMY] 🎉 Level Up! ${oldLevel} -> ${newLevel} (${levelName}). Reward: ${tokensToAdd} (${BASE_REWARD} base + ${bonus} bonus)`);

                // Show level-up notification
                if (window.showToast) {
                    window.showToast(`🎉 ¡Subiste a Nivel ${newLevel}: ${levelName}! +${bonus} 💎 Bonus`, 'success');
                }
            } else {
                console.log(`[ECONOMY] Standard Reward. ${tokensToAdd} tokens.`);
            }

            // Get fresh stats for update
            const userPromptsStats = await pb.collection('prompts').getList(1, 1, {
                filter: `author = "${this.currentUser.id}"`,
                fields: 'id'
            });
            const totalPosts = userPromptsStats.totalItems;

            const allPrompts = await pb.collection('prompts').getFullList({
                filter: `author = "${this.currentUser.id}"`,
                fields: 'copy_count'
            });
            const totalCopies = allPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

            console.log(`[ECONOMY] Calculated reward for post: ${tokensToAdd} tokens (Level ${oldLevel} -> ${newLevel})`);

            // Calculate progress for UI
            const progress = levelSystem.calculateProgress(newLevel, totalPosts, totalCopies);

            // === Auditoría Económica (v3.2: DB Schema Patched) ===
            try {
                // Sincronizar balance y estadísticas del perfil
                const currentTokens = this.currentUser.tokens || 0;
                const currentEarned = this.currentUser.total_earned || 0;
                const currentRewards = this.currentUser.total_rewards || 0;

                await pb.collection('users').update(this.currentUser.id, {
                    level: newLevel,
                    level_progress: progress,
                    prompts_count: totalPosts,
                    total_copies: totalCopies,
                    tokens: currentTokens + tokensToAdd,
                    total_earned: currentEarned + tokensToAdd,
                    total_rewards: currentRewards + tokensToAdd
                });

                // Registro en el Ledger — Phase C: Double-Entry via LedgerService
                await LedgerService.systemReward(
                    this.currentUser.id, BASE_REWARD, 'POST_REWARD',
                    `Publicación: ${data.title}`
                );

                // Registro en el Ledger para subida de nivel (si ocurrió)
                if (shouldLevelUp) {
                    const bonus = tokensToAdd - BASE_REWARD;
                    await LedgerService.systemReward(
                        this.currentUser.id, bonus, 'LEVEL_UP',
                        `Bono por subir al Nivel ${newLevel}: ${levelName}`
                    );
                }
            } catch (err) {
                console.error("[ECONOMY] Error crítico en auditoría (verifica campos en DB):", err);
                // No bloqueamos la publicación si el ledger falla, pero avisamos
                if (window.showToast) window.showToast("Dificultades al registrar en el historial", "info");
            }

            await this._loadUserProfile(this.currentUser.id);
            await this.loadPrompts();
            this.logActivity('publish', { postId: data.title, type: data.type });

            // --- AUTO-POST TO FACEBOOK ---
            // Lo hacemos de forma asíncrona para no bloquear el UI del usuario
            this._bridgeToFacebook(record);

            return {
                success: true,
                leveledUp: shouldLevelUp,
                newLevel: newLevel,
                levelName: shouldLevelUp ? levelName : null,
                tokensEarned: tokensToAdd
            };
        } catch (err) {
            console.error("Publish error:", err);
            return { success: false, msg: "Error al guardar en base de datos: " + err.message };
        }
    },

    async updatePrompt(id, data) {
        console.log(`[DEBUG_V8.8] updatePrompt requested for ID: ${id}`);
        console.log(`[DEBUG_V8.8] Current User ID: ${this.currentUser?.id}`);

        if (!this.currentUser) return { success: false, msg: "Debes iniciar sesión" };

        // --- DIAGNOSTIC: VERIFY OWNERSHIP (v8.9) ---
        try {
            const currentPost = await pb.collection('prompts').getOne(id);
            if (currentPost.author !== this.currentUser.id) {
                console.error(`[OWNERSHIP MISMATCH] PostAuthor: ${currentPost.author} vs User: ${this.currentUser.id}`);
                return {
                    success: false,
                    msg: `⛔ Error de Propiedad: Este post pertenece a otro ID de usuario (${currentPost.author}). Tu ID actual es ${this.currentUser.id}.`
                };
            }
        } catch (e) {
            console.warn("Could not verify ownership before update:", e);
        }
        // ------------------------------------

        let imageUrl = data.image;
        try {
            if (data.image && data.image.startsWith('data:')) {
                // Reutilizamos la lógica de uploadImage interna si es accesible, 
                // o llamamos a _compressImage + uploadToCloudinary
                const compressed = await this._compressImage(data.image);
                const file = this._dataURLtoFile(compressed, 'update.webp');
                imageUrl = await uploadToCloudinary(file);
            }
        } catch (uploadErr) {
            console.error("Upload error:", uploadErr);
            return { success: false, msg: "Error al subir imagen nueva" };
        }

        try {
            await pb.collection('prompts').update(id, {
                title: data.title,
                prompt: data.prompt,
                negative_prompt: data.negative_prompt,
                image: imageUrl,
                is_private: data.isPrivate,
                needs_reference: data.needsReference,
                tool: data.tool,
                rating: data.rating,
                content: data.content,
                extra_config: data.extraConfig,
                tags: data.tags // NUEVO
            });
            await this.loadPrompts();
            return { success: true };
        } catch (err) {
            console.error("Update error:", err);
            return { success: false, msg: err.message || "Error al actualizar en BD" };
        }
    },

    async removePrompt(id) {
        try {
            await pb.collection('prompts').delete(id);

            // --- FIX: AUTO-DECREMENT COUNT ---
            try {
                // Get real count from DB to be 100% accurate
                const countRes = await pb.collection('prompts').getList(1, 1, {
                    filter: `author = "${this.currentUser.id}"`,
                    fields: 'id'
                });
                const newCount = countRes.totalItems;

                // Update User Profile
                await pb.collection('users').update(this.currentUser.id, {
                    prompts_count: newCount
                });

                // Update Local State
                this.currentUser.prompts_count = newCount;
                console.log(`[STORE] Count updated to ${newCount}`);
            } catch (countErr) {
                console.warn("Failed to update count:", countErr);
            }
            // ---------------------------------

            this.prompts = this.prompts.filter(p => p.id !== id);
            if (window.render) window.render();
            return { success: true };
        } catch (err) {
            return { success: false, msg: "Error al eliminar" };
        }
    },

    async toggleReaction(postId, type) {
        if (!this.currentUser) return { success: false };
        const prompt = this.prompts.find(p => String(p.id) === String(postId));
        if (!prompt) return { success: false };

        const username = this.currentUser.username;
        let reactions = { ...(prompt.reactions || {}) };

        // Inicializar si no existen las claves básicas
        ['like', 'love', 'fire', 'funny', 'dislike', 'sad'].forEach(k => {
            if (typeof reactions[k] !== 'number') reactions[k] = 0;
        });

        let uMap = reactions._u || {};
        const oldReaction = uMap[username];

        // ACTUALIZACIÓN OPTIMISTA (LOCAL)
        if (oldReaction === type) {
            reactions[type] = Math.max(0, reactions[type] - 1);
            delete uMap[username];
        } else {
            if (oldReaction) {
                reactions[oldReaction] = Math.max(0, reactions[oldReaction] - 1);
            }
            reactions[type] = (reactions[type] || 0) + 1;
            uMap[username] = type;
        }
        reactions._u = uMap;

        // Sync local immediately
        prompt.reactions = reactions;
        prompt.userReactions = uMap;
        if (window.render) window.render();

        try {
            await pb.collection('prompts').update(postId, { reactions: reactions });
            this.logActivity(type, { postTitle: prompt.title || 'Post' });
            return { success: true };
        } catch (error) {
            console.error("Error al sincronizar reacción:", error);
            // Revertir si falla el servidor (opcional, pero ayuda a la consistencia)
            return { success: false };
        }
    },

    async addComment(postId, text) {
        if (!this.currentUser) return { success: false };
        const prompt = this.prompts.find(p => String(p.id) === String(postId));
        if (!prompt) return { success: false };

        const newComment = {
            user: this.currentUser.username,
            avatar: this.currentUser.avatar || `https://robohash.org/${this.currentUser.username}`,
            text: text.trim(),
            date: new Date().toISOString()
        };

        const comments = [...(prompt.comments || []), newComment];
        try {
            await pb.collection('prompts').update(postId, { comments: comments });
            prompt.comments = comments;
            this.logActivity('comment', { postTitle: prompt.title });
            return { success: true };
        } catch (error) { return { success: false }; }
    },

    async toggleSave(id) {
        if (!this.currentUser) return;
        const prompt = this.prompts.find(p => String(p.id) === String(id));
        if (!prompt) return;

        const savedBy = [...(prompt.savedBy || [])];
        const idx = savedBy.indexOf(this.currentUser.username);
        if (idx > -1) savedBy.splice(idx, 1);
        else savedBy.push(this.currentUser.username);

        try {
            await pb.collection('prompts').update(id, { saved_by: savedBy });
            prompt.savedBy = savedBy;
            prompt.saved_by = savedBy;
            if (window.render) window.render();
        } catch (err) { console.warn("Save failed"); }
    },

    async boostPost(postId) {
        if (!this.currentUser || this.currentUser.tokens < 50) return { success: false, msg: 'Saldo insuficiente' };
        const featuredUntil = new Date();
        featuredUntil.setDate(featuredUntil.getDate() + 7);

        try {
            const batch = pb.createBatch();
            batch.collection('users').update(this.currentUser.id, { tokens: this.currentUser.tokens - 50 });
            batch.collection('prompts').update(postId, { is_featured: true, featured_until: featuredUntil.toISOString() });
            await batch.send();
            this.currentUser.tokens -= 50;
            return { success: true, msg: '¡Prompt destacado!' };
        } catch (err) { return { success: false }; }
    },

    async sendTip(postId, amount, recipientId = null) {
        if (!this.currentUser) return { success: false, msg: 'Inicia sesión' };

        // Level Check (Level 1+)
        const levelCheck = this.checkLevelFeature('transfer');
        if (!levelCheck.hasAccess) {
            return { success: false, msg: levelCheck.message };
        }

        if (!Number.isInteger(amount) || amount <= 0) return { success: false, msg: 'Monto inválido' };
        if (this.currentUser.tokens < amount) return { success: false, msg: `Saldo insuficiente. Tienes ${this.currentUser.tokens} 💎` };

        try {
            let actualRecipientId = recipientId;
            let authorUsername = '';
            if (postId) {
                const prompt = this.prompts.find(p => String(p.id) === String(postId));
                if (prompt) { actualRecipientId = prompt.author_id; authorUsername = prompt.author; }
            }
            if (!actualRecipientId) return { success: false, msg: 'Destinatario no encontrado' };

            // Call Vercel Serverless Function (Secure)
            console.log('[TRANSFER] Calling serverless endpoint /api/transfer...');

            const response = await fetch('/api/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify({
                    recipientId: actualRecipientId,
                    amount: amount,
                    postId: postId || null
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error en la transferencia');
            }

            // Update local user state immediately for UI responsiveness
            if (this.currentUser) {
                this.currentUser.tokens -= amount;
                // Background refresh to be sure
                this._loadUserProfile(this.currentUser.id);
            }

            return {
                success: true,
                msg: `✅ ¡${amount} 💎 enviados!`,
                newBalance: this.currentUser.tokens
            };
        } catch (err) {
            console.error('[TRANSFER] Error:', err);
            return { success: false, msg: `❌ ${err.message}` };
        }
    },


    async followUser(targetIdentifier) {
        if (!this.currentUser) return { success: false, msg: "Login requerido" };
        try {
            console.log(`[FOLLOW] Procesando: ${targetIdentifier}`);
            let target = null;
            const lowerTarget = targetIdentifier.toLowerCase();

            // 1. Intentar por ID (15 caracteres típicos de PB)
            if (targetIdentifier.length === 15) {
                try {
                    target = await pb.collection('users').getOne(targetIdentifier);
                    console.log("[FOLLOW] Encontrado por ID");
                } catch (e) { }
            }

            // 2. Intentar por NAME (Campo verificado en auditoría)
            if (!target) {
                try {
                    // Solo filtramos por name ya que username no existe en el esquema y da error 400
                    target = await pb.collection('users').getFirstListItem(`name="${targetIdentifier}"`);
                    console.log("[FOLLOW] Encontrado por NAME");
                } catch (e) { }
            }

            if (!target) {
                console.warn(`[FOLLOW] No se halló usuario para: ${targetIdentifier}`);
                return { success: false, msg: `Usuario no identificado (${targetIdentifier})` };
            }

            if (target.id === this.currentUser.id) return { success: false, msg: "No puedes seguirte a ti mismo" };

            const following = [...(this.currentUser.following || [])];
            const followers = [...(target.followers || [])];

            const idx = following.indexOf(target.id);
            let action = 'follow';
            if (idx > -1) {
                // Unfollow
                following.splice(idx, 1);
                const fIdx = followers.indexOf(this.currentUser.id);
                if (fIdx > -1) followers.splice(fIdx, 1);
                action = 'unfollow';
            } else {
                // Follow
                following.push(target.id);
                followers.push(this.currentUser.id);
            }

            // A. Actualizar Perfil Propio (Prioridad)
            try {
                await pb.collection('users').update(this.currentUser.id, { following });
                this.currentUser.following = following;
            } catch (myErr) {
                console.error("[FOLLOW] Error perfil propio:", myErr);
                return { success: false, msg: "Error al actualizar tu lista de seguidos" };
            }

            // B. Actualizar Perfil Objetivo (Opcional, puede fallar por RLS)
            try {
                await pb.collection('users').update(target.id, { followers });
            } catch (targetErr) {
                console.warn("[FOLLOW] Error perfil objetivo (RLS?):", targetErr);
            }

            // C. Sync Cache
            target.followers = followers;
            this.usersCache[lowerTarget] = { ...target, _fetchedAt: Date.now() };
            // También cachear por ID para consistencia
            this.usersCache[target.id] = this.usersCache[lowerTarget];

            this.logActivity(action, { target: targetIdentifier });
            // 5. AUTO-ADD TO FB QUEUE (Silent)
            // Solo si es SFW o Sugestivo
            if (['SFW / Apto', 'Sugestivo'].includes(data.rating)) {
                pb.collection('facebook_queue').create({
                    prompt: record.id,
                    status: 'pending',
                    added_by: this.currentUser.id
                }).catch(e => console.warn("[FB_AUTO] Failed to auto-queue:", e));
            }

            return { success: true, id: record.id };
        } catch (err) {
            console.error("[FOLLOW] CRITICAL FAULT:", err);
            return { success: false, msg: "Fallo crítico en el sistema de seguimiento" };
        }
    },



    async updateUserSettings(data) {
        if (!this.currentUser) return { success: false };
        try {
            const updateData = {
                username: data.username,
                socials: data.socials,
                moderation: data.moderation
            };

            // FIX: Convert Base64 to File for PocketBase 'avatar' field
            if (data.avatar && data.avatar.startsWith('data:image')) {
                // 1. Compress Image (Client-Side) - Reduce size to avoid 413 or slow uploads
                // Convert to WebP 0.8 quality, max 1400px width
                console.log("[AVATAR] Compressing image...");
                const compressedBase64 = await this._compressImage(data.avatar);

                // 2. Generate Filename & Convert to File
                const filename = `avatar_${Date.now()}.webp`;
                const fileObj = this._dataURLtoFile(compressedBase64, filename);
                updateData.avatar = fileObj;

                console.log(`[AVATAR] Uploading as ${filename} size: ${(fileObj.size / 1024).toFixed(2)}KB`);
                // DO NOT set avatar_url manually, PB handles it
            }

            const record = await pb.collection('users').update(this.currentUser.id, updateData);

            // Reload full profile to get normalized avatar URL
            await this._loadUserProfile(this.currentUser.id);

            return { success: true };
        } catch (err) {
            console.error("Update User Error:", err);
            let msg = err.message || "Error desconocido";

            // Extract specific validation error from PocketBase
            if (err.data && err.data.data) {
                const firstKey = Object.keys(err.data.data)[0];
                if (firstKey) {
                    const detail = err.data.data[firstKey];
                    msg += `: ${detail.message} (${firstKey})`;
                }
            }
            return { success: false, msg: msg };
        }
    },

    async changePassword(oldPass, newPass) {
        if (!this.currentUser) return { success: false, msg: "Sesión no válida" };
        try {
            await pb.collection('users').update(this.currentUser.id, {
                oldPassword: oldPass,
                password: newPass,
                passwordConfirm: newPass
            });
            return { success: true, msg: "¡Contraseña actualizada con éxito!" };
        } catch (err) {
            const msg = err.data?.data?.oldPassword?.message || "Error al actualizar: verifica tu contraseña actual.";
            return { success: false, msg };
        }
    },

    async deleteAccount() {
        if (!this.currentUser) return { success: false };
        try {
            await pb.collection('users').delete(this.currentUser.id);
            this.logout();
            return { success: true };
        } catch (err) { return { success: false }; }
    },

    // --- LEVEL SYSTEM HELPERS ---

    /**
     * Check if current user has a specific badge in unique_badges
     * @param {string} badgeName 
     * @returns {boolean}
     */
    hasBadge(badgeName) {
        if (!this.currentUser || !this.currentUser.unique_badges) return false;
        // The unique_badges field is expected to be an array of strings
        return Array.isArray(this.currentUser.unique_badges) &&
            this.currentUser.unique_badges.includes(badgeName);
    },

    /**
     * Get the effective level of a user, considering unique badges.
     * CREADOR FUNDADOR and CREADOR VIP get Level 2 benefits automatically.
     * @param {object} user 
     * @returns {number}
     */
    getEffectiveLevel(user) {
        if (!user) return 0;
        const baseLevel = user.level || 0;
        const badges = (user.unique_badges || []).map(b => b.toUpperCase());

        const isVIP = badges.some(b =>
            b.includes('FUNDADOR') ||
            b.includes('V.I.P') ||
            b.includes('VIP')
        );

        // Grant Level 2 benefits if VIP/Founder
        if (isVIP && baseLevel < 2) return 2;

        return baseLevel;
    },

    /**
     * Check if current user has access to a level-gated feature
     * @param {string} feature - Feature name (e.g., 'comment', 'favorite', 'transfer', 'boost', 'avatar', 'socials', 'sequence')
     * @returns {object} { hasAccess: boolean, requiredLevel: number, message: string }
     */
    checkLevelFeature(feature) {
        if (!this.currentUser) {
            return { hasAccess: false, requiredLevel: 1, message: "Inicia sesión para continuar" };
        }

        const effectiveLevel = this.getEffectiveLevel(this.currentUser);
        const featureRequirements = {
            'comment': { level: 1, name: 'Novato', message: 'Necesitas ser Nivel 1 (Novato) para comentar. ¡Publica 5 prompts para subir!' },
            'favorite': { level: 1, name: 'Novato', message: 'Necesitas ser Nivel 1 (Novato) para guardar favoritos. ¡Publica 5 prompts!' },
            'transfer': { level: 1, name: 'Novato', message: 'Necesitas ser Nivel 1 (Novato) para transferir PromptBits. ¡Publica 5 prompts!' },
            'boost': { level: 1, name: 'Novato', message: 'Necesitas ser Nivel 1 (Novato) para destacar posts. ¡Publica 5 prompts!' },
            'avatar': { level: 2, name: 'Creador Jr', message: 'Necesitas ser Nivel 2 (Creador Jr) para cambiar tu foto de perfil. ¡Publica 25 prompts!' },
            'socials': { level: 2, name: 'Creador Jr', message: 'Necesitas ser Nivel 2 (Creador Jr) para añadir tus redes sociales. ¡Publica 25 prompts!' },
            'sequence': { level: 2, name: 'Creador Jr', message: 'Necesitas ser Nivel 2 (Creador Jr) para publicar secuencias. ¡Publica 25 prompts!' }
        };

        const requirement = featureRequirements[feature];
        if (!requirement) {
            return { hasAccess: true, requiredLevel: 0, message: '' };
        }

        if (effectiveLevel >= requirement.level) {
            // Check if it's a VIP bypass for messaging
            const badges = (this.currentUser.unique_badges || []).map(b => b.toUpperCase());
            const isVIP = badges.some(b => b.includes('FUNDADOR') || b.includes('VIP') || b.includes('V.I.P'));
            const msg = isVIP && this.currentUser.level < requirement.level ? `💎 Beneficio de VIP/Fundador activado` : '';

            return { hasAccess: true, requiredLevel: requirement.level, message: msg };
        }

        return {
            hasAccess: false,
            requiredLevel: requirement.level,
            message: requirement.message
        };
    },

    // --- ADMIN ACTIONS ---

    async adminLoadAllUsers() {
        if (!this.currentUser || (this.currentUser.role !== 'admin' && this.currentUser.username !== 'rodrigodlmoral' && this.currentUser.username !== 'rodridomrock')) return [];
        try {
            const records = await pb.collection('users').getFullList({ sort: '-created' });
            this.users = records.map(r => ({ ...r, avatar: r.avatar_url || r.avatar }));
            return this.users;
        } catch (err) { return []; }
    },

    getAllUsers() { return this.users; },

    async adminUpdateUser(userId, data) {
        if (!this.currentUser || (this.currentUser.role !== 'admin' && this.currentUser.username !== 'rodrigodlmoral' && this.currentUser.username !== 'rodridomrock')) return { success: false };
        try {
            await pb.collection('users').update(userId, {
                level: data.level,
                badges: data.badges,
                role: data.role // Added role update
            });
            await this.adminLoadAllUsers();
            return { success: true };
        } catch (err) { return { success: false, msg: err.message }; }
    },

    async adminDeletePrompt(promptId) {
        if (!this.currentUser || (this.currentUser.role !== 'admin' && this.currentUser.username !== 'rodrigodlmoral' && this.currentUser.username !== 'rodridomrock')) return { success: false };
        try {
            await pb.collection('prompts').delete(promptId);
            this.prompts = this.prompts.filter(p => p.id !== promptId);
            return { success: true };
        } catch (err) { return { success: false, msg: err.message }; }
    },


    // --- FB AUTOPOST QUEUE ---

    async adminGetFbQueue() {
        if (!this.currentUser || (this.currentUser.role !== 'admin' && this.currentUser.username !== 'rodrigodlmoral')) return [];
        try {
            // Pending items first (FIFO) - removed sort: 'created' due to 400 error
            // Added prompt.author to nested expand to fix @undefined bug
            const records = await pb.collection('facebook_queue').getFullList({
                expand: 'prompt,prompt.author,added_by',
                $autoCancel: false
            });
            // Manual sort locally for safety
            records.sort((a, b) => new Date(a.created) - new Date(b.created));

            return records.map(r => ({
                id: r.id,
                status: r.status,
                prompt: r.expand?.prompt ? this._mapPrompts([r.expand.prompt])[0] : null,
                addedBy: r.expand?.added_by?.username || 'System',
                created: r.created,
                error: r.error_log
            }));
        } catch (e) {
            console.error("Error fetching FB Queue:", e);
            return [];
        }
    },

    async adminAddToFbQueue(promptId) {
        if (!this.currentUser) return { success: false, msg: "No user" };
        try {
            // Check if already exists
            const existing = await pb.collection('facebook_queue').getList(1, 1, {
                filter: `prompt = "${promptId}" && status = "pending"`
            });
            if (existing.totalItems > 0) return { success: false, msg: "Ya está en la cola." };

            await pb.collection('facebook_queue').create({
                prompt: promptId,
                status: 'pending',
                added_by: this.currentUser.id
            });
            return { success: true };
        } catch (e) {
            console.error("[FB QUEUE ERROR]", e);
            // Return detailed error for toast
            return { success: false, msg: e.data?.message || e.message };
        }
    },

    async adminRemoveFromFbQueue(queueId) {
        try {
            await pb.collection('facebook_queue').delete(queueId);
            return { success: true };
        } catch (e) { return { success: false, msg: e.message }; }
    },

    async adminProcessFbQueueItem(queueId, prompt) {
        try {
            await pb.collection('facebook_queue').update(queueId, { status: 'processing' });

            const res = await fetch('/api/facebook-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, adminSecret: 'PG_ROBOT_SECRET' })
            });
            const data = await res.json();

            if (data.success) {
                await pb.collection('facebook_queue').update(queueId, { status: 'published' });
                return { success: true };
            } else {
                await pb.collection('facebook_queue').update(queueId, { status: 'failed', error_log: data.message || data.error });
                return { success: false, msg: data.message || data.error };
            }
        } catch (e) {
            await pb.collection('facebook_queue').update(queueId, {
                status: 'failed',
                error_log: e.message
            });
            return { success: false, msg: e.message };
        }
    },

    subscribeToFbQueue(callback) {
        pb.collection('facebook_queue').subscribe('*', async ({ action, record }) => {
            // Expansion logic for real-time item
            if (action === 'create' || action === 'update') {
                try {
                    const expanded = await pb.collection('facebook_queue').getOne(record.id, {
                        expand: 'prompt,prompt.author,added_by'
                    });
                    callback({ action, record: expanded });
                } catch (e) {
                    callback({ action, record });
                }
            } else {
                callback({ action, record });
            }
        });
    },

    unsubscribeFromFbQueue() {
        pb.collection('facebook_queue').unsubscribe('*');
    },

    async giftTokens(userId, amount) {
        if (!this.currentUser || (this.currentUser.role !== 'admin' && this.currentUser.username !== 'rodrigodlmoral' && this.currentUser.username !== 'rodridomrock')) return { success: false };
        try {
            const user = await pb.collection('users').getOne(userId);
            await pb.collection('users').update(userId, { tokens: (user.tokens || 0) + parseInt(amount) });
            await this.adminLoadAllUsers();
            return { success: true };
        } catch (err) { return { success: false, msg: err.message }; }
    },

    // --- HACK SOCIAL (V30) ---
    async adminMassFollow() {
        if (!this.currentUser || this.currentUser.id !== 'rkmrhmgh067x7un') {
            return { success: false, msg: "Solo el Administrador Principal puede ejecutar este hack." };
        }

        try {
            console.log("🚀 Iniciando Hack Social (Follow All)...");
            const users = await pb.collection('users').getFullList({ fields: 'id,following' });
            console.log(`📊 Procesando ${users.length} usuarios...`);

            const adminId = 'rkmrhmgh067x7un';
            const admin = await pb.collection('users').getOne(adminId);
            let adminFollowers = new Set(admin.followers || []);
            let successCount = 0;

            for (const user of users) {
                if (user.id === adminId) continue;
                let userFollowing = new Set(user.following || []);

                if (!userFollowing.has(adminId)) {
                    userFollowing.add(adminId);
                    adminFollowers.add(user.id);
                    try {
                        // Usamos update directo (esto funcionará porque el admin está autenticado en la sesión actual)
                        await pb.collection('users').update(user.id, { following: Array.from(userFollowing) });
                        successCount++;
                        console.log(`✅ [${successCount}] Usuario ${user.id} siguiendo.`);
                        // Delay de 300ms para suavidad
                        await new Promise(r => setTimeout(r, 300));
                    } catch (e) {
                        console.warn(`⚠️ Error en usuario ${user.id}:`, e.message);
                    }
                }
            }

            // Actualizar admin final
            await pb.collection('users').update(adminId, { followers: Array.from(adminFollowers) });
            console.log("🏁 Hack Social Finalizado con éxito.");
            return { success: true, count: successCount };
        } catch (err) {
            console.error("💥 Error en Hack:", err);
            return { success: false, msg: err.message };
        }
    },

    async adminUpdatePrompt(id, data) {
        if (!this.currentUser || (this.currentUser.role !== 'admin' && this.currentUser.username !== 'rodrigodlmoral' && this.currentUser.username !== 'rodridomrock')) return { success: false, msg: "Acceso denegado" };
        try {
            await pb.collection('prompts').update(id, data);
            await this.loadPrompts();
            return { success: true };
        } catch (err) { return { success: false, msg: err.message }; }
    },

    // --- REPAIR TOOL (v8.11) ---
    async claimGhostPosts() {
        if (!this.currentUser || (this.currentUser.role !== 'admin' && this.currentUser.username !== 'rodrigodlmoral' && this.currentUser.username !== 'rodridomrock')) return { success: false, msg: "Requiere acceso Admin" };
        try {
            // 1. Buscamos posts por varios criterios posibles
            const possibleFilters = [
                `author_name = '${this.currentUser.username}'`,
                `username = '${this.currentUser.username}'`,
                `name = '${this.currentUser.username}'`,
                `author_name = '${this.currentUser.name}'`,
                `username = '${this.currentUser.name}'`
            ];

            let allGhostRecords = [];
            for (const filterStr of possibleFilters) {
                try {
                    console.log("👻 Probando filtro Nuclear:", filterStr);
                    const partial = await pb.collection('prompts').getFullList({ filter: filterStr });
                    allGhostRecords = [...allGhostRecords, ...partial];
                } catch (e) {
                    // Ignoramos si el campo no existe en esa colección específica
                }
            }

            // Eliminar duplicados por ID
            const uniqueRecords = Array.from(new Map(allGhostRecords.map(item => [item.id, item])).values());

            // 2. Filtramos solo los que NO tengan tu ID actual
            const ghostPosts = uniqueRecords.filter(r => r.author !== this.currentUser.id);

            console.log(`👻 [NUCLEAR] Detectados ${ghostPosts.length} posts únicos potenciales.`);
            if (ghostPosts.length > 0) {
                console.log(`👻 Muestra de Campos del primer post:`, Object.keys(ghostPosts[0]));
            }

            if (ghostPosts.length === 0) {
                return { success: true, count: 0, msg: "No se encontraron posts fantasmas ni con búsqueda Nuclear. ¿Seguro que los posts muestran tu nombre?" };
            }

            // Preguntamos confirmación con el número exacto
            if (!confirm(`Se han detectado ${ghostPosts.length} posts que te pertenecen pero tienen un ID de autor antiguo.\n\n¿Quieres intentar reclamarlos todos?`)) {
                return { success: false, msg: "Operación cancelada" };
            }

            // 3. Los reclamamos uno por uno
            let fixedCount = 0;
            let errors = [];
            for (const p of ghostPosts) {
                try {
                    await pb.collection('prompts').update(p.id, { author: this.currentUser.id });
                    fixedCount++;
                } catch (err) {
                    console.error(`Error reclamando post ${p.id}:`, err);
                    errors.push(`${p.id}: ${err.message}`);
                }
            }

            await this.loadPrompts();
            if (fixedCount > 0 && errors.length === 0) {
                return { success: true, count: fixedCount, msg: `¡Éxito! Has recuperado ${fixedCount} posts.` };
            } else {
                return {
                    success: false,
                    msg: `Se arreglaron ${fixedCount}, pero fallaron ${errors.length}. Probablemente por falta de Permisos (Rules) en PocketBase.`
                };
            }

        } catch (err) {
            console.error("Detailed Claim Error:", err);
            // Si es un error de PocketBase, tiene data y originalError
            const detail = err.data ? JSON.stringify(err.data) : (err.message || "Error desconocido");
            return { success: false, msg: "Error al buscar: " + detail };
        }
    },

    async addSupportTicket(data) {
        try {
            await pb.collection('tickets').create({
                name: data.name,
                email: data.email,
                message: data.message,
                status: 'new'
            });
            return { success: true };
        } catch (err) {
            console.error("Support Ticket Error:", err);
            return { success: false, msg: "Error al enviar el ticket." };
        }
    },

    // --- AUTH ---

    async login(email, password) {
        try {
            const authData = await pb.collection('users').authWithPassword(email, password);
            if (authData) {
                // VERIFICACIÓN OBLIGATORIA
                if (!authData.record.verified) {
                    pb.authStore.clear();
                    return {
                        success: false,
                        msg: "Debes verificar tu correo antes de ingresar. Por favor revisa tu bandeja de entrada o spam."
                    };
                }
                await this._loadUserProfile(authData.record.id);
                location.reload();
                return { success: true };
            }
        } catch (error) {
            // Check for "User is not verified" error (400 or 403)
            if (error.status === 400 || error.data?.message?.includes('verified')) {
                return {
                    success: false,
                    msg: "🔒 Debes verificar tu correo para entrar. Revisa tu bandeja de entrada (o spam)."
                };
            }
            return { success: false, msg: "Credenciales inválidas o error de conexión" };
        }
    },

    async register(email, username, password) {
        try {
            // 1. CREACIÓN DE CUENTA DIRECTA (Confiamos en las restricciones de PB)
            // HACK: Auto-follow Admin (rodrigodlmoral) ID: rkmrhmgh067x7un
            await pb.collection('users').create({
                username, email, password, passwordConfirm: password,
                name: username, tokens: 50, level: 0, xp: 0, role: 'user',
                moderation: { suggestive: 'BLUR', nsfw: 'BLUR' },
                following: ['rkmrhmgh067x7un']
            });

            // 2. SOLICITAR VERIFICACIÓN AUTOMÁTICAMENTE
            try {
                await pb.collection('users').requestVerification(email);
            } catch (vErr) {
                console.warn("[REGISTER] Fallo al solicitar verificación (no crítico):", vErr);
            }

            // 3. AUTO-FOLLOW AL ADMIN (rkmrhmgh067x7un - @rodrigodlmoral)
            try {
                const newUser = await pb.collection('users').getFirstListItem(`email="${email}"`);
                if (newUser) {
                    const adminId = 'rkmrhmgh067x7un';
                    const admin = await pb.collection('users').getOne(adminId);

                    const following = [adminId];
                    const followers = [...(admin.followers || []), newUser.id];

                    const batch = pb.createBatch();
                    batch.collection('users').update(newUser.id, { following });
                    batch.collection('users').update(adminId, { followers });
                    await batch.send();
                    console.log("[REGISTER] Auto-follow completo.");

                    // 4. REGISTRAR BONO DE REGISTRO EN LEDGER (fire-and-forget)
                    try {
                        await LedgerService.systemReward(
                            newUser.id, 50, 'REGISTRATION_BONUS',
                            `Bono de bienvenida para @${username}`
                        );
                        console.log(`[REGISTER] ✅ Ledger: +50💎 registro para ${newUser.id}`);
                    } catch (ledgerErr) {
                        console.warn('[REGISTER] Ledger entry failed (non-blocking):', ledgerErr.message);
                    }
                }
            } catch (fErr) {
                console.warn("[REGISTER] Error en auto-follow (no crítico):", fErr);
            }

            return { success: true };
        } catch (error) {
            console.error("Register Error:", error);

            // Mapeo detallado de errores de PocketBase (400 Bad Request)
            if (error.status === 400 && error.data?.data) {
                const fields = error.data.data;
                if (fields.email) {
                    return { success: false, msg: "Este correo ya está registrado. Prueba con otro o inicia sesión." };
                }
                if (fields.username) {
                    return { success: false, msg: "Ese nombre de usuario ya está en uso. ¡Elige uno más original! ✨" };
                }
            }

            return { success: false, msg: "Error al crear cuenta. " + (error.message || "Inténtalo de nuevo.") };
        }
    },

    async logout() {
        pb.authStore.clear();
        location.reload();
    },

    async recoverPassword(email) {
        try {
            await pb.collection('users').requestPasswordReset(email);
            return { success: true, msg: "Instrucciones enviadas a tu correo." };
        }
        catch (err) { return { success: false, msg: "Error al enviar correo." }; }
    },

    // MÉTODO para PASSWORD RESET (Hotfix Feb 11)
    async confirmPasswordReset(token, password, userOrEmail) {
        try {
            await pb.collection('users').confirmPasswordReset(token, password, password);
        } catch (err) {
            console.error("Token Reset Error:", err);
            return { success: false, msg: "El link de recuperación es inválido o ha expirado." };
        }
        return await this.login(userOrEmail, password);
    },

    // MÉTODO para ACTIVACIÓN DE CUENTA (Password inicial)
    async confirmResetPassword(token, password, userOrEmail) {
        // 1. Confirmar el cambio de contraseña via PocketBase
        try {
            await pb.collection('users').confirmPasswordReset(token, password, password);
        } catch (err) {
            console.error("Reset Token Error:", err);
            // Si es error de validación (contraseña corta, etc.)
            if (err.data?.data?.password) {
                return { success: false, msg: err.data.data.password.message };
            }
            if (err.data?.data?.passwordConfirm) {
                return { success: false, msg: err.data.data.passwordConfirm.message };
            }
            // Error genérico o de token
            return { success: false, msg: "El link ha expirado o es inválido. Solicita uno nuevo." };
        }

        // 2. Login automático inmediatamente (Si falla, no invalidamos el éxito anterior)
        try {
            return await this.login(userOrEmail, password);
        } catch (loginErr) {
            console.warn("Auto-login failed after reset:", loginErr);
            // Aunque falle el login, el reset fue exitoso.
            return { success: true, warning: "Contraseña actualizada, pero el auto-login falló. Por favor inicia sesión manualmente." };
        }
    },

    async confirmVerification(token) {
        try {
            await pb.collection('users').confirmVerification(token);
            // Si hay un usuario logueado pero no verificado, recargar perfil
            if (this.currentUser) {
                await this._loadUserProfile(this.currentUser.id);
            }
            return { success: true };
        } catch (err) {
            // Si el error es 400, verificamos si ya está validado (quizás el token ya se usó o el navegador pre-cargó el link)
            if (err.status === 400) {
                console.log("[VERIFY] Token ya usado o inválido, asumiendo procesamiento previo.");
                return { success: true, note: "already_processed" };
            }
            console.error("Verification error:", err);
            return { success: false, msg: "Error al verificar la cuenta." };
        }
    },

    // --- HELPERS ---

    _compressImage(base64) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width; let height = img.height;
                const MAX = 1400;
                if (width > MAX) { height = (MAX / width) * height; width = MAX; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/webp', 0.8));
            };
            img.src = base64;
        });
    },

    _compressImageHD(base64) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Estimate size in bytes
                const estimate = Math.floor((base64.length - 22) * 0.75);
                const MAX_BYTES = 9.2 * 1024 * 1024; // 9.2 MB for safety
                const isPng = base64.startsWith('data:image/png');

                // Si la imagen está dentro de los límites, preservar el formato original (PNG o JPEG)
                if (estimate <= MAX_BYTES && width <= 4500) {
                    console.log(`[HD_PROCESS] Image within limits (${(estimate / 1024 / 1024).toFixed(2)}MB, ${width}x${height}). Keeping ORIGINAL format (${isPng ? 'PNG' : 'JPEG'}).`);
                    resolve(base64);
                    return;
                }

                console.log(`[HD_PROCESS] Image too large (${(estimate / 1024 / 1024).toFixed(2)}MB) or resolution too high (${width}px). Smart compression...`);
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 4500;
                if (width > MAX_WIDTH) {
                    height = (MAX_WIDTH / width) * height;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Intentar primero como PNG si la original era PNG y el resultado cabe
                if (isPng) {
                    const pngDataUrl = canvas.toDataURL('image/png');
                    const pngEstimate = Math.floor((pngDataUrl.length - 22) * 0.75);
                    if (pngEstimate <= MAX_BYTES) {
                        console.log(`[HD_PROCESS] PNG re-encode fits (${(pngEstimate / 1024 / 1024).toFixed(2)}MB). Using PNG.`);
                        resolve(pngDataUrl);
                        return;
                    }
                    console.log(`[HD_PROCESS] PNG too heavy (${(pngEstimate / 1024 / 1024).toFixed(2)}MB). Falling back to JPEG.`);
                }

                // Fallback a JPEG con calidad progresiva
                let quality = 0.95;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                let newEstimate = Math.floor((dataUrl.length - 22) * 0.75);

                while (newEstimate > MAX_BYTES && quality > 0.6) {
                    quality -= 0.05;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                    newEstimate = Math.floor((dataUrl.length - 22) * 0.75);
                    console.log(`[HD_PROCESS] JPEG compression: Quality ${quality.toFixed(2)}, Size: ${(newEstimate / 1024 / 1024).toFixed(2)}MB`);
                }

                resolve(dataUrl);
            };
            img.src = base64;
        });
    },

    _dataURLtoFile(dataurl, filename) {
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        return new File([u8arr], filename, { type: mime });
    },

    // --- COPY COUNT TRACKING CON ANTI-SPAM ---
    async incrementCopyCount(promptId) {
        const userId = this.currentUser?.id || 'anon';
        const key = `${userId}_${promptId}`;
        const COPY_COOLDOWN = 10000;
        const now = Date.now();

        if (!window._lastCopyTime) window._lastCopyTime = {};
        if (window._lastCopyTime[key] && (now - window._lastCopyTime[key]) < COPY_COOLDOWN) {
            return { success: false, msg: 'Cooldown activo (10s)' };
        }
        window._lastCopyTime[key] = now;

        try {
            console.log(`[DEBUG_COPY] Iniciando copia para prompt ID: ${promptId}`);
            const prompt = await pb.collection('prompts').getOne(promptId);

            // FIX: prompt.author es el ID de relación en PocketBase
            // this.currentUser.id es el ID del usuario logueado
            console.log(`[DEBUG_COPY] Author_ID: ${prompt.author} | Current_User_ID: ${userId}`);

            if (this.currentUser && prompt.author === this.currentUser.id) {
                console.log('[DEBUG_COPY] Autor detectado. No sumamos para evitar auto-farmeo.');
                return { success: true, selfCopy: true };
            }

            // Mantenemos compatibilidad con ambos nombres de campo probables
            const oldVal = parseInt(prompt.copy_count || prompt.copies || 0);
            const newVal = oldVal + 1;

            console.log(`[DEBUG_COPY] Incrementando: ${oldVal} -> ${newVal}`);

            // Actualizar en DB
            const res = await pb.collection('prompts').update(promptId, {
                copy_count: newVal
            });
            console.log(`[DEBUG_COPY] DB Update exitoso:`, res);

            // Sincronizar localmente para que la UI se actualice de inmediato
            const local = this.prompts.find(x => String(x.id) === String(promptId));
            if (local) {
                local.copy_count = newVal;
                console.log('[DEBUG_COPY] Store local sincronizado');
            }

            // Notificar registro
            this.logActivity('copy', { postId: promptId, count: newVal });

            // === PHASE 5: Copy Milestone Bonus ===
            const milestoneResult = await checkCopyMilestone(prompt.author, promptId, newVal);
            if (milestoneResult.milestoneReached) {
                console.log(`[COPY_BONUS] 🎉 Milestone! ${milestoneResult.copies} copies = +${milestoneResult.bonus} 💎`);
                if (prompt.author === this.currentUser?.id && window.toast) {
                    window.toast(`🎉 ¡Tu prompt alcanzó ${milestoneResult.copies} copias! +${milestoneResult.bonus} 💎`, 'success');
                }
            }

            // Subida de nivel al autor
            await this._checkAuthorLevelUp(prompt.author);

            return { success: true, count: newVal, milestone: milestoneResult };
        } catch (err) {
            console.error('[DEBUG_COPY] Error crítico en persistencia:', err);
            return { success: false, msg: err.message };
        }
    },

    // --- VERIFICACIÓN AUTOMÁTICA DE NIVEL DEL AUTOR ---
    async _checkAuthorLevelUp(authorId) {
        try {
            console.log(`[DEBUG_LVL] Iniciando verificación para autor: ${authorId}`);
            // Obtener todos los prompts del autor
            const authorPrompts = await pb.collection('prompts').getFullList({
                filter: `author = "${authorId}"`,
                fields: 'copy_count'
            });

            const totalPosts = authorPrompts.length;
            const totalCopies = authorPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

            console.log(`[DEBUG_LVL] Real Stats -> Posts: ${totalPosts}, Copies: ${totalCopies}`);

            // Calcular nivel correcto basado en posts Y copias
            let newLevel = 0;
            LEVEL_REQS.forEach((req, idx) => {
                if (totalPosts >= req.posts && totalCopies >= req.copies) {
                    newLevel = idx;
                }
            });

            // Obtener datos actuales del autor
            const author = await pb.collection('users').getOne(authorId);
            const isAdmin = this.currentUser?.role === 'admin';
            const isSelf = this.currentUser?.id === authorId;

            console.log(`[DEBUG_LVL] Current Level: ${author.level}, New Calculated: ${newLevel}`);

            // IMPORTANTE: Solo actualizamos si hay cambios O si somos admin/autor con permisos
            const hasChanges = (newLevel > (author.level || 0)) ||
                (author.prompts_count !== totalPosts) ||
                (author.total_copies !== totalCopies);

            if (hasChanges) {
                if (isAdmin || isSelf) {
                    console.log(`[DEBUG_LVL] Actualizando registro de usuario ${authorId}...`);
                    await pb.collection('users').update(authorId, {
                        level: Math.max(newLevel, author.level || 0),
                        prompts_count: totalPosts,
                        total_copies: totalCopies
                    });
                    console.log(`[DEBUG_LVL] ✅ Usuario actualizado con éxito`);
                } else {
                    console.log(`[DEBUG_LVL] ⚠️ Cambio detectado pero el usuario actual NO tiene permisos para actualizar este perfil. El autor lo sincronizará al entrar a su perfil.`);
                }
            } else {
                console.log(`[DEBUG_LVL] No se requieren cambios en el perfil.`);
            }
        } catch (err) {
            console.warn("[DEBUG_LVL] Error en verificación de nivel:", err);
        }
    },

    // --- MASTED UNIFICATION: CENTRALIZED MODAL & REACTION LOGIC ---
    activePostId: null,
    currentSeqStep: 0,
    sliderUnlocked: false,

    getModeration(p, forcedRating) {
        let rating = forcedRating || p.rating || 'SFW / Apto';
        if (!forcedRating && p.type === 'sequence' && p.content && p.content.length > 0) {
            rating = p.content[0].rating || 'SFW / Apto';
        }
        const mod = this.currentUser?.moderation || { suggestive: 'BLUR', nsfw: 'BLUR' };
        let applyBlur = false; let warningLabel = '';
        if (rating === 'Sugestivo' && mod.suggestive === 'BLUR') { applyBlur = true; warningLabel = 'SUGESTIVO'; }
        if (rating === 'NSFW / +18' && mod.nsfw === 'BLUR') { applyBlur = true; warningLabel = 'NSFW'; }
        return { applyBlur, warningLabel };
    },

    openDetail(id) {
        const p = this.findPrompt(id);
        if (!p) return;
        this.activePostId = id;
        this.currentSeqStep = 0;
        this.sliderUnlocked = false;

        const modal = document.getElementById('viewModal');
        if (!modal) return;

        // UI Resets
        const slider = document.getElementById('commSlider');
        const handle = document.getElementById('commSliderHandle');
        const botContainer = document.getElementById('commAntiBot');
        if (slider) slider.classList.remove('unlocked');
        if (handle) { handle.style.left = '4px'; handle.style.transition = 'none'; }
        if (botContainer) botContainer.style.display = 'none';

        document.getElementById('detTitle').innerText = p.title || 'Sin Título';

        const detMetaTop = document.getElementById('detMetaTop');
        if (detMetaTop) {
            const d = new Date(p.createdAt || Date.now());
            detMetaTop.innerText = `${p.tool} • ${p.type === 'sequence' ? 'Secuencia' : 'Imagen Única'} • ${d.toLocaleDateString()}`;
        }

        const userEl = document.getElementById('detUser');
        if (userEl) {
            userEl.innerHTML = `
                <span style="display:flex; align-items:center; gap:10px">
                    Por: <span onclick="window.location.href='/profile.html?u=${p.author}'" style="cursor:pointer; text-decoration:underline">${p.author}</span>
                </span>
                <div id="detTipsButton" style="margin: 8px 0 10px 0">
                    <button style="background:rgba(162, 155, 254, 0.15); border:1px solid rgba(162, 155, 254, 0.4); color:#a29bfe; padding:4px 12px; border-radius:4px; font-size:0.75rem; font-weight:700; cursor:pointer;" onclick="window.openTip('${p.id}')">
                        💎 ${p.tokens_received || 0} PromptBits
                    </button>
                </div>`;
        }

        const tagsEl = document.getElementById('detTags');
        if (tagsEl) {
            tagsEl.innerHTML = (p.tags && p.tags.length > 0)
                ? p.tags.map(t => `<span class="server-tag-pill">${t}</span>`).join('')
                : '';
        }

        const badgesEl = document.getElementById('detBadges');
        if (badgesEl) {
            let bhtml = `<span style="background:#222; border:1px solid #444; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:700">🛠️ ${p.tool || 'Desconocido'}</span>`;
            const r = p.rating || 'SFW / Apto';
            const icon = r.startsWith('SFW') ? '🟢' : '🔞';
            bhtml += `<span style="background:#222; border:1px solid #444; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:700">${icon} ${r}</span>`;
            const refText = (p.needsReference || p.needs_reference) ? '📸 Requiere imagen de Referencia' : '🚫 No requiere imagen de Referencia';
            bhtml += `<span style="background:#222; border:1px solid #444; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:700">${refText}</span>`;
            badgesEl.innerHTML = bhtml;
        }

        // Setup Reactions & Counts (Initial)
        this._updateModalUI(p);

        // Sequence vs Single
        const prevBtn = document.getElementById('detPrevBtn');
        const nextBtn = document.getElementById('detNextBtn');
        const seqCount = document.getElementById('detSeqCount');
        const detImg = document.getElementById('detImg');
        const detPrompt = document.getElementById('detPrompt');

        if (p.type === 'sequence' && p.content && p.content.length > 0) {
            if (prevBtn) prevBtn.style.display = 'flex';
            if (nextBtn) nextBtn.style.display = 'flex';
            if (seqCount) seqCount.style.display = 'block';
            this.updateSeqDisplay(p);
        } else {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (seqCount) seqCount.style.display = 'none';
            if (detImg) detImg.src = p.image || '';
            if (detPrompt) detPrompt.innerText = p.prompt || '';

            const detNegPrompt = document.getElementById('detNegPrompt');
            const btnCopyNeg = document.getElementById('btnCopyNeg');
            const negText = p.negative_prompt;
            if (negText && negText.trim()) {
                if (detNegPrompt) { detNegPrompt.innerText = negText; detNegPrompt.style.display = 'block'; }
                if (btnCopyNeg) btnCopyNeg.style.display = 'block';
            } else {
                if (detNegPrompt) detNegPrompt.style.display = 'none';
                if (btnCopyNeg) btnCopyNeg.style.display = 'none';
            }
        }

        const detImgWrap = document.getElementById('detImgWrap');
        if (detImgWrap) {
            const { applyBlur, warningLabel } = this.getModeration(p);
            detImgWrap.classList.toggle('card-blurred', applyBlur);
            detImgWrap.dataset.warning = applyBlur ? warningLabel : '';
            const oldOverlay = detImgWrap.querySelector('.blur-overlay');
            if (oldOverlay) oldOverlay.remove();
        }

        const detCopyBadge = document.getElementById('detCopyBadge');
        if (detCopyBadge) {
            detCopyBadge.style.display = 'block';
            detCopyBadge.innerText = `📋 Copiado ${p.copy_count || 0} veces`;
        }

        const commentsEl = document.getElementById('detComments');
        if (commentsEl) {
            const currUser = this.currentUser?.username;
            const isPostOwner = currUser === p.author;
            commentsEl.innerHTML = (p.comments && p.comments.length > 0)
                ? p.comments.map(c => `<div style="background:#1a1a1a; padding:10px; border-radius:8px; margin-bottom:10px; border-left:3px solid var(--accent); position:relative">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px">
                            <span style="font-weight:700; color:var(--accent); font-size:0.85rem">@${window.escapeHTML(c.username)}</span>
                            ${(isPostOwner || currUser === c.username) ? `<button onclick="window.doDeleteComment(${c.id})" style="background:none; border:none; color:#ff4444; cursor:pointer; font-size:0.8rem; padding:0">🗑️</button>` : ''}
                        </div>
                        <div style="font-size:0.9rem; color:#eee; word-break:break-word">${window.escapeHTML(c.text)}</div>
                    </div>`).join('')
                : '<div style="opacity:0.5; font-size:0.9rem">No hay comentarios aún.</div>';
        }

        if (modal.parentNode !== document.body) document.body.appendChild(modal);
        modal.style.cssText = 'display: flex !important; z-index: 1000000 !important; visibility: visible !important; opacity: 1 !important; background: rgba(0,0,0,0.95) !important; position: fixed !important; top: 0; left: 0; width: 100%; height: 100%;';
    },

    updateSeqDisplay(p) {
        const step = p.content[this.currentSeqStep];
        if (!step) return;
        const { applyBlur, warningLabel } = this.getModeration(p, step.rating);
        const detImgWrap = document.getElementById('detImgWrap');
        if (detImgWrap) {
            detImgWrap.classList.toggle('card-blurred', applyBlur);
            detImgWrap.dataset.warning = applyBlur ? warningLabel : '';
            const oldOverlay = detImgWrap.querySelector('.blur-overlay');
            if (oldOverlay) oldOverlay.remove();
        }
        const btnCopyNegSeq = document.getElementById('btnCopyNeg');
        if (btnCopyNegSeq) {
            const negText = step.negative_prompt || '';
            btnCopyNegSeq.style.display = (negText.trim()) ? 'block' : 'none';
        }
        const detImg = document.getElementById('detImg');
        const detPrompt = document.getElementById('detPrompt');
        const seqCount = document.getElementById('detSeqCount');
        if (detImg) detImg.src = step.image || step.url || step.src || '';
        if (detPrompt) detPrompt.innerText = step.prompt || p.prompt || '';
        if (seqCount) seqCount.innerText = `Imagen ${this.currentSeqStep + 1} de ${p.content.length}`;
    },

    prevSeqStep() {
        const p = this.findPrompt(this.activePostId);
        if (!p || p.type !== 'sequence') return;
        this.currentSeqStep = (this.currentSeqStep - 1 + p.content.length) % p.content.length;
        this.updateSeqDisplay(p);
    },

    nextSeqStep() {
        const p = this.findPrompt(this.activePostId);
        if (!p || p.type !== 'sequence') return;
        this.currentSeqStep = (this.currentSeqStep + 1) % p.content.length;
        this.updateSeqDisplay(p);
    },

    async doReact(type) {
        if (!this.currentUser) {
            if (window.toast) window.toast("Inicia sesión para reaccionar", "warning");
            else { const am = document.getElementById('authModal'); if (am) am.style.display = 'flex'; }
            return;
        }
        const p = this.findPrompt(this.activePostId);
        if (!p) return;

        const myOldReaction = (p.userReactions) ? p.userReactions[this.currentUser.username] : null;
        let newCounts = { ...p.reactions };
        let newMyReaction;

        if (myOldReaction === type) { newCounts[type] = Math.max(0, (newCounts[type] || 0) - 1); newMyReaction = null; }
        else {
            if (myOldReaction) newCounts[myOldReaction] = Math.max(0, (newCounts[myOldReaction] || 0) - 1);
            newCounts[type] = (newCounts[type] || 0) + 1;
            newMyReaction = type;
        }

        this._updateModalUI({ reactions: newCounts, userReactions: { [this.currentUser.username]: newMyReaction } }, true);

        try { await this.toggleReaction(this.activePostId, type); }
        catch (e) { console.error("Sync failed", e); }
    },

    _updateModalUI(data, isOptimistic = false) {
        const reactions = data.reactions || { like: 0, love: 0, fire: 0, funny: 0, dislike: 0, sad: 0 };
        const myUsername = this.currentUser?.username;
        const myReaction = (data.userReactions && myUsername) ? data.userReactions[myUsername] : null;

        ['like', 'love', 'fire', 'funny', 'dislike', 'sad'].forEach(t => {
            const el = document.getElementById(`det-${t}-count`);
            const btn = document.getElementById(`btn-react-${t}`);
            if (el) el.innerText = reactions[t] || 0;
            if (btn) {
                const isActive = myReaction === t;
                btn.classList.toggle('active', isActive);
                if (isOptimistic && isActive) {
                    btn.style.transform = "scale(1.2)";
                    setTimeout(() => btn.style.transform = "scale(1)", 200);
                }
            }
        });
    },

    showSlider() {
        const bot = document.getElementById('commAntiBot');
        if (bot && bot.style.display === 'none') {
            bot.style.display = 'flex';
            this.initCrystalSlider();
        }
    },

    initCrystalSlider() {
        const track = document.getElementById('commSlider');
        const handle = document.getElementById('commSliderHandle');
        if (!track || !handle) return;

        let isDragging = false;
        let startX = 0;

        const onStart = (e) => {
            if (this.sliderUnlocked) return;
            isDragging = true;
            startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            handle.style.transition = 'none';
        };

        const onMove = (e) => {
            if (!isDragging || this.sliderUnlocked) return;
            const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const diff = currentX - startX;
            const max = track.offsetWidth - handle.offsetWidth - 8;
            const pos = Math.max(0, Math.min(diff, max));
            handle.style.left = (pos + 4) + 'px';

            if (pos >= max - 5) {
                this.sliderUnlocked = true;
                isDragging = false;
                track.classList.add('unlocked');
                handle.style.left = 'calc(100% - 44px)';
            }
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            if (!this.sliderUnlocked) {
                handle.style.transition = 'left 0.3s ease';
                handle.style.left = '4px';
            }
        };

        handle.onmousedown = onStart;
        handle.ontouchstart = onStart;
        window.onmousemove = onMove;
        window.ontouchmove = onMove;
        window.onmouseup = onEnd;
        window.ontouchend = onEnd;
    },

    async postComm() {
        if (!this.currentUser) {
            if (window.toast) window.toast("Debes iniciar sesión para comentar", "error");
            return;
        }

        // Level Check (Level 1+)
        const levelCheck = this.checkLevelFeature('comment');
        if (!levelCheck.hasAccess) {
            if (window.toast) window.toast(levelCheck.message, 'warning');
            return;
        }

        const input = document.getElementById('commInput');
        const val = input ? input.value.trim() : '';

        if (!val) return;
        if (val.length < 5) {
            if (window.toast) window.toast("Comentario demasiado corto", "info");
            return;
        }

        if (!this.sliderUnlocked) {
            if (window.toast) window.toast("Desliza el diamante 💎 para verificar que eres humano", "info");
            return;
        }

        const result = await this.addComment(this.activePostId, val);

        if (result.success) {
            if (window.toast) window.toast("¡Comentario enviado con éxito!", "success");
            if (input) input.value = '';

            this.sliderUnlocked = false;
            const track = document.getElementById('commSlider');
            const handle = document.getElementById('commSliderHandle');
            const bot = document.getElementById('commAntiBot');
            if (track) track.classList.remove('unlocked');
            if (handle) { handle.style.left = '4px'; handle.style.transition = 'none'; }
            if (bot) bot.style.display = 'none';

            this.openDetail(this.activePostId);
        } else {
            if (window.toast) window.toast(result.msg || "Error al comentar", "error");
        }
    },

    // --- ADMIN METHODS (Restored) ---
    async adminLoadAllUsers() {
        if (!this.currentUser || (this.currentUser.role !== 'admin' && this.currentUser.username !== 'rodrigodlmoral' && this.currentUser.username !== 'rodridomrock')) return;
        try {
            // Fetch ALL users via Backend API to bypass RLS
            const res = await fetch('/api/admin-users');
            if (!res.ok) throw new Error('API Error: ' + res.statusText);

            const users = await res.json();
            this.allUsers = users; // Store locally
            return users;
        } catch (e) {
            console.error("Admin Load Users Error:", e);
            if (window.toast) window.toast("Error cargando usuarios: " + e.message, "error");
            return [];
        }
    },

    getAllUsers() {
        return this.allUsers || [];
    },

    async adminUpdateUser(id, data) {
        try {
            await pb.collection('users').update(id, data);
            return { success: true };
        } catch (e) {
            return { success: false, msg: e.message };
        }
    },

    async adminDeleteUser(id) {
        try {
            await pb.collection('users').delete(id);
            return { success: true };
        } catch (e) {
            return { success: false, msg: e.message };
        }
    },

    async adminUpdatePrompt(id, data) {
        try {
            await pb.collection('prompts').update(id, data);
            return { success: true };
        } catch (e) {
            return { success: false, msg: e.message };
        }
    },

    async removePrompt(id) {
        try {
            await pb.collection('prompts').delete(id);
            return { success: true };
        } catch (e) {
            return { success: false, msg: e.message };
        }
    },

    async giftTokens(userId, amount) {
        // Simple client-side check, real security is on server/RLS
        if (this.currentUser.tokens < amount) return { success: false, msg: "Saldo insuficiente" };

        try {
            // 1. Deduct from Admin
            await pb.collection('users').update(this.currentUser.id, {
                tokens: this.currentUser.tokens - amount
            });
            this.currentUser.tokens -= amount; // Local update

            // 2. Add to User
            const u = await pb.collection('users').getOne(userId);
            await pb.collection('users').update(userId, {
                tokens: (u.tokens || 0) + amount,
                total_earned: (u.total_earned || 0) + amount
            });

            // 3. Record in Ledger — Phase M: Economy Audit
            try {
                await LedgerService.transfer(
                    this.currentUser.id, userId, amount,
                    `Regalo Admin de @${this.currentUser.username} a @${u.username || 'Usuario'}`
                );
                console.log(`[GIFT] ✅ Ledger: ${amount}💎 ${this.currentUser.id} → ${userId}`);
            } catch (ledgerErr) {
                console.warn('[GIFT] Ledger entry failed (non-blocking):', ledgerErr.message);
            }

            // 4. Activity Log (legacy compatibility)
            await this.logActivity('tip', { recipient: u.username, amount: amount, postId: 'ADMIN_GIFT' });

            return { success: true };
        } catch (e) {
            return { success: false, msg: e.message };
        }
    },

    // --- MIGRATION UTILITY (Restored) ---
    async migrateOldImages(onProgress, ignoredIds = []) {
        try {
            // Buscamos posts con imágenes de Firebase (storage.googleapis.com)
            const records = await pb.collection('prompts').getFullList({
                filter: 'image ~ "storage.googleapis.com"',
                $autoCancel: false
            });

            const pending = records.filter(r => !ignoredIds.includes(r.id));
            if (pending.length === 0) return { done: true, totalPending: 0 };

            let count = 0;
            const batch = pending.slice(0, 5); // Procesar de 5 en 5 para no saturar

            for (const r of batch) {
                if (onProgress) onProgress(count, batch.length, r.title, pending.length - count);

                try {
                    // 1. Descargar imagen de Firebase
                    const imgRes = await fetch(r.image);
                    const blob = await imgRes.blob();
                    const file = new File([blob], `migrated_${r.id}.webp`, { type: 'image/webp' });

                    // 2. Subir a Cloudinary
                    const cloudUrl = await window.uploadToCloudinary(file);

                    // 3. Actualizar en PocketBase
                    await pb.collection('prompts').update(r.id, {
                        image: cloudUrl
                    });
                    count++;
                } catch (err) {
                    console.error(`Error migrando post ${r.id}:`, err);
                    ignoredIds.push(r.id);
                }
            }

            return { done: false, count, totalPending: pending.length - count, failedIds: ignoredIds };
        } catch (e) {
            return { fatal: e.message };
        }
    }
};

window.store = store;
export { store };
