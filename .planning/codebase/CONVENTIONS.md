# Convenções de Código

**Data da Análise:** 2026-05-25

## Idioma

**UI e comentários:** Português brasileiro (pt-BR) — regra obrigatória definida em `.agent/rules/language.md`. Todos os textos visíveis ao usuário, labels, mensagens de erro e comentários no código são escritos em português.

**Termos técnicos e código:** Nomes de funções, variáveis, tipos e identificadores seguem padrão em inglês (ex: `fetchLicenses`, `LicenseType`, `handleSubmit`). Constantes de negócio usam português (ex: `'Ativa'`, `'Vencida'`, `'Em Renovação'`).

## Padrões de Nomenclatura

**Arquivos:**
- Componentes React: `PascalCase.tsx` — `Dashboard.tsx`, `LicenseManagement.tsx`, `BranchManagement.tsx`
- Utilitários: `camelCase.ts` — `laoSchedule.ts`
- Tipos: `types.ts`
- Arquivos de entrada: `index.tsx`, `index.html`, `index.css`
- Ícones: `PascalCase` em sua própria pasta — `components/icons/LicenseIcon.tsx`

**Diretórios:**
- Componentes em `components/` na raiz do projeto (sem subpastas por feature)
- Ícones em `components/icons/`
- Utilitários em `utils/` na raiz
- Não usa estrutura `src/` — todos os fontes estão na raiz do projeto

**Funções:**
- `camelCase` — `fetchLicenses()`, `handleSubmit()`, `addUnit()`, `getDaysUntilExpiry()`
- Handlers de evento: `handle` + ação — `handleSubmit`, `handleChange`, `handleEditClick`, `handleCancel`
- Buscadores/getters: `fetch` + entidade ou `get` + descrição — `fetchUnits()`, `getBranchName()`, `getAlertBadge()`
- Funções de conveniência: `formatDateBR()`, `parseISODate()`, `new Date()` + `'T00:00:00'` para datas

**Variáveis:**
- `camelCase` — `selectedLicenseForModal`, `isFormOpen`, `visibleBranchIds`
- Estados booleanos usam prefixo `is`/`show`/`has` — `isFormOpen`, `showFilter`, `hasScreenAccess`
- Estados de loading: `loading`, `uploading`, `savingInspection`, `authLoading`
- Estados de erro: `error` (string)

**Tipos e Interfaces:**
- `PascalCase` — `License`, `Branch`, `LaoRecord`, `Unit`
- Interfaces de props: `{ComponentName}Props` — `DashboardProps`, `LoginProps`, `LicenseManagementProps`
- Tipos union: `PascalCase` — `View`, `ThemeMode`, `Status`, `LaoCategory`, `LaoFrequencyPreset`
- Enums-like: usam-se `type` com literais — `type Status = 'Ativa' | 'Vencida' | 'Em Renovação'` (não usa `enum` do TypeScript)

## Estilo de Código

**Formatação:**
- Não há Prettier, ESLint ou Biome configurados no projeto
- Indentação consistente de 2 espaços (observada em todo o código)
- Ponto e vírgula ao final de instruções
- Chaves em nova linha para blocos de função
- Strings com aspas simples (`'`)
- JSX com atributos multi-linha indentados com alinhamento

**TypeScript:**
- `strict: true` em `tsconfig.json`
- `noUnusedLocals: true` — variáveis locais não usadas impedem compilação
- `noUnusedParameters: true` — parâmetros não usados impedem compilação
- `noFallthroughCasesInSwitch: true`
- Uso de `import type` para imports apenas de tipo — `import type { License, Branch } from '../types'`
- Tipos definidos centralmente em `types.ts` na raiz do projeto
- Interfaces exportadas com `export interface`; tipos com `export type`

**React:**
- Todos componentes são `React.FC<PropsType>` — `const Dashboard: React.FC<DashboardProps> = (...)`
- Estado local gerenciado com `useState` — não usa Redux, Zustand ou outros gerenciadores de estado
- O componente `App.tsx` centraliza todo estado global e operações Firestore
- Componentes filhos recebem dados e callbacks via props

**Tailwind CSS:**
- Classes utilitárias inline nos elementos JSX
- Dark mode via estratégia `class` — classes `dark:` prefixadas em todo o código
- Variáveis CSS customizadas definidas em `index.css` para cores de superfície, texto e borda
- Animações: `animate-spin`, `animate-fade-in`, `transition-colors`, `transition-transform`
- Padding/margin: usa as classes padrão do Tailwind — `p-3`, `p-6`, `mb-4`, `gap-6`

## Organização de Imports

**Ordem dos imports — padrão observado:**

1. React e hooks — `import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react'`
2. Firebase (app, firestore, auth, storage) — `import { db } from './firebase'`
3. Tipos (com `import type`) — `import type { License, Branch } from '../types'`
4. Componentes filhos — `import Login from './components/Login'`
5. Ícones (nomeados) — `import { PlusIcon } from './icons/PlusIcon'`
6. Utilitários — `import { formatDateBR } from '../utils/laoSchedule'`
7. Assets/imagens — `import logo from './assets/ambiental.svg'`
8. Firebase SDK exports — `import { collection, getDocs, addDoc } from 'firebase/firestore'`

**Alias de Path:**
- `@/*` → raiz do projeto — definido em `tsconfig.json` (`"paths": { "@/*" : ["./*"] }`) e `vite.config.ts`
- Pouco usado na prática — o código prefere imports relativos como `'../types'`, `'./firebase'`

