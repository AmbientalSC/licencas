import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { LaoDetailKV, LaoFrequencyPreset } from '../types';
import {
  getFrequencyPresetFromLabel,
  getImportKey,
  normalizeText,
  parseWorkbookDate,
} from '../utils/laoSchedule';

export interface ParsedLaoConditionImport {
  name: string;
  frequencyPreset: LaoFrequencyPreset;
  customMonthsInterval?: number;
  inspections: string[];
  lastInspectionDate?: string | null;
  notes?: string;
}

export interface ParsedLaoImportItem {
  importKey: string;
  laoNumber: string;
  title: string;
  empreendimento: string;
  processNumber?: string;
  fcei?: string;
  codam?: string;
  issueDate?: string;
  validityDate?: string;
  details: LaoDetailKV[];
  conditions: ParsedLaoConditionImport[];
}

export interface LaoImportExecutionResult {
  created: number;
  updated: number;
  pendingBranch: number;
  conditionCreated: number;
  conditionUpdated: number;
  inspectionsCreated: number;
  inspectionsSkipped: number;
  parserErrors: string[];
  importErrors: string[];
  pendingItems: Array<{ laoNumber: string; empreendimento: string; reason: string }>;
}

interface ImportLaoWorkbookModalProps {
  open: boolean;
  onClose: () => void;
  onImportParsed: (
    items: ParsedLaoImportItem[],
    parserErrors: string[],
  ) => Promise<LaoImportExecutionResult>;
}

const IGNORED_SHEETS = new Set(['capa', 'lai', 'cronograma', 'plan1']);

