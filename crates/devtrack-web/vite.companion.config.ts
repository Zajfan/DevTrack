import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  build: { outDir:'dist-companion', emptyOutDir:true, rollupOptions:{input:'companion.html'} },
  preview: { port:4174, strictPort:true },
});
