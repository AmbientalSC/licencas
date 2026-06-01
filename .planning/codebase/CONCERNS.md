# Preocupações do Código

**Data da Análise:** 2026-05-25

## Dívida Técnica

### App.tsx como Componente Deus (God Component)

- **Problema:** O `App.tsx` (785 linhas) concentra **todo** o estado da aplicação e **todas** as operações CRUD do Firestore (add/update/delete), além de autenticação, tema, navegação e renderização da sidebar. Viola o princípio de responsabilidade única.
- **Arquivos:** `App.tsx` (linhas 79-783)
- **Impacto:** Qualquer alteração exige compreensão de todo o estado da aplicação. Impossível testar isoladamente. Risco alto de efeitos colaterais em mudanças. O estado de 7 coleções Firestore coexiste no mesmo componente.
- **Abordagem de correção:** Extrair operações Firestore para hooks customizados (ex.: `useLicenses`, `useLaos`) ou uma camada de serviço (`services/`). Extrair a lógica de sidebar para componente próprio. O estado de autenticação deve ir para um contexto React (`AuthContext`).

### LaoConditionsManagement.tsx - Componente de 2119 Linhas

- **Problema:** O componente `LaoConditionsManagement.tsx` tem **2119 linhas** e contém lógica de: filtros, busca, CRUD de LAOs, CRUD de condicionantes, CRUD de vistorias, importação de planilhas, upload de anexos, projeção de datas futuras, e renderização de uma matriz complexa de condicionantes por mês.
- **Arquivos:** `components/LaoConditionsManagement.tsx`
- **Impacto:** Impossível dar manutenção ou depurar. O componente é frágil — qualquer modificação de estado pode quebrar múltiplas funcionalidades interdependentes.
- **Abordagem de correção:** Decompor em subcomponentes: `LaoFilters`, `LaoTable`, `LaoMatrix`, `LaoFormModal`, `ConditionFormModal`, `InspectionModal`. Extrair lógica de importação para hook `useLaoImport`. Separar `executeImport` (~200 linhas) em um módulo de serviço próprio.

### LicenseManagement.tsx - Componente de 698 Linhas

- **Problema:** Componente com responsabilidades misturadas: formulário de cadastro/edição, tabela com ordenação/filtro/colunas customizáveis, drag-and-drop de colunas, redimensionamento de colunas, upload de arquivo, modal de detalhes.
- **Arquivos:** `components/LicenseManagement.tsx`
- **Impacto:** Dificuldade de manutenção. A lógica de redimensionamento de colunas e drag-and-drop adiciona complexidade desnecessária ao componente principal.
- **Abordagem de correção:** Extrair `LicenseTable` como componente dedicado com hooks para ordenação e filtro. Extrair `LicenseForm` separadamente. Separar lógica de colunas customizáveis em um hook `useTableColumns`.

### LicenseDetailsModal.tsx - Componente de 697 Linhas

- **Problema:** Modal que gerencia edição de licença, upload de múltiplos arquivos, verificação de arquivos deletados no Storage, e limpeza automática de anexos órfãos.
- **Arquivos:** `components/LicenseDetailsModal.tsx`
- **Impacto:** Lógica de verificação de anexos (`verifyAndCleanAttachments`) faz chamadas ao Firestore Storage ao abrir o modal, gerando latência perceptível e risco de atualizações não intencionais.
- **Abordagem de correção:** Mover `verifyAndCleanAttachments` para um hook ou serviço separado. Extrair a aba de anexos para componente `AttachmentsManager`.

### Tipagem `any` que Contorna o Strict Mode

- **Problema:** 15 usos de `any` que anulam as verificações estritas do TypeScript (`strict: true` no `tsconfig.json`).
- **Arquivos:**
  - `App.tsx`: linha 65 (`toFirestoreData` com parâmetro e retorno `any`), linha 89 (`user: any`), linha 260 (`docData as any`)
  - `components/ImportLicensesModal.tsx`: linha 57 (`rows: any[]`), linha 139 (`value: any`)
  - `components/Login.tsx`: linha 23 (`err: any`)
  - `components/UserManagement.tsx`: linhas 171, 210, 242, 253 (`err: any`)
  - `components/LicenseDetailsModal.tsx`: linha 53 (`error: any`), linha 138 (`value: any`)
