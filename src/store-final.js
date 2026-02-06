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

export const TOOLS = ['ChatGPT', 'Gemini', 'Grok', 'Meta', 'DIGEN AI', 'SD 1.5', 'SD 2.0', 'SDXL', 'Flux', 'Midjourney', 'Huggingface', 'Fooocus', 'ComfyUI', 'Perchance', 'Otro'];
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

    async init() {
        if (pb.authStore.isValid && pb.authStore.model) {
            await this._loadUserProfile(pb.authStore.model.id);
        }
        await this.loadPrompts();
    },

    async _loadUserProfile(userId) {
        try {
            const record = await pb.collection('users').getOne(userId);
            if (record) {
                const profile = window.normalizeProfile ? window.normalizeProfile(record) : record;

                // --- DYNAMIC AUTO-SYNC & ROBUSTNESS ---
                try {
                    const stats = await pb.collection('prompts').getList(1, 1, {
                        filter: `author = "${userId}"`,
                        fields: 'id'
                    });
                    const realPosts = stats.totalItems || 0;

                    // Si el valor en DB es distinto al real, lo corregimos físicamente en la DB
                    if (profile.prompts_count !== realPosts) {
                        await pb.collection('users').update(userId, {
                            prompts_count: realPosts
                        });
                        profile.prompts_count = realPosts;
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
            // NO usar sort: '-created' porque causa error 400 en PocketHost
            const records = await pb.collection('prompts').getList(1, 100);

            // Ordenar en el cliente
            const sortedItems = records.items.sort((a, b) => {
                return new Date(b.created) - new Date(a.created);
            });

            this.prompts = sortedItems.map(p => ({
                id: p.id,
                title: p.title,
                prompt: p.prompt,
                negative_prompt: p.negative_prompt,
                image: p.image_url || p.image, // Normalización de campo de imagen
                author: p.author_name || p.expand?.author?.name || 'Explorador',
                author_id: p.author,
                createdAt: new Date(p.created || p.created_at_original).getTime(),
                created_at: p.created,
                reactions: p.reactions || { like: 0, love: 0, fire: 0, funny: 0 },
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
                admin_featured: p.admin_featured || false,
                is_featured: p.is_featured || false,
                featured_until: p.featured_until || null,
                tool: p.tool || 'ChatGPT',
                content: p.content || [],
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

    async fetchUserProfileByUsername(rawUsername) {
        if (!rawUsername) return null;

        // --- SANITIZATION ---
        const username = rawUsername.trim().replace(/['"]/g, "");

        if (this.usersCache[username] && (Date.now() - this.usersCache[username]._fetchedAt < 60000)) {
            return this.usersCache[username];
        }

        const logError = (msg) => {
            console.error(`[ST_DEBUG] ${msg}`);
            // INJECT ERROR INTO DOM (User requested visibility)
            const banner = document.getElementById('debug-banner') || document.createElement('div');
            banner.id = 'debug-banner';
            banner.style.cssText = "position:fixed; top:0; left:0; width:100%; background:red; color:white; font-size:12px; z-index:99999; padding:5px; text-align:center;";
            banner.innerText = msg;
            document.body.appendChild(banner);
            setTimeout(() => banner.remove(), 10000);
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
                console.log("[ST_DEBUG] ☢️ Iniciando NUCLEAR SEARCH (1000 items from DB)...");
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
                logError(`[SUCCESS] Found user '${found.username}' via Nuclear Search (Matches: ${username})`);
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
            await pb.collection('activity_logs').create({
                user: this.currentUser.id,
                action: action,
                details: details
            });
            window.trackEvent(action, details);
        } catch (err) {
            console.warn("Failed to log activity:", err);
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
                content: data.content
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

        let reactions = { ...(prompt.reactions || { like: 0, love: 0, fire: 0, funny: 0 }) };
        reactions[type] = (reactions[type] || 0) + 1;

        try {
            await pb.collection('prompts').update(postId, { reactions: reactions });
            this.logActivity(type, { postTitle: prompt.title || 'Post' });
            return { success: true, count: reactions[type] };
        } catch (error) { return { success: false }; }
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

    async changePassword(newPass) {
        if (!this.currentUser) return { success: false };
        try {
            await pb.collection('users').update(this.currentUser.id, {
                password: newPass,
                passwordConfirm: newPass
            });
            return { success: true };
        } catch (err) { return { success: false }; }
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

    // --- AUTH ---

    async login(email, password) {
        try {
            const authData = await pb.collection('users').authWithPassword(email, password);
            if (authData) {
                await this._loadUserProfile(authData.record.id);
                location.reload();
                return { success: true };
            }
        } catch (error) { return { success: false, msg: "Credenciales inválidas" }; }
    },

    async register(email, username, password) {
        try {
            await pb.collection('users').create({
                username, email, password, passwordConfirm: password,
                name: username, tokens: 100, level: 0, xp: 0, role: 'user'
            });
            return { success: true };
        } catch (error) { return { success: false, msg: "Error al crear cuenta" }; }
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
        const COPY_COOLDOWN = 10000; // 10 segundos
        const now = Date.now();
        const userId = this.currentUser?.id || 'anon';
        const key = `${userId}_${promptId}`;

        // Cooldown anti-spam
        if (!window._lastCopyTime) window._lastCopyTime = {};
        if (window._lastCopyTime[key] && (now - window._lastCopyTime[key]) < COPY_COOLDOWN) {
            console.warn('⏱️ Cooldown activo para copias (10s)');
            return { success: false, msg: 'Espera unos segundos antes de copiar de nuevo' };
        }

        window._lastCopyTime[key] = now;

        try {
            const prompt = await pb.collection('prompts').getOne(promptId);

            // Anti-spam: No incrementar si el autor copia su propio prompt
            if (this.currentUser && prompt.author === this.currentUser.id) {
                console.log('🚫 Auto-copia detectada, no se incrementa contador');
                return { success: true, selfCopy: true };
            }

            const newCount = (prompt.copy_count || 0) + 1;
            await pb.collection('prompts').update(promptId, {
                copy_count: newCount
            });

            // Verificar si el autor debe subir de nivel
            await this._checkAuthorLevelUp(prompt.author);

            console.log(`✅ Copy count incrementado: ${newCount}`);
            return { success: true, count: newCount };
        } catch (err) {
            console.error('❌ Error incrementando copy_count:', err);
            return { success: false, msg: err.message };
        }
    },

    // --- VERIFICACIÓN AUTOMÁTICA DE NIVEL DEL AUTOR ---
    async _checkAuthorLevelUp(authorId) {
        try {
            // Obtener todos los prompts del autor
            const authorPrompts = await pb.collection('prompts').getFullList({
                filter: `author = "${authorId}"`
            });

            const totalPosts = authorPrompts.length;
            const totalCopies = authorPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

            // Calcular nivel correcto basado en posts Y copias
            let newLevel = 0;
            LEVEL_REQS.forEach((req, idx) => {
                if (totalPosts >= req.posts && totalCopies >= req.copies) {
                    newLevel = idx;
                }
            });

            // Obtener nivel actual del autor
            const author = await pb.collection('users').getOne(authorId);

            // Si el nivel, posts o copias cambiaron, actualizar
            if (newLevel > (author.level || 0) || author.prompts_count !== totalPosts || author.total_copies !== totalCopies) {
                await pb.collection('users').update(authorId, {
                    level: Math.max(newLevel, author.level || 0),
                    prompts_count: totalPosts,
                    total_copies: totalCopies
                });
                if (newLevel > (author.level || 0)) {
                    console.log(`🎉 Usuario ${author.username} subió a Nivel ${newLevel} (${LEVEL_REQS[newLevel].name})!`);
                }
            }
        } catch (err) {
            console.warn('⚠️ Error checking author level:', err);
        }
    }
};

window.store = store;
export { store };
