# Estrutura do Codebase

**Data da Análise:** 2026-05-25

## Layout de Diretórios

```
licencas/
├── .agent/                         # Regras para agentes de IA
│   └── rules/
│       └── language.md             # Regra: sempre responder em pt-BR
├── .planning/                      # Documentos de planejamento GSD
│   └── codebase/                   # Documentos de mapeamento do codebase
├── assets/                         # Recursos estáticos (imagens, build output)
│   ├── ambiental.svg               # Logo da Ambiental
│   └── meioambiental.jpeg          # Imagem de fundo da tela de login
├── components/                     # Componentes React da aplicação
│   ├── icons/                      # Ícones como componentes React (16 arquivos)
│   │   ├── BuildingIcon.tsx        # Ícone de prédio (filiais)
│   │   ├── ChevronLeftIcon.tsx     # Seta esquerda
│   │   ├── ChevronRightIcon.tsx    # Seta direita
│   │   ├── ColumnsIcon.tsx         # Ícone de colunas (controle de visibilidade)
│   │   ├── DashboardIcon.tsx       # Ícone do dashboard
│   │   ├── ExpiredIcon.tsx         # Ícone de licença vencida
│   │   ├── FilterIcon.tsx          # Ícone de filtro
│   │   ├── ImportIcon.tsx          # Ícone de importação
│   │   ├── LicenseIcon.tsx         # Ícone de licença
│   │   ├── MenuIcon.tsx            # Ícone de menu hamburguer
│   │   ├── PencilIcon.tsx          # Ícone de edição (lápis)
│   │   ├── PlusIcon.tsx            # Ícone de adicionar (+)
│   │   ├── SettingsIcon.tsx        # Ícone de configurações
│   │   ├── TrashIcon.tsx           # Ícone de lixeira (excluir)
│   │   ├── TypeIcon.tsx            # Ícone de tipo de licença
│   │   └── UsersIcon.tsx           # Ícone de usuários
│   ├── BranchManagement.tsx        # CRUD de filiais (218 linhas)
│   ├── Dashboard.tsx               # Tela de dashboard com KPIs (196 linhas)
│   ├── DeactivatedLicenses.tsx     # Visualização de licenças vencidas (213 linhas)
│   ├── ImportLaoWorkbookModal.tsx  # Modal de importação Excel de LAOs (492 linhas)
│   ├── ImportLicensesModal.tsx     # Modal de importação Excel de licenças (178 linhas)
│   ├── LaoConditionsManagement.tsx # Gestão de LAOs, condicionantes e inspeções (2119 linhas)
│   ├── LicenseDetailsModal.tsx     # Modal de detalhes/anexos de licença (697 linhas)
│   ├── LicenseManagement.tsx       # CRUD de licenças com filtros (698 linhas)
│   ├── LicenseTypeManagement.tsx   # CRUD de tipos de licença (172 linhas)
│   ├── Login.tsx                   # Tela de login (79 linhas)
│   ├── Sidebar.tsx                 # Sidebar standalone (parcialmente em uso) (66 linhas)
│   └── UserManagement.tsx          # CRUD de usuários e permissões (471 linhas)
├── public/                         # Arquivos públicos servidos diretamente
│   └── favicon.svg                 # Favicon do site
├── utils/                          # Funções utilitárias
│   └── laoSchedule.ts              # Datas, parsing Excel, cronograma LAO (161 linhas)
├── .firebaserc                     # Configuração de projeto Firebase
├── .gitignore                      # Arquivos ignorados pelo Git
├── AGENTS.md                       # Guia para agentes de IA (77 linhas)
├── App.tsx                         # Componente raiz monolítico (785 linhas)
├── cors.json                       # Regras CORS para Firebase Storage
├── firebase.json                   # Configuração de Firebase Functions
├── firebase.ts                     # Inicialização do Firebase (25 linhas)
├── index.css                       # Estilos globais + variáveis de tema (170 linhas)
├── index.html                      # HTML entry point com script de tema (32 linhas)
├── index.tsx                       # React entry point (17 linhas)
├── metadata.json                   # Metadados da aplicação
├── package.json                    # Dependências e scripts npm
├── package-lock.json               # Lockfile de dependências
├── postcss.config.cjs              # Configuração do PostCSS
├── README.md                       # Documentação do projeto
├── tailwind.config.cjs             # Configuração do Tailwind CSS
├── tsconfig.json                   # Configuração do TypeScript
├── types.ts                        # Tipos e interfaces do domínio (138 linhas)
├── vite.config.js                  # Config Vite (versão JS simplificada)
└── vite.config.ts                  # Config Vite (versão TS com env vars)
```