- **Impacto:** Perda de segurança de tipos. Erros em runtime que o TypeScript poderia capturar em tempo de compilação.
- **Abordagem de correção:** Criar tipos específicos para erros (`FirebaseError`). Tipar `toFirestoreData` corretamente com genéricos. Tipar `user` como `User | null` em vez de `any`.

### Migração de Dados Embutida no Fetch

- **Problema:** A migração de licenças do formato antigo (`fileUrl`/`fileName`) para o novo (`attachments[]`) é executada **a cada fetch**, gerando objetos `Attachment` com `id: Date.now().toString()` que são diferentes a cada leitura.
- **Arquivos:** `App.tsx`, linhas 151-177 (`fetchLicenses`)
- **Impacto:** Re-renderizações desnecessárias pois os IDs dos attachments mudam a cada fetch. Se o usuário nunca salvar os dados migrados, a migração ocorre indefinidamente sem persistência.
- **Abordagem de correção:** Executar a migração uma única vez (ex.: via script ou Cloud Function) e persistir no Firestore. Remover a lógica de migração do fetch após todos os registros estarem atualizados.

### Duplicação de Interface `User`

- **Problema:** A interface `User` é definida em `types.ts` (exportada) e **redefinida** localmente em `components/UserManagement.tsx` (linhas 10-20).
- **Arquivos:** `types.ts` (linhas 67-77), `components/UserManagement.tsx` (linhas 10-20)
- **Impacto:** Divergência entre as duas definições pode causar bugs difíceis de detectar. Manutenção duplicada.
- **Abordagem de correção:** Importar `User` de `types.ts` exclusivamente. Remover definição local em `UserManagement.tsx`.

### Configuração Firebase Hardcoded

- **Problema:** `apiKey`, `projectId` e demais configurações do Firebase estão hardcoded no código fonte.
- **Arquivos:** `firebase.ts` (linhas 7-15)
- **Impacto:** A chave de API fica exposta no bundle JavaScript público. Embora a API Key do Firebase não seja considerada secreta para apps web, a configuração hardcoded dificulta trocar entre ambientes (dev/staging/prod).
- **Abordagem de correção:** Usar variáveis de ambiente injetadas pelo Vite (`import.meta.env.VITE_FIREBASE_*`). **Nota:** O `AGENTS.md` alerta para não extrair sem testar o deploy — qualquer mudança aqui requer validação completa do pipeline de build e deploy no GitHub Pages.

### Criação de Usuário com App Firebase Secundário

- **Problema:** `UserManagement.tsx` cria uma instância secundária do Firebase App (`initializeApp` + `deleteApp`) a cada criação de usuário para não deslogar o admin atual.
- **Arquivos:** `components/UserManagement.tsx` (linhas 182-204)
- **Impacto:** Padrão frágil. Se `deleteApp` falhar, apps acumulam em memória. O timestamp `Date.now()` no nome do app secundário (`Secondary-${Date.now()}`) previne colisões mas é um workaround, não uma solução.
- **Abordagem de correção:** Migrar a criação de usuários para uma **Cloud Function** (Firebase Functions). O diretório `functions/` já está declarado no `firebase.json` mas não implementado.

### Duplicação de Configuração Vite

- **Problema:** Dois arquivos de configuração Vite coexistem: `vite.config.ts` (30 linhas) e `vite.config.js` (20 linhas).
- **Arquivos:** `vite.config.ts`, `vite.config.js`
- **Impacto:** O `vite.config.js` não expõe a variável `GEMINI_API_KEY` (só o `.ts` faz). O `vite.config.js` não define alias `@/*` (só o `.ts` faz). Se o Vite priorizar `vite.config.js`, essas funcionalidades quebram silenciosamente.
- **Abordagem de correção:** Remover `vite.config.js` e manter apenas `vite.config.ts`. Validar que o build e dev usam o arquivo `.ts`.

## Possíveis Bugs

### Exclusão de Usuário não Remove do Firebase Auth

- **Sintomas:** Ao excluir um usuário, apenas o documento no Firestore (`users/{id}`) é removido. A conta permanece no Firebase Auth. O usuário ainda pode fazer login (embora sem permissões pois o documento Firestore não existe mais).
- **Arquivos:** `components/UserManagement.tsx`, linhas 235-246
- **Gatilho:** Admin exclui um colaborador.
- **Solução alternativa:** Nenhuma. O código comenta: "Deleting from Auth requires Admin SDK or Cloud Functions."
- **Recomendação:** Implementar Cloud Function para exclusão completa (Auth + Firestore).

