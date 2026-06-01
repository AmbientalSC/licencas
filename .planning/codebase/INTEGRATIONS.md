# Integrações Externas

**Data da Análise:** 2026-05-25

## APIs e Serviços Externos

### Firebase (Backend como Serviço)

- **Projeto:** `licencas-a47f9`
- **SDK/Cliente:** `firebase` v11.10.0
- **Configuração:** `firebase.ts` (configuração hardcoded, inclui API key)

**Serviços Firebase utilizados:**

| Serviço | Propósito | Arquivos |
|---------|-----------|----------|
| **Firestore** | Banco de dados NoSQL principal | `App.tsx`, `firebase.ts`, `components/UserManagement.tsx` |
| **Authentication** | Login por email/senha | `App.tsx`, `components/Login.tsx`, `components/UserManagement.tsx` |
| **Storage** | Armazenamento de arquivos (anexos de licenças e LAOs) | `components/LicenseDetailsModal.tsx`, `components/LicenseManagement.tsx`, `components/LaoConditionsManagement.tsx` |

### Google Gemini API

- **Propósito:** Integração com IA generativa do Google
- **Configuração:** Chave `GEMINI_API_KEY` injetada via `vite.config.ts` como `process.env.GEMINI_API_KEY` e `process.env.API_KEY`
- **Status:** Configurado no build mas sem uso detectado no código atual — nenhum arquivo `.ts` ou `.tsx` referencia `process.env.GEMINI_API_KEY` ou `process.env.API_KEY`
- **Auth:** Variável de ambiente `GEMINI_API_KEY` no `.env` local

## Armazenamento de Dados

### Banco de Dados Primário: Firebase Firestore

- **Tipo:** NoSQL (documentos e coleções)
- **Conexão:** Via Firebase SDK (`firebase/firestore`), inicializado em `firebase.ts`
- **Cliente:** `getFirestore(app)` — instância exportada como `db`
- **Operações:** CRUD via `addDoc`, `updateDoc`, `deleteDoc`, `getDocs`, `writeBatch`
- **Queries:** `query()` + `where()` para filtros por campo

**Coleções Firestore (`App.tsx`, linhas 57–63):**

| Coleção | Interface TypeScript | Propósito |
|---------|---------------------|-----------|
| `units` | `Unit` | Unidades/licenciamentos |
| `licenses` | `License` | Licenças ambientais |
| `licenseTypes` | `LicenseType` | Tipos de licença cadastrados |
| `branches` | `Branch` | Filiais da empresa |
| `laos` | `LaoRecord` | LAOs (Licenças Ambientais de Operação) |
| `laoConditions` | `LaoCondition` | Condicionantes de LAOs |
| `laoInspections` | `LaoInspection` | Inspeções de condicionantes |
| `users` | `User` | Perfis de usuários (papéis, permissões) |

**Padrão de acesso:**
- Todas as coleções são carregadas integralmente no `App.tsx` via `getDocs()` sem paginação no `useEffect` inicial
- Operações de escrita usam `addDoc`/`updateDoc`/`deleteDoc` com re-fetch completo da coleção após cada mutação
- Deleções em cascata (ex: deletar `unit` deleta `licenses` associadas) usam `writeBatch` para atomicidade

### Armazenamento de Arquivos: Firebase Storage

- **Tipo:** Object storage (Cloud Storage)
- **Cliente:** `getStorage(app)` — instância exportada como `storage`
- **Propósito:** Anexos de licenças e LAOs como objetos `Attachment` (array com `id`, `fileName`, `fileUrl`, `uploadedAt`, `storagePath`)

**Padrões de uso do Storage:**

1. **Upload:** `uploadBytes(storageRef, file)` → `getDownloadURL(snapshot.ref)` para obter URL pública
   - Licenças: `components/LicenseDetailsModal.tsx` (linhas 160–162) e `components/LicenseManagement.tsx` (linhas 334–336)
   - LAOs: `components/LaoConditionsManagement.tsx` (linhas 551–553)
   - Path: `licenses/{timestamp}_{filename}` para licenças

2. **Download/Visualização:** URLs públicas geradas pelo Firebase Storage usadas diretamente como links

3. **Deleção:** `deleteObject(ref(storage, storagePath))` — usado em `LicenseDetailsModal.tsx` (linhas 198–199) e `LaoConditionsManagement.tsx` (linha 578)

4. **Verificação de integridade:** `getMetadata(fileRef)` para validar existência de arquivos antes de exibir anexos — `LicenseDetailsModal.tsx` (linhas 45–46)

