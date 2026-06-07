import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: './',
  // GitHub Pages は docs/ をソースに指定できるため出力先を docs にする
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})
