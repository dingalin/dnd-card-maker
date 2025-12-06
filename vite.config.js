import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ command }) => {
    return {
        base: command === 'build' ? '/dnd-card-maker/' : '/',
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
    }
})
