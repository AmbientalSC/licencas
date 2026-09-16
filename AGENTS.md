# AGENTS.md — Sistema de Gestão de Licenças Ambientais

Aplicação web (React 19 + TypeScript + Vite + Tailwind CSS) para gestão de licenças ambientais, credores e condicionantes (LAO) da Ambiental. Backend: Firebase (Auth, Firestore, Storage, Cloud Functions). Deploy: GitHub Pages em `/licencas/`.

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção (Vite) — **não** roda typecheck |
| `npm run test:run` | Testes (Vitest, jsdom) |
| `npx tsc --noEmit` | Typecheck da raiz (não existe script npm) |
| `npm --prefix functions run build` | Compila Cloud Functions (tsc → `functions/lib/`) |
| `npm --prefix functions run lint` | ESLint das functions (roda no `predeploy` do Firebase) |
| `npm run deploy` | `gh-pages -d dist` (aplica a base `/licencas/`) |
| `firebase deploy --only firestore:rules` | Publica `firestore.rules` |

## Arquitetura

- **`App.tsx`** — roteamento por estado (`View` union type), sem react-router. Telas carregadas com `React.lazy` + `Suspense`. Telas: `dashboard`, `licenses`, `sgaLicenses`, `deactivatedLicenses`, `licenseTypes`, `branches`, `credores`, `laoConditions`, `users`.
- **`components/`** — uma tela por arquivo (`LicenseManagement.tsx`, `LaoConditionsManagement.tsx`, `ImportLicensesModal.tsx`, etc.) + `icons/` (SVGs como componentes React).
- **`hooks/`** — `useAuth` (auth + perfil/role do usuário), `useFirestoreData` (leitura/CRUD de todas as coleções), `usePermissions` (acesso a telas + filtragem de visibilidade por branch/tipo de licença), `useTheme` (dark mode via classe `dark`).
- **`types.ts`** — modelos de domínio: `License`, `Unit`, `Branch`, `Credor`, `CredorLicense`, `LaoRecord`, `LaoCondition`, `LaoInspection`, `User`.
- **`utils/laoSchedule.ts`** — lógica de agendamento de inspeções de condicionantes (frequências, datas, import de planilhas). Testes em `utils/laoSchedule.test.ts`.
- **`functions/`** — Cloud Functions v2 (`onCall`): `adminResetUserPassword` (reset de senha + e-mail via SMTP usando secrets `defineSecret`). Código-fonte em `src/`, build em `lib/` (gitignored).

## Dados (Firestore)

Coleções: `users`, `licenses`, `units`, `licenseTypes`, `branches`, `laos`, `laoConditions`, `laoInspections`, `credores`, `credorLicenses`.

Regras em `firestore.rules`: leitura/escrita de `licenses`/`units`/`laos`/`laoConditions`/`laoInspections`/`credorLicenses` para usuários ativos; `licenseTypes`/`branches`/`credores` são somente leitura para ativos e escrita apenas para admin; `users` tem regras próprias (auto-criação do primeiro usuário como admin).

## Convenções

- UI e mensagens em **pt-BR** (datas em `dd/mm/aaaa`, status: `Ativa` | `Vencida` | `Em Renovação`).
- Dark mode: Tailwind `darkMode: 'class'` + variáveis CSS em `index.css`; preferência salva em `localStorage('themePreference')`. Não adicione cores hardcoded sem passar pelas variáveis.
- Alias `@` → raiz do projeto (`vite.config.ts` / `tsconfig.json`).
- `firebase.ts` contém a config pública do Firebase (normal para apps web); a segurança real vem de `firestore.rules`. Ao alterar regras, publique com o comando acima.
- Filtragem de dados por permissão acontece em `usePermissions` (nunca no componente); telas são controladas por `allowedScreens` do perfil (`User`).
- Componentes de tela recebem dados e callbacks por props a partir de `App.tsx` (ex.: `onAddLicense`, `onUpdateLicense`).
- Testes: Vitest + jsdom, padrão Arrange-Act-Assert, em `*.test.ts` ao lado do módulo.

## Armadilhas conhecidas

- `npx tsc --noEmit` na raiz **falha** hoje (18 erros): `vite.config.ts` usa `test` sem importar de `vitest/config`; imports de `*.svg`/`*.css` e `react-dom/client` sem declarações (falta `vite-env.d.ts` e `@types/react-dom`); vários erros `noUnusedLocals` (`SettingsIcon.tsx`, `Dashboard.tsx`, `LicenseManagement.tsx`, `LaoConditionsManagement.tsx`, `App.tsx`); erro de tipo real em `DeactivatedLicenses.tsx` (destructuring `checked`) e `ImportLicensesModal.tsx` (`status` como `string`). O build do Vite passa mesmo assim.
- `index.html` tem CSP inline listando os domínios do Firebase. Se novos endpoints forem adicionados (ex.: Cloud Functions em outra região), atualize `connect-src`. Em dev, o websocket de HMR pode ser bloqueado pelo CSP.
- `functions` usa ESLint 8 + `@typescript-eslint` 7 com TypeScript 5.9 — o lint funciona, mas emite warning de versão não suportada (suporta `<5.6`).
- Chunk `xlsx` é grande (~430 kB min): já separado via `manualChunks`; não importe `xlsx` nas telas principais sem `React.lazy`.
- `App.tsx` define `SidebarItem` dentro do componente (recriado a cada render) — prefira extrair para componente/arquivo próprio.
- `usePermissions`: para não-admins, `visibleBranchIds`/`visibleLicenseTypes` vazios significam "sem restrição" (vê tudo). Se quiser restringir, liste os IDs.