### `useEffect` com Dependência Incompleta

- **Sintomas:** O `useEffect` no `LicenseManagement.tsx` (linhas 367-374) depende de `[licenses, isModalOpen]` mas usa `selectedLicenseForModal` como condição. Se `selectedLicenseForModal` mudar sem que `licenses` mude, o efeito não é reexecutado.
- **Arquivos:** `components/LicenseManagement.tsx`, linhas 367-374
- **Gatilho:** Difícil de reproduzir — exige um cenário onde o modal está aberto com um estado interno diferente do estado das props.
- **Solução alternativa:** Incluir `selectedLicenseForModal` nas dependências do `useEffect`.

### Botão de Importação Comentado

- **Sintomas:** O botão "Importar Workbook" existe no código JSX mas está inteiramente comentado (linhas 1031-1040).
- **Arquivos:** `components/LaoConditionsManagement.tsx`, linhas 1031-1040
- **Impacto:** Funcionalidade de importação de planilhas de LAO existe (código está implementado, `ImportLaoWorkbookModal` está importado) mas está inacessível via UI.
- **Abordagem de correção:** Descomentar o botão ou remover o código de importação se não for mais necessário. Código morto acumula complexidade.

### Verificação de Duplicatas na Criação de LAO Permite Prosseguir

- **Sintomas:** A função `saveLao` (linha 614) detecta LAOs duplicadas mas emite apenas um `alert` informativo e **permite o cadastro mesmo assim**: "O cadastro seguirá normalmente."
- **Arquivos:** `components/LaoConditionsManagement.tsx`, linhas 607-616
- **Gatilho:** Usuário cadastra LAO com mesmo número e empreendimento.
- **Impacto:** Duas LAOs com mesma chave de importação (`getImportKey`) causam ambiguidade na importação de planilhas.
- **Recomendação:** Bloquear o cadastro ou perguntar se deseja substituir.

### Validação de Formulário por `alert()`

- **Sintomas:** Toda validação de formulário usa `alert()` nativo do navegador, que é bloqueante e oferece péssima experiência.
- **Arquivos:** `components/LaoConditionsManagement.tsx` (linhas 462, 467, 474, 480, 568, 591, 595, 615, 695, 702, 782), `components/LicenseManagement.tsx` (linha 171), `components/LicenseDetailsModal.tsx` (linha 179)
- **Impacto:** Experiência do usuário degradada. Impossível mostrar múltiplos erros simultaneamente.
- **Abordagem de correção:** Implementar validação com estados de erro por campo e exibição inline.

## Considerações de Segurança

### Ausência de Regras de Segurança no Firestore

- **Risco:** Toda a filtragem de dados por perfil (`colaborador` vê apenas suas filiais/tipos de licença) é feita **no cliente**. Um colaborador pode abrir o console do navegador e consultar dados de outras filiais via Firebase SDK.
- **Arquivos:** `App.tsx`, linhas 554-572 (filtragem `visibleLicenses`, `visibleBranches`, etc.)
- **Mitigação atual:** Nenhuma no backend. Apenas filtragem client-side.
- **Recomendações:** Implementar **Firestore Security Rules** que validam o `uid` e as permissões do usuário (`allowedScreens`, `visibleBranchIds`, `visibleLicenseTypes`) no servidor. Sem isso, qualquer usuário autenticado pode ler/escrever qualquer coleção.

### Sem Proteção contra Enumeração de Usuários

- **Risco:** A mensagem de erro do login é genérica ("Usuário ou senha inválidos"), mas não há rate limiting no Firebase Auth configurado.
- **Arquivos:** `components/Login.tsx`
- **Mitigação atual:** Mensagem de erro genérica (boa prática). Sem rate limiting.
- **Recomendações:** Configurar limites de tentativas de login no Firebase Auth console. Considerar Firebase App Check.

### Chave de API Exposta

