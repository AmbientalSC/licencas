# Tecnologia Stack

**Data da Análise:** 2026-05-25

## Linguagens

**Primária:**
- TypeScript ~5.7.2 — Linguagem de todo o código-fonte (`*.ts`, `*.tsx`)

**Secundária:**
- JavaScript — Configurações de build (`vite.config.js`, `postcss.config.cjs`, `tailwind.config.cjs`), script inline de tema no `index.html`
- CSS — Estilização via Tailwind CSS (`index.css`) e classes utilitárias inline

## Runtime

**Ambiente:**
- Node.js — Não há `.nvmrc` ou `.node-version` definidos; versão não especificada formalmente

**Gerenciador de Pacotes:**
- npm — Versão implícita via Node.js
- Lockfile: `package-lock.json` presente

## Frameworks

**Core:**
- React 19.1.0 — Biblioteca principal de UI (`react`, `react-dom`)
- Vite 6.2.0 — Build tool e servidor de desenvolvimento (`vite.config.ts`, `vite.config.js`)

**Estilização:**
- Tailwind CSS 3.4.17 — Framework utilitário de CSS
  - Configuração: `tailwind.config.cjs`
  - Dark mode: estratégia `class` (alternância manual)
  - PostCSS + Autoprefixer 10.4.27 como plugins de processamento
  - Variáveis CSS customizadas em `index.css` para temas claro/escuro

**Testing:**
- Não detectado — Não há frameworks de teste configurados (sem jest, vitest, etc.)

**Build/Dev:**
- gh-pages 6.3.0 — Deploy automatizado para GitHub Pages (script `deploy`)
- Vite — Dev server com HMR (`npm run dev`), build de produção (`npm run build`), preview local (`npm run preview`)

## Dependências Chave

**Críticas:**
- firebase 11.10.0 — SDK do Firebase que provê toda a infraestrutura backend da aplicação
  - Módulos utilizados: `firebase/app`, `firebase/firestore`, `firebase/auth`, `firebase/storage`
  - Configuração hardcoded em `firebase.ts` (projeto: `licencas-a47f9`)
- xlsx 0.18.5 — Leitura e escrita de arquivos Excel para importação de dados (LAOs e licenças)

**Dev:**
- @types/react 19.1.8 — Tipos do React para TypeScript
- @types/node 22.14.0 — Tipos do Node.js
- @types/nodemailer 6.4.17 — Tipos do Nodemailer (declarado mas sem uso detectado de nodemailer em runtime)

## Configuração

**Ambiente:**
- `.env` local (não versionado) — Variáveis de ambiente injetadas via Vite
  - `GEMINI_API_KEY` — Chave da API do Google Gemini, injetada como `process.env.GEMINI_API_KEY` e `process.env.API_KEY`
  - Arquivo `.env` não presente no repositório (gerado localmente)

**Build:**
- `tsconfig.json` — Configuração TypeScript com `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
  - Target: `ES2020`
  - Module: `ESNext` com `moduleResolution: bundler`
  - Path alias: `@/*` → raiz do projeto
  - `noEmit: true` (Vite gerencia a compilação)
- `vite.config.ts` — Configuração principal do Vite
  - Base path: `/licencas/` (para GitHub Pages)
  - Code splitting manual: chunks separados para `firebase`, `react-vendor`, `xlsx`, `vendor`
  - Alias de path: `@` → raiz do projeto
- `vite.config.js` — Configuração secundária simplificada do Vite (sem injeção de variáveis de ambiente)
- `postcss.config.cjs` — PostCSS com plugins `tailwindcss` e `autoprefixer`
- `tailwind.config.cjs` — Tailwind CSS com `darkMode: 'class'`

**Firebase:**
- `firebase.json` — Configuração do Firebase Functions (diretório `functions/` declarado mas não existente)
- `.firebaserc` — Projeto default: `licencas-a47f9`
- `cors.json` — Regras CORS para Firebase Storage (origens: `https://ambientalsc.github.io`, `http://localhost:5173`)

## Requisitos de Plataforma

**Desenvolvimento:**
- Node.js (versão não especificada; compatível com Vite 6 e React 19)
- npm
- Conexão com internet para Firebase (não há emuladores locais configurados)
- Chave `GEMINI_API_KEY` no `.env` (opcional, recurso não parece estar ativo no código atual)

**Produção:**
- Deploy em GitHub Pages (`https://ambientalsc.github.io/licencas/`)
- Firebase Firestore, Auth e Storage como backend serverless
- Build estático (SPA) gerado em `dist/` e publicado via `gh-pages`

---

*Análise da stack: 2026-05-25*
