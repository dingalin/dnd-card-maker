import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    base: '/dnd-card-maker/', // Base path for GitHub Pages
    build: {
        outDir: 'dist',
    },
    plugins: [
        viteStaticCopy({
            targets: [
                { src: 'components/*', dest: 'components' },
                { src: 'css/**/*', dest: 'css' }
            ]
        })
    ]
})