- **Risco:** A `apiKey` do Firebase está hardcoded e visível no bundle JavaScript público.
- **Arquivos:** `firebase.ts`, linhas 7-15
- **Mitigação atual:** Firebase API keys para web são consideradas "não secretas" pela documentação Firebase — o acesso real é controlado por Security Rules e Auth. Ainda assim, a exposição facilita abuso se as Security Rules estiverem ausentes.
- **Recomendações:** Implementar Security Rules **antes** de se preocupar com a visibilidade da API key. Considerar Firebase App Check para restringir chamadas à origem do app.

### Sem Tratamento de Erros para Falhas de Rede

- **Risco:** As chamadas Firestore não possuem retry logic ou tratamento de erros de rede além de `console.error`.
- **Arquivos:** `App.tsx` (linhas 214-232 — o `fetchData` captura erros apenas com `console.error`)
- **Impacto:** Se a rede falhar durante o carregamento inicial, o usuário vê "Carregando dados..." indefinidamente. Não há botão de "Tentar novamente".
- **Recomendações:** Adicionar estado de erro com botão de retry. Implementar retry automático com backoff exponencial para chamadas Firestore.

## Gargalos de Desempenho

### Busca Completa de Todas as Coleções no Carregamento

- **Problema:** O `App.tsx` busca **todas as 8 coleções** do Firestore no carregamento inicial, sem paginação, sem cache local, sem lazy loading.
- **Arquivos:** `App.tsx`, linhas 213-241
- **Causa:** `Promise.all` com 8 `getDocs` sem filtros — traz todos os documentos de cada coleção.
- **Caminho de melhoria:** Implementar paginação (`limit()`, `startAfter()`). Carregar dados sob demanda (ex.: `laoInspections` só quando a tela de condicionantes for acessada). Usar `onSnapshot` para atualizações em tempo real em vez de re-fetch completo após cada mutação.

### Re-fetch Completo Após Cada Mutação

- **Problema:** Após cada `addDoc`, `updateDoc` ou `deleteDoc`, o componente faz `fetchCollection()` que traz **todos** os documentos novamente.
- **Arquivos:** `App.tsx` — ex.: `addLicense` (linhas 332-338) chama `await fetchLicenses()` ao final.
- **Impacto:** Leituras desnecessárias do Firestore. Custo financeiro aumentado (Firebase cobra por leitura). Latência percebida pelo usuário.
- **Caminho de melhoria:** Usar `onSnapshot` para listeners em tempo real. Ou atualizar o estado local otimisticamente após a mutação.

### Renderização de Matriz 12×N sem Virtualização

- **Problema:** A tabela de condicionantes renderiza uma matriz de 12 colunas (meses) × N condicionantes. Com 50 condicionantes, são 600 células renderizadas, cada uma com listeners de clique.
- **Arquivos:** `components/LaoConditionsManagement.tsx`, linhas 1118-1410
- **Causa:** Toda a matriz é renderizada de uma vez com `map` aninhado. O hack `rotateX(180deg)` (linhas 1119-1120) é usado para inverter a direção do scroll, indicando que a tabela é grande e a UX já sofre com isso.
- **Caminho de melhoria:** Implementar virtualização com `react-window` ou `@tanstack/react-virtual`. Remover o hack `rotateX` — ele quebra acessibilidade e pode causar problemas de renderização em alguns navegadores.

### Chamadas Individuais ao Storage no Carregamento do Modal

- **Problema:** `verifyAndCleanAttachments` faz chamadas `getMetadata` para **cada** anexo ao abrir o modal de detalhes da licença.
- **Arquivos:** `components/LicenseDetailsModal.tsx`, linhas 31-79
- **Causa:** Loop `for (const attachment of licenseToCheck.attachments)` com `await getMetadata(fileRef)` — chamadas sequenciais ao Firebase Storage.
- **Caminho de melhoria:** Paralelizar com `Promise.allSettled`. Ou remover esta verificação e tratar arquivos ausentes apenas no momento do download (lazy error handling).

### Múltiplos `useMemo` com Dependências Amplas

- **Problema:** `LaoConditionsManagement.tsx` contém 6 blocos `useMemo` complexos (`laoById`, `licensesById`, `sourceLicenses`, `conditionsByLao`, `inspectionsByMonth`, `projectedByCondition`, `filteredLaos`, `laoDetailsData`), muitos dependendo de `conditions` e `inspections` — arrays que são recriados a cada fetch.
- **Arquivos:** `components/LaoConditionsManagement.tsx`, linhas 188-368
- **Causa:** Cada fetch recria `conditions` e `inspections` como novos arrays, invalidando todos os `useMemo` dependentes.
- **Caminho de melhoria:** Estabilizar referências com `useRef` ou implementar memoização mais granular. Usar `React.memo` nos subcomponentes extraídos.

