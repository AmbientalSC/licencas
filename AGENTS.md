# AGENTS.md — Sistema de Gestão de Licenças Ambientais

## Comandos

```bash
npm run dev       # servidor de desenvolvimento Vite (localhost:5173)
npm run build     # build de produção (output: dist/)
npm run preview   # preview local do build de produção
npm run deploy    # deploy no GitHub Pages via gh-pages (roda build antes)
npm test          # rodar testes (vitest watch)
npm run test:run  # rodar testes uma vez (CI)
```

**Atenção:** Não há scripts de lint, typecheck ou format. O TypeScript é verificado apenas em tempo de build via Vite. O `tsconfig.json` tem `strict: true`, `noUnusedLocals: true` e `noUnusedParameters: true` — código com variáveis não usadas **não compila**.

## Stack

- **Frontend:** React 19, TypeScript 5.7, Vite 6, Tailwind CSS 3 (dark mode com estratégia `class`)
- **Backend/Infra:** Firebase (Firestore, Auth, Storage). Projeto: `licencas-a47f9`
- **Deploy:** GitHub Pages — base path `/licencas/` (definido em `vite.config.ts`)

## Arquitetura

SPA com entry point em `index.tsx` → `App.tsx`. O estado da aplicação foi extraído para hooks customizados:

- `hooks/useAuth.ts` — autenticação Firebase Auth + perfil Firestore + validação de `active`
- `hooks/useTheme.ts` — tema dark/light + localStorage + prefers-color-scheme
- `hooks/useFirestore.ts` — CRUD de todas as coleções Firestore + migração de attachments
- `hooks/usePermissions.ts` — controle de acesso a telas e filtros de visibilidade por role

O `App.tsx` (~322 linhas) agora é apenas a camada de view: compõe os hooks e renderiza sidebar, header e rotas.

**Componentes lazy-loaded:** `Dashboard`, `LicenseManagement`, `LicenseTypeManagement`, `BranchManagement`, `DeactivatedLicenses`, `LaoConditionsManagement`, `UserManagement`

**Coleções Firestore:** `units`, `licenses`, `licenseTypes`, `branches`, `laos`, `laoConditions`, `laoInspections`, `users`

**Alias de path:** `@/*` mapeia para a raiz do projeto (`tsconfig.json` + `vite.config.ts`).

## Autenticação e Perfis

- Login via Firebase Auth (email/senha) — component `Login.tsx`
- Primeiro usuário a logar vira `admin` automaticamente; seguintes viram `colaborador`
- `admin` vê tudo. `colaborador` tem acesso restrito por `allowedScreens`, `visibleBranchIds` e `visibleLicenseTypes`
- O perfil do usuário é armazenado na coleção `users` do Firestore (não em Custom Claims)
- O hook `useAuth.ts` verifica o campo `active`: se `active === false`, o usuário é automaticamente deslogado

## Datas

Todas as datas no código são strings ISO (`YYYY-MM-DD`). Exibição em formato brasileiro (`DD/MM/YYYY`) feita pelo utilitário `formatDateBR` em `utils/laoSchedule.ts`. Importação de planilhas Excel converte números de série do Excel e strings `DD/MM/YYYY` para ISO via `parseWorkbookDate`.

## Temas (Dark/Light)

- Tailwind configurado com `darkMode: 'class'`
- Preferência salva em `localStorage` (`themePreference`, `theme`)
- Respeita `prefers-color-scheme` do sistema quando configurado como `'system'`
- Script inline no `<head>` de `index.html` aplica o tema antes do React hidratar (evita flash)

## Importação de Dados

- O pacote `xlsx` é usado para importar LAOs e licenças via planilhas Excel
- Componentes de importação: `ImportLaoWorkbookModal.tsx` e `ImportLicensesModal.tsx`
- A importação de inspeções de condicionantes detecta duplicatas por `conditionId` + `inspectionDate`

## Migração de Dados (Attachments)

No `fetchLicenses` há uma migração automática: licenças no formato antigo (`fileUrl`/`fileName` únicos) são convertidas para o novo formato `attachments[]` (array de objetos `Attachment`). Essa lógica deve ser preservada ao modificar o fetch de licenças.

## Firebase Functions

O `firebase.json` declara um diretório `functions/`, mas ele **ainda não existe**. Se precisar adicionar Cloud Functions, crie o diretório e configure.

## CORS do Storage

O arquivo `cors.json` define regras CORS para o Firebase Storage. Origens permitidas: `https://ambientalsc.github.io` e `http://localhost:5173`. Métodos: GET, PUT, POST, DELETE. Aplicar com `gsutil cors set cors.json gs://licencas-a47f9.firebasestorage.app`.

## Firestore Security Rules

O arquivo `firestore.rules` contém regras granulares de segurança. Regras principais:
- Apenas usuários autenticados e ativos (`active: true`) podem ler/escrever
- Apenas `admin` pode escrever em `licenseTypes`, `branches` e deletar `users`
- Usuários criam o próprio perfil Firestore no primeiro login
- Deploy das regras: `firebase deploy --only firestore:rules`

## Segurança (CSP)

O `index.html` inclui meta tag Content-Security-Policy restritiva. Ao modificar integrações externas, verifique se os domínios necessários estão na política.

## GEMINI_API_KEY

A injeção de `process.env.GEMINI_API_KEY` foi removida do `vite.config.ts` — nada no código atual usava essa variável. Se precisar reintroduzir, prefira Firebase Functions como proxy em vez de expor no frontend.

## .env

Arquivos `.env`, `.env.local` e `.env.*.local` estão no `.gitignore`. Não comite secrets.

## Convenções de Código

- UI e comentários em **português brasileiro** (regra em `.agent/rules/language.md`)
- Ícones são componentes React em `components/icons/` (SVGs inline, não biblioteca externa)
- Firebase config está hardcoded em `firebase.ts` (API key, project ID etc.) — não extraia para `.env` sem testar o deploy
