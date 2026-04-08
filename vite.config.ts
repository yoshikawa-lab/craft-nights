import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    build: {
        rollupOptions: {
            output: {
                manualChunks: (id: string) => {
                    if (id.includes('phaser')) return 'phaser';
                    return undefined;
                },
            },
        },
    },
    server: {
        port: 8080,
        host: true,
    },
});