5. **CORS:** Regras definidas em `cors.json` permitindo origens `https://ambientalsc.github.io` e `http://localhost:5173` com método GET

6. **Migração de dados:** Licenças no formato antigo (`fileUrl`/`fileName` únicos) são convertidas para o novo formato `attachments[]` durante `fetchLicenses` — `App.tsx` (linhas 156–168)

### Cache

- **Tipo:** Cache local em memória (estado React) + localStorage
- **localStorage:** Preferência de tema (`themePreference`, `theme`)
- **SessionStorage/Cookies:** Não utilizado

## Autenticação e Identidade

### Provedor de Autenticação: Firebase Authentication

- **Método:** Email/Senha (`signInWithEmailAndPassword`)
- **Arquivos:** `firebase.ts` (inicialização), `components/Login.tsx` (tela de login), `App.tsx` (gerenciamento de sessão), `components/UserManagement.tsx` (criação de usuários)

**Fluxo de autenticação:**
1. `Login.tsx`: Usuário insere email/senha → `signInWithEmailAndPassword(auth, email, password)`
2. `App.tsx`: `onAuthStateChanged` monitora mudanças de sessão (linha 244)
3. Após login, o perfil é buscado na coleção `users` do Firestore por `uid` — `App.tsx` (linhas 252–288)
4. **Primeiro usuário:** Se a coleção `users` estiver vazia, o primeiro login cria automaticamente um admin — `App.tsx` (linhas 264–277)
5. **Usuários subsequentes:** Recebem papel `colaborador` automaticamente — `App.tsx` (linhas 278–280)

**Perfis de usuário:**
- `admin`: Acesso total a todas as telas e dados
- `colaborador`: Acesso restrito por `allowedScreens`, `visibleBranchIds` e `visibleLicenseTypes` (filtros em `App.tsx` linhas 554–572)

**Criação de usuários:**
- `UserManagement.tsx`: Cria novo usuário via Firebase Auth secundário com `createUserWithEmailAndPassword`, usando o `firebaseConfig` para instanciar um app secundário e evitar conflito com a sessão atual — linhas 181+

**Logout:**
- `signOut(auth)` — acionado pelo botão "Sair" no header e no perfil do usuário na sidebar

## Monitoramento e Observabilidade

**Rastreamento de Erros:**
- Firebase Analytics: `measurementId: "G-JGXM1WF3P4"` configurado em `firebase.ts` — Google Analytics via Firebase
- Não há serviço externo de error tracking (Sentry, etc.)

**Logs:**
- `console.error` para falhas de operações Firestore — `App.tsx` (linha 227)
- `console.log` para notificações de arquivos deletados — `LicenseDetailsModal.tsx` (linha 55)
- Sem sistema de logging estruturado

## CI/CD e Deploy

**Hospedagem:**
- GitHub Pages (`https://ambientalsc.github.io/licencas/`)
- Base path `/licencas/` configurado em `vite.config.ts` e `vite.config.js`

**Pipeline de CI:**
- Não detectado — sem GitHub Actions ou outro CI configurado
- Deploy manual via `npm run deploy` (script `gh-pages -d dist`)

**Build:**
- `npm run build` → Vite gera bundle estático em `dist/`
- Chunks separados: `firebase`, `react-vendor`, `xlsx`, `vendor`
- `npm run predeploy` → executa `build` antes do deploy

## Configuração de Ambiente

**Variáveis de ambiente necessárias:**

| Variável | Obrigatória | Propósito | Arquivo |
|----------|-------------|-----------|---------|
| `GEMINI_API_KEY` | Não (recurso inativo) | Chave da API Google Gemini | `.env` local |

**Segredos:**
- Firebase API key e configuração hardcoded em `firebase.ts` (não é prática sensível para Firebase — a API key é pública por design)
- Senhas de usuários gerenciadas pelo Firebase Authentication

## Webhooks e Callbacks

**Entrada:**
- Nenhum — Não há endpoints HTTP configurados (SPA cliente-somente, sem servidor backend próprio)

**Saída:**
- Nenhum — Não há chamadas para webhooks externos

## Firebase Functions

- **Status:** Declarado em `firebase.json` mas o diretório `functions/` **não existe**
- **Configuração:** Scripts `predeploy` de lint e build definidos, mas o código fonte ainda não foi criado
- **Propósito futuro:** Potencial para lógica serverless (agendamento de notificações, processamento assíncrono)

---

*Auditoria de integrações: 2026-05-25*
