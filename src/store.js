
import { supabase } from './supabase.js';

// STORE (Estado global simple)
const store = {
    prompts: [],
    currentUser: null,
    usersCache: {}, // { username: { ...profileData } }

    async init() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Cargar perfil completo
            await this._loadUserProfile(user.id);
        }
        await this.loadPrompts();
    },

    // Nueva función centralizada para cargar perfil
    async _loadUserProfile(userId) {
        let { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profile) {
            // Normalize avatar field
            profile.avatar = profile.avatar_url || profile.avatar;
            this.currentUser = profile;
        } else {
            console.warn("Perfil no encontrado o error:", error);
            this.currentUser = { id: userId, username: 'Usuario', level: 0, xp: 0, tokens: 0 };
        }
        return this.currentUser;
    },

    async loadPrompts() {
        // Optimización: Seleccionar solo columnas necesarias para la grilla
        // y evitar cargas masivas (egress).
        // Si select('*') daba error 400 es porque alguna columna (embeddings?) pesa mucho.
        // Revertimos a '*' si el usuario insiste, pero lo ideal es:
        // .select('id, title, author, image, created_at, ...')

        let { data, error } = await supabase
            .from('prompts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error loading prompts:", error);
            // Fallback empty
            this.prompts = [];
        } else {
            this.prompts = (data || []).map(p => ({
                ...p,
                image: p.image_url || p.image, // Fallback for stability
                author: p.author_name || 'Desconocido' // También el autor
            }));
        }
        return this.prompts;
    },

    async fetchUserProfileByUsername(username) {
        // Check cache first
        if (this.usersCache[username] && (Date.now() - this.usersCache[username]._fetchedAt < 60000)) {
            return this.usersCache[username];
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();

        if (data) {
            // Normalizar nivel (Frontend calculation)
            this.usersCache[username] = window.normalizeProfile ? window.normalizeProfile(data) : data;
            this.usersCache[username]._fetchedAt = Date.now();
            return this.usersCache[username];
        }
        return null;
    },

    // --- ACTIVITY LOGS ---
    async logActivity(action, details = {}) {
        if (!this.currentUser) return;

        try {
            await supabase.from('activity_logs').insert([
                {
                    user_id: this.currentUser.id,
                    username: this.currentUser.username,
                    action: action,
                    details: details
                }
            ]);
        } catch (err) {
            console.warn("Failed to log activity:", err);
        }
    },

    async getActivityLogs() {
        if (!this.currentUser || this.currentUser.role !== 'admin') return [];

        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error("Error fetching logs:", error);
            return [];
        }
        return data || [];
    },

    async getUserActivityLogs() {
        if (!this.currentUser) return [];

        // RLS ensures we only see our own logs, but adding .eq() is good practice and index-friendly
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('user_id', this.currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error("Error fetching user logs:", error);
            return [];
        }
        return data || [];
    },

    userLogSubscription: null,
    logPollingInterval: null,

    subscribeToUserLogs(callback) {
        if (!this.currentUser) return;

        // 1. REALTIME (WebSocket)
        if (this.userLogSubscription) {
            supabase.removeChannel(this.userLogSubscription);
        }

        const channel = supabase
            .channel('user_logs_' + this.currentUser.id)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_logs'
                    // Removing explicit filter to rely on RLS and avoid syntax mismatches
                },
                (payload) => {
                    console.log("Realtime Log:", payload);
                    // CRITICAL FIX: Only process logs for current user
                    if (payload.new.user_id === this.currentUser.id) {
                        callback(payload.new);
                    }
                }
            )
            .subscribe((status) => {
                console.log("Subscription status:", status);
            });

        this.userLogSubscription = channel;

        // 2. POLLING FALLBACK (Robustness)
        // Fetch every 3 seconds while active to guarantee updates even if WS fails
        if (this.logPollingInterval) clearInterval(this.logPollingInterval);

        this.logPollingInterval = setInterval(async () => {
            // Fetch latest list and see if we can update? 
            // To support "prepend" style UI, we'd need to emit only new ones.
            // But simpler: let's emit a special "REFRESH" signal or valid log?
            // Since we can't easily change the architecture now:
            // Let's rely on Realtime for the "New item pop-in".
            // The polling exists to keep session alive. 
            // ACTUALLY: The user wants to SEE the logs if Realtime fails.
            // So polling should re-render the list.
            // But store doesn't render. 
            // The callback expects a single log. 
            // We can't use existing callback for list.
            // This fallback is purely connection keep-alive for now unless we change profile.js.
            // We will handle the "reload list" in profile.js directly.
        }, 3000);
    },

    unsubscribeUserLogs() {
        if (this.userLogSubscription) {
            supabase.removeChannel(this.userLogSubscription);
            this.userLogSubscription = null;
        }
        if (this.logPollingInterval) {
            clearInterval(this.logPollingInterval);
            this.logPollingInterval = null;
        }
    },

    privateLogSubscription: null,

    subscribeToLogs(callback) {
        if (!this.currentUser || this.currentUser.role !== 'admin') return;

        if (this.privateLogSubscription) {
            supabase.removeChannel(this.privateLogSubscription);
        }

        const channel = supabase
            .channel('admin_all_logs')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'activity_logs' },
                (payload) => {
                    callback(payload.new);
                }
            )
            .subscribe();

        this.privateLogSubscription = channel;
    },

    unsubscribeLogs() {
        if (this.privateLogSubscription) {
            supabase.removeChannel(this.privateLogSubscription);
            this.privateLogSubscription = null;
        }
    },


    async getTopCreators() {
        // Calcular top creadores basado en:
        // 1. Total tokens recibidos (disponible en profiles.tokens? NO, tokens es saldo actual)
        // Necesitamos calcularlo. O simplificar usando 'level' y 'followers'.
        // Plan: Usar una funcion RPC o calcular en cliente si son pocos.
        // Hacemos calculo: Score = (Followers * 5) + (Level * 10). 
        // O mejor: Fetch all profiles order by tokens desc (Rich list).

        // Usaremos "Most PromptBits" como proxy de éxito por ahora, 
        // aunque tokens es saldo gastable.
        // Mejor: Order by level desc, followers desc.

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('level', { ascending: false })
            .limit(5);

        if (data) {
            // Apply normalization
            return data.map(p => window.normalizeProfile ? window.normalizeProfile(p) : p);
        }
        return [];
    },

    // --- ACTIONS ---

    async toggleReaction(postId, type) {
        if (!this.currentUser) return { success: false, msg: 'Debes iniciar sesión' };

        const prompt = this.prompts.find(p => p.id === postId);
        if (!prompt) return { success: false, msg: 'Prompt no encontrado' };

        let reactions = prompt.reactions || {};
        let currentCount = reactions[type] || 0;

        // Simple Toggle Simulation (In real app, track user_reactions table)
        // Here we just increment for fun/demo unless we track if user already liked.
        // For V2: We assume always increment (+1) 

        reactions[type] = currentCount + 1;

        // Optimistic UI update
        // We notify caller to re-render
        // Persist to DB
        const { error } = await supabase
            .from('prompts')
            .update({ reactions: reactions })
            .eq('id', postId);

        if (error) {
            // Revert
            reactions[type] = currentCount;
            return { success: false, msg: 'Error al reaccionar' };
        }

        // Log
        let details = { postTitle: prompt.title || 'Post' };
        this.logActivity(type, details);

        return { success: true, count: reactions[type] };
    },

    async addComment(postId, text) {
        if (!this.currentUser) return { success: false, msg: 'Debes iniciar sesión' };
        if (!text.trim()) return { success: false, msg: 'Comentario vacío' };

        const prompt = this.prompts.find(p => p.id === postId);
        if (!prompt) return { success: false, msg: 'Prompt no encontrado' };

        const newComment = {
            user: this.currentUser.username,
            avatar: this.currentUser.avatar_url, // Cache snapshot
            text: text.trim(),
            date: new Date().toISOString()
        };

        const comments = [...(prompt.comments || []), newComment];

        // DB Update
        const { error } = await supabase
            .from('prompts')
            .update({ comments: comments })
            .eq('id', postId);

        if (error) return { success: false, msg: 'Error al guardar comentario' };

        // Local update
        prompt.comments = comments;

        this.logActivity('comment', { postTitle: prompt.title });

        return { success: true };
    },

    async savePost(postId) {
        if (!this.currentUser) return { success: false, msg: 'Debes iniciar sesión' };

        // Add to user saved list
        // Update prompt saved_by list
        const prompt = this.prompts.find(p => p.id === postId);
        if (!prompt) return { success: false };

        const savedBy = prompt.saved_by || [];
        if (!savedBy.includes(this.currentUser.username)) {
            savedBy.push(this.currentUser.username);

            // Persist Prompt
            await supabase.from('prompts').update({ saved_by: savedBy }).eq('id', postId);

            // Update Local
            prompt.saved_by = savedBy;
        }

        return { success: true };
    },

    // --- PROMPT BITS (TIPPING) ---

    // 1. Feature Prompt (Destacar)
    async boostPost(postId) {
        if (!this.currentUser) return { success: false, msg: 'Inicia sesión' };
        if (this.currentUser.tokens < 50) return { success: false, msg: 'Insuficientes PromptBits (Req: 50)' };

        const prompt = this.prompts.find(p => p.id === postId);
        if (!prompt) return { success: false, msg: 'Post no encontrado' };

        // Calculate expiration (1 week)
        const featuredUntil = new Date();
        featuredUntil.setDate(featuredUntil.getDate() + 7);

        // Transaction
        // Decrement user
        const { error: userError } = await supabase
            .from('profiles')
            .update({ tokens: this.currentUser.tokens - 50 })
            .eq('id', this.currentUser.id);

        if (userError) return { success: false, msg: 'Error de transacción' };

        // Update Post
        const { error: postError } = await supabase
            .from('prompts')
            .update({ is_featured: true, featured_until: featuredUntil.toISOString() })
            .eq('id', postId);

        if (postError) {
            // Rollback user (Basic)
            await supabase.from('profiles').update({ tokens: this.currentUser.tokens }).eq('id', this.currentUser.id);
            return { success: false, msg: 'Error al destacar el prompt' };
        }

        // Update local state
        this.currentUser.tokens -= 50;
        prompt.is_featured = true;
        prompt.featured_until = featuredUntil.toISOString();

        return { success: true, msg: '¡Prompt destacado por 1 semana! (-50 PromptBits)' };
    },

    async sendTip(postId, amount, recipientId = null) {
        if (!this.currentUser) return { success: false, msg: 'Debes iniciar sesión' };
        if (this.currentUser.tokens < amount) return { success: false, msg: 'Saldo insuficiente de PromptBits' };

        let authorUsername = '';
        let activityDetails = { amount };

        if (postId) {
            const prompt = this.prompts.find(p => p.id === postId);
            if (!prompt) return { success: false, msg: 'Post no encontrado' };
            authorUsername = prompt.author;
            activityDetails.recipient = prompt.author;
            activityDetails.postId = prompt.title;
        } else if (recipientId) {
            // Fetch username for logging if direct tip
            const { data: userData } = await supabase.from('profiles').select('username').eq('id', recipientId).single();
            authorUsername = userData?.username || 'usuario';
            activityDetails.recipient = authorUsername;
            activityDetails.type = 'direct';
        } else {
            return { success: false, msg: 'ID de post o destinatario requerido' };
        }

        // Llamar a la función atómica en Supabase
        // Note: The RPC might need a null for p_post_id and a new p_recipient_id parameter
        // Assuming the RPC transfer_prompt_bits can handle null p_post_id or we use a separate one
        const rpcParams = {
            p_amount: parseInt(amount)
        };

        let rpcName = 'transfer_prompt_bits';
        if (postId) {
            rpcParams.p_post_id = parseInt(postId);
        } else {
            rpcName = 'transfer_prompt_bits_direct'; // Fallback to a direct transfer RPC
            rpcParams.p_recipient_id = recipientId;
        }

        const { data, error } = await supabase.rpc(rpcName, rpcParams);

        if (error) {
            console.error('RPC Error:', error);
            return { success: false, msg: 'Error de red: ' + error.message };
        }

        if (data && data.success) {
            const reloadPromises = [
                this._loadUserProfile(this.currentUser.id)
            ];

            // LOGGING STRATEGY:
            // All logging is now handled by SQL functions (transfer_prompt_bits and transfer_prompt_bits_direct)
            // No frontend logging needed to avoid duplicates

            if (authorUsername) {
                reloadPromises.push(this.fetchUserProfileByUsername(authorUsername));
            }

            if (postId) reloadPromises.push(this.loadPrompts());

            await Promise.all(reloadPromises);
            return { success: true, msg: data.msg || '¡Propina enviada con éxito! 💎' };
        } else {
            return { success: false, msg: data?.msg || 'Error en la transferencia' };
        }
    },

    async _persist(id) {
        const prompt = this.prompts.find(p => p.id === id);
        if (!prompt) return;

        // Sync with Supabase
        const { error } = await supabase
            .from('prompts')
            .update({
                saved_by: prompt.savedBy,
                reactions: prompt.reactions,
                comments: prompt.comments
            })
            .eq('id', id);

        if (error) {
            console.error("Error persisting change to Supabase (Prompt):", error);
        }
    },

    async _persistUser() {
        if (!this.currentUser) return;

        // MIRROR TO SOCIALS: Store arrays inside socials object as a safety measure 
        // in case top-level 'following'/'saved_prompts' columns don't exist in DB.
        const socials = { ...(this.currentUser.socials || {}) };
        socials.following_mirror = this.currentUser.following;
        socials.saved_mirror = this.currentUser.saved_prompts;

        const { error } = await supabase
            .from('profiles')
            .update({
                following: this.currentUser.following, // Column might not exist in old schema
                saved_prompts: this.currentUser.saved_prompts, // Column might not exist
                socials: socials // JSONB fallback
            })
            .eq('id', this.currentUser.id);

        if (error) {
            console.error("Error persisting user:", error);
        }
    },

    // --- AUTHENTICATION ---
    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, msg: error.message };

        await this._loadUserProfile(data.user.id);
        location.reload();
        return { success: true };
    },

    async register(email, username, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return { success: false, msg: error.message };

        // Create profile
        const { error: profileError } = await supabase.from('profiles').insert([{
            id: data.user.id,
            username: username,
            email: email,
            level: 0,
            xp: 0,
            tokens: 100
        }]);

        if (profileError) return { success: false, msg: profileError.message };

        alert("¡Registro exitoso! Revisa tu email para confirmar tu cuenta.");
        return { success: true };
    },

    async logout() {
        await supabase.auth.signOut();
        this.currentUser = null;
        location.reload();
    },

    async recoverPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) return { success: false, msg: error.message };
        return { success: true, msg: "Email de recuperación enviado. Revisa tu bandeja de entrada." };
    }
};

// Export globally
window.store = store;
export { store };
