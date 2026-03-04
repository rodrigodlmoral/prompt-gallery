import { defineConfig } from 'vite'

export default defineConfig({
    base: '/', // Use absolute paths for assets to avoid MIME errors on deep routes
    server: {
        port: 5174, // Fixed port
        open: false // Don't auto-open (the .bat file will do it)
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: 'index.html',
                admin: 'admin.html',
                profile: 'profile.html',
                batch_upload: 'batch_upload.html',
                text_prompts: 'text-prompts.html'
            }
        }
    },
    preview: {
        open: true, // Open browser on preview
        port: 4173
    }
})
