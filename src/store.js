import { supabase } from './supabase.js'
import { uploadToCloudinary } from './uploadService.js'

// Base de Datos Real (Supabase) + Estado Local
export const store = {
    currentUser: null,
    users: [], // Cache de usuarios para búsquedas rápidas
    prompts: [],

    async init() {
        // 1. Recuperar sesión
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            console.log("✅ Sesión recuperada:", session.user.id);
            await this._loadUserProfile(session.user.id);
            // Proactive sync for current user level
            this.checkLevelUp(session.user.id, this.currentUser?.level || 0);
        } else if (localStorage.getItem('pg_master_role') === 'true') {
            await this._loadUserProfile('MASTER_ADMIN_ID');
        }


        // 2. Removed global loadUsers() to save Egress. Use fetchUserProfileByUsername(username) instead.

        // 2. Escuchar cambios de sesión (Login/Logout externos)
        supabase.auth.onAuthStateChange((event, session) => {
            console.log(`🔐 Auth Event: ${event}`, session?.user?.id);

            // Evitar recargas si es solo un refresco de token y ya tenemos usuario
            if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                if (this.currentUser && session && this.currentUser.id === session.user.id) return;
            };

            if (session) {
                // Bloqueo estricto: Si ya tengo este usuario cargado, NO HAGO NADA.
                if (this.currentUser && this.currentUser.id === session.user.id) {
                    return;
                }
                // Si es un nuevo usuario (login), cargamos perfil
                this._loadUserProfile(session.user.id);
            } else {
                // Logout o sesión expirada
                if (this.currentUser && this.currentUser.id === 'MASTER_ADMIN_ID') return;

                if (this.currentUser) {
                    console.log("👋 Sesión cerrada o expirada.");
                    this.currentUser = null;
                    if (window.render) window.render();
                }
            }
        });

        // 3. Cargar datos iniciales (Prompts públicos)
        await this.loadPrompts();

        // 4. Limpieza local de destacados expirados
        if (this.prompts) {
            const now = new Date();
            this.prompts.forEach(p => {
                if (p.is_featured && p.featured_until && new Date(p.featured_until) < now) {
                    p.is_featured = false;
                }
            });
        }
    },

    // _loadLocalData DEPRECATED - Removed logic
    _loadLocalData() { },

    async _loadUserProfile(uid) {
        if (uid === 'MASTER_ADMIN_ID') {
            this.currentUser = {
                id: 'MASTER_ADMIN_ID',
                username: 'admi',
                email: 'admin@system.local',
                role: 'admin',
                avatar: 'https://robohash.org/admi?set=set4',
                socials: {},
                following: [],
                saved_prompts: []
            };
            if (window.render) window.render();
            return;
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single();

        // Count prompts for level logic
        const { count: promptsCount } = await supabase
            .from('prompts')
            .select('*', { count: 'exact', head: true })
            .eq('author_id', uid);

        if (data) {
            let userProfile = this._normalizeProfile({ ...data, prompts_count: promptsCount || 0 });

            // RETROACTIVE CHECK: Verify level on load
            const { leveledUp, newLevel } = await this.checkLevelUp(uid, userProfile.level);
            if (leveledUp) {
                userProfile.level = newLevel; // Update local immediately
            }

            this.currentUser = userProfile;
        } else {
            console.error("Perfil no encontrado", error);
        }
        if (window.render) window.render();
    },

    getAllUsers() {
        return this.users;
    },

    async loadUsers() {
        // Disabled for Egress health. Do not call this globally.
        console.warn("Global loadUsers() disabled. Use fetchUserProfileByUsername for specific profiles.");
    },

    async adminLoadAllUsers() {
        if (!this.currentUser || this.currentUser.role !== 'admin') return;

        console.log("Admin loading all users...");
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('username', { ascending: true });

        if (error) {
            console.error("Error loading all users (admin):", error);
            return;
        }

        if (data) {
            this.users = data.map(u => this._normalizeProfile(u));
            if (window.render) window.render();
        }
    },

    async fetchUserProfileByUsername(username) {
        if (!username) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();

        if (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }

        const normalized = this._normalizeProfile(data);

        // AUTO-HEAL: If visitor is ADMIN, trigger a DB level sync for the viewed user
        if (this.currentUser && this.currentUser.role === 'admin' && normalized.id !== 'MASTER_ADMIN_ID') {
            this.checkLevelUp(normalized.id, normalized.level);
        }

        // Cache it
        const idx = this.users.findIndex(u => u.username === username);
        if (idx > -1) this.users[idx] = normalized;
        else this.users.push(normalized);

        return normalized;
    },

    async getTopCreators() {
        try {
            // 1. Get all prompts (lightweight) to calculate counts
            const { data: prompts, error } = await supabase.from('prompts').select('author_id');
            if (error) throw error;

            // 2. Aggregate counts
            const counts = {};
            prompts.forEach(p => { counts[p.author_id] = (counts[p.author_id] || 0) + 1; });

            // 3. Sort and take top 10
            const sortedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 10);

            if (sortedIds.length === 0) return [];

            // 4. Fetch details for these users
            const { data: profiles, error: pError } = await supabase.from('profiles').select('*').in('id', sortedIds);
            if (pError) throw pError;

            // 5. Merge, normalize and return
            const topCreators = sortedIds.map(id => {
                const p = profiles.find(prof => prof.id === id);
                if (!p) return null;

                // CRITICAL: Normalize to ensure dynamic level calculation is applied
                const normalized = this._normalizeProfile({
                    ...p,
                    prompts_count: counts[id]
                });

                // Cache it for ProfileHeader etc.
                const idx = this.users.findIndex(u => u.id === normalized.id);
                if (idx > -1) this.users[idx] = normalized;
                else this.users.push(normalized);

                return normalized;
            }).filter(Boolean);

            return topCreators;

        } catch (err) {
            console.error("Error fetching top creators:", err);
            return [];
        }
    },

    // --- LEVEL SYSTEM ---
    async getUserStats(uid) {
        // Fetch all prompts for user to count totals
        const { data: prompts, error } = await supabase
            .from('prompts')
            .select('copy_count')
            .eq('author_id', uid);

        if (error || !prompts) return { posts: 0, copies: 0 };

        const posts = prompts.length;
        const copies = prompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);
        return { posts, copies };
    },

    async checkLevelUp(uid, currentLevel) {
        const { posts, copies } = await this.getUserStats(uid);

        const THRESHOLDS = [
            { level: 5, posts: 250, copies: 50 },
            { level: 4, posts: 100, copies: 30 },
            { level: 3, posts: 50, copies: 15 },
            { level: 2, posts: 25, copies: 0 },
            { level: 1, posts: 10, copies: 0 }
        ];

        // Find highest matching level
        const match = THRESHOLDS.find(t => posts >= t.posts && copies >= t.copies);
        const newLevel = match ? match.level : 0;

        if (newLevel > currentLevel) {
            console.log(`🎉 Level Up! ${currentLevel} -> ${newLevel}`);

            // Update DB
            const { error } = await supabase
                .from('profiles')
                .update({ level: newLevel })
                .eq('id', uid);

            if (!error) {
                this.logActivity('levelup', { old: currentLevel, new: newLevel });
                return { leveledUp: true, newLevel };
            }
        }
        return { leveledUp: false, newLevel: currentLevel }; // No change
    },

    _normalizeProfile(data) {
        if (!data) return null;
        const socials = data.socials || {};

        // SECURITY MIRROR PRIORITY: If we have data in socials mirror, compare it with columns
        // This handles cases where columns exist but fail to update due to schema issues
        const tokens = Math.max(data.tokens || 0, socials._tokens || 0);
        const lastCommAt = Math.max(data.last_comment_at || 0, socials._last_comment_at || 0);

        // For daily count, we only use the mirror if the day matches
        let dailyCount = data.daily_comment_count || 0;
        let commDay = data.last_comment_day || "";

        if (socials._last_comm_day === commDay && socials._daily_comm_count > dailyCount) {
            dailyCount = socials._daily_comm_count;
        } else if (socials._last_comm_day && !commDay) {
            dailyCount = socials._daily_comm_count;
            commDay = socials._last_comm_day;
        }

        const prompts_count = data.prompts_count || 0;

        // Dynamic Level Calculation (Fallback for unsynced DB levels)
        let calculatedLevel = 0;
        if (prompts_count >= 250) calculatedLevel = 5;
        else if (prompts_count >= 100) calculatedLevel = 4;
        else if (prompts_count >= 50) calculatedLevel = 3;
        else if (prompts_count >= 25) calculatedLevel = 2;
        else if (prompts_count >= 10) calculatedLevel = 1;

        const effectiveLevel = Math.max(data.level || 0, calculatedLevel);

        return {
            ...data,
            role: data.role || 'user',
            avatar: data.avatar_url,
            socials: socials,
            moderation: data.moderation || { suggestive: 'ON', nsfw: 'BLUR' },
            following: data.following || socials._following || [],
            saved_prompts: data.saved_prompts || socials._saved || [],
            level: effectiveLevel,
            tokens: tokens,
            prompts_count: prompts_count,
            badges: data.badges || [],
            daily_comment_count: dailyCount,
            last_comment_day: commDay,
            last_comment_at: lastCommAt
        };
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

    subscribeToUserLogs(callback) {
        if (!this.currentUser) return;

        // Remove existing sub if any
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
                    table: 'activity_logs',
                    filter: 'user_id=eq.' + this.currentUser.id
                },
                (payload) => {
                    console.log("New User Log:", payload);
                    callback(payload.new);
                }
            )
            .subscribe();

        this.userLogSubscription = channel;
    },

    unsubscribeUserLogs() {
        if (this.userLogSubscription) {
            supabase.removeChannel(this.userLogSubscription);
            this.userLogSubscription = null;
        }
    },

    privateLogSubscription: null,

    subscribeToLogs(callback) {
        if (!this.currentUser || this.currentUser.role !== 'admin') return;

        // Remove existing if any
        this.unsubscribeLogs();

        console.log("📡 Activando Realtime para logs...");
        this.privateLogSubscription = supabase
            .channel('public:activity_logs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, payload => {
                console.log("🔔 Nuevo log recibido:", payload.new);
                if (callback) callback(payload.new);
            })
            .subscribe();
    },

    unsubscribeLogs() {
        if (this.privateLogSubscription) {
            console.log("📵 Desactivando Realtime para logs.");
            supabase.removeChannel(this.privateLogSubscription);
            this.privateLogSubscription = null;
        }
    },

    // --- AUTH ---

    async register(email, username, password) {
        // 1. Crear Auth User
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) return { success: false, msg: error.message };
        const user = data.user;

        // 2. Crear Perfil Público (Tabla 'profiles')
        if (user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: user.id,
                        username: username,
                        email: email,
                        avatar_url: `https://robohash.org/${username}`
                    }
                ]);

            if (profileError) {
                return { success: false, msg: "Usuario creado pero falló el perfil: " + profileError.message };
            }
        }

        // window.location.reload(); // Removed to prevent session loss race condition
        // Listener will also pick this up if auto-sign-in happens
        return { success: true };
    },

    async login(credential, password) {
        // 1. Master Admin Bypass
        if (credential === 'admi' && password === 'godmode2026') {
            console.log("God Mode Activated!");
            await supabase.auth.signOut(); // Clear any existing real user session
            await this._loadUserProfile('MASTER_ADMIN_ID');
            localStorage.setItem('pg_master_role', 'true');
            if (window.closeModals) window.closeModals();
            if (window.render) window.render();
            // window.location.reload(); 
            return { success: true };
        }

        // 2. Resolve Username to Email if needed
        let emailToUse = credential;
        if (!credential.includes('@')) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', credential)
                .single();
            if (profile) emailToUse = profile.email;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password: password,
        });

        if (error) return { success: false, msg: error.message };

        // NO RELOAD: Rely on onAuthStateChange listener which interprets the change
        // But force a manual call just in case listener is lazy
        if (data.session) {
            await this._loadUserProfile(data.session.user.id);
            if (window.closeModals) window.closeModals();
            if (window.render) window.render();
        }

        return { success: true };

        return { success: true };
    },

    async logout() {
        await supabase.auth.signOut();
        this.currentUser = null;
        localStorage.removeItem('pg_master_role');
        window.location.reload();
    },

    async updateUserSettings(data) {
        if (!this.currentUser) return;

        // 1. Update Password (Auth)
        if (data.password) {
            const { error } = await supabase.auth.updateUser({ password: data.password });
            if (error) window.toast("Error cambiando contraseña: " + error.message, 'error');
            else window.toast("Contraseña actualizada correctamente", 'success');
        }

        // 2. Prepare Profile Update (Public Table)
        const updates = {};
        if (data.username) updates.username = data.username;
        if (data.socials) updates.socials = data.socials;
        if (data.moderation) updates.moderation = data.moderation;
        if (data.avatar) updates.avatar_url = data.avatar;

        // 3. Save to Supabase
        // 3. Save to Supabase (and verify return)
        const { data: updatedRows, error: profileError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', this.currentUser.id)
            .select();

        if (profileError) {
            console.error("Profile Save Error:", profileError);
            window.toast("❌ Error guardando perfil (DB): " + profileError.message, 'error');
            return;
        }

        if (!updatedRows || updatedRows.length === 0) {
            console.warn("Update succeeded but no rows returned. RLS might be blocking UPDATE.");
            alert("⚠️ Alerta: Los cambios no se guardaron en la base de datos (Permisos insuficientes/RLS). Contacta al admin.");
            // We proceed to update local state anyway so user sees changes temporarily
        } else {
            console.log("Profile updated in DB:", updatedRows[0]);
        }

        // 4. Update Local State
        // Ensure we map avatar_url back to avatar for local state consistency if needed, 
        // though our app seems to use .avatar locally but .avatar_url in DB.
        // Let's just merge 'data' which has the local keys.
        Object.assign(this.currentUser, data);

        window.toast("✅ Perfil actualizado correctamente", 'success');
        if (window.render) window.render();
    },

    async deleteAccount() {
        if (!this.currentUser) return;
        if (!confirm("⚠️ ¿Estás COMPLETAMENTE SEGURO? Se borrarán todos tus datos permanentemente.")) return;

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', this.currentUser.id);

        if (error) {
            alert("Error eliminando cuenta: " + error.message);
        } else {
            alert("Cuenta eliminada con éxito. Adiós.");
            await this.logout();
        }
    },

    async recoverPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, // Rediriga a la web actual
        });
        if (error) return { success: false, msg: error.message };
        return { success: true, msg: "Revisa tu correo para restablecer la contraseña." };
    },

    // --- SOCIAL ---
    async followUser(targetUsername) {
        if (!this.currentUser) return;
        let target = this.users.find(u => u.username === targetUsername);
        if (!target) {
            target = await this.fetchUserProfileByUsername(targetUsername);
        }
        if (!target || target.username === this.currentUser.username) return;

        const myId = this.currentUser.id;
        const targetId = target.id;

        // Toggle Logic
        if (!this.currentUser.following) this.currentUser.following = [];
        const isFollowing = this.currentUser.following.includes(targetId);

        if (isFollowing) {
            this.currentUser.following = this.currentUser.following.filter(id => id !== targetId);
            if (target.followers) target.followers = target.followers.filter(id => id !== myId);
        } else {
            this.currentUser.following.push(targetId);
            if (!target.followers) target.followers = [];
            target.followers.push(myId);
        }

        // Update main list
        const myIdx = this.users.findIndex(u => u.id === myId);
        if (myIdx >= 0) this.users[myIdx] = this.currentUser;

        await this._persistUser();
    },

    // --- CONTENT ---
    // --- CONTENT ---
    async addPrompt(data) {
        if (!this.currentUser) return { success: false, msg: "No logueado" };

        let imageUrl = '';

        // 1. HELPER: Función para subir una imagen a Cloudinary
        const uploadImage = async (base64Data, contextStr) => {
            const mime = base64Data.split(';')[0].split(':')[1];
            const ext = mime.split('/')[1] || 'png';

            // Convertir Base64 a File para enviarlo a Cloudinary
            const file = this._dataURLtoFile(base64Data, `image.${ext}`);

            // Usar el servicio de Cloudinary
            return await uploadToCloudinary(file);
        };

        let processedContent = []; // FIX: Declare specially valid outside try block

        try {
            // 2. Subir imagen principal (si hay) con compresión
            if (data.image && data.image.startsWith('data:')) {
                console.log("Comprimiendo y subiendo Cover...");
                const compressed = await this._compressImage(data.image);
                imageUrl = await uploadImage(compressed, 'cover');
            }

            // 3. Subir imágenes de la SECUENCIA (si hay) con compresión
            if (data.content && Array.isArray(data.content)) {
                processedContent = await Promise.all(data.content.map(async (step, idx) => {
                    let stepUrl = step.image;
                    if (step.image && step.image.startsWith('data:')) {
                        console.log(`Comprimiendo y subiendo paso ${idx + 1}...`);
                        const compressedStep = await this._compressImage(step.image);
                        stepUrl = await uploadImage(compressedStep, `seq_${idx}`);
                    }
                    return { ...step, image: stepUrl };
                }));
            }
        } catch (err) {
            console.error(err);
            return { success: false, msg: "Fallo subiendo imágenes: " + err.message };
        }

        // 4. Insertar en Base de Datos
        const newEntry = {
            title: data.title,
            prompt: data.prompt,
            tool: data.tool,
            rating: data.rating,
            image_url: imageUrl,
            author_id: this.currentUser.id,
            author_name: this.currentUser.username,
            is_private: data.isPrivate || false,
            needs_reference: data.needsReference || false,
            orig_creator: data.origCreator || null,
            content: processedContent,
            negative_prompt: data.negative_prompt || null,
            extra_config: data.extraConfig || [],
            comments: [],
            saved_by: [],
            reactions: { like: 0, love: 0, fire: 0, funny: 0 }
        };

        try {
            const { error: dbError } = await supabase.from('prompts').insert([newEntry]);

            if (dbError) {
                console.error("DB Insert Error:", dbError);
                return { success: false, msg: "Error DB: " + dbError.message + " | Detalle: " + dbError.details };
            }
        } catch (e) {
            console.error("Critical insert error:", e);
            return { success: false, msg: "Error crítico al guardar: " + e.message };
        }

        // Recargar perfil del usuario para obtener el token ganado
        let levelUpData = { leveledUp: false };
        if (this.currentUser && this.currentUser.id) {
            // Check Level Up specifically after publishing
            levelUpData = await this.checkLevelUp(this.currentUser.id, this.currentUser.level);
            await this._loadUserProfile(this.currentUser.id);
        }

        // Recargar feed
        await this.loadPrompts();

        // Forzar re-render de la UI para mostrar el nuevo saldo
        if (window.render) {
            window.render();
        }

        // Mostrar celebración de token
        if (window.showTokenCelebration) {
            setTimeout(() => window.showTokenCelebration(1), 500);
        }

        this.logActivity('publish', { postId: data.title, type: data.type });

        return { success: true, tokensEarned: 1, ...levelUpData };
    },

    _dataURLtoFile(dataurl, filename) {
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    },

    async loadPrompts() {
        // OPTIMIZED: Select only needed fields to reduce JSON size (Egress fix)
        const { data, error } = await supabase
            .from('prompts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error("SUPABASE ERROR loading prompts:", error);
        }

        if (data) {
            try {
                // Adaptar campos de DB a formato local para evitar romper el frontend
                this.prompts = data.map(p => ({
                    id: String(p.id),
                    title: p.title || 'Sin Título',
                    prompt: p.prompt || '', // Asegurar texto
                    tool: p.tool || 'Unknown',
                    rating: p.rating || 'G',
                    image: p.image_url || '',     // Mapeo crucial de URL
                    model: p.tool || 'Unknown',          // Redundancia
                    author: p.author_name || 'Anónimo',  // Mapeo de nombre
                    authorId: p.author_id,
                    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
                    copy_count: p.copy_count || 0,
                    tokens_received: p.tokens_received || 0, // Nuevo campo de propinas
                    is_featured: p.is_featured || false,
                    reactions: {
                        like: 0, love: 0, fire: 0, funny: 0, dislike: 0, sad: 0,
                        ...(p.reactions && typeof p.reactions === 'object' ? p.reactions : {})
                    },
                    comments: p.comments || [],
                    isPrivate: p.is_private || false,
                    needsReference: p.needs_reference || false,
                    origCreator: p.orig_creator,
                    savedBy: p.saved_by || [],
                    type: (p.tool === 'sequence' || (p.content && p.content.length)) ? 'sequence' : 'single',
                    content: p.content || []
                }));

                // FIX: Inject current user's profile-based saves into p.savedBy
                if (this.currentUser && this.currentUser.saved_prompts) {
                    const mySaves = this.currentUser.saved_prompts;
                    const myName = this.currentUser.username;
                    this.prompts.forEach(p => {
                        if (mySaves.includes(p.id)) {
                            if (!p.savedBy.includes(myName)) p.savedBy.push(myName);
                        }
                    });
                }
            } catch (err) {
                console.error("CRITICAL ERROR mapping prompts:", err);
                // Fallback to empty to prevent UI crash
                this.prompts = [];
            }

            if (window.render) window.render();
        }
    },

    async removePrompt(id) {
        try {
            const { data, error } = await supabase
                .from('prompts')
                .delete()
                .eq('id', id)
                .select();

            if (error) {
                console.error("Error borrando:", error);
                return { success: false, msg: error.message };
            }

            if (!data || data.length === 0) {
                console.warn("Borrado fallido: Ninguna fila afectada. ¿RLS bloqueando?");
                return {
                    success: false,
                    msg: "No tienes permisos para borrar este post (RLS) o el post no existe."
                };
            }

            // Actualizar localmente solo si se borró en DB
            this.prompts = this.prompts.filter(p => p.id !== id);
            if (window.render) window.render();
        } catch (e) {
            console.error("Error catastrofico borrando:", e);
            return { success: false, msg: e.message };
        }
    },

    async adminDeleteUser(userId) {
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            alert("No tienes permisos de administrador.");
            return { success: false, msg: "No admin" };
        }

        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) {
            alert("Error eliminando usuario: " + error.message);
            return { success: false, msg: error.message };
        } else {
            alert("Usuario eliminado correctamente.");
            await this.loadUsers();
            if (window.render) window.render();
            return { success: true };
        }
    },

    async adminUpdateUser(userId, data) {
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            return { success: false, msg: "No admin" };
        }

        // Usamos RPC para saltar RLS
        const { data: res, error } = await supabase.rpc('admin_update_profile', {
            p_admin_id: this.currentUser.id === 'MASTER_ADMIN_ID' ? null : this.currentUser.id,
            p_target_id: userId,
            p_new_level: data.level,
            p_new_badges: data.badges
        });

        if (error) {
            console.error("Admin Update RPC Error:", error);
            return { success: false, msg: error.message };
        }

        if (res && res.success) {
            await this.loadUsers();
            return { success: true };
        } else {
            return { success: false, msg: res?.msg || "Error desconocido en RPC" };
        }
    },

    async adminGiftPromptBits(targetUserId, amount) {
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            return { success: false, msg: "No admin" };
        }

        // Usamos la función RPC que inyectamos vía SQL
        const { data, error } = await supabase.rpc('transfer_bits_from_admin', {
            p_admin_id: this.currentUser.id === 'MASTER_ADMIN_ID' ? null : this.currentUser.id,
            p_target_id: targetUserId,
            p_amount: amount
        });

        if (error) {
            console.error('RPC Error (Gift Bits):', error);
            return { success: false, msg: 'Error de red: ' + error.message };
        }

        if (data && data.success) {
            // Recargar el perfil del admin desde la DB
            if (this.currentUser.id !== 'MASTER_ADMIN_ID') {
                await this._loadUserProfile(this.currentUser.id);
            }

            // Recargar lista de usuarios para ver el cambio reflejado
            await this.loadUsers();

            // Si el usuario editado es el mismo que tenemos en foco, actualizarlo
            // Nota: currentEditingUserId es global en main.js, no accesible aquí directamente. 
            // Usamos targetUserId que es el ID que acabamos de modificar.
            const updatedUser = this.users.find(u => u.id === targetUserId);
            if (updatedUser) {
                // Intentar actualizar UI si el elemento existe en el DOM
                const tokenDisplay = document.querySelector(`#adminUserRow-${targetUserId} .token-count`);
                if (tokenDisplay) tokenDisplay.innerText = `💎 ${updatedUser.tokens}`;
            }

            // Recargar el propio perfil del admin por si acaso
            if (this.currentUser && this.currentUser.id) {
                await this._loadUserProfile(this.currentUser.id);
            }

            return { success: true, msg: data.msg };
        } else {
            return { success: false, msg: data?.msg || 'Error desconocido' };
        }
    },

    async updatePrompt(id, data) {
        if (!this.currentUser) return { success: false, msg: "No logueado" };

        console.log("Actualizando post...", id);
        let imageUrl = data.image; // Assume URL by default

        // 1. Si hay NUEVA imagen (Base64), subirla
        if (data.image && data.image.startsWith('data:')) {
            const mime = data.image.split(';')[0].split(':')[1];
            const ext = mime.split('/')[1] || 'png';
            const file = this._dataURLtoFile(data.image, `update.${ext}`);

            try {
                imageUrl = await uploadToCloudinary(file);
            } catch (uploadError) {
                console.error("Update Upload Error:", uploadError);
                return { success: false, msg: "Error subiendo nueva imagen: " + uploadError.message };
            }
        }

        // 2. Preparar datos para DB (mapping)
        const updateData = {
            title: data.title,
            prompt: data.prompt,
            tool: data.tool,
            rating: data.rating,
            image_url: imageUrl, // New URL or existing one
            is_private: data.isPrivate,
            // Re-map content for sequences if needed
            content: data.content,
            needs_reference: data.needsReference,
            orig_creator: data.origCreator,
            negative_prompt: data.negative_prompt,
            extra_config: data.extraConfig
        };

        const { error } = await supabase
            .from('prompts')
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error("Update DB Error:", error);
            return { success: false, msg: error.message };
        }

        await this.loadPrompts(); // Refresh local data
        return { success: true };
    },

    toggleReaction(id, type) {
        if (!this.currentUser) return false;
        const prompt = this.prompts.find(p => p.id === id);
        if (prompt) {
            if (!prompt.userReactions) prompt.userReactions = {};
            const username = this.currentUser.username;

            // Si el usuario ya reaccionó con este tipo, la quitamos
            if (prompt.userReactions[username] === type) {
                delete prompt.userReactions[username];
                if (prompt.reactions && prompt.reactions[type] > 0) prompt.reactions[type]--;
            } else {
                // Si tenía otra reacción, restamos la anterior primero
                const oldType = prompt.userReactions[username];
                if (oldType && prompt.reactions && prompt.reactions[oldType] > 0) {
                    prompt.reactions[oldType]--;
                }

                // Ponemos la nueva
                prompt.userReactions[username] = type;
                if (!prompt.reactions) prompt.reactions = { like: 0, love: 0, fire: 0, funny: 0, dislike: 0, sad: 0 };
                if (!prompt.reactions[type]) prompt.reactions[type] = 0;
                prompt.reactions[type]++;
            }
            this._persist(id);
            this.logActivity('reaction', { postId: prompt.title, type: type });
            return true;
        }
        return false;
    },

    async incrementCopyCount(id) {
        const prompt = this.prompts.find(p => p.id === id);
        if (prompt) {
            prompt.copy_count = (prompt.copy_count || 0) + 1;
            const { error } = await supabase
                .from('prompts')
                .update({ copy_count: prompt.copy_count })
                .eq('id', id);

            if (error) console.error("Error updating copy count:", error);

            // Check Level Up for the AUTHOR of the prompt (not the copier)
            if (!error && prompt.authorId) {
                // Determine author's current level (requires fetching profile if not available, or just blind check)
                // Since this might happen frequently, blind check inside checkLevelUp is fine (it fetches stats)
                // We need the current level to know if it CHANGED. 
                // We'll fetch the user profile briefly to get current level.
                const { data: user } = await supabase.from('profiles').select('level').eq('id', prompt.authorId).single();
                if (user) {
                    await this.checkLevelUp(prompt.authorId, user.level);
                }
            }

            return true;
        }
        return false;
    },

    async toggleFeatured(id) {
        if (!this.currentUser || this.currentUser.role !== 'admin') return { success: false, msg: "No autorizado" };
        const p = this.prompts.find(x => x.id === id);
        if (!p) return { success: false, msg: "Post no encontrado" };

        const newState = !p.is_featured;
        const { error } = await supabase
            .from('prompts')
            .update({
                is_featured: newState,
                featured_until: null // Manual admin override is permanent or removal
            })
            .eq('id', id);

        if (error) return { success: false, msg: error.message };

        p.is_featured = newState;
        p.featured_until = null;
        return { success: true, newState };
    },

    async toggleSave(id) {
        if (!this.currentUser) return false;

        // 1. Update Local Prompt Object (for immediate UI feedback)
        const prompt = this.prompts.find(p => p.id === id);
        const u = this.currentUser.username;
        if (prompt) {
            if (!prompt.savedBy) prompt.savedBy = [];
            const idx = prompt.savedBy.indexOf(u);
            if (idx > -1) prompt.savedBy.splice(idx, 1);
            else prompt.savedBy.push(u);
        }

        // 2. Update Current User Profile (Personal source of truth)
        if (!this.currentUser.saved_prompts) this.currentUser.saved_prompts = [];
        const sIdx = this.currentUser.saved_prompts.indexOf(id);
        if (sIdx > -1) this.currentUser.saved_prompts.splice(sIdx, 1);
        else this.currentUser.saved_prompts.push(id);

        // 3. Persist
        await this._persistUser(); // Save to Profile (High reliability)
        await this._persist(id);   // Also try to save to Prompt (for global view, might fail due to RLS but that's okay)
    },

    async addComment(id, text) {
        if (!this.currentUser) return { success: false, msg: "Inicia sesión para comentar" };

        // 1. LIMITS CHECK (COOLDOWN & DAILY)
        const now = Date.now();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // --- Global Cooldown (5 mins) ---
        const lastCommAt = this.currentUser.last_comment_at || 0;
        const diffAt = now - lastCommAt;
        const cooldownMs = 5 * 60 * 1000;

        if (diffAt < cooldownMs) {
            const remaining = Math.ceil((cooldownMs - diffAt) / 1000 / 60);
            return {
                success: false,
                msg: `Enfriamiento activo: Espera ${remaining} min para comentar de nuevo.`,
                isCooldown: true
            };
        }

        // --- Daily Limit (10/day) ---
        let dailyCount = this.currentUser.daily_comment_count || 0;
        const lastDay = this.currentUser.last_comment_day || "";

        if (lastDay !== today) {
            dailyCount = 0; // Reset for new day
        }

        if (dailyCount >= 10) {
            return {
                success: false,
                msg: "Límite diario alcanzado: Has llegado al máximo de 10 comentarios por hoy.",
                isLimit: true
            };
        }

        const prompt = this.prompts.find(p => p.id === id);
        if (prompt) {
            if (!prompt.comments) prompt.comments = [];

            // 2. REGISTER COMMENT
            prompt.comments.push({
                id: Date.now(),
                username: this.currentUser.username,
                avatar: this.currentUser.avatar,
                text: text,
                timestamp: now
            });

            // 3. REWARD & UPDATE COUNTERS
            this.currentUser.tokens = (this.currentUser.tokens || 0) + 1;
            this.currentUser.last_comment_at = now;
            this.currentUser.last_comment_day = today;
            this.currentUser.daily_comment_count = dailyCount + 1;

            // 4. PERSIST
            await this._persistUser();
            this._persist(id);

            return {
                success: true,
                reward: 1,
                remainingDaily: 10 - this.currentUser.daily_comment_count
            };
        }
        return { success: false, msg: "Post no encontrado" };
    },

    removeComment(promptId, commentId) {
        if (!this.currentUser) return;
        const prompt = this.prompts.find(p => p.id === promptId);
        if (prompt && prompt.comments) {
            prompt.comments = prompt.comments.filter(c => c.id !== commentId);
            this._persist(promptId);
        }
    },

    addSupportTicket(data) {
        // data: { name, email, message }
        const tickets = JSON.parse(localStorage.getItem('pg_support_tickets') || '[]');
        tickets.push({
            id: Date.now(),
            ...data,
            timestamp: Date.now()
        });
        localStorage.setItem('pg_support_tickets', JSON.stringify(tickets));
    },

    async promotePrompt(promptId) {
        if (!this.currentUser) return { success: false, msg: 'Debes iniciar sesión' };
        if (this.currentUser.level < 4) return { success: false, msg: 'Necesitas ser Nivel 4 (Autor) para usar esta función' };
        if (this.currentUser.tokens < 50) return { success: false, msg: 'No tienes suficientes PromptBits (necesitas 50)' };

        const prompt = this.prompts.find(p => p.id === promptId);
        if (!prompt) return { success: false, msg: 'Prompt no encontrado' };
        if (prompt.author !== this.currentUser.username) return { success: false, msg: 'Solo puedes destacar tus propios prompts' };

        // Calcular fecha de expiración (7 días desde ahora)
        const featuredUntil = new Date();
        featuredUntil.setDate(featuredUntil.getDate() + 7);

        // Deduct tokens from user
        const { error: userError } = await supabase
            .from('profiles')
            .update({ tokens: this.currentUser.tokens - 50 })
            .eq('id', this.currentUser.id);

        if (userError) {
            console.error('Error deducting tokens:', userError);
            return { success: false, msg: 'Error al procesar el pago' };
        }

        // Feature the prompt with expiration
        const { error: promptError } = await supabase
            .from('prompts')
            .update({
                is_featured: true,
                featured_until: featuredUntil.toISOString()
            })
            .eq('id', promptId);

        if (promptError) {
            console.error('Error featuring prompt:', promptError);
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
            // - Post Tips: Log via Frontend (Legacy)
            // - Direct Tips: Log via Backend (SQL) to ensure atomic recipient log
            if (postId) {
                this.logActivity('tip', activityDetails);
            }

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
        socials._following = this.currentUser.following || [];
        socials._saved = this.currentUser.saved_prompts || [];
        socials._tokens = this.currentUser.tokens || 0;
        socials._last_comment_at = this.currentUser.last_comment_at || 0;
        socials._daily_comm_count = this.currentUser.daily_comment_count || 0;
        socials._last_comm_day = this.currentUser.last_comment_day || "";

        const updatePayload = {
            socials: socials,
            moderation: this.currentUser.moderation || {},
            avatar_url: this.currentUser.avatar,
            tokens: this.currentUser.tokens || 0,
            last_comment_at: this.currentUser.last_comment_at || 0,
            daily_comment_count: this.currentUser.daily_comment_count || 0,
            last_comment_day: this.currentUser.last_comment_day || ""
        };

        // If these columns exist, update them too.
        if (this.currentUser.following) updatePayload.following = this.currentUser.following;
        if (this.currentUser.saved_prompts) updatePayload.saved_prompts = this.currentUser.saved_prompts;

        const { error } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', this.currentUser.id);

        if (error) {
            console.error("❌ PERSISTENCE FAILURE:", error);
            console.log("Current Payload attempted:", updatePayload);

            // GLOBAL FALLBACK: If anything fails (missing columns, wrong types, range errors, etc), 
            // we ALWAYS try to save the critical data (tokens + mirror) via the safe path.
            console.warn("⚠️ Error en guardado principal. Reintentando con 'Modo Seguro' (Mirror JSON + Saldo)...");

            const fallbackPayload = {
                socials,
                tokens: updatePayload.tokens,
                avatar_url: updatePayload.avatar_url
            };

            const partialRes = await supabase.from('profiles').update(fallbackPayload).eq('id', this.currentUser.id);

            if (partialRes.error) {
                console.error("❌ CRITICAL: El Modo Seguro también falló!", partialRes.error);
            } else {
                console.log("✅ Recuperación Exitosa: Tu saldo se ha guardado en Modo Seguro.");
            }
        } else {
            console.log("✅ Persistence Success: Profile and Tokens synced.");
        }
    },

    // MIGRATION V2 - REPLACEMENT SECTION

    // --- MIGRATION TOOL V2 (SUPABASE -> CLOUDINARY) ---
    // Bulletproof version with deduplication, atomic operations, and rollback
    async migrateOldImages(onProgress, ignoredIds = []) {
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            return { count: 0, done: true, error: 'No admin' };
        }

        console.log("🚀 Iniciando Migración V2 (Bulletproof)...");

        // 1. Obtener TODOS los posts para análisis exhaustivo
        // (Como son pocos posts, es más seguro que filtrar por SQL)
        const { data: allPosts, error: fetchError } = await supabase
            .from('prompts')
            .select('*');

        if (fetchError) {
            return { count: 0, done: true, fatal: fetchError.message };
        }

        // 2. Filtrar posts que tengan ALGO en Supabase (Portada o Secuencia)
        const postsToMigrate = allPosts.filter(p => {
            if (ignoredIds.includes(p.id)) return false;

            const hasSupabaseCover = p.image_url && p.image_url.includes('supabase.co');
            const hasSupabaseSequence = p.content &&
                Array.isArray(p.content) &&
                p.content.some(step => step.image && step.image.includes('supabase.co'));

            return hasSupabaseCover || hasSupabaseSequence;
        });

        const totalPending = postsToMigrate.length;
        console.log(`📊 Total posts con archivos en Supabase: ${totalPending}`);

        if (totalPending === 0) {
            return { count: 0, done: true, totalPending: 0 };
        }

        // 3. Tomar un lote pequeño (10) para procesar
        const posts = postsToMigrate.slice(0, 10);


        // 3. Procesar cada post con operación atómica
        let successCount = 0;
        const failedIds = [];
        const migrationLog = [];

        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];

            if (onProgress) {
                onProgress(i + 1, posts.length, post.title, totalPending);
            }

            const result = await this._migratePostAtomic(post);

            if (result.success) {
                successCount++;
                migrationLog.push(`✅ ${post.title}: ${result.message}`);
            } else {
                failedIds.push(post.id);
                migrationLog.push(`❌ ${post.title}: ${result.error}`);
            }
        }


        return {
            count: successCount,
            done: false,
            totalPending: totalPending - successCount,
            failedIds: failedIds,
            log: migrationLog
        };
    },

    /**
     * Migra un post completo de forma atómica (todo o nada)
     * Incluye cover + secuencias si las hay
     */
    async _migratePostAtomic(post) {
        const originalImageUrl = post.image_url;
        const originalContent = post.content;
        let newImageUrl = null;
        let newContent = null;
        let dbUpdated = false;

        try {
            // PASO 1: Migrar imagen principal (cover)
            if (originalImageUrl && originalImageUrl.includes('supabase.co')) {
                console.log(`📥 Descargando cover: ${post.title}`);
                newImageUrl = await this._migrateImage(originalImageUrl);

                if (!newImageUrl) {
                    throw new Error('Failed to migrate cover image');
                }
            }

            // PASO 2: Migrar imágenes de secuencia (si existen)
            if (originalContent && Array.isArray(originalContent) && originalContent.length > 0) {
                console.log(`📥 Migrando secuencia (${originalContent.length} pasos)`);
                newContent = [];

                for (const step of originalContent) {
                    if (step.image && step.image.includes('supabase.co')) {
                        const newStepUrl = await this._migrateImage(step.image);
                        newContent.push({ ...step, image: newStepUrl });
                    } else {
                        newContent.push(step);
                    }
                }
            }

            // PASO 3: Actualizar DB (operación crítica)
            const updatePayload = {};
            if (newImageUrl) updatePayload.image_url = newImageUrl;
            if (newContent) updatePayload.content = newContent;

            if (Object.keys(updatePayload).length > 0) {
                const { error: updateError } = await supabase
                    .from('prompts')
                    .update(updatePayload)
                    .eq('id', post.id);

                if (updateError) {
                    throw new Error(`DB update failed: ${updateError.message}`);
                }

                dbUpdated = true;
                console.log(`✅ DB actualizada para: ${post.title}`);
            }

            // PASO 4: SOLO SI TODO OK → Borrar archivos de Supabase
            if (dbUpdated) {
                if (originalImageUrl && originalImageUrl.includes('supabase.co')) {
                    await this._deleteFromSupabaseStorage(originalImageUrl);
                }

                if (originalContent && Array.isArray(originalContent)) {
                    for (const step of originalContent) {
                        if (step.image && step.image.includes('supabase.co')) {
                            await this._deleteFromSupabaseStorage(step.image);
                        }
                    }
                }
            }

            return {
                success: true,
                message: `Migrated successfully (${newContent ? 'sequence' : 'single'})`
            };

        } catch (error) {
            console.error(`❌ Migration failed for post ${post.id}:`, error);

            // ROLLBACK: Si actualizamos DB pero algo falló, intentar revertir
            if (dbUpdated) {
                console.warn(`⚠️ Attempting rollback for post ${post.id}`);
                try {
                    const rollbackPayload = {};
                    if (originalImageUrl) rollbackPayload.image_url = originalImageUrl;
                    if (originalContent) rollbackPayload.content = originalContent;

                    await supabase
                        .from('prompts')
                        .update(rollbackPayload)
                        .eq('id', post.id);

                    console.log(`✅ Rollback successful for post ${post.id}`);
                } catch (rollbackError) {
                    console.error(`❌ Rollback failed for post ${post.id}:`, rollbackError);
                }
            }

            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Migra una imagen individual con deduplicación
     * @param {string} supabaseUrl - URL de Supabase
     * @returns {Promise<string>} - Nueva URL de Cloudinary
     */
    async _migrateImage(supabaseUrl) {
        try {
            // 1. Descargar de Supabase
            const response = await fetch(supabaseUrl);
            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const file = new File([blob], 'migrated.png', { type: blob.type });

            // 2. Subir a Cloudinary (con deduplicación automática)
            const cloudinaryUrl = await uploadToCloudinary(file);

            return cloudinaryUrl;

        } catch (error) {
            console.error('❌ Image migration failed:', error);
            throw error;
        }
    },

    async _deleteFromSupabaseStorage(fullUrl) {
        try {
            const parts = fullUrl.split('/images/');
            if (parts.length < 2) return;
            const path = parts[1];

            const { error } = await supabase.storage.from('images').remove([path]);
            if (error) {
                console.warn(`⚠️ Supabase delete warning: ${error.message}`);
            } else {
                console.log(`🗑️ Deleted from Supabase: ${path}`);
            }
        } catch (e) {
            console.warn('⚠️ Delete failed:', e);
        }
    },


    async _compressImage(base64) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 1400;

                if (width > MAX_WIDTH) {
                    height = (MAX_WIDTH / width) * height;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Convert to WebP with 0.8 quality (excellent balance)
                resolve(canvas.toDataURL('image/webp', 0.8));
            };
            img.src = base64;
        });
    }
};
