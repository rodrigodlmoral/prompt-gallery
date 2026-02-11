import { pb } from './pocketbase.js';
import { uploadToCloudinary } from './uploadService.js';

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
        avatarUrl = pb.files.getUrl(p, p.avatar);
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
    { posts: 0, copies: 0, name: 'Explorador', benefits: ['Comentar en prompts', 'Guardar favoritos', 'Enviar PromptBits'], icon: '🛡️', color: '#888' },
    { posts: 10, copies: 0, name: 'Novato', benefits: ['Publicar Secuencias (Multi-imagen)'], icon: '🌱', color: '#4caf50' },
    { posts: 25, copies: 0, name: 'Creador Jr', benefits: ['Cambiar foto de perfil', 'Añadir redes sociales al perfil'], icon: '🎨', color: '#2196f3' },
    { posts: 50, copies: 15, name: 'Creador', benefits: ['Sin cooldown en comentarios', 'Medalla especial de plata'], icon: '🏆', color: '#ff9800' },
    { posts: 100, copies: 40, name: 'Artista', benefits: ['Destacar tus propios posts (Self-Promo)', 'Panel de estadísticas avanzado'], icon: '💎', color: '#9c27b0' },
    { posts: 250, copies: 80, name: 'Maestro', benefits: ['Herramientas de moderación básica', 'Soporte prioritario 24/7'], icon: '👑', color: 'gold' }
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
    currentUser: null,
    usersCache: {}, // { username: { ...profileData } }
    users: [],      // Admin list
    nuclearCache: { items: [], lastFetch: 0 }, // Cache for mass user search
    stats: { users: 0, prompts: 0, visits: 0 },

    async init() {
        if (pb.authStore.isValid && pb.authStore.model) {
            await this._loadUserProfile(pb.authStore.model.id);
        }
        await this.loadPrompts();
        await this.getPublicStats();
        this.trackVisit();
    },

    async _loadUserProfile(userId) {
        try {
            const record = await pb.collection('users').getOne(userId);
            if (record) {
                const profile = window.normalizeProfile ? window.normalizeProfile(record) : record;

                // --- DYNAMIC AUTO-SYNC & ROBUSTNESS ---
                try {
                    // Contar posts reales
                    const stats = await pb.collection('prompts').getList(1, 1, {
                        filter: `author = "${userId}"`,
                        fields: 'id'
                    });
                    const realPosts = stats.totalItems || 0;

                    // Calcular copias totales reales
                    const allPrompts = await pb.collection('prompts').getFullList({
                        filter: `author = "${userId}"`,
                        fields: 'copy_count'
                    });
                    const realCopies = allPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

                    const needsUpdate = (profile.prompts_count !== realPosts) || (profile.total_copies !== realCopies);

                    if (needsUpdate) {
                        console.log(`[ST_DEBUG] Auto-syncing profile for ${userId}: Posts ${realPosts}, Copies ${realCopies}`);
                        await pb.collection('users').update(userId, {
                            prompts_count: realPosts,
                            total_copies: realCopies
                        });
                        profile.prompts_count = realPosts;
                        profile.total_copies = realCopies;
                    }
                } catch (e) {
                    console.warn("Auto-sync error:", e);
                }

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

    async loadPrompts() {
        try {
            // ESTRATEGIA: Jump to Tail (Salto al final)
            // Ya que PocketHost falla con 'sort', saltamos a la última página para obtener lo más nuevo.
            const stats = await pb.collection('prompts').getList(1, 1);
            const total = stats.totalItems;

            let records = { items: [] };
            if (total > 0) {
                const limit = 200;
                const lastPage = Math.ceil(total / limit);

                // Obtenemos la última página (los más recientes)
                const batch1 = await pb.collection('prompts').getList(lastPage, limit);
                records.items = batch1.items;

                // Si la última página es pequeña, unimos con la anterior para asegurar volumen
                if (records.items.length < limit && lastPage > 1) {
                    const batch2 = await pb.collection('prompts').getList(lastPage - 1, limit);
                    records.items = [...batch2.items, ...records.items].slice(-limit);
                }
            }

            // Ordenar en el cliente (Descendente: más nuevo primero)
            const sortedItems = records.items.sort((a, b) => {
                const getVal = (p) => (p.created_at_custom && p.created_at_custom !== 'N/A') ? p.created_at_custom : p.created;
                const dateA = new Date(getVal(a));
                const dateB = new Date(getVal(b));
                return dateB - dateA;
            });

            this.prompts = sortedItems.map(p => ({
                id: p.id,
                title: p.title,
                prompt: p.prompt,
                negative_prompt: p.negative_prompt,
                image: p.image_url || p.image, // Normalización de campo de imagen
                author: p.author_name || p.expand?.author?.name || 'Explorador',
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
                content: p.content || [],

                // NUEVOS CAMPOS POST-MIGRACIÓN
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
                content: p.content || [],
                extraConfig: p.extra_config || [],
                tags: p.tags || [], // NUEVO: Include tags in frontend model
                profiles: p.expand?.author ? {
                    username: p.expand.author.username,
                    avatar_url: p.expand.author.avatar_url,
                    level: p.expand.author.level
                } : null
            }));

            if (window.render) window.render();
        } catch (error) {
            console.error("Error loading prompts:", error);
            this.prompts = [];
        }
        return this.prompts;
    },

    async getPublicStats() {
        try {
            // 1. Contar usuarios registrados
            const usersRes = await pb.collection('users').getList(1, 1, { fields: 'id' });
            this.stats.users = usersRes.totalItems;

            // 2. Contar prompts totales
            const promptsRes = await pb.collection('prompts').getList(1, 1, { fields: 'id' });
            this.stats.prompts = promptsRes.totalItems;

            // 3. Obtener visitas totales desde app_stats
            try {
                const statsRec = await pb.collection('app_stats').getFirstListItem('');
                if (statsRec) this.stats.visits = statsRec.total_visits || 0;
            } catch (e) {
                console.warn("app_stats record not found. Creating one...");
                // Si no existe, lo creamos (necesita permisos de creación para público o admin)
                // Usualmente el admin lo crea manualmente, pero intentamos por robustez
            }

            return this.stats;
        } catch (err) {
            console.error("Error fetching stats:", err);
            return this.stats;
        }
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

        // --- SANITIZATION ---
        const username = rawUsername.trim().replace(/['"]/g, "");

        if (this.usersCache[username] && (Date.now() - this.usersCache[username]._fetchedAt < 60000)) {
            return this.usersCache[username];
        }

        const logError = (msg) => {
            console.error(`[ST_DEBUG] ${msg}`);
            // Banner disabled to avoid UI clutter
        };

        try {
            // STRATEGY 1: HYBRID SEARCH (v7.0 - "The Dragnet")
            // Problem: API Filters cause 400 Bad Request.
            // Solution: Try strict filter. If fails, fetch raw list and filter in client (JavaScript).
            let directFound = null;

            // 1.1 Try Strict Filter First (Best case)
            try {
                const resName = await pb.collection('users').getList(1, 1, {
                    filter: `name = '${username}'`
                });
                if (resName.items.length > 0) directFound = resName.items[0];
            } catch (e1) {
                // 1.2 DRAGNET FALLBACK (If Filter Fails)
                console.warn(`[ST_DEBUG] Strategy 1 Filter Failed (${e1.status}). Engaging DRAGNET...`);

                try {
                    // Fetch top 50 users WITHOUT FILTER (Bypass API bug)
                    // We know 'valentine' is recent, so listing by -created should find him.
                    const dragnet = await pb.collection('users').getList(1, 50, {
                        sort: '-created'
                    });

                    const targetLower = username.toLowerCase();
                    directFound = dragnet.items.find(u =>
                        (u.name && u.name.toLowerCase() === targetLower) ||
                        (u.username && u.username.toLowerCase() === targetLower)
                    );

                    if (directFound) {
                        console.log(`[ST_DEBUG] DRAGNET SUCCESS: Found ${username} in raw list.`);
                    }
                } catch (e2) {
                    console.error(`[ST_DEBUG] Dragnet Failed:`, e2);
                }
            }

            if (directFound) {
                console.log(`[ST_DEBUG] Strategy 1 Found: ${username} (ID: ${directFound.id})`);
                return this._cacheUser(username, directFound);
            }

            // 1.2 Try Username (fallback)
            if (!directFound) {
                try {
                    const resUser = await pb.collection('users').getList(1, 1, {
                        filter: `username = '${username}'`
                    });
                    if (resUser.items.length > 0) directFound = resUser.items[0];
                } catch (e2) {
                    if (e2.status !== 404) console.warn(`[ST_DEBUG] Strategy 1 (User) Warn:`, e2);
                }
            }

            if (directFound) {
                console.log(`[ST_DEBUG] Strategy 1 Found: ${username} (ID: ${directFound.id})`);
                return this._cacheUser(username, directFound);
            }

            // STRATEGY 2: ID Check (If looks like ID)
            if (username.length === 15) {
                try {
                    const u = await pb.collection('users').getOne(username);
                    return this._cacheUser(username, u);
                } catch (e) { }
            }

            // STRATEGY 3: NUCLEAR FALLBACK (Fetch LARGER list & filter in memory case-insensitive)
            // CACHE CHECK (5 min validity)
            let items = [];
            const CACHE_TTL = 300000; // 5 min

            if (this.nuclearCache.items.length > 0 && (Date.now() - this.nuclearCache.lastFetch < CACHE_TTL)) {
                console.log("[ST_DEBUG] ⚡ Usando CACHÉ NUCLEAR (No se descarga nada)...");
                items = this.nuclearCache.items;
            } else {
                const nuclearRes = await pb.collection('users').getList(1, 1000, { sort: '-updated' });
                items = nuclearRes.items;

                // Update Cache
                this.nuclearCache.items = items;
                this.nuclearCache.lastFetch = Date.now();
            }

            const lowerQuery = username.toLowerCase();
            const found = items.find(u =>
                (u.name && u.name.toLowerCase() === lowerQuery) ||
                (u.username && u.username.toLowerCase() === lowerQuery)
            );

            if (found) {
                console.log(`[SUCCESS] Found user '${found.username}' via Nuclear Search (Matches: ${username})`);
                return this._cacheUser(username, found);
            }

            logError(`[FAIL] Usuario '${username}' no encontrado en los últimos 1000 registros.`);
        } catch (err) {
            logError(`[CRITICAL] Error final: ${err.message}`);
        }
        return null;
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

    async getTopCreators() {
        try {
            const records = await pb.collection('users').getList(1, 10, {
                sort: '-prompts_count'
            });
            return records.items.map(p => window.normalizeProfile ? window.normalizeProfile(p) : p);
        } catch (err) {
            return [];
        }
    },

    // --- CONTENT ACTIONS ---

    async addPrompt(data) {
        if (!this.currentUser) return { success: false, msg: "Inicia sesión para publicar" };

        let imageUrl = '';
        const uploadImage = async (base64) => {
            const compressed = await this._compressImage(base64);
            const file = this._dataURLtoFile(compressed, 'upload.webp');
            return await uploadToCloudinary(file);
        };

        let processedContent = [];
        try {
            if (data.image && data.image.startsWith('data:')) {
                imageUrl = await uploadImage(data.image);
            }
            if (data.content && Array.isArray(data.content)) {
                processedContent = await Promise.all(data.content.map(async (step) => {
                    let stepUrl = step.image;
                    if (step.image && step.image.startsWith('data:')) {
                        stepUrl = await uploadImage(step.image);
                    }
                    return { ...step, image: stepUrl };
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
                author: this.currentUser.id,
                author_name: this.currentUser.username,
                type: data.type || 'single',
                is_private: data.isPrivate || false,
                needs_reference: data.needsReference || false, // NEW: Persist reference requirement
                tool: data.tool,
                rating: data.rating,
                content: processedContent,
                tags: data.tags || [], // NUEVO
                created_at_custom: new Date().toISOString(), // Usamos ISO para asegurar orden correcto
                reactions: { like: 0, love: 0, fire: 0, funny: 0 },
                comments: [],
                saved_by: []
            });

            // --- LEVEL UP LOGIC (POSTS + COPIAS) ---
            const oldLevel = this.currentUser.level || 0;

            // Obtener total de posts
            const userPrompts = await pb.collection('prompts').getList(1, 1, {
                filter: `author = "${this.currentUser.id}"`
            });
            const totalPosts = userPrompts.totalItems;

            // Obtener total de copias de TODOS los prompts del usuario
            const allPrompts = await pb.collection('prompts').getFullList({
                filter: `author = "${this.currentUser.id}"`
            });
            const totalCopies = allPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

            // Calcular nivel (considerando posts Y copias)
            let newLevel = 0;
            LEVEL_REQS.forEach((req, idx) => {
                if (totalPosts >= req.posts && totalCopies >= req.copies) {
                    newLevel = idx;
                }
            });

            let leveledUp = false;
            if (newLevel > oldLevel) {
                leveledUp = true;
                await pb.collection('users').update(this.currentUser.id, {
                    level: newLevel,
                    prompts_count: totalPosts,
                    total_copies: totalCopies,
                    tokens: (this.currentUser.tokens || 0) + 10 // Bonus for level up
                });
            } else {
                // Just regular reward (1 token per post)
                await pb.collection('users').update(this.currentUser.id, {
                    tokens: (this.currentUser.tokens || 0) + 1,
                    prompts_count: totalPosts, // Physical backup
                    total_copies: totalCopies   // Physical backup
                });
            }

            await this._loadUserProfile(this.currentUser.id);
            await this.loadPrompts();
            this.logActivity('publish', { postId: data.title, type: data.type });

            return {
                success: true,
                leveledUp: leveledUp,
                newLevel: newLevel,
                tokensEarned: leveledUp ? 10 : 1
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
        if (!this.currentUser || this.currentUser.tokens < amount) return { success: false, msg: 'Saldo insuficiente' };
        try {
            let actualRecipientId = recipientId;
            let authorUsername = '';
            if (postId) {
                const prompt = this.prompts.find(p => String(p.id) === String(postId));
                if (prompt) { actualRecipientId = prompt.author_id; authorUsername = prompt.author; }
            }
            if (!actualRecipientId) return { success: false };

            const recipient = await pb.collection('users').getOne(actualRecipientId);
            const batch = pb.createBatch();
            batch.collection('users').update(this.currentUser.id, { tokens: this.currentUser.tokens - amount });
            batch.collection('users').update(actualRecipientId, { tokens: (recipient.tokens || 0) + amount });
            batch.collection('activity_logs').create({
                user: this.currentUser.id,
                action: 'send_tip',
                details: { amount, recipient: authorUsername || actualRecipientId }
            });
            await batch.send();
            await this._loadUserProfile(this.currentUser.id);
            return { success: true };
        } catch (err) { return { success: false }; }
    },

    async followUser(targetUsername) {
        if (!this.currentUser) return { success: false };
        try {
            // Find target user by name (identificador real post-migración)
            const target = await pb.collection('users').getFirstListItem(`name="${targetUsername}"`);
            if (!target) return { success: false };

            const following = [...(this.currentUser.following || [])];
            const followers = [...(target.followers || [])];

            const idx = following.indexOf(target.id);
            if (idx > -1) {
                // Unfollow
                following.splice(idx, 1);
                const fIdx = followers.indexOf(this.currentUser.id);
                if (fIdx > -1) followers.splice(fIdx, 1);
            } else {
                // Follow
                following.push(target.id);
                followers.push(this.currentUser.id);
            }

            const batch = pb.createBatch();
            batch.collection('users').update(this.currentUser.id, { following });
            batch.collection('users').update(target.id, { followers });
            await batch.send();

            this.currentUser.following = following;
            this.logActivity('follow', { target: targetUsername });
            return { success: true };
        } catch (err) { return { success: false }; }
    },



    async updateUserSettings(data) {
        if (!this.currentUser) return { success: false };
        try {
            const updateData = {
                username: data.username,
                socials: data.socials,
                moderation: data.moderation
            };
            if (data.avatar) updateData.avatar_url = data.avatar;

            const record = await pb.collection('users').update(this.currentUser.id, updateData);
            this.currentUser = { ...this.currentUser, ...record };
            return { success: true };
        } catch (err) { return { success: false, msg: err.message }; }
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

    async adminDeleteUser(userId) {
        if (!this.currentUser || (this.currentUser.role !== 'admin' && this.currentUser.username !== 'rodrigodlmoral' && this.currentUser.username !== 'rodridomrock')) return { success: false };
        try {
            await pb.collection('users').delete(userId);
            await this.adminLoadAllUsers();
            return { success: true };
        } catch (err) { return { success: false, msg: err.message }; }
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
            return { success: false, msg: "Credenciales inválidas o error de conexión" };
        }
    },

    async register(email, username, password) {
        try {
            await pb.collection('users').create({
                username, email, password, passwordConfirm: password,
                name: username, tokens: 100, level: 0, xp: 0, role: 'user'
            });

            // SOLICITAR VERIFICACIÓN AUTOMÁTICAMENTE
            await pb.collection('users').requestVerification(email);

            return { success: true };
        } catch (error) {
            return { success: false, msg: "Error al crear cuenta o el usuario/email ya existe." };
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

    async confirmResetPassword(token, password, userOrEmail) {
        try {
            // 1. Confirmar el cambio de contraseña
            await pb.collection('users').confirmPasswordReset(token, password, password);

            // 2. Login automático inmediatamente
            return await this.login(userOrEmail, password);
        } catch (err) {
            console.error("Reset error:", err);
            return { success: false, msg: "El link ha expirado o es inválido." };
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

            // Subida de nivel al autor
            await this._checkAuthorLevelUp(prompt.author);

            return { success: true, count: newVal };
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
        const mod = this.currentUser?.moderation || { suggestive: 'ON', nsfw: 'BLUR' };
        let applyBlur = false; let warningLabel = '';
        if (rating === 'Sugestivo' && mod.suggestive === 'BLUR') { applyBlur = true; warningLabel = 'SUGESTIVO'; }
        if (rating === 'NSFW / +18' && mod.nsfw === 'BLUR') { applyBlur = true; warningLabel = 'NSFW'; }
        return { applyBlur, warningLabel };
    },

    openDetail(id) {
        const p = this.prompts.find(x => String(x.id) === String(id));
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
        const p = this.prompts.find(x => String(x.id) === String(this.activePostId));
        if (!p || p.type !== 'sequence') return;
        this.currentSeqStep = (this.currentSeqStep - 1 + p.content.length) % p.content.length;
        this.updateSeqDisplay(p);
    },

    nextSeqStep() {
        const p = this.prompts.find(x => String(x.id) === String(this.activePostId));
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
        const p = this.prompts.find(x => String(x.id) === String(this.activePostId));
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
    }
};

window.store = store;
export { store };
