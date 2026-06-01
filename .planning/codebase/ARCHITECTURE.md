<!-- refreshed: 2026-05-25 -->
# Arquitetura

**Data da Análise:** 2026-05-25

## Visão Geral do Sistema

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Navegador (SPA Client-Side)                   │
├─────────────────────────────────────────────────────────────────┤
│  index.tsx (entry point) ──► App.tsx (componente monolítico)    │
│                                  │                              │
│           ┌──────────────────────┼──────────────────────┐       │
│           ▼                      ▼                      ▼       │
│   ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐ │
│   │   Auth/Login │    │   Sidebar +      │    │   Tema       │ │
│   │  `Login.tsx` │    │   Navegação      │    │  (dark/light)│ │
│   └──────────────┘    │  (inline no      │    └──────────────┘ │
│                       │   App.tsx)        │                     │
│                       └────────┬─────────┘                     │
│                                │                                │
│            ┌───────────────────┼───────────────────┐           │
│            ▼                   ▼                   ▼           │
│   ┌─────────────┐    ┌─────────────┐    ┌──────────────────┐  │
│   │  Dashboard  │    │  Licenses   │    │  LAO Conditions  │  │
│   │  (lazy)     │    │  (lazy)     │    │  (lazy)          │  │
│   └─────────────┘    └─────────────┘    └──────────────────┘  │
│            ▼                   ▼                   ▼           │
│   ┌─────────────┐    ┌─────────────┐    ┌──────────────────┐  │
│   │  Types     │    │  Branches   │    │  Users           │  │
│   │  (lazy)    │    │  (lazy)     │    │  (lazy)          │  │
│   └─────────────┘    └─────────────┘    └──────────────────┘  │
│                       │                                         │
│   ┌───────────────────┼───────────────────┐                    │
│   │  Deactivated      │  Import Modals    │                    │
│   │  Licenses (lazy)  │  (lazy)           │                    │
│   └───────────────────┴───────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Firebase (Backend)                           │
│  `firebase.ts`                                                  │
├──────────────┬──────────────────┬───────────────────────────────┤
│  Firestore   │  Auth            │  Storage                      │
│  (NoSQL)     │  (email/senha)   │  (anexos)                     │
└──────────────┴──────────────────┴───────────────────────────────┘
```

## Responsabilidades dos Componentes

| Componente | Responsabilidade | Arquivo |
|-----------|-----------------|---------|
| `App` | Estado global, autenticação, tema, roteamento por view, **todas** operações CRUD Firestore, controle de acesso por perfil | `App.tsx` (785 linhas) |
| `Login` | Tela de login com Firebase Auth (email/senha) | `components/Login.tsx` (79 linhas) |
| `Dashboard` | Visão geral: cards de status, licenças próximas do vencimento, distribuição por tipo/filial | `components/Dashboard.tsx` (196 linhas) |
| `LicenseManagement` | CRUD de licenças, filtros, ordenação, upload de anexos, importação Excel | `components/LicenseManagement.tsx` (698 linhas) |
| `LicenseDetailsModal` | Modal de detalhes/edição de licença com gerenciamento de anexos (upload/delete/verificação) | `components/LicenseDetailsModal.tsx` (697 linhas) |
| `LaoConditionsManagement` | CRUD de LAOs, condicionantes e inspeções, calendário de vistorias, importação Excel | `components/LaoConditionsManagement.tsx` (2119 linhas) |
| `ImportLaoWorkbookModal` | Parsing de planilha Excel de LAOs/condicionantes, detecção de duplicatas | `components/ImportLaoWorkbookModal.tsx` (492 linhas) |
| `ImportLicensesModal` | Parsing de planilha Excel de licenças, template download | `components/ImportLicensesModal.tsx` (178 linhas) |
| `LicenseTypeManagement` | CRUD de tipos de licença com parâmetros de renovação | `components/LicenseTypeManagement.tsx` (172 linhas) |
| `BranchManagement` | CRUD de filiais | `components/BranchManagement.tsx` (218 linhas) |
| `DeactivatedLicenses` | Visualização e edição de licenças inativas/vencidas | `components/DeactivatedLicenses.tsx` (213 linhas) |
| `UserManagement` | CRUD de usuários, definição de permissões (telas, filiais, tipos de licença) | `components/UserManagement.tsx` (471 linhas) |
| `Sidebar` | Barra lateral de navegação (versão standalone — parcialmente usada, navegação principal está inline no App.tsx) | `components/Sidebar.tsx` (66 linhas) |
| Ícones (16 arquivos) | Componentes React com SVGs inline para ícones da UI | `components/icons/*.tsx` |

## Panorama de Padrões

**Padrão Geral:** SPA Monolítica com Container-Presenter (variante degenerada)

**Características Principais:**
- Único container stateful (`App.tsx`) que detém **todo** o estado e **todas** as operações CRUD
- Componentes filhos recebem dados e callbacks exclusivamente via **props** (sem Context API, Redux, Zustand ou qualquer gerenciador de estado)
- Navegação por `view` (state string) com renderização condicional — **sem React Router**
- Carregamento lazy dos componentes de tela (`React.lazy` + `Suspense`)
- Integração direta com Firebase Firestore nos callbacks do App (sem camada de serviço/repositório)

## Camadas

**Camada de Entrada:**
- Propósito: Inicializar React e montar a aplicação
- Localização: `index.tsx`, `index.html`
- Contém: ReactDOM.createRoot, injeção de tema (script inline no `<head>`)
- Depende de: `App.tsx`, `index.css`
- Usado por: Navegador (ponto de entrada único)

**Camada de Shell (App):**
- Propósito: Orquestrar autenticação, estado global, operações Firestore, tema e roteamento
- Localização: `App.tsx`
- Contém: Estado de todas as coleções, callbacks CRUD, lógica de autenticação/perfil, filtros de visibilidade por perfil, sidebar, header, footer
- Depende de: `firebase.ts`, `types.ts`, `components/*`, `utils/*`
- Usado por: Todos os componentes de tela (via props)

**Camada de Visualização (Telas):**
- Propósito: Renderizar cada tela funcional do sistema
- Localização: `components/Dashboard.tsx`, `components/LicenseManagement.tsx`, `components/LaoConditionsManagement.tsx`, etc.
- Contém: Lógica de UI, estado local de formulários, filtros, ordenação
- Depende de: Props do App.tsx, `types.ts`, `firebase.ts` (Storage), `utils/laoSchedule.ts`
- Usado por: `App.tsx` (via lazy loading)

**Camada de Infraestrutura:**
- Propósito: Comunicação com Firebase
- Localização: `firebase.ts`
- Contém: Inicialização do Firebase App, export de `db` (Firestore), `auth`, `storage`
- Depende de: Firebase SDK
- Usado por: `App.tsx` e componentes que acessam Storage diretamente

**Camada de Tipos:**
- Propósito: Definição de interfaces e tipos TypeScript do domínio
- Localização: `types.ts`
- Contém: `Unit`, `License`, `LicenseType`, `Branch`, `User`, `LaoRecord`, `LaoCondition`, `LaoInspection`, `Attachment`, enums
- Depende de: Nada
- Usado por: Toda a aplicação

**Camada de Utilitários:**
- Propósito: Funções auxiliares de data, parsing de planilhas, normalização
- Localização: `utils/laoSchedule.ts`
- Contém: `formatDateBR`, `parseISODate`, `parseWorkbookDate`, `frequencyPresetToMonths`, `projectInspectionDatesForYear`, etc.
- Depende de: `types.ts`
- Usado por: `LaoConditionsManagement`, `ImportLaoWorkbookModal`

## Fluxo de Dados

### Caminho Primário: Carregamento Inicial

1. `index.html` executa script inline que aplica tema (light/dark) antes da hidratação React — evita flash (`index.html:8-26`)
2. `index.tsx` monta `<App />` dentro de `<React.StrictMode>` (`index.tsx:13-15`)
3. `App.tsx` inicializa Firebase Auth listener (`App.tsx:244-249`) e dispara carregamento paralelo de 7 coleções Firestore (`App.tsx:213-241`)
4. Enquanto carrega, exibe spinner "Carregando dados..." (`App.tsx:543-552`)
5. Se não autenticado, renderiza `<Login />` (`App.tsx:301-303`)
6. Após auth + dados, renderiza sidebar + header + tela ativa com dados filtrados por perfil (`App.tsx:576-782`)

### Caminho de CRUD: Adicionar Licença

1. Usuário interage com formulário em `LicenseManagement.tsx` (estado local)
2. Ao submeter, chama `onAddLicense(license)` — callback recebido via props (`LicenseManagement.tsx`)
3. `App.tsx` executa `addDoc(licensesCollectionRef, license)` no Firestore (`App.tsx:332-339`)
4. Em seguida, chama `fetchLicenses()` para re-carregar a coleção completa (`App.tsx:338`)
5. `LicenseManagement` re-renderiza com a lista atualizada de licenças

### Caminho de Autenticação e Perfil

1. `Login.tsx` chama `signInWithEmailAndPassword(auth, email, password)` (`Login.tsx:21`)
2. `onAuthStateChanged` em `App.tsx` detecta o usuário logado (`App.tsx:244`)
3. `App.tsx` busca perfil na coleção `users` do Firestore por `uid` (`App.tsx:252-288`)
4. Se nenhum usuário existe → primeiro login → cria automaticamente como `admin` (`App.tsx:264-277`)
5. Se já existem usuários → novo login → `colaborador` (sem telas) (`App.tsx:279-281`)
6. Filtros de visibilidade aplicados: `visibleLicenses`, `visibleBranches`, `visibleLaos` etc. (`App.tsx:554-572`)

**Gerenciamento de Estado:**
- Todo estado é local ao `App.tsx` via `useState`
- Não há estado global compartilhado entre componentes irmãos (só via props do App)
- Tema persiste em `localStorage` (`themePreference`, `theme`)
- Dados Firestore são recarregados integralmente após cada mutação (fetch completo, sem cache incremental)

## Abstrações Principais

**Tipos de Domínio (`types.ts`):**
- Propósito: Definir as entidades do sistema e seus formatos de dados
- Exemplos: `Unit`, `License`, `LicenseType`, `Branch`, `User`, `LaoRecord`, `LaoCondition`, `LaoInspection`, `Attachment`
- Padrão: Todas as interfaces têm `id: string`; o tipo `Omit<T, 'id'>` é usado para operações de criação

**Referências de Coleção Firestore (`App.tsx`):**
- Propósito: Referências estáticas às coleções do Firestore, criadas uma vez no escopo do módulo
- Exemplos: `unitsCollectionRef`, `licensesCollectionRef`, `licenseTypesCollectionRef`, `branchesCollectionRef`, `laoCollectionRef`, `laoConditionsCollectionRef`, `laoInspectionsCollectionRef`
- Padrão: `collection(db, 'nomeDaColecao')` em constantes no topo do arquivo (linhas 57-63)

**toFirestoreData (`App.tsx:65-77`):**
- Propósito: Sanitizar objetos antes de enviar ao Firestore, removendo campos `undefined` recursivamente
- Usado em: `addLao`, `updateLao`, `addLaoCondition`, `updateLaoCondition`, `addLaoInspection`

**Utilitários de Data (`utils/laoSchedule.ts`):**
- Propósito: Conversão entre formatos de data (ISO ↔ Brasileiro ↔ Excel), projeção de cronograma de inspeções
- Funções principais: `formatDateBR`, `parseWorkbookDate`, `frequencyPresetToMonths`, `projectInspectionDatesForYear`

**Ícones como Componentes (`components/icons/`):**
- Propósito: Encapsular SVGs inline como componentes React reutilizáveis
- Padrão: Cada arquivo exporta um `React.FC<React.SVGProps<SVGSVGElement>>` com SVG hardcoded

## Pontos de Entrada

**Entrada HTML:**
- Localização: `index.html`
- Gatilhos: Requisição HTTP ao servidor (GitHub Pages ou Vite dev server)
- Responsabilidades: Carregar CSS, aplicar tema antes da hidratação React, montar `<div id="root">`

**Entrada React:**
- Localização: `index.tsx`
- Gatilhos: Carregamento do bundle JavaScript
- Responsabilidades: Criar React root, renderizar `<App />` dentro de `<StrictMode>`

**Entrada Firebase:**
- Localização: `firebase.ts`
- Gatilhos: Importação por qualquer módulo que precise de `db`, `auth` ou `storage`
- Responsabilidades: Inicializar Firebase app com config hardcoded, exportar instâncias

**Entrada de Autenticação:**
- Localização: `components/Login.tsx`
- Gatilhos: Usuário não autenticado (estado `user === null` no App)
- Responsabilidades: Formulário de email/senha, chamada `signInWithEmailAndPassword`

## Restrições Arquiteturais

- **Threading:** Single-threaded (JavaScript event loop no navegador). Todas as operações Firestore são assíncronas via Promises.
- **Estado global:** Apenas `App.tsx` detém estado compartilhado. Não há stores globais como Redux ou Context. `firebase.ts` exporta singletons (`db`, `auth`, `storage`) que são estado de infraestrutura, não de aplicação.
- **Importações circulares:** Não detectadas. A hierarquia é estritamente unidirecional: `App.tsx` → componentes → tipos/utils.
- **Build sem typecheck separado:** O TypeScript é verificado apenas em tempo de build pelo Vite. Não há script `tsc --noEmit`.
- **Duplicação de config Vite:** Existem dois arquivos (`vite.config.ts` e `vite.config.js`) com sobreposição parcial. O `.ts` injeta `GEMINI_API_KEY`; o `.js` não.

## Anti-Padrões

### Componente Monolítico (God Component)

**O que acontece:** `App.tsx` concentra ~785 linhas com **todo** o estado da aplicação (19 `useState`), **todas** as operações CRUD (24 funções), lógica de autenticação, tema, navegação, sidebar, header, footer e filtros de visibilidade.
**Por que é ruim:** Dificulta manutenção e testes. Qualquer alteração no estado ou CRUD requer modificar o App. O componente tem responsabilidades demais (Single Responsibility Principle violado).
**Faça em vez disso:** Extraia providers de contexto (AuthContext, DataContext, ThemeContext) ou adote um gerenciador de estado. Mova operações Firestore para uma camada de serviços (ex.: `services/licenses.ts`).

### Recarregamento Completo Após Cada Mutação

**O que acontece:** Após cada `addDoc`/`updateDoc`/`deleteDoc`, o App busca **toda** a coleção novamente (`fetchLicenses()`, `fetchUnits()`, etc.).
**Por que é ruim:** Desperdício de leituras do Firestore (custos) e latência desnecessária. Se a coleção tem 500 documentos, cada edição recarrega todos os 500.
**Faça em vez disso:** Atualize o estado local otimisticamente ou use `onSnapshot` para listeners em tempo real.

### Acesso Direto ao Storage pelos Componentes Filhos

**O que acontece:** `LicenseManagement.tsx`, `LicenseDetailsModal.tsx` e `LaoConditionsManagement.tsx` importam `storage` de `firebase.ts` e fazem upload/download diretamente, sem passar pelo App.
**Por que é ruim:** Quebra o padrão de fluxo de dados unidirecional. Torna impossível rastrear todas as operações de Storage em um único lugar.
**Faça em vez disso:** Mova operações de Storage para callbacks no App (como já feito com Firestore CRUD) ou para uma camada de serviço dedicada.

### Sidebar.tsx Redundante

**O que acontece:** Existe um componente `Sidebar.tsx` standalone com ~60 linhas, mas a navegação real é implementada inline no `App.tsx` (linhas 520-669).
**Por que é ruim:** Código morto que causa confusão e pode divergir.
**Faça em vez disso:** Remova `Sidebar.tsx` ou refatore o App para usar o componente Sidebar.

## Tratamento de Erros

**Estratégia:** Mínimo. Erros de rede Firebase são logados no console (`console.error`). O estado de loading é gerenciado, mas sem tratamento granular de falhas.

**Padrões:**
- Try/catch no carregamento inicial de dados com fallback silencioso (`App.tsx:216-231`)
- Try/catch no login com mensagem de erro exibida ao usuário (`Login.tsx:20-27`)
- Verificação de duplicatas em inspeções retorna `null` sem lançar erro (`App.tsx:507-512`)
- `parseWorkbookDate` retorna `null` para valores inválidos (não lança exceções)

## Preocupações Transversais

**Logging:** `console.error` para falhas de fetch. Sem sistema de logging estruturado.

**Validação:** Tipagem TypeScript em tempo de compilação (`strict: true`). Sem validação em runtime (ex.: Zod, Yup). `toFirestoreData` remove `undefined` mas não valida tipos.

**Autenticação:** Firebase Auth com listener `onAuthStateChanged`. Perfis (`admin`/`colaborador`) armazenados no Firestore (coleção `users`). Controle de acesso por tela, filial e tipo de licença implementado via filtros no App.

**Tema:** Tailwind CSS com `darkMode: 'class'`. Preferência salva em `localStorage`. Script inline no `<head>` previne flash de tema (FOUC). Suporte a `prefers-color-scheme` do sistema operacional.

---

*Análise de arquitetura: 2026-05-25*
