import { defineConfig } from 'vite'

export default defineConfig({
    base: './', // Use relative paths for assets
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
                admin: 'admin.html'
            }
        }
    },
    preview: {
        open: true, // Open browser on preview
        port: 4173
    }
})
