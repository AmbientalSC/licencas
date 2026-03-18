import { defineConfig } from 'vite'

// Configuração mínima do Vite para suportar deploy no GitHub Pages
// quando o site for servido a partir de https://<user>.github.io/licencas/
export default defineConfig({
  base: '/licencas/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
          if (id.includes('xlsx')) return 'xlsx';
          return 'vendor';
        }
      }
    }
  }
})
