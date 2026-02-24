import React, { useMemo, useState } from 'react';
import { storage } from '../firebase';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type {
  Attachment,
  Branch,
  LaoCategory,
  LaoCondition,
  LaoDetailKV,
  LaoFrequencyPreset,
  LaoInspection,
  LaoRecord,
} from '../types';
import {
  addMonthsPreserveDay,
  formatDateBR,
  frequencyPresetToMonths,
  getImportKey,
  isMonthBeforeToday,
  normalizeText,
  parseISODate,
  projectInspectionDatesForYear,
} from '../utils/laoSchedule';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ImportIcon } from './icons/ImportIcon';
import {
  ImportLaoWorkbookModal,
  type LaoImportExecutionResult,
  type ParsedLaoConditionImport,
  type ParsedLaoImportItem,
} from './ImportLaoWorkbookModal';

interface LaoConditionsManagementProps {
  laos: LaoRecord[];
  conditions: LaoCondition[];
  inspections: LaoInspection[];
  branches: Branch[];
  canEdit: boolean;
  onAddLao: (lao: Omit<LaoRecord, 'id'>) => Promise<string>;
  onUpdateLao: (lao: LaoRecord) => Promise<void>;
  onDeleteLao: (id: string) => Promise<void>;
  onAddCondition: (condition: Omit<LaoCondition, 'id'>) => Promise<string>;
  onUpdateCondition: (condition: LaoCondition) => Promise<void>;
  onDeleteCondition: (id: string) => Promise<void>;
  onAddInspection: (
    inspection: Omit<LaoInspection, 'id'>,
  ) => Promise<string | null>;
}

interface InspectionDraft {
  lao: LaoRecord;
  condition: LaoCondition;
  monthIndex: number;
  defaultDate: string;
}

const MONTH_LABELS = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
];

const FREQUENCY_OPTIONS: Array<{
  value: LaoFrequencyPreset;
  label: string;
}> = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'custom', label: 'Personalizada' },
];

function frequencyLabel(condition: LaoCondition): string {
  if (condition.frequencyPreset === 'custom') {
    const interval = condition.customMonthsInterval || 0;
    return interval > 0 ? `Personalizada (${interval} meses)` : 'Personalizada';
  }
  return (
    FREQUENCY_OPTIONS.find(option => option.value === condition.frequencyPreset)
      ?.label || condition.frequencyPreset
  );
}

function createEmptyDetail(index: number): LaoDetailKV {
  return {
    id: `detail-${Date.now()}-${index}`,
    key: '',
    value: '',
    order: index,
  };
}

function getMonthKey(conditionId: string, monthIndex: number, year: number): string {
  return `${conditionId}-${year}-${monthIndex}`;
}

function maxDateISO(values: string[]): string | null {
  if (values.length === 0) return null;
  return values.reduce((acc, value) => (value > acc ? value : acc), values[0]);
}