## Áreas Frágeis

### Lógica de Datas Manual

- **Arquivos:** `utils/laoSchedule.ts` (161 linhas)
- **Por que é frágil:** Todo o cálculo de projeção de vistorias, adição de meses, parsing de datas ISO, conversão Excel→ISO é feito manualmente com manipulação de strings e `Date`. Não há tratamento de timezone. A função `addMonthsPreserveDay` tem edge cases com meses de 28/29/30/31 dias.
- **Modificação segura:** Adicionar testes unitários para cada função de data antes de modificar. Considerar usar `date-fns` ou `luxon` para operações de data.
- **Cobertura de testes:** Zero testes.

### Estado do Tema com 3 Fontes de Verdade

- **Arquivos:** `App.tsx` (linhas 94-139), `index.html` (linhas 8-26)
- **Por que é frágil:** O tema é controlado por: (1) `localStorage` (via `themePreference` + `theme`), (2) script inline no `<head>` do HTML, (3) estado React. O script inline aplica o tema antes da hidratação para evitar flash, mas pode divergir do estado React se a lógica não estiver 100% sincronizada.
- **Modificação segura:** Testar em todos os cenários: primeira visita, retorno com tema salvo, mudança de tema do sistema enquanto app está aberto, troca manual.
- **Cobertura de testes:** Zero testes.

### Importação de Planilhas com Módulo Assíncrono

- **Arquivos:** `components/ImportLaoWorkbookModal.tsx` (492 linhas), `components/ImportLicensesModal.tsx` (168 linhas)
- **Por que é frágil:** O módulo `xlsx` é carregado sob demanda (`import('xlsx')`) com um singleton Promise (`xlsxModulePromise`). Se a importação falhar, o estado fica corrompido e o modal não funciona.
- **Modificação segura:** Adicionar tratamento de erro no carregamento do módulo. Exibir mensagem de fallback se o `xlsx` não puder ser carregado.
- **Cobertura de testes:** Zero testes.

### Sem Tratamento para localStorage Indisponível

- **Arquivos:** `App.tsx` (linhas 96, 137-138), `components/LicenseManagement.tsx` (linhas 65, 82, 90, 94)
- **Por que é frágil:** Nenhum acesso ao `localStorage` está envolto em try/catch. Se o localStorage estiver cheio ou for inacessível (navegador em modo privado restritivo, algumas configurações corporativas), o app quebra com exceção não tratada.
- **Modificação segura:** Envolver todos os acessos ao `localStorage` em try/catch com fallback para estado em memória.

## Limites de Escalabilidade

### Firestore Sem Índices Compostos Visíveis

- **Capacidade atual:** Consultas simples com `where` único. Nenhum índice composto configurado visivelmente.
- **Limite:** Consultas com múltiplos `where` e ordenação (ex.: filtrar licenças por branchId + licenseType + ordenar por data) exigem índices compostos no Firestore.
- **Caminho de escalabilidade:** Monitorar erros de "missing index" no console do Firebase. Criar índices compostos conforme necessário.

### Sem Paginação em Nenhuma Consulta

- **Capacidade atual:** `getDocs` sem `limit()` — traz todos os documentos.
- **Limite:** O Firestore cobra por documento lido. Com centenas de licenças, LAOs e vistorias, cada carregamento de página consome dezenas de leituras. Milhares de usuários ativos podem gerar custos significativos.
- **Caminho de escalabilidade:** Implementar paginação com cursores (`startAfter`, `limit`). Considerar cache agressivo com `onSnapshot`.

### Armazenamento de Arquivos sem Limpeza

- **Capacidade atual:** Upload de arquivos para Firebase Storage sem política de retenção ou limites de tamanho.
- **Limite:** Storage gratuito tem cota (5GB no plano Spark). Arquivos órfãos (de licenças deletadas sem limpar storage) consomem cota permanentemente.
- **Caminho de escalabilidade:** Implementar deleção de arquivos do Storage junto com a deleção da licença/LAO. Adicionar limite de tamanho de upload. Cloud Function para limpeza periódica de arquivos órfãos.