## Tratamento de Erros

**Padrão predominante: `try/catch/finally` com `console.error` + alert**

```typescript
try {
  await someAsyncOperation();
} catch (error) {
  console.error("Error uploading file: ", error);
  alert("Erro ao fazer upload do arquivo.");
} finally {
  setUploading(false);
}
```

**Variações observadas:**

- **App.tsx:** `try/catch` com `console.error` e sem alert (busca de dados do Firestore)
- **Login.tsx:** `try/catch` com `setError('...')` para exibir erro no formulário
- **UserManagement.tsx:** `try/catch` com `setError(err.message)` e `setSuccess('...')` para feedback
- **LaoConditionsManagement.tsx:** `try/catch` com `console.warn` e `alert`
- **ImportLaoWorkbookModal.tsx:** `try/catch` retornando null em caso de erro

**Casos sem try/catch:**
- Muitas operações CRUD em `App.tsx` não envolvem `try/catch` — erros de Firestore propagam sem tratamento
- Handlers de formulário validam com `if (!required) { alert(...); return; }` antes de submeter

## Logging

**Framework:** `console` nativo do navegador — sem biblioteca de logging externa

**Padrões:**
- `console.error("Error ...", error)` — usado para erros em operações Firestore/Storage (7 ocorrências)
- `console.warn(...)` — usado para falhas não críticas como remoção de arquivo (2 ocorrências)
- `console.log(...)` — usado para debug de verificação de anexos (1 ocorrência em `LicenseDetailsModal.tsx`)

## Comentários

**Quando comentar:**
- Explicações de migração de dados — ex: "Migração: Se tem fileUrl mas não tem attachments, converter para novo formato" (`App.tsx:157`)
- Correções e ajustes de comportamento — ex: "Correções de tipagem e null check" (`LicenseManagement.tsx:97`)
- Notas de sincronização — ex: "O useEffect abaixo vai sincronizar os dados quando as licenças forem recarregadas" (`LicenseManagement.tsx:363`)
- Explicações de lógica complexa — ex: "Criticidade: 0 = vencida, 1 = vence em X dias, 2 = ativa" (`LicenseManagement.tsx:214`)

**JSDoc/TSDoc:** Não utilizado em nenhum arquivo do projeto

**Comentários de código:** Comentários em português brasileiro, alinhados com a regra de linguagem

## Design de Funções

**Tamanho:**
- Não há limite rígido — arquivos variam de 7 linhas (ícones) a 2119 linhas (`LaoConditionsManagement.tsx`)
- `App.tsx` com 785 linhas concentra toda lógica de CRUD e estado global
- Funções utilitárias em `laoSchedule.ts` são curtas (5-15 linhas cada)

**Parâmetros:**
- Objetos de props tipados com interfaces — sempre definida acima do componente
- CRUD: `Omit<T, 'id'>` para criação, `T` (completo) para atualização
- Callbacks de deleção: apenas o `id: string`

**Padrão de fábrica de estado inicial:**
```typescript
const initialFormState: Omit<Branch, 'id'> = {
  name: '',
  cnpj: '',
  address: '',
  city: '',
  state: '',
  contact: '',
  status: 'Ativa',
};
```

**Valores de retorno:**
- Funções assíncronas de criação retornam `Promise<string>` (o ID do documento)
- `addLaoInspection` retorna `Promise<string | null>` — `null` quando duplicata detectada
- Funções de atualização/deleção retornam `Promise<void>`

## Design de Módulo

**Exports:**
- Componentes de página: `export default` — `export default Dashboard`, `export default App`
- Ícones: `export const` nomeado — `export const LicenseIcon: React.FC<...>`
- Modal compartilhado: `export const` nomeado — `export const LicenseDetailsModal`
- Tipos: todos `export type`/`export interface`
- Utilitários: `export function`/`export const` nomeado

**Barrel Files (arquivos de reexportação):** Não utilizados. Cada import é feito diretamente do arquivo de origem.

## Firestore

**Referências de coleção:** Definidas como constantes no escopo do módulo em `App.tsx`
```typescript
const unitsCollectionRef = collection(db, 'units');
const licensesCollectionRef = collection(db, 'licenses');
```

**Mapeamento de documentos:** Padrão consistente de `.map(d => ({ ...d.data(), id: d.id } as T))`

**Escrita no Firestore:** Função auxiliar `toFirestoreData()` remove campos `undefined` recursivamente antes de salvar (exigência do Firestore que rejeita `undefined`)

**Operações em lote:** `writeBatch` usado para deleções com cascata (ex: deletar unidade + licenças associadas)

## Componentes React

**Estrutura de componente:**
1. Interface de props
2. Estado inicial
3. Definição do componente com `useState`
4. Funções auxiliares e handlers
5. `useEffect` para side effects
6. Renderização JSX

**Lazy loading:** Componentes de tela principal carregados com `React.lazy()` e envolvidos em `<Suspense>`
```typescript
const Dashboard = lazy(() => import('./components/Dashboard'));
```

## Ativos e Arquivos Estáticos

- Imagens em `assets/` — `ambiental.svg`, `meioambiental.jpeg`
- Favicon em `public/favicon.svg`
- Build de produção gera JS/CSS em `assets/` via Vite

---

*Análise de convenções: 2026-05-25*