export const LaoConditionsManagement: React.FC<LaoConditionsManagementProps> = ({
  laos,
  conditions,
  inspections,
  branches,
  canEdit,
  onAddLao,
  onUpdateLao,
  onDeleteLao,
  onAddCondition,
  onUpdateCondition,
  onDeleteCondition,
  onAddInspection,
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [categoryFilter, setCategoryFilter] = useState<'all' | LaoCategory>('all');
  const [branchFilter, setBranchFilter] = useState('');
  const [search, setSearch] = useState('');

  const [showLaoModal, setShowLaoModal] = useState(false);
  const [editingLao, setEditingLao] = useState<LaoRecord | null>(null);
  const [laoUploading, setLaoUploading] = useState(false);

  const [showConditionModal, setShowConditionModal] = useState(false);
  const [editingCondition, setEditingCondition] = useState<LaoCondition | null>(null);

  const [inspectionDraft, setInspectionDraft] = useState<InspectionDraft | null>(null);
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionNote, setInspectionNote] = useState('');
  const [savingInspection, setSavingInspection] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedLaoForDetails, setSelectedLaoForDetails] = useState<LaoRecord | null>(null);

  const [laoForm, setLaoForm] = useState<Omit<LaoRecord, 'id'>>({
    laoNumber: '',
    title: '',
    empreendimento: '',
    branchId: '',
    category: 'Ambiental',
    processNumber: '',
    fcei: '',
    codam: '',
    issueDate: '',
    validityDate: '',
    details: [createEmptyDetail(0)],
    attachments: [],
    active: true,
    createdAt: '',
    updatedAt: '',
  });

  const [conditionForm, setConditionForm] = useState<Omit<LaoCondition, 'id'>>({
    laoId: '',
    name: '',
    frequencyPreset: 'mensal',
    customMonthsInterval: 0,
    lastInspectionDate: '',
    notes: '',
    active: true,
    createdAt: '',
    updatedAt: '',
  });

  const laoById = useMemo(() => {
    const map = new Map<string, LaoRecord>();
    laos.forEach(item => map.set(item.id, item));
    return map;
  }, [laos]);

  const conditionsByLao = useMemo(() => {
    const map = new Map<string, LaoCondition[]>();
    conditions.forEach(condition => {
      const list = map.get(condition.laoId) || [];
      list.push(condition);
      map.set(condition.laoId, list);
    });
    map.forEach(list =>
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
    );
    return map;
  }, [conditions]);

  const inspectionsByMonth = useMemo(() => {
    const map = new Map<string, LaoInspection[]>();
    inspections.forEach(inspection => {
      const date = new Date(`${inspection.inspectionDate}T00:00:00`);
      if (date.getFullYear() !== selectedYear) return;
      const key = getMonthKey(inspection.conditionId, date.getMonth(), selectedYear);
      const list = map.get(key) || [];
      list.push(inspection);
      map.set(key, list);
    });
    map.forEach(list => list.sort((a, b) => a.inspectionDate.localeCompare(b.inspectionDate)));
    return map;
  }, [inspections, selectedYear]);

  const projectedByCondition = useMemo(() => {
    const map = new Map<string, string[]>();
    conditions.forEach(condition => {
      const lao = laoById.get(condition.laoId);
      if (!lao || !condition.lastInspectionDate) {
        map.set(condition.id, []);
        return;
      }
      const interval = frequencyPresetToMonths(
        condition.frequencyPreset,
        condition.customMonthsInterval,
      );
      if (!interval) {
        map.set(condition.id, []);
        return;
      }
      map.set(
        condition.id,
        projectInspectionDatesForYear(
          condition.lastInspectionDate,
          lao.validityDate,
          interval,
          selectedYear,
        ),
      );
    });
    return map;
  }, [conditions, laoById, selectedYear]);

  const filteredLaos = useMemo(() => {
    const normalizedSearch = normalizeText(search);
    return [...laos]
      .filter(lao => {
        if (categoryFilter !== 'all' && lao.category !== categoryFilter) return false;
        if (branchFilter && lao.branchId !== branchFilter) return false;

        if (!normalizedSearch) return true;

        const laoText = `${lao.laoNumber} ${lao.title} ${lao.empreendimento}`;
        if (normalizeText(laoText).includes(normalizedSearch)) return true;

        const laoConditions = conditionsByLao.get(lao.id) || [];
        return laoConditions.some(condition =>
          normalizeText(condition.name).includes(normalizedSearch),
        );
      })
      .sort((a, b) =>
        `${a.laoNumber} ${a.empreendimento}`.localeCompare(
          `${b.laoNumber} ${b.empreendimento}`,
          'pt-BR',
          { sensitivity: 'base' },
        ),
      );
  }, [branchFilter, categoryFilter, conditionsByLao, laos, search]);

  const laoDetailsData = useMemo(() => {
    if (!selectedLaoForDetails) return null;

    const laoConditions = conditions
      .filter(condition => condition.laoId === selectedLaoForDetails.id && condition.active)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

    const laoInspections = inspections
      .filter(inspection => inspection.laoId === selectedLaoForDetails.id)
      .sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate));

    const branchName =
      branches.find(branch => branch.id === selectedLaoForDetails.branchId)?.name || '-';

    const inspectionsByCondition = new Map<string, LaoInspection[]>();
    laoInspections.forEach(inspection => {
      const list = inspectionsByCondition.get(inspection.conditionId) || [];
      list.push(inspection);
      inspectionsByCondition.set(inspection.conditionId, list);
    });

    const conditionSummary = laoConditions.map(condition => {
      const conditionInspections = inspectionsByCondition.get(condition.id) || [];
      const mergedDates = [
        ...(condition.lastInspectionDate ? [condition.lastInspectionDate] : []),
        ...conditionInspections.map(inspection => inspection.inspectionDate),
      ];
      return {
        condition,
        inspectionsCount: conditionInspections.length,
        lastInspection: maxDateISO(mergedDates),
      };
    });

    const totalThisYear = laoInspections.filter(inspection =>
      inspection.inspectionDate.startsWith(`${selectedYear}-`),
    ).length;
    const withoutInspectionCount = conditionSummary.filter(
      item => item.inspectionsCount === 0 && !item.condition.lastInspectionDate,
    ).length;

    return {
      lao: selectedLaoForDetails,
      branchName,
      totalConditions: laoConditions.length,
      totalInspections: laoInspections.length,
      totalThisYear,
      withoutInspectionCount,
      latestInspection: laoInspections[0]?.inspectionDate || null,
      conditionSummary,
      recentInspections: laoInspections.slice(0, 10).map(inspection => ({
        ...inspection,
        conditionName:
          laoConditions.find(condition => condition.id === inspection.conditionId)?.name ||
          'Condicionante não encontrada',
      })),
      attachments: selectedLaoForDetails.attachments || [],
    };
  }, [branches, conditions, inspections, selectedLaoForDetails, selectedYear]);

  const resetLaoForm = (): void => {
    setEditingLao(null);
    setLaoForm({
      laoNumber: '',
      title: '',
      empreendimento: '',
      branchId: '',
      category: 'Ambiental',
      processNumber: '',
      fcei: '',
      codam: '',
      issueDate: '',
      validityDate: '',
      details: [createEmptyDetail(0)],
      attachments: [],
      active: true,
      createdAt: '',
      updatedAt: '',
    });
  };

  const openCreateLao = (): void => {
    resetLaoForm();
    setShowLaoModal(true);
  };

  const openEditLao = (lao: LaoRecord): void => {
    setEditingLao(lao);
    setLaoForm({
      ...lao,
      branchId: lao.branchId || '',
      details:
        lao.details.length > 0
          ? lao.details
          : [createEmptyDetail(0)],
      attachments: lao.attachments || [],
    });
    setShowLaoModal(true);
  };

  const handleLaoFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ): void => {
    const { name, value, type } = event.target;
    setLaoForm(prev => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (event.target as HTMLInputElement).checked
          : value,
    }));
  };

  const updateDetail = (index: number, field: 'key' | 'value', value: string): void => {
    setLaoForm(prev => ({
      ...prev,
      details: prev.details.map((detail, idx) =>
        idx === index ? { ...detail, [field]: value } : detail,
      ),
    }));
  };

  const addDetail = (): void => {
    setLaoForm(prev => ({
      ...prev,
      details: [...prev.details, createEmptyDetail(prev.details.length)],
    }));
  };

  const removeDetail = (index: number): void => {
    setLaoForm(prev => {
      const details = prev.details.filter((_, idx) => idx !== index);
      return {
        ...prev,
        details:
          details.length > 0
            ? details.map((item, idx) => ({ ...item, order: idx }))
            : [createEmptyDetail(0)],
      };
    });
  };

  const moveDetail = (index: number, direction: -1 | 1): void => {
    setLaoForm(prev => {
      const target = index + direction;
      if (target < 0 || target >= prev.details.length) return prev;
      const cloned = [...prev.details];
      const [item] = cloned.splice(index, 1);
      cloned.splice(target, 0, item);
      return {
        ...prev,
        details: cloned.map((detail, idx) => ({ ...detail, order: idx })),
      };
    });
  };

  const handleUploadAttachment = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setLaoUploading(true);
    try {
      const laoIdentity = editingLao?.id || `new-${Date.now()}`;
      const storagePath = `laos/${laoIdentity}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const upload = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(upload.ref);

      const newAttachment: Attachment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fileName: file.name,
        fileUrl: url,
        uploadedAt: new Date().toISOString(),
        storagePath,
      };

      setLaoForm(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), newAttachment],
      }));
    } catch (error) {
      alert(`Erro ao anexar arquivo: ${(error as Error).message}`);
    } finally {
      setLaoUploading(false);
      event.target.value = '';
    }
  };

  const removeAttachmentFromForm = async (attachment: Attachment): Promise<void> => {
    try {
      if (attachment.storagePath) {
        await deleteObject(ref(storage, attachment.storagePath));
      }
    } catch (error) {
      console.warn('Falha ao remover arquivo do storage:', error);
    }
    setLaoForm(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(item => item.id !== attachment.id),
    }));
  };

  const saveLao = async (): Promise<void> => {
    if (!laoForm.laoNumber.trim() || !laoForm.empreendimento.trim()) {
      alert('Informe LAO e Empreendimento.');
      return;
    }
    if (!laoForm.validityDate) {
      alert('Informe a validade da LAO.');
      return;
    }
    const now = new Date().toISOString();
    const sanitizedDetails = laoForm.details
      .filter(detail => detail.key.trim() && detail.value.trim())
      .map((detail, index) => ({
        ...detail,
        id: detail.id || `detail-${Date.now()}-${index}`,
        order: index,
      }));

    if (editingLao) {
      await onUpdateLao({
        ...editingLao,
        ...laoForm,
        branchId: laoForm.branchId || null,
        details: sanitizedDetails,
        attachments: laoForm.attachments || [],
        updatedAt: now,
      });
    } else {
      await onAddLao({
        ...laoForm,
        branchId: laoForm.branchId || null,
        details: sanitizedDetails,
        attachments: laoForm.attachments || [],
        createdAt: now,
        updatedAt: now,
      });
    }
    setShowLaoModal(false);
    resetLaoForm();
  };

  const confirmDeleteLao = async (id: string): Promise<void> => {
    if (!window.confirm('Deseja excluir esta LAO e suas condicionantes?')) return;
    await onDeleteLao(id);
  };

  const resetConditionForm = (): void => {
    setEditingCondition(null);
    setConditionForm({
      laoId: '',
      name: '',
      frequencyPreset: 'mensal',
      customMonthsInterval: 0,
      lastInspectionDate: '',
      notes: '',
      active: true,
      createdAt: '',
      updatedAt: '',
    });
  };

  const openCreateCondition = (laoId: string): void => {
    resetConditionForm();
    setConditionForm(prev => ({ ...prev, laoId }));
    setShowConditionModal(true);
  };

  const openEditCondition = (condition: LaoCondition): void => {
    setEditingCondition(condition);
    setConditionForm({
      ...condition,
      customMonthsInterval: condition.customMonthsInterval || 0,
      lastInspectionDate: condition.lastInspectionDate || '',
      notes: condition.notes || '',
    });
    setShowConditionModal(true);
  };

  const handleConditionFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ): void => {
    const { name, value, type } = event.target;
    setConditionForm(prev => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (event.target as HTMLInputElement).checked
          : value,
    }));
  };

  const saveCondition = async (): Promise<void> => {
    if (!conditionForm.laoId || !conditionForm.name.trim()) {
      alert('Selecione a LAO e informe a condicionante.');
      return;
    }
    if (
      conditionForm.frequencyPreset === 'custom' &&
      (!conditionForm.customMonthsInterval || conditionForm.customMonthsInterval <= 0)
    ) {
      alert('Informe um intervalo válido para frequência personalizada.');
      return;
    }

    const now = new Date().toISOString();
    const conditionPayload: Omit<LaoCondition, 'id'> = {
      ...conditionForm,
      lastInspectionDate: conditionForm.lastInspectionDate || null,
      notes: conditionForm.notes || '',
      createdAt: editingCondition?.createdAt || now,
      updatedAt: now,
    };
    if (conditionForm.frequencyPreset === 'custom') {
      conditionPayload.customMonthsInterval = Number(
        conditionForm.customMonthsInterval || 0,
      );
    } else {
      delete conditionPayload.customMonthsInterval;
    }

    if (editingCondition) {
      const updatedCondition: LaoCondition = {
        ...editingCondition,
        ...conditionPayload,
        createdAt: editingCondition.createdAt,
        updatedAt: now,
      };
      if (conditionPayload.frequencyPreset !== 'custom') {
        delete updatedCondition.customMonthsInterval;
      }
      await onUpdateCondition(updatedCondition);
    } else {
      await onAddCondition({
        ...conditionPayload,
        createdAt: now,
        updatedAt: now,
      });
    }
    setShowConditionModal(false);
    resetConditionForm();
  };

  const confirmDeleteCondition = async (conditionId: string): Promise<void> => {
    if (!window.confirm('Deseja excluir esta condicionante?')) return;
    await onDeleteCondition(conditionId);
  };

  const openInspectionEditor = (
    lao: LaoRecord,
    condition: LaoCondition,
    monthIndex: number,
    projectedDate: string | null,
  ): void => {
    if (!canEdit) return;
    const fallbackDate = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    setInspectionDraft({
      lao,
      condition,
      monthIndex,
      defaultDate:
        projectedDate || condition.lastInspectionDate || fallbackDate,
    });
    setInspectionDate(projectedDate || condition.lastInspectionDate || fallbackDate);
    setInspectionNote('');
  };

  const saveInspection = async (): Promise<void> => {
    if (!inspectionDraft || !inspectionDate) return;
    setSavingInspection(true);
    try {
      const created = await onAddInspection({
        laoId: inspectionDraft.lao.id,
        conditionId: inspectionDraft.condition.id,
        inspectionDate,
        note: inspectionNote.trim() || undefined,
        source: 'manual',
        createdAt: new Date().toISOString(),
      });

      if (!created) {
        alert('Já existe vistoria nessa data para esta condicionante.');
        return;
      }

      const currentLast = inspectionDraft.condition.lastInspectionDate || '';
      if (!currentLast || inspectionDate > currentLast) {
        await onUpdateCondition({
          ...inspectionDraft.condition,
          lastInspectionDate: inspectionDate,
          updatedAt: new Date().toISOString(),
        });
      }
      setInspectionDraft(null);
      setInspectionDate('');
      setInspectionNote('');
    } finally {
      setSavingInspection(false);
    }
  };

  const executeImport = async (
    parsedItems: ParsedLaoImportItem[],
    parserErrors: string[],
  ): Promise<LaoImportExecutionResult> => {
    const summary: LaoImportExecutionResult = {
      created: 0,
      updated: 0,
      pendingBranch: 0,
      conditionCreated: 0,
      conditionUpdated: 0,
      inspectionsCreated: 0,
      inspectionsSkipped: 0,
      parserErrors,
      importErrors: [],
      pendingItems: [],
    };

    let currentLaos = [...laos];
    let currentConditions = [...conditions];
    let currentInspections = [...inspections];

    const findMatchingBranch = (empreendimento: string): string | null => {
      const normalized = normalizeText(empreendimento);
      const match = branches.find(branch => normalizeText(branch.name) === normalized);
      return match?.id || null;
    };

    const normalizeConditionForImport = (
      laoId: string,
      condition: ParsedLaoConditionImport,
      now: string,
    ): Omit<LaoCondition, 'id'> => ({
      laoId,
      name: condition.name.trim(),
      frequencyPreset: condition.frequencyPreset,
      ...(condition.frequencyPreset === 'custom'
        ? { customMonthsInterval: Number(condition.customMonthsInterval || 0) }
        : {}),
      lastInspectionDate:
        condition.lastInspectionDate ||
        maxDateISO(condition.inspections) ||
        null,
      notes: condition.notes || '',
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of parsedItems) {
      try {
        const now = new Date().toISOString();
        const key = getImportKey(item.laoNumber, item.empreendimento);
        const branchId = findMatchingBranch(item.empreendimento);

        if (!branchId) {
          summary.pendingBranch += 1;
          summary.pendingItems.push({
            laoNumber: item.laoNumber,
            empreendimento: item.empreendimento,
            reason: 'Filial não encontrada automaticamente',
          });
        }

        let lao = currentLaos.find(
          current => getImportKey(current.laoNumber, current.empreendimento) === key,
        );

        const laoPayload: Omit<LaoRecord, 'id'> = {
          laoNumber: item.laoNumber,
          title: item.title || `${item.laoNumber} ${item.empreendimento}`.trim(),
          empreendimento: item.empreendimento,
          branchId,
          category: 'Ambiental',
          processNumber: item.processNumber || '',
          fcei: item.fcei || '',
          codam: item.codam || '',
          issueDate: item.issueDate || '',
          validityDate: item.validityDate || '',
          details: item.details.map((detail, index) => ({
            ...detail,
            id: detail.id || `detail-import-${Date.now()}-${index}`,
            order: index,
          })),
          attachments: lao?.attachments || [],
          active: true,
          createdAt: lao?.createdAt || now,
          updatedAt: now,
        };

        if (!laoPayload.validityDate) {
          summary.importErrors.push(
            `LAO "${item.laoNumber}" ignorada: validade obrigatória ausente.`,
          );
          continue;
        }

        if (lao) {
          const updatedLao: LaoRecord = {
            ...lao,
            ...laoPayload,
            attachments: lao.attachments || [],
            createdAt: lao.createdAt,
          };
          await onUpdateLao(updatedLao);
          summary.updated += 1;
          lao = updatedLao;
          currentLaos = currentLaos.map(current =>
            current.id === lao?.id ? lao : current,
          );
        } else {
          const newId = await onAddLao(laoPayload);
          lao = { id: newId, ...laoPayload };
          currentLaos.push(lao);
          summary.created += 1;
        }

        if (!lao) continue;

        for (const parsedCondition of item.conditions) {
          const normalizedName = normalizeText(parsedCondition.name);
          const existingCondition = currentConditions.find(
            condition =>
              condition.laoId === lao.id &&
              normalizeText(condition.name) === normalizedName,
          );
          const conditionPayload = normalizeConditionForImport(
            lao.id,
            parsedCondition,
            now,
          );
          let conditionId = existingCondition?.id || '';

          if (existingCondition) {
            const mergedLastInspection = maxDateISO(
              [
                ...(existingCondition.lastInspectionDate
                  ? [existingCondition.lastInspectionDate]
                  : []),
                ...(parsedCondition.lastInspectionDate
                  ? [parsedCondition.lastInspectionDate]
                  : []),
                ...parsedCondition.inspections,
              ].filter(Boolean),
            );
            const updatedCondition: LaoCondition = {
              ...existingCondition,
              ...conditionPayload,
              createdAt: existingCondition.createdAt,
              lastInspectionDate: mergedLastInspection,
              updatedAt: now,
            };
            await onUpdateCondition(updatedCondition);
            summary.conditionUpdated += 1;
            conditionId = updatedCondition.id;
            currentConditions = currentConditions.map(condition =>
              condition.id === updatedCondition.id ? updatedCondition : condition,
            );
          } else {
            const newConditionId = await onAddCondition(conditionPayload);
            summary.conditionCreated += 1;
            conditionId = newConditionId;
            currentConditions.push({ id: newConditionId, ...conditionPayload });
          }

          const sortedInspectionDates = Array.from(
            new Set(parsedCondition.inspections),
          ).sort((a, b) => a.localeCompare(b));

          for (const inspectionDateValue of sortedInspectionDates) {
            const duplicate = currentInspections.some(
              inspection =>
                inspection.conditionId === conditionId &&
                inspection.inspectionDate === inspectionDateValue,
            );
            if (duplicate) {
              summary.inspectionsSkipped += 1;
              continue;
            }

            const createdInspectionId = await onAddInspection({
              laoId: lao.id,
              conditionId,
              inspectionDate: inspectionDateValue,
              source: 'import',
              createdAt: now,
            });

            if (!createdInspectionId) {
              summary.inspectionsSkipped += 1;
              continue;
            }

            summary.inspectionsCreated += 1;
            currentInspections.push({
              id: createdInspectionId,
              laoId: lao.id,
              conditionId,
              inspectionDate: inspectionDateValue,
              source: 'import',
              createdAt: now,
            });
          }
        }
      } catch (error) {
        summary.importErrors.push(
          `Falha ao importar "${item.laoNumber}": ${(error as Error).message}`,
        );
      }
    }

    return summary;
  };

  const today = new Date();
  const sortedBranches = [...branches].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Condicionantes LAO
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="rounded-lg bg-slate-600 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <span className="inline-flex items-center gap-2">
                <ImportIcon />
                Importar Workbook
              </span>
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={openCreateLao}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <span className="inline-flex items-center gap-2">
                  <PlusIcon />
                  Nova LAO
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold text-slate-700 dark:text-gray-200">
              Ano
            </label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={selectedYear}
              onChange={event => setSelectedYear(Number(event.target.value) || currentYear)}
              className="rounded border border-slate-400 bg-white p-2 text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold text-slate-700 dark:text-gray-200">
              Categoria
            </label>
            <select
              value={categoryFilter}
              onChange={event =>
                setCategoryFilter(event.target.value as 'all' | LaoCategory)
              }
              className="rounded border border-slate-400 bg-white p-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">Todas</option>
              <option value="Ambiental">Ambiental</option>
              <option value="SGA">SGA</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold text-slate-700 dark:text-gray-200">
              Filial
            </label>
            <select
              value={branchFilter}
              onChange={event => setBranchFilter(event.target.value)}
              className="rounded border border-slate-400 bg-white p-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="">Todas</option>
              {sortedBranches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex flex-col">
            <label className="mb-1 text-xs font-semibold text-slate-700 dark:text-gray-200">
              Busca (LAO ou condicionante)
            </label>
            <input
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Digite para buscar..."
              className="rounded border border-slate-400 bg-white p-2 text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] table-fixed border-collapse bg-white dark:bg-gray-800">
            <thead>
              <tr>
                <th className="w-72 border border-slate-500 bg-slate-700 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide !text-slate-50 dark:border-gray-600 dark:bg-gray-700 dark:!text-gray-100">
                  LAO
                </th>
                <th className="w-80 border border-slate-500 bg-slate-700 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide !text-slate-50 dark:border-gray-600 dark:bg-gray-700 dark:!text-gray-100">
                  Condicionante
                </th>
                <th className="w-44 border border-slate-500 bg-slate-700 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide !text-slate-50 dark:border-gray-600 dark:bg-gray-700 dark:!text-gray-100">
                  Frequência
                </th>
                {MONTH_LABELS.map(label => (
                  <th
                    key={label}
                    className="w-24 border border-slate-500 bg-slate-700 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide !text-slate-50 dark:border-gray-600 dark:bg-gray-700 dark:!text-gray-100"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLaos.length === 0 && (
                <tr>
                  <td
                    colSpan={15}
                    className="border border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  >
                    Nenhuma LAO encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
              {filteredLaos.map(lao => {
                const laoConditions = (conditionsByLao.get(lao.id) || []).filter(
                  condition => condition.active,
                );
                const branchName =
                  branches.find(branch => branch.id === lao.branchId)?.name || '-';

                if (laoConditions.length === 0) {
                  return (
                    <tr key={lao.id}>
                      <td className="border border-slate-300 bg-white px-3 py-3 align-top dark:border-gray-700 dark:bg-gray-800">
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setSelectedLaoForDetails(lao)}
                            className="text-left text-sm font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
                            title="Abrir detalhes da LAO"
                          >
                            {lao.laoNumber}
                          </button>
                          <div className="text-xs font-medium text-slate-800 dark:text-gray-200">
                            {lao.empreendimento}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-gray-400">
                            Validade: {formatDateBR(lao.validityDate)} | Filial:{' '}
                            {branchName}
                          </div>
                          {canEdit && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditLao(lao)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Editar LAO"
                              >
                                <PencilIcon />
                              </button>
                              <button
                                onClick={() => openCreateCondition(lao.id)}
                                className="text-green-600 hover:text-green-800"
                                title="Nova condicionante"
                              >
                                <PlusIcon />
                              </button>
                              <button
                                onClick={() => confirmDeleteLao(lao.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Excluir LAO"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        colSpan={14}
                        className="border border-slate-300 bg-white px-3 py-3 text-sm text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      >
                        Nenhuma condicionante cadastrada.
                      </td>
                    </tr>
                  );
                }

                return laoConditions.map((condition, index) => {
                  const projections = projectedByCondition.get(condition.id) || [];
                  const hasAnchor = !!condition.lastInspectionDate;
                  const intervalMonths = frequencyPresetToMonths(
                    condition.frequencyPreset,
                    condition.customMonthsInterval,
                  );
                  const anchorDate = parseISODate(condition.lastInspectionDate || null);
                  const validityDate = parseISODate(lao.validityDate);
                  const nextProjectedDate =
                    anchorDate && intervalMonths
                      ? addMonthsPreserveDay(anchorDate, intervalMonths)
                      : null;
                  const validityEndsBeforeNextProjection =
                    !!nextProjectedDate &&
                    !!validityDate &&
                    nextProjectedDate.getTime() > validityDate.getTime();

                  return (
                    <tr key={`${lao.id}-${condition.id}`}>
                      {index === 0 && (
                        <td
                          rowSpan={laoConditions.length}
                          className="border border-slate-300 bg-white px-3 py-3 align-top dark:border-gray-700 dark:bg-gray-800"
                        >
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => setSelectedLaoForDetails(lao)}
                              className="text-left text-sm font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
                              title="Abrir detalhes da LAO"
                            >
                              {lao.laoNumber}
                            </button>
                            <div className="text-xs font-semibold text-slate-800 dark:text-gray-200">
                              {lao.empreendimento}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-gray-400">
                              {lao.title}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-gray-400">
                              Emissão: {formatDateBR(lao.issueDate || '') || '-'}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-gray-400">
                              Validade: {formatDateBR(lao.validityDate)}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-gray-400">
                              Filial: {branchName}
                            </div>
                            {canEdit && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditLao(lao)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Editar LAO"
                                >
                                  <PencilIcon />
                                </button>
                                <button
                                  onClick={() => openCreateCondition(lao.id)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Nova condicionante"
                                >
                                  <PlusIcon />
                                </button>
                                <button
                                  onClick={() => confirmDeleteLao(lao.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Excluir LAO"
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="border border-slate-300 bg-white px-3 py-2 align-top dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-gray-100">
                            {condition.name}
                          </span>
                          {canEdit && (
                            <span className="flex gap-2">
                              <button
                                onClick={() => openEditCondition(condition)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Editar condicionante"
                              >
                                <PencilIcon />
                              </button>
                              <button
                                onClick={() => confirmDeleteCondition(condition.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Excluir condicionante"
                              >
                                <TrashIcon />
                              </button>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border border-slate-300 bg-white px-3 py-2 align-top dark:border-gray-700 dark:bg-gray-800">
                        <div className="text-sm font-medium text-slate-800 dark:text-gray-200">
                          {frequencyLabel(condition)}
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-gray-400">
                          Última vistoria:{' '}
                          {condition.lastInspectionDate
                            ? formatDateBR(condition.lastInspectionDate)
                            : 'pendente'}
                        </div>
                        {!hasAnchor && (
                          <div className="mt-1 rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                            Sem última vistoria
                          </div>
                        )}
                        {hasAnchor && validityEndsBeforeNextProjection && (
                          <div className="mt-1 rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
                            Sem previsão: validade encerra antes da próxima vistoria
                          </div>
                        )}
                      </td>
                      {MONTH_LABELS.map((_, monthIndex) => {
                        const monthInspections =
                          inspectionsByMonth.get(
                            getMonthKey(condition.id, monthIndex, selectedYear),
                          ) || [];
                        const projectedDate =
                          projections.find(
                            projection =>
                              new Date(`${projection}T00:00:00`).getMonth() === monthIndex,
                          ) || null;

                        const hasInspection = monthInspections.length > 0;
                        let status: 'empty' | 'planned' | 'done' | 'overdue' = 'empty';
                        if (hasInspection) {
                          status = 'done';
                        } else if (projectedDate) {
                          status = isMonthBeforeToday(monthIndex, selectedYear, today)
                            ? 'overdue'
                            : 'planned';
                        }

                        const statusClass =
                          status === 'done'
                            ? 'bg-emerald-600 text-white'
                            : status === 'planned'
                              ? 'bg-sky-300 text-sky-950 dark:bg-blue-900/40 dark:text-blue-100'
                              : status === 'overdue'
                                ? 'bg-rose-300 text-rose-950 dark:bg-red-900/40 dark:text-red-100'
                                : 'bg-white text-slate-500 dark:bg-gray-900 dark:text-gray-500';

                        return (
                          <td
                            key={`${condition.id}-${monthIndex}`}
                            onClick={() =>
                              openInspectionEditor(
                                lao,
                                condition,
                                monthIndex,
                                projectedDate,
                              )
                            }
                            className={`border border-slate-300 px-1 py-2 text-center text-xs font-semibold align-top dark:border-gray-700 ${
                              canEdit ? 'cursor-pointer hover:ring-1 hover:ring-blue-400' : ''
                            } ${statusClass}`}
                            title={
                              canEdit
                                ? 'Clique para registrar vistoria'
                                : undefined
                            }
                          >
                            {hasInspection ? (
                              <div className="space-y-1">
                                {monthInspections.slice(0, 2).map(inspection => (
                                  <div key={inspection.id}>
                                    {formatDateBR(inspection.inspectionDate).slice(0, 5)}
                                  </div>
                                ))}
                                {monthInspections.length > 2 && (
                                  <div>+{monthInspections.length - 2}</div>
                                )}
                              </div>
                            ) : projectedDate ? (
                              <span>{formatDateBR(projectedDate).slice(0, 5)}</span>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
      {laoDetailsData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {laoDetailsData.lao.laoNumber} - {laoDetailsData.lao.empreendimento}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
                  {laoDetailsData.lao.title || 'Sem título'} | Filial: {laoDetailsData.branchName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLaoForDetails(null)}
                className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              >
                Fechar
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded border border-slate-300 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <div className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">
                  Condicionantes
                </div>
                <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {laoDetailsData.totalConditions}
                </div>
              </div>
              <div className="rounded border border-slate-300 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <div className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">
                  Vistorias totais
                </div>
                <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {laoDetailsData.totalInspections}
                </div>
              </div>
              <div className="rounded border border-slate-300 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <div className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">
                  Vistorias em {selectedYear}
                </div>
                <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {laoDetailsData.totalThisYear}
                </div>
              </div>
              <div className="rounded border border-slate-300 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <div className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">
                  Última vistoria geral
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {laoDetailsData.latestInspection
                    ? formatDateBR(laoDetailsData.latestInspection)
                    : 'Sem registros'}
                </div>
              </div>
              <div className="rounded border border-slate-300 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <div className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">
                  Sem vistoria
                </div>
                <div className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-300">
                  {laoDetailsData.withoutInspectionCount}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded border border-slate-300 p-4 dark:border-gray-700">
                <h4 className="mb-3 font-semibold text-slate-900 dark:text-white">
                  Itens da LAO
                </h4>
                {laoDetailsData.conditionSummary.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-gray-300">
                    Nenhuma condicionante cadastrada.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] border-collapse">
                      <thead>
                        <tr>
                          <th className="border border-slate-300 bg-slate-100 px-2 py-1 text-left text-xs font-semibold uppercase text-slate-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100">
                            Item
                          </th>
                          <th className="border border-slate-300 bg-slate-100 px-2 py-1 text-left text-xs font-semibold uppercase text-slate-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100">
                            Frequência
                          </th>
                          <th className="border border-slate-300 bg-slate-100 px-2 py-1 text-left text-xs font-semibold uppercase text-slate-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100">
                            Última vistoria
                          </th>
                          <th className="border border-slate-300 bg-slate-100 px-2 py-1 text-center text-xs font-semibold uppercase text-slate-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {laoDetailsData.conditionSummary.map(item => (
                          <tr key={item.condition.id}>
                            <td className="border border-slate-300 px-2 py-1 text-sm text-slate-900 dark:border-gray-700 dark:text-gray-100">
                              {item.condition.name}
                            </td>
                            <td className="border border-slate-300 px-2 py-1 text-sm text-slate-700 dark:border-gray-700 dark:text-gray-200">
                              {frequencyLabel(item.condition)}
                            </td>
                            <td className="border border-slate-300 px-2 py-1 text-sm text-slate-700 dark:border-gray-700 dark:text-gray-200">
                              {item.lastInspection
                                ? formatDateBR(item.lastInspection)
                                : 'Sem vistoria'}
                            </td>
                            <td className="border border-slate-300 px-2 py-1 text-center text-sm font-semibold text-slate-800 dark:border-gray-700 dark:text-gray-100">
                              {item.inspectionsCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded border border-slate-300 p-4 dark:border-gray-700">
                <h4 className="mb-3 font-semibold text-slate-900 dark:text-white">
                  Resumo de vistorias
                </h4>
                {laoDetailsData.recentInspections.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-gray-300">
                    Sem registros de vistoria.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {laoDetailsData.recentInspections.map(inspection => (
                      <div
                        key={inspection.id}
                        className="rounded border border-slate-200 bg-slate-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatDateBR(inspection.inspectionDate)} - {inspection.conditionName}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-gray-300">
                          Origem: {inspection.source === 'import' ? 'Importação' : 'Manual'}
                          {inspection.note ? ` | Obs: ${inspection.note}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded border border-slate-300 p-4 dark:border-gray-700">
                <h4 className="mb-3 font-semibold text-slate-900 dark:text-white">Anexos</h4>
                {laoDetailsData.attachments.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-gray-300">
                    Nenhum anexo cadastrado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {laoDetailsData.attachments.map(attachment => (
                      <a
                        key={attachment.id}
                        href={attachment.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-blue-700 hover:underline dark:border-gray-700 dark:bg-gray-900 dark:text-blue-300"
                      >
                        {attachment.fileName}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded border border-slate-300 p-4 dark:border-gray-700">
                <h4 className="mb-3 font-semibold text-slate-900 dark:text-white">Detalhes da LAO</h4>
                {laoDetailsData.lao.details?.length ? (
                  <div className="space-y-2">
                    {[...laoDetailsData.lao.details]
                      .sort((a, b) => a.order - b.order)
                      .map(detail => (
                        <div
                          key={detail.id}
                          className="rounded border border-slate-200 bg-slate-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                        >
                          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">
                            {detail.key}
                          </div>
                          <div className="text-sm text-slate-900 dark:text-gray-100">
                            {detail.value}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-gray-300">
                    Sem detalhes adicionais cadastrados.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showLaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
              {editingLao ? 'Editar LAO' : 'Nova LAO'}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium">Número da LAO</label>
                <input
                  name="laoNumber"
                  value={laoForm.laoNumber}
                  onChange={handleLaoFieldChange}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="flex flex-col md:col-span-2">
                <label className="mb-1 text-sm font-medium">Título</label>
                <input
                  name="title"
                  value={laoForm.title}
                  onChange={handleLaoFieldChange}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="flex flex-col md:col-span-2">
                <label className="mb-1 text-sm font-medium">Empreendimento</label>
                <input
                  name="empreendimento"
                  value={laoForm.empreendimento}
                  onChange={handleLaoFieldChange}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium">Filial</label>
                <select
                  name="branchId"
                  value={laoForm.branchId || ''}
                  onChange={handleLaoFieldChange}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Sem vínculo</option>
                  {sortedBranches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium">Categoria</label>
                <select
                  name="category"
                  value={laoForm.category}
                  onChange={handleLaoFieldChange}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  <option value="Ambiental">Ambiental</option>
                  <option value="SGA">SGA</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium">Processo</label>
                <input
                  name="processNumber"
                  value={laoForm.processNumber}
                  onChange={handleLaoFieldChange}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium">FCEI</label>
                <input
                  name="fcei"
                  value={laoForm.fcei}
                  onChange={handleLaoFieldChange}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium">CODAM</label>
                <input
                  name="codam"
                  value={laoForm.codam}
                  onChange={handleLaoFieldChange}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium">Emissão</label>
                <input
                  type="date"
                  name="issueDate"
                  value={laoForm.issueDate || ''}
                  onChange={handleLaoFieldChange}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium">Validade</label>
                <input
                  type="date"
                  name="validityDate"
                  value={laoForm.validityDate}
                  onChange={handleLaoFieldChange}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="laoActive"
                  type="checkbox"
                  name="active"
                  checked={laoForm.active}
                  onChange={handleLaoFieldChange}
                />
                <label htmlFor="laoActive" className="text-sm font-medium">
                  LAO ativa
                </label>
              </div>
            </div>

            <div className="mt-6 rounded border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-semibold text-gray-800 dark:text-white">
                  Detalhes (chave/valor)
                </h4>
                <button
                  type="button"
                  onClick={addDetail}
                  className="rounded bg-slate-600 px-3 py-1 text-sm text-white hover:bg-slate-700"
                >
                  Adicionar detalhe
                </button>
              </div>
              <div className="space-y-2">
                {laoForm.details.map((detail, index) => (
                  <div key={detail.id} className="grid grid-cols-12 gap-2">
                    <input
                      value={detail.key}
                      onChange={event => updateDetail(index, 'key', event.target.value)}
                      placeholder="Campo"
                      className="col-span-4 rounded border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                    <input
                      value={detail.value}
                      onChange={event => updateDetail(index, 'value', event.target.value)}
                      placeholder="Valor"
                      className="col-span-6 rounded border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => moveDetail(index, -1)}
                        className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                      >
                        &uarr;
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDetail(index, 1)}
                        className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                      >
                        &darr;
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDetail(index)}
                        className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="mb-3 font-semibold text-gray-800 dark:text-white">Anexos</h4>
              <input
                type="file"
                onChange={handleUploadAttachment}
                disabled={laoUploading}
                className="mb-3 block w-full text-sm"
              />
              {laoUploading && (
                <p className="mb-3 text-sm text-blue-600">Enviando anexo...</p>
              )}
              <div className="space-y-2">
                {(laoForm.attachments || []).map(attachment => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 dark:border-gray-700"
                  >
                    <a
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm text-blue-600 hover:underline"
                    >
                      {attachment.fileName}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeAttachmentFromForm(attachment)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowLaoModal(false);
                  resetLaoForm();
                }}
                className="rounded bg-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveLao}
                className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Salvar LAO
              </button>
            </div>
          </div>
        </div>
      )}
      {showConditionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
              {editingCondition ? 'Editar Condicionante' : 'Nova Condicionante'}
            </h3>
            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium">LAO</label>
                <select
                  name="laoId"
                  value={conditionForm.laoId}
                  onChange={handleConditionFieldChange}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Selecione...</option>
                  {laos.map(lao => (
                    <option key={lao.id} value={lao.id}>
                      {lao.laoNumber} - {lao.empreendimento}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium">Condicionante</label>
                <input
                  name="name"
                  value={conditionForm.name}
                  onChange={handleConditionFieldChange}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium">Frequência</label>
                  <select
                    name="frequencyPreset"
                    value={conditionForm.frequencyPreset}
                    onChange={handleConditionFieldChange}
                    className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    {FREQUENCY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {conditionForm.frequencyPreset === 'custom' && (
                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-medium">Intervalo (meses)</label>
                    <input
                      type="number"
                      name="customMonthsInterval"
                      min={1}
                      value={conditionForm.customMonthsInterval || 0}
                      onChange={handleConditionFieldChange}
                      className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium">Última vistoria</label>
                  <input
                    type="date"
                    name="lastInspectionDate"
                    value={conditionForm.lastInspectionDate || ''}
                    onChange={handleConditionFieldChange}
                    className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <input
                    id="conditionActive"
                    type="checkbox"
                    name="active"
                    checked={conditionForm.active}
                    onChange={handleConditionFieldChange}
                  />
                  <label htmlFor="conditionActive" className="text-sm font-medium">
                    Condicionante ativa
                  </label>
                </div>
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium">Observações</label>
                <textarea
                  name="notes"
                  value={conditionForm.notes || ''}
                  onChange={handleConditionFieldChange}
                  rows={3}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowConditionModal(false);
                  resetConditionForm();
                }}
                className="rounded bg-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveCondition}
                className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Salvar condicionante
              </button>
            </div>
          </div>
        </div>
      )}

      {inspectionDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-2 text-lg font-bold text-gray-800 dark:text-white">
              Registrar vistoria
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              {inspectionDraft.lao.laoNumber} &bull; {inspectionDraft.condition.name} (
              {MONTH_LABELS[inspectionDraft.monthIndex]}/{selectedYear})
            </p>
            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium">Data da vistoria</label>
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={event => setInspectionDate(event.target.value)}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium">Observação</label>
                <textarea
                  value={inspectionNote}
                  onChange={event => setInspectionNote(event.target.value)}
                  rows={3}
                  className="rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInspectionDraft(null)}
                className="rounded bg-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingInspection}
                onClick={saveInspection}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {savingInspection ? 'Salvando...' : 'Salvar vistoria'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportLaoWorkbookModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportParsed={executeImport}
      />
    </div>
  );
};

export default LaoConditionsManagement;
