import { defineConfig } from 'vite'

// Configuração mínima do Vite para suportar deploy no GitHub Pages
// quando o site for servido a partir de https://<user>.github.io/licencas/
export default defineConfig({
  base: '/licencas/'
})