## Propósito dos Diretórios

**`components/`:**
- Propósito: Todos os componentes React da aplicação
- Contém: Componentes de tela (lazy-loaded), modais, e ícones
- Arquivos-chave: `LaoConditionsManagement.tsx`, `LicenseManagement.tsx`, `LicenseDetailsModal.tsx`, `Dashboard.tsx`

**`components/icons/`:**
- Propósito: Ícones da interface como componentes React com SVG inline
- Contém: 16 arquivos `.tsx`, cada um exportando um `React.FC<React.SVGProps<SVGSVGElement>>`
- Arquivos-chave: `LicenseIcon.tsx`, `DashboardIcon.tsx`, `TrashIcon.tsx`, `PlusIcon.tsx`

**`utils/`:**
- Propósito: Funções utilitárias compartilhadas
- Contém: Apenas `laoSchedule.ts` — utilitários de data, parsing de Excel, projeção de cronograma
- Arquivos-chave: `laoSchedule.ts`

**`assets/`:**
- Propósito: Recursos estáticos referenciados no código (imagens, SVGs)
- Contém: Logo (`ambiental.svg`), imagem de fundo do login (`meioambiental.jpeg`), e build artifacts
- Nota: Os arquivos `index-*.js` e `index-*.css` são output do build e **não** devem ser editados manualmente

**`public/`:**
- Propósito: Arquivos servidos diretamente na raiz do site
- Contém: Apenas `favicon.svg`

**`.agent/`:**
- Propósito: Regras para agentes de IA que interagem com o codebase
- Contém: `rules/language.md` — regra para sempre responder em português brasileiro

**`.planning/`:**
- Propósito: Documentos de planejamento gerados pelo GSD
- Contém: `codebase/` — documentos de mapeamento do codebase
- Gerado: Sim (pelos comandos GSD)
- Commitado: Sim

## Localizações de Arquivos-Chave

**Pontos de Entrada:**
- `index.html`: Entrada HTML — carrega CSS, aplica tema inline, monta `<div id="root">`
- `index.tsx`: Entrada React — `ReactDOM.createRoot`, renderiza `<App />`
- `firebase.ts`: Entrada Firebase — inicializa app, exporta `db`, `auth`, `storage`

**Configuração:**
- `package.json`: Scripts npm e dependências
- `tsconfig.json`: Config TypeScript (`strict: true`, alias `@/*`, target ES2020)
- `vite.config.ts`: Config Vite principal — base path `/licencas/`, env vars, code splitting
- `vite.config.js`: Config Vite secundária (simplificada, sem env vars)
- `tailwind.config.cjs`: Config Tailwind — `darkMode: 'class'`, paths de conteúdo
- `postcss.config.cjs`: Config PostCSS
- `firebase.json`: Config Firebase Functions (diretório `functions/` declarado mas não implementado)
- `cors.json`: Regras CORS para Firebase Storage

**Lógica Central:**
- `App.tsx`: Componente raiz — estado global, CRUD Firestore, autenticação, tema, navegação
- `types.ts`: Todas as interfaces e tipos TypeScript do domínio
- `firebase.ts`: Inicialização e exportação das instâncias Firebase

**Componentes de Tela (lazy-loaded):**
- `components/Dashboard.tsx`: Dashboard com KPIs e gráficos
- `components/LicenseManagement.tsx`: Gestão de licenças (Ambiental e SGA)
- `components/LicenseTypeManagement.tsx`: Gestão de tipos de licença
- `components/BranchManagement.tsx`: Gestão de filiais
- `components/DeactivatedLicenses.tsx`: Licenças vencidas/inativas
- `components/LaoConditionsManagement.tsx`: Gestão de LAOs e condicionantes (maior arquivo: 2119 linhas)
- `components/UserManagement.tsx`: Gestão de usuários e permissões

**Modais e Diálogos:**
- `components/LicenseDetailsModal.tsx`: Detalhes da licença com gerenciamento de anexos
- `components/ImportLaoWorkbookModal.tsx`: Importação de planilha de LAOs
- `components/ImportLicensesModal.tsx`: Importação de planilha de licenças

**Autenticação:**
- `components/Login.tsx`: Tela de login com Firebase Auth

**Utilitários:**
- `utils/laoSchedule.ts`: Funções de data, parsing Excel, cronograma de condicionantes

**Estilos:**
- `index.css`: Estilos globais, diretivas Tailwind, variáveis CSS de tema (light/dark)

## Convenções de Nomenclatura

