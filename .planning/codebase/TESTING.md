# Padrões de Teste

**Data da Análise:** 2026-05-25

## Situação Atual

**O projeto NÃO possui testes automatizados.** Esta é a lacuna mais crítica identificada na análise do codebase.

### Evidências

- Nenhum arquivo de teste encontrado (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`)
- Nenhuma dependência de framework de teste no `package.json` (sem `jest`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `cypress`, `playwright`)
- Nenhum script de teste no `package.json` — apenas `dev`, `build`, `preview`, `predeploy`, `deploy`
- Nenhum arquivo de configuração de teste (`jest.config.*`, `vitest.config.*`, `.spec.*`)
- Nenhum diretório de testes (`__tests__/`, `tests/`, `*.test.*`)
- Nenhuma configuração de cobertura

### Riscos

| Risco | Impacto |
|-------|---------|
| Regressões não detectadas em mudanças de UI | Alto — mudanças visuais passam despercebidas |
| Quebra silenciosa de regras de negócio | Alto — cálculos de prazos, vencimentos e alertas sem validação automatizada |
| Migrações de dados sem verificação | Médio — migração de `fileUrl` para `attachments[]` sem testes de regressão |
| Lógica de permissões sem cobertura | Alto — regras `admin` vs `colaborador` complexas e não testadas |
| Erros em condições de borda de datas | Alto — cálculos de `processStartDate`, `prorrogaDate` dependentes de manipulação manual de datas |

## Recomendações para Introdução de Testes

### Framework Recomendado: Vitest + Testing Library

Considerando que o projeto usa **Vite 6** como bundler de desenvolvimento, o **Vitest** é a escolha natural:

**Dependências a adicionar no `package.json`:**
```json
{
  "devDependencies": {
    "vitest": "^3.x",
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/user-event": "^14.x",
    "jsdom": "^25.x"
  },
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### Comandos de Execução

```bash
npm test                      # Executa todos os testes
npm run test:ui              # Interface visual do Vitest
npm run test:coverage        # Executa testes com relatório de cobertura
```

## Estrutura de Arquivos de Teste Recomendada

### Localização: Co-localizada com os fontes

```
licencas/
├── App.test.tsx
├── types.test.ts
├── utils/
│   └── laoSchedule.test.ts
├── components/
│   ├── Dashboard.test.tsx
│   ├── Login.test.tsx
│   ├── LicenseManagement.test.tsx
│   ├── BranchManagement.test.tsx
│   ├── LicenseTypeManagement.test.tsx
│   ├── DeactivatedLicenses.test.tsx
│   ├── LaoConditionsManagement.test.tsx
│   ├── UserManagement.test.tsx
│   └── LicenseDetailsModal.test.tsx
```

### Convenção de Nomenclatura

- `{NomeArquivo}.test.ts` para utilitários
- `{NomeArquivo}.test.tsx` para componentes React

## O Que Testar Primeiro (Prioridade Alta)

### 1. Utilitários de Data (`utils/laoSchedule.ts`)

**Funções críticas sem testes:**
- `parseISODate()` — parsing de strings ISO `YYYY-MM-DD`
- `toISODate()` — formatação de `Date` para string ISO
- `formatDateBR()` — formatação brasileira `DD/MM/YYYY`
- `parseWorkbookDate()` — conversão de data Excel (número serial) e string `DD/MM/YYYY`
- `getFrequencyPresetFromLabel()` — parsing de texto para frequência
- `frequencyPresetToMonths()` — conversão de preset para número de meses
- `addMonthsPreserveDay()` — adição de meses preservando dia
- `projectInspectionDatesForYear()` — projeção de datas de inspeção
- `isMonthBeforeToday()` — verificação de mês passado

**Exemplo de estrutura de teste para utilitários:**
```typescript
// utils/laoSchedule.test.ts
import { describe, it, expect } from 'vitest';
import { parseISODate, toISODate, formatDateBR, parseWorkbookDate } from './laoSchedule';

describe('parseISODate', () => {
  it('deve converter string ISO válida para Date', () => {
    const result = parseISODate('2024-06-15');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2024);
    expect(result!.getMonth()).toBe(5); // junho = 5
    expect(result!.getDate()).toBe(15);
  });

  it('deve retornar null para string vazia', () => {
    expect(parseISODate('')).toBeNull();
    expect(parseISODate(null)).toBeNull();
    expect(parseISODate(undefined)).toBeNull();
  });

  it('deve retornar null para formato inválido', () => {
    expect(parseISODate('15/06/2024')).toBeNull();
    expect(parseISODate('abc')).toBeNull();
  });
});

describe('parseWorkbookDate', () => {
  it('deve converter número serial Excel para ISO', () => {
    // 01/01/2020 = 43831 no Excel
    const result = parseWorkbookDate(43831);
    expect(result).toBe('2020-01-01');
  });

  it('deve converter string DD/MM/YYYY para ISO', () => {
    expect(parseWorkbookDate('15/06/2024')).toBe('2024-06-15');
  });

  it('deve retornar null para valor vazio', () => {
    expect(parseWorkbookDate('')).toBeNull();
    expect(parseWorkbookDate(null)).toBeNull();
  });
});
```

### 2. Lógica de Permissões e Visibilidade (`App.tsx`)

**Regras a testar:**
- `admin` vê todas as licenças, filiais, tipos, LAOs
- `colaborador` vê apenas licenças de `visibleBranchIds` e `visibleLicenseTypes`
- `hasScreenAccess()` retorna `true` para todas as telas no admin
- `visibleLicenses` filtra corretamente por `unitId` (branch) e `licenseType`
- Herança de visibilidade: LAOs → Condições → Inspeções

### 3. Cálculos de Alertas e Prazos

**Funções a testar no `LicenseManagement.tsx` e `Dashboard.tsx`:**
- `getDaysUntilExpiry()` — cálculo de dias até vencimento
- `getAlertBadge()` / lógica de status `'ok' | 'warning' | 'expired'`
- Cálculo automático de `prorrogaDate` e `processStartDate` no `handleChange`
- Validação de `renewalProtocolDays` e `processStartDays`
- Cenários com data de vencimento no passado, presente e futuro

### 4. Componentes com Estado de Formulário

**Padrão a testar em BranchManagement, LicenseTypeManagement, Login:**
- Submissão com campos obrigatórios vazios mostra alerta
- Submissão bem-sucedida chama o callback correto (`onAdd`, `onUpdate`)
- Campos são resetados após cancelar (`handleCancel`)
- Modo de edição vs criação — `handleEditClick` vs `handleAddNewClick`

## Mocking

### Firebase / Firestore

Para testar componentes que dependem do Firestore sem bater na API real:

```typescript
// __mocks__/firebase.ts — mock manual na raiz do projeto
import { vi } from 'vitest';

export const db = {};
export const auth = {
  currentUser: null,
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
};
export const storage = {};
```

**O que mockar:**
- `getDocs`, `addDoc`, `updateDoc`, `deleteDoc` do `firebase/firestore`
- `onAuthStateChanged`, `signInWithEmailAndPassword` do `firebase/auth`
- `ref`, `uploadBytes`, `getDownloadURL`, `deleteObject` do `firebase/storage`

**O que NÃO mockar:**
- Utilitários puros (`laoSchedule.ts`) — testar com dados reais
- Funções de transformação de dados — testar com valores de entrada/saída
- Tipos TypeScript — validados em tempo de compilação

### Dados de Teste (Fixtures)

Criar fábricas de dados no padrão:

```typescript
// tests/fixtures/licenses.ts
import type { License, Branch, LicenseType } from '../../types';

export function createTestLicense(overrides: Partial<License> = {}): License {
  return {
    id: 'lic-001',
    unitId: 'branch-001',
    licenseType: 'Licença Ambiental de Operação',
    numberYear: '123/2024',
    description: 'Licença de teste',
    licensingAgency: 'IMA',
    processNumber: 'PROC-001',
    issueDate: '2024-01-15',
    originalExpiryDate: '2025-01-15',
    prorrogaDate: '2024-10-15',
    processStartDate: '2024-07-15',
    observation: '',
    active: true,
    category: 'Ambiental',
    responsible: 'Fulano',
    attachments: [],
    ...overrides,
  };
}

export function createTestBranch(overrides: Partial<Branch> = {}): Branch {
  return {
    id: 'branch-001',
    name: 'Filial Centro',
    cnpj: '00.000.000/0001-00',
    address: 'Rua Principal, 100',
    city: 'Florianópolis',
    state: 'SC',
    contact: '(48) 99999-9999',
    status: 'Ativa',
    ...overrides,
  };
}
```

## Testes de Integração com Firebase

Considerando que o projeto depende fortemente do Firestore, recomenda-se usar **Firebase Emulator Suite** para testes de integração:

```bash
firebase emulators:start --only firestore,auth
```

**Cenários de integração prioritários:**

1. **fetchLicenses()** — recupera licenças e aplica migração de `fileUrl`/`fileName` → `attachments[]`
2. **addLicense() / updateLicense()** — cria e atualiza com dados válidos
3. **deleteLicense()** — remove documento e verifica que não existe mais
4. **Cascata de deleção** — `deleteUnit` remove unidade e licenças associadas
5. **Duplicação de inspeção** — `addLaoInspection` rejeita `conditionId` + `inspectionDate` duplicados
6. **Primeiro login** — criação automática de usuário admin
7. **Controle de acesso** — usuário `colaborador` não consegue acessar telas não permitidas

## Cobertura

**Situação atual:** 0% — sem testes implementados.

**Meta recomendada:**
- **80%+ de cobertura** nos utilitários de data (`laoSchedule.ts`)
- **70%+ de cobertura** nos componentes com lógica de formulário
- **Testes críticos cobrindo:** permissões, cálculos de prazo, migração de dados, importação de planilhas

## Tipos de Teste

### Testes Unitários (prioridade máxima)
- **Escopo:** Funções puras, utilitários, hooks de estado, lógica de filtro
- **Arquivos-alvo:** `utils/laoSchedule.ts`, funções de filtro/mapeamento nos componentes
- **Sem dependência:** Firebase, DOM

### Testes de Componente (prioridade alta)
- **Escopo:** Renderização, interações de formulário, exibição condicional
- **Arquivos-alvo:** `Login.tsx`, `BranchManagement.tsx`, `LicenseTypeManagement.tsx`
- **Mock:** Firebase, callbacks de props
- **Ferramentas:** `@testing-library/react` + `@testing-library/user-event`

### Testes de Integração (prioridade média)
- **Escopo:** Fluxos completos com Firebase Emulator
- **Arquivos-alvo:** `App.tsx`, integração CRUD completo
- **Ferramentas:** Firebase Emulator Suite + Vitest

### Testes E2E (prioridade baixa)
- **Escopo:** Fluxos de usuário completos no navegador
- **Framework:** Não utilizado atualmente; pode-se considerar Playwright no futuro
- **Observação:** Depende de ter testes unitários e de integração primeiro

## Padrões Comuns Recomendados

### Teste Assíncrono

```typescript
import { describe, it, expect } from 'vitest';

describe('fetchLicenses', () => {
  it('deve aplicar migração de fileUrl para attachments', async () => {
    // arrange: mock getDocs retornando licença no formato antigo
    // act: chamar fetchLicenses
    // assert: verificar que attachments foi populado e fileUrl mantido
  });
});
```

### Teste de Erro

```typescript
describe('Login', () => {
  it('deve exibir erro quando login falha', async () => {
    // arrange: mock signInWithEmailAndPassword para rejeitar
    // act: preencher formulário e submeter
    // assert: verificar que mensagem de erro aparece na tela
  });
});
```

---

*Análise de testes: 2026-05-25*