## Dependências em Risco

### `xlsx` (SheetJS) v0.18.5

- **Risco:** Versão community com vulnerabilidades conhecidas. O pacote `xlsx` tem histórico de CVEs relacionados a parsing de arquivos maliciosos (ex.: CVE-2023-30533 para prototype pollution).
- **Arquivos:** `components/ImportLaoWorkbookModal.tsx`, `components/ImportLicensesModal.tsx`
- **Impacto:** Upload de planilha Excel maliciosa poderia causar XSS ou vazamento de dados.
- **Plano de migração:** Atualizar para a versão mais recente. Considerar migrar para `xlsx` versão `0.20+` ou alternativa como `exceljs`.

### `@types/nodemailer` sem Uso

- **Risco:** Dependência de desenvolvimento `@types/nodemailer` está no `package.json` (linha 22) mas `nodemailer` não está listado como dependência e não há uso aparente no código.
- **Arquivos:** `package.json`
- **Impacto:** Dependência fantasma — sugere que uma funcionalidade de email estava planejada mas nunca implementada.
- **Plano de migração:** Remover `@types/nodemailer` do `devDependencies`.

## Funcionalidades Críticas Ausentes

### Ausência Total de Testes

- **Problema:** Zero arquivos de teste. Nenhum test runner configurado (`jest`, `vitest` não estão no `package.json`).
- **Bloqueia:** Qualquer refatoração é arriscada. Impossível validar regressões. Os componentes grandes (2000+ linhas) são intocáveis sem risco de quebrar funcionalidades.
- **Prioridade:** Alta.

### Ausência de Error Boundaries

- **Problema:** Nenhum componente `ErrorBoundary` implementado. Um erro em qualquer componente filho (ex.: falha no lazy load de um chunk) derruba toda a aplicação.
- **Arquivos:** Não encontrado em nenhum arquivo.
- **Risco:** Tela branca para o usuário sem feedback. Sem logging do erro.
- **Prioridade:** Alta.

### Ausência de CI/CD

- **Problema:** Nenhum arquivo de configuração de CI (GitHub Actions, etc.) encontrado. O deploy é manual via `npm run deploy`.
- **Bloqueia:** Sem validação automatizada de build, typecheck, ou linting antes do deploy. Um push com erro de compilação TypeScript pode chegar em produção.
- **Prioridade:** Média.

### Sem Tratamento de Offline

- **Problema:** A aplicação não funciona offline. Sem cache de dados, sem service worker, sem PWA.
- **Impacto:** Em campo (onde fiscais ambientais frequentemente estão sem conectividade), o app é inutilizável.
- **Prioridade:** Baixa (depende do caso de uso real).

## Lacunas de Cobertura de Testes

| Área Não Testada | O Que Falta | Arquivos | Risco | Prioridade |
|---|---|---|---|---|
| Operações CRUD Firestore | Testes de integração para add/update/delete | `App.tsx` (linhas 305-499) | Regressão em fluxo básico do app | Alta |
| Cálculo de datas e projeções | Testes unitários para `projectInspectionDatesForYear`, `addMonthsPreserveDay`, `parseWorkbookDate` | `utils/laoSchedule.ts` | Cálculos incorretos de vencimento de condicionantes | Alta |
| Filtragem de permissões | Testes para `visibleLicenses`, `visibleBranches` | `App.tsx` (linhas 554-572) | Colaborador vê dados de outras filiais | Alta |
| Autenticação e perfil | Testes para fluxo de login, criação de primeiro admin | `components/Login.tsx`, `App.tsx` (linhas 251-288) | Usuário sem acesso loga como admin | Média |
| Importação de planilhas | Testes para parsing de datas Excel, mapeamento de colunas | `components/ImportLaoWorkbookModal.tsx`, `components/ImportLicensesModal.tsx` | Dados incorretos importados | Média |
| Upload e deleção de anexos | Testes para upload/deleção no Storage | `components/LicenseDetailsModal.tsx`, `components/LaoConditionsManagement.tsx` | Perda de anexos ou falha silenciosa | Média |
| Renderização dos componentes | Testes de snapshot ou renderização | Todos os componentes | Regressões visuais | Baixa |

---

*Auditoria de preocupações: 2026-05-25*
