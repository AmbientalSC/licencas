import type { LaoFrequencyPreset } from '../types';

export interface FrequencyResolution {
  preset: LaoFrequencyPreset;
  customMonthsInterval?: number;
}

const FREQUENCY_MONTHS: Record<Exclude<LaoFrequencyPreset, 'custom'>, number> = {
  mensal: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function getImportKey(laoNumber: string, empreendimento: string): string {
  return `${normalizeText(laoNumber)}::${normalizeText(empreendimento)}`;
}

export function parseISODate(value?: string | null): Date | null {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateBR(value?: string | null): string {
  const date = parseISODate(value);
  if (!date) return '';
  return date.toLocaleDateString('pt-BR');
}

export function parseWorkbookDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return toISODate(value);

  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const millis = Math.round(value * 24 * 60 * 60 * 1000);
    const parsed = new Date(excelEpoch.getTime() + millis);
    if (Number.isNaN(parsed.getTime())) return null;
    return toISODate(
      new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()),
    );
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return trimmed;

    const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) {
      const day = Number(brMatch[1]);
      const month = Number(brMatch[2]);
      const year = Number(brMatch[3]);
      if (day > 0 && day <= 31 && month > 0 && month <= 12) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  return null;
}

export function getFrequencyPresetFromLabel(value: string): FrequencyResolution {
  const normalized = normalizeText(value);
  if (!normalized) return { preset: 'anual' };
  if (normalized.includes('mensal')) return { preset: 'mensal' };
  if (normalized.includes('bimestral')) return { preset: 'bimestral' };
  if (normalized.includes('trimestral')) return { preset: 'trimestral' };
  if (normalized.includes('semestral')) return { preset: 'semestral' };
  if (normalized.includes('anual')) return { preset: 'anual' };

  const everyMonthsMatch = normalized.match(/(\d+)\s*(mes|meses|m)/);
  if (everyMonthsMatch) {
    const interval = Number(everyMonthsMatch[1]);
    if (!Number.isNaN(interval) && interval > 0) {
      return { preset: 'custom', customMonthsInterval: interval };
    }
  }

  return { preset: 'anual' };
}

export function frequencyPresetToMonths(
  preset: LaoFrequencyPreset,
  customMonthsInterval?: number,
): number | null {
  if (preset === 'custom') {
    if (!customMonthsInterval || customMonthsInterval <= 0) return null;
    return customMonthsInterval;
  }
  return FREQUENCY_MONTHS[preset];
}

export function addMonthsPreserveDay(base: Date, monthsToAdd: number): Date {
  const year = base.getFullYear();
  const month = base.getMonth();
  const day = base.getDate();

  const targetMonthDate = new Date(year, month + monthsToAdd, 1);
  const nextMonth = new Date(
    targetMonthDate.getFullYear(),
    targetMonthDate.getMonth() + 1,
    0,
  );
  const dayToUse = Math.min(day, nextMonth.getDate());

  return new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), dayToUse);
}

export function projectInspectionDatesForYear(
  anchorDateISO: string | null | undefined,
  validityDateISO: string,
  intervalMonths: number,
  year: number,
): string[] {
  const anchor = parseISODate(anchorDateISO || null);
  const validity = parseISODate(validityDateISO);
  if (!anchor || !validity || intervalMonths <= 0) return [];

  const dates: string[] = [];
  let cursor = addMonthsPreserveDay(anchor, intervalMonths);

  while (cursor.getTime() <= validity.getTime()) {
    if (cursor.getFullYear() === year) {
      dates.push(toISODate(cursor));
    }
    if (cursor.getFullYear() > year && cursor.getTime() > validity.getTime()) {
      break;
    }
    cursor = addMonthsPreserveDay(cursor, intervalMonths);
  }

  return dates;
}

export function isMonthBeforeToday(monthIndex: number, year: number, today: Date): boolean {
  if (year < today.getFullYear()) return true;
  if (year > today.getFullYear()) return false;
  return monthIndex < today.getMonth();
}