**Arquivos:**
- Componentes React: `PascalCase.tsx` (ex.: `LicenseManagement.tsx`, `Dashboard.tsx`)
- Ícones: `PascalCaseIcon.tsx` (ex.: `TrashIcon.tsx`, `PlusIcon.tsx`)
- Utilitários: `camelCase.ts` (ex.: `laoSchedule.ts`)
- Tipos: `camelCase.ts` (ex.: `types.ts`)
- Configuração: `kebab-case.config.ext` (ex.: `tailwind.config.cjs`, `vite.config.ts`)
- Assets: `kebab-case.ext` (ex.: `meioambiental.jpeg`)

**Diretórios:**
- Componentes: plural em inglês (`components/`, `utils/`, `assets/`)
- Subdiretórios: plural descritivo (`icons/`, `rules/`)

**Funções:**
- Componentes React: `PascalCase` (ex.: `LicenseManagement`, `Dashboard`)
- Funções utilitárias: `camelCase` (ex.: `formatDateBR`, `parseWorkbookDate`, `fetchLicenses`)
- Handlers de evento: `handle` + ação (ex.: `handleSubmit`, `handleEditClick`, `handleCancel`)
- Callbacks CRUD no App: `add`/`update`/`delete` + entidade (ex.: `addLicense`, `updateLicense`, `deleteLicense`)
- Funções fetch: `fetch` + entidade no plural (ex.: `fetchLicenses`, `fetchUnits`)

**Variáveis:**
- Estado: `camelCase` descritivo (ex.: `isSidebarOpen`, `editingLicense`, `authLoading`)
- Referências Firestore: `camelCase` + `CollectionRef` (ex.: `licensesCollectionRef`, `unitsCollectionRef`)

**Interfaces e Tipos:**
- Interfaces de domínio: `PascalCase` singular (ex.: `License`, `Branch`, `LaoCondition`)
- Props de componente: `PascalCase` + `Props` (ex.: `LicenseManagementProps`, `DashboardProps`)
- Types utilitários: `PascalCase` (ex.: `Status`, `ThemeMode`, `View`, `LaoFrequencyPreset`)

## Onde Adicionar Código Novo

**Nova Funcionalidade (feature):**
- Componente de tela: `components/NomeDaFeature.tsx`
- Registrar no App.tsx: Adicionar ao tipo `View`, criar lazy import, adicionar entrada na Sidebar e renderização condicional
- Tipos: Adicionar interfaces em `types.ts` se necessário
- Callbacks CRUD: Adicionar funções `add*`/`update*`/`delete*` em `App.tsx`

**Novo Componente de UI reutilizável:**
- Implementação: `components/NomeDoComponente.tsx`

**Novo Ícone:**
- Implementação: `components/icons/NomeDoIconeIcon.tsx`
- Padrão: Exportar `React.FC<React.SVGProps<SVGSVGElement>>` com SVG inline

**Nova Função Utilitária:**
- Se relacionada a datas/LAO: `utils/laoSchedule.ts`
- Se for um domínio novo: Criar `utils/nomeDoDominio.ts`

**Nova Coleção Firestore:**
- Adicionar `collectionRef` em `App.tsx` (junto às existentes nas linhas 57-63)
- Adicionar estado `useState` no App
- Adicionar funções `fetch*`, `add*`, `update*`, `delete*`
- Adicionar tipo/interface em `types.ts`

**Novo Modal:**
- Implementação: `components/NomeDoModal.tsx`
- Importar no componente que o utiliza (não no App, a menos que seja global)

**Novo Serviço/Integração Firebase:**
- Se for novo produto Firebase: Adicionar inicialização em `firebase.ts`
- Se for Cloud Function: Criar diretório `functions/` (declarado em `firebase.json` mas ainda não existe)

## Diretórios Especiais

**`assets/`:**
- Propósito: Recursos estáticos usados em `import` nos componentes
- Gerado: Parcialmente (arquivos `index-*.js`/`index-*.css` são output do build)
- Commitado: Sim (inclui os build artifacts para deploy)

**`public/`:**
- Propósito: Arquivos servidos na raiz sem processamento
- Gerado: Não
- Commitado: Sim

**`node_modules/`:**
- Propósito: Dependências instaladas
- Gerado: Sim (`npm install`)
- Commitado: Não (listado no `.gitignore`)

**`dist/`:**
- Propósito: Output do build de produção (`npm run build`)
- Gerado: Sim
- Commitado: Não (gerado durante deploy pelo `gh-pages`)

---

*Análise de estrutura: 2026-05-25*