function uniqueSortedDates(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function maxDateISO(values: string[]): string | null {
  if (values.length === 0) return null;
  return values.reduce((acc, value) => (value > acc ? value : acc), values[0]);
}

function extractLaoNumber(value: string): string {
  const lines = value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
  if (lines.length === 0) return value.trim();
  return lines[0];
}

function extractEmpreendimento(value: string): string {
  const lines = value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines.slice(1).join(' ');

  const first = lines[0] || '';
  const laoNumber = extractLaoNumber(first);
  return first.replace(laoNumber, '').trim();
}

function mergeDetailBlocks(base: LaoDetailKV[], addition: LaoDetailKV[]): LaoDetailKV[] {
  const merged = [...base];
  for (const detail of addition) {
    const exists = merged.some(
      item =>
        normalizeText(item.key) === normalizeText(detail.key) &&
        normalizeText(item.value) === normalizeText(detail.value),
    );
    if (!exists) {
      merged.push({
        ...detail,
        id: `${detail.id}-${merged.length}`,
        order: merged.length,
      });
    }
  }
  return merged.map((item, index) => ({ ...item, order: index }));
}

function mergeCondition(
  target: ParsedLaoConditionImport[],
  nextCondition: ParsedLaoConditionImport,
): ParsedLaoConditionImport[] {
  const index = target.findIndex(
    condition => normalizeText(condition.name) === normalizeText(nextCondition.name),
  );
  if (index < 0) {
    return [...target, nextCondition];
  }

  const current = target[index];
  const mergedInspections = uniqueSortedDates([
    ...current.inspections,
    ...nextCondition.inspections,
  ]);
  const merged: ParsedLaoConditionImport = {
    ...current,
    frequencyPreset: nextCondition.frequencyPreset || current.frequencyPreset,
    customMonthsInterval:
      nextCondition.customMonthsInterval || current.customMonthsInterval,
    inspections: mergedInspections,
    lastInspectionDate: maxDateISO(mergedInspections),
    notes: current.notes || nextCondition.notes,
  };

  const cloned = [...target];
  cloned[index] = merged;
  return cloned;
}

function parseWorkbook(fileData: ArrayBuffer): {
  items: ParsedLaoImportItem[];
  parserErrors: string[];
} {
  const workbook = XLSX.read(fileData, { cellDates: true });
  const parserErrors: string[] = [];

  const detailRecords: ParsedLaoImportItem[] = [];
  for (const sheetName of workbook.SheetNames) {
    if (IGNORED_SHEETS.has(normalizeText(sheetName))) continue;
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
    if (rows.length === 0) continue;

    let empreendimento = '';
    let laoNumber = '';
    let processNumber = '';
    let fcei = '';
    let codam = '';
    let issueDate = '';
    let validityDate = '';
    const details: LaoDetailKV[] = [];

    rows.forEach((row, index) => {
      const keyRaw = String(row[0] ?? '').trim();
      if (!keyRaw) return;
      const valueRaw = row[1];
      const valueString = String(valueRaw ?? '').trim();
      const key = normalizeText(keyRaw);
      const parsedDate = parseWorkbookDate(valueRaw);

      if (key === 'empreendimento') {
        empreendimento = valueString;
        return;
      }
      if (key === 'processo') {
        processNumber = valueString;
        return;
      }
      if (key === 'fcei') {
        fcei = valueString;
        return;
      }
      if (key === 'codam') {
        codam = valueString;
        return;
      }
      if (key.includes('licenca')) {
        laoNumber = valueString;
        return;
      }
      if (key.includes('emissao')) {
        issueDate = parsedDate || valueString;
        return;
      }
      if (key === 'validade') {
        validityDate = parsedDate || valueString;
        return;
      }

      if (!valueString) return;
      details.push({
        id: `detail-${normalizeText(sheetName)}-${index}`,
        key: keyRaw,
        value: valueString,
        order: details.length,
      });
    });

    if (!empreendimento && !laoNumber && details.length === 0) continue;

    const safeLaoNumber = laoNumber || `LAO ${sheetName}`;
    const safeEmpreendimento = empreendimento || sheetName;

    detailRecords.push({
      importKey: getImportKey(safeLaoNumber, safeEmpreendimento),
      laoNumber: safeLaoNumber,
      title: `${safeLaoNumber} ${safeEmpreendimento}`.trim(),
      empreendimento: safeEmpreendimento,
      processNumber: processNumber || undefined,
      fcei: fcei || undefined,
      codam: codam || undefined,
      issueDate: issueDate || undefined,
      validityDate: validityDate || undefined,
      details,
      conditions: [],
    });
  }

  const capaSheet = workbook.Sheets.Capa || workbook.Sheets.capa;
  if (!capaSheet) {
    return {
      items: detailRecords,
      parserErrors: ['Aba Capa não encontrada no arquivo.'],
    };
  }

  const capaRows = XLSX.utils.sheet_to_json(capaSheet, {
    header: 1,
    defval: '',
  }) as unknown[][];

  const map = new Map<string, ParsedLaoImportItem>();
  let currentLaoTitle = '';
  let currentLaoNumber = '';
  let currentEmpreendimento = '';

  for (let rowIndex = 1; rowIndex < capaRows.length; rowIndex += 1) {
    const row = capaRows[rowIndex];
    const colA = String(row[0] ?? '').trim();
    const colB = String(row[1] ?? '').trim();
    const colC = String(row[2] ?? '').trim();

    if (colA && normalizeText(colA).includes('lao')) {
      currentLaoTitle = colA;
      currentLaoNumber = extractLaoNumber(colA);
      currentEmpreendimento = extractEmpreendimento(colA) || currentLaoNumber;
      const key = getImportKey(currentLaoNumber, currentEmpreendimento);
      if (!map.has(key)) {
        map.set(key, {
          importKey: key,
          laoNumber: currentLaoNumber,
          title: currentLaoTitle.replace(/\n+/g, ' ').trim(),
          empreendimento: currentEmpreendimento,
          details: [],
          conditions: [],
        });
      }
      continue;
    }

    if (!colB || !currentLaoNumber) continue;
    const key = getImportKey(currentLaoNumber, currentEmpreendimento);
    const existing = map.get(key);
    if (!existing) continue;

    const resolvedFrequency = getFrequencyPresetFromLabel(colC);
    const inspections: string[] = [];
    for (let colIndex = 3; colIndex <= 14; colIndex += 1) {
      const parsed = parseWorkbookDate(row[colIndex]);
      if (parsed) inspections.push(parsed);
    }

    const uniqueDates = uniqueSortedDates(inspections);
    const condition: ParsedLaoConditionImport = {
      name: colB,
      frequencyPreset: resolvedFrequency.preset,
      customMonthsInterval: resolvedFrequency.customMonthsInterval,
      inspections: uniqueDates,
      lastInspectionDate: maxDateISO(uniqueDates),
    };

    existing.conditions = mergeCondition(existing.conditions, condition);
    map.set(key, existing);
  }

  const capaItems = Array.from(map.values());

  for (const detailItem of detailRecords) {
    const exact = map.get(detailItem.importKey);
    if (exact) {
      exact.processNumber = exact.processNumber || detailItem.processNumber;
      exact.fcei = exact.fcei || detailItem.fcei;
      exact.codam = exact.codam || detailItem.codam;
      exact.issueDate = exact.issueDate || detailItem.issueDate;
      exact.validityDate = exact.validityDate || detailItem.validityDate;
      exact.details = mergeDetailBlocks(exact.details, detailItem.details);
      continue;
    }

    const byEmpreendimento = capaItems.find(
      item =>
        normalizeText(item.empreendimento) === normalizeText(detailItem.empreendimento),
    );
    if (byEmpreendimento) {
      byEmpreendimento.processNumber =
        byEmpreendimento.processNumber || detailItem.processNumber;
      byEmpreendimento.fcei = byEmpreendimento.fcei || detailItem.fcei;
      byEmpreendimento.codam = byEmpreendimento.codam || detailItem.codam;
      byEmpreendimento.issueDate = byEmpreendimento.issueDate || detailItem.issueDate;
      byEmpreendimento.validityDate =
        byEmpreendimento.validityDate || detailItem.validityDate;
      byEmpreendimento.details = mergeDetailBlocks(
        byEmpreendimento.details,
        detailItem.details,
      );
      continue;
    }

    map.set(detailItem.importKey, detailItem);
  }

  const items = Array.from(map.values()).filter(item => {
    if (!item.laoNumber || !item.empreendimento) {
      parserErrors.push(
        `Registro ignorado por falta de LAO/Empreendimento: "${item.title}"`,
      );
      return false;
    }
    if (!item.validityDate) {
      parserErrors.push(
        `LAO "${item.laoNumber}" sem validade definida no detalhamento.`,
      );
      return false;
    }
    return true;
  });

  return { items, parserErrors };
}

function downloadReport(result: LaoImportExecutionResult): void {
  const lines = [
    'tipo;lao;empreendimento;motivo',
    ...result.pendingItems.map(
      item =>
        `pendencia;${item.laoNumber};${item.empreendimento};${item.reason}`,
    ),
    ...result.importErrors.map(error => `erro;;;${error}`),
    ...result.parserErrors.map(error => `parser;;;${error}`),
  ];
  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-importacao-lao-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const ImportLaoWorkbookModal: React.FC<ImportLaoWorkbookModalProps> = ({
  open,
  onClose,
  onImportParsed,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LaoImportExecutionResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleChangeFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMessage(null);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseWorkbook(buffer);
      const importResult = await onImportParsed(parsed.items, parsed.parserErrors);
      setResult(importResult);
      setMessage('Importação concluída.');
    } catch (error) {
      setMessage(`Erro ao importar: ${(error as Error).message}`);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            Importar Workbook de LAO
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            ×
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          Formato suportado: planilha com aba <strong>Capa</strong> e abas de
          detalhamento por empreendimento.
        </p>

        <div className="mb-4">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleChangeFile}
            disabled={loading}
            className="block w-full text-sm text-gray-700 dark:text-gray-200"
          />
        </div>

        {loading && (
          <div className="mb-4 rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">
            Processando importação...
          </div>
        )}

        {message && (
          <div className="mb-4 rounded bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-100">
            {message}
          </div>
        )}

        {result && (
          <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-white">
              Resultado da importação
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-200">
              <div>LAOs criadas: {result.created}</div>
              <div>LAOs atualizadas: {result.updated}</div>
              <div>Condicionantes criadas: {result.conditionCreated}</div>
              <div>Condicionantes atualizadas: {result.conditionUpdated}</div>
              <div>Vistorias criadas: {result.inspectionsCreated}</div>
              <div>Vistorias ignoradas: {result.inspectionsSkipped}</div>
              <div>Pendências de filial: {result.pendingBranch}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadReport(result)}
                className="rounded bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Baixar relatório
              </button>
            </div>
            {(result.importErrors.length > 0 || result.parserErrors.length > 0) && (
              <div className="max-h-40 overflow-y-auto rounded bg-red-50 p-2 text-xs text-red-700">
                {[...result.parserErrors, ...result.importErrors].map((error, index) => (
                  <div key={`${error}-${index}`}>• {error}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
