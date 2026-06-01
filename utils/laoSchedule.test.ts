import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  getImportKey,
  parseISODate,
  toISODate,
  formatDateBR,
  parseWorkbookDate,
  getFrequencyPresetFromLabel,
  frequencyPresetToMonths,
  addMonthsPreserveDay,
  projectInspectionDatesForYear,
  isMonthBeforeToday,
} from './laoSchedule';

describe('normalizeText', () => {
  it('remove acentos e converte para minúsculas', () => {
    expect(normalizeText('Água')).toBe('agua');
    expect(normalizeText('EMPRESA SÃO JOÃO')).toBe('empresa sao joao');
    expect(normalizeText('AÇÃO')).toBe('acao');
  });

  it('remove espaços extras e trim', () => {
    expect(normalizeText('  texto   com   espaços  ')).toBe('texto com espacos');
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(normalizeText('')).toBe('');
  });
});

describe('getImportKey', () => {
  it('gera chave normalizada com número do LAO e empreendimento', () => {
    const key = getImportKey('LAO-001', 'Empreendimento Teste');
    expect(key).toBe('lao-001::empreendimento teste');
  });

  it('remove acentos na chave', () => {
    const key = getImportKey('LAO-002', 'Construção Civil');
    expect(key).toBe('lao-002::construcao civil');
  });
});

describe('parseISODate', () => {
  it('converte string ISO para Date', () => {
    const result = parseISODate('2025-06-15');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getMonth()).toBe(5);
    expect(result!.getDate()).toBe(15);
  });

  it('retorna null para valor nulo ou undefined', () => {
    expect(parseISODate(null)).toBeNull();
    expect(parseISODate(undefined)).toBeNull();
    expect(parseISODate('')).toBeNull();
  });

  it('retorna null para formato inválido', () => {
    expect(parseISODate('abc')).toBeNull();
    expect(parseISODate('2025-13-01')).not.toBeNull();
  });
});

describe('toISODate', () => {
  it('converte Date para string ISO', () => {
    const result = toISODate(new Date(2025, 0, 5));
    expect(result).toBe('2025-01-05');
  });

  it('formata corretamente meses e dias com dois dígitos', () => {
    expect(toISODate(new Date(2025, 10, 9))).toBe('2025-11-09');
    expect(toISODate(new Date(2025, 0, 25))).toBe('2025-01-25');
  });
});

describe('formatDateBR', () => {
  it('converte ISO para formato brasileiro', () => {
    expect(formatDateBR('2025-06-15')).toBe('15/06/2025');
    expect(formatDateBR('2025-01-05')).toBe('05/01/2025');
  });

  it('retorna string vazia para valor nulo', () => {
    expect(formatDateBR(null)).toBe('');
    expect(formatDateBR(undefined)).toBe('');
    expect(formatDateBR('')).toBe('');
  });
});

describe('parseWorkbookDate', () => {
  it('converte número serial do Excel para ISO', () => {
    const excelSerial = 44927;
    const result = parseWorkbookDate(excelSerial);
    expect(result).toBe('2023-01-01');
  });

  it('converte string ISO mantendo o formato', () => {
    expect(parseWorkbookDate('2025-06-15')).toBe('2025-06-15');
  });

  it('converte string brasileira DD/MM/YYYY para ISO', () => {
    expect(parseWorkbookDate('15/06/2025')).toBe('2025-06-15');
    expect(parseWorkbookDate('05/01/2025')).toBe('2025-01-05');
  });

  it('converte string brasileira com dia/mês sem zero à esquerda', () => {
    expect(parseWorkbookDate('5/1/2025')).toBe('2025-01-05');
  });

  it('retorna null para valor vazio', () => {
    expect(parseWorkbookDate(null)).toBeNull();
    expect(parseWorkbookDate('')).toBeNull();
    expect(parseWorkbookDate('   ')).toBeNull();
  });

  it('converte objeto Date para ISO', () => {
    const date = new Date(2025, 5, 15);
    expect(parseWorkbookDate(date)).toBe('2025-06-15');
  });
});

describe('getFrequencyPresetFromLabel', () => {
  it('identifica presets por texto', () => {
    expect(getFrequencyPresetFromLabel('Mensal').preset).toBe('mensal');
    expect(getFrequencyPresetFromLabel('Bimestral').preset).toBe('bimestral');
    expect(getFrequencyPresetFromLabel('Trimestral').preset).toBe('trimestral');
    expect(getFrequencyPresetFromLabel('Semestral').preset).toBe('semestral');
    expect(getFrequencyPresetFromLabel('Anual').preset).toBe('anual');
  });

  it('identifica intervalo customizado por regex', () => {
    const result = getFrequencyPresetFromLabel('3 meses');
    expect(result.preset).toBe('custom');
    expect(result.customMonthsInterval).toBe(3);
  });

  it('identifica "3 mes" (singular)', () => {
    const result = getFrequencyPresetFromLabel('6 mes');
    expect(result.preset).toBe('custom');
    expect(result.customMonthsInterval).toBe(6);
  });

  it('retorna anual como padrão para texto não reconhecido', () => {
    expect(getFrequencyPresetFromLabel('').preset).toBe('anual');
    expect(getFrequencyPresetFromLabel('xyz').preset).toBe('anual');
  });
});

describe('frequencyPresetToMonths', () => {
  it('converte presets para número de meses', () => {
    expect(frequencyPresetToMonths('mensal')).toBe(1);
    expect(frequencyPresetToMonths('bimestral')).toBe(2);
    expect(frequencyPresetToMonths('trimestral')).toBe(3);
    expect(frequencyPresetToMonths('semestral')).toBe(6);
    expect(frequencyPresetToMonths('anual')).toBe(12);
  });

  it('retorna customMonthsInterval para preset custom', () => {
    expect(frequencyPresetToMonths('custom', 4)).toBe(4);
  });

  it('retorna null para custom sem intervalo', () => {
    expect(frequencyPresetToMonths('custom')).toBeNull();
    expect(frequencyPresetToMonths('custom', 0)).toBeNull();
  });
});

describe('addMonthsPreserveDay', () => {
  it('adiciona meses preservando o dia quando possível', () => {
    const result = addMonthsPreserveDay(new Date(2025, 0, 15), 1);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(15);
  });

  it('ajusta para último dia do mês quando dia excede', () => {
    const result = addMonthsPreserveDay(new Date(2025, 0, 31), 1);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(28);
  });

  it('adiciona múltiplos meses atravessando ano', () => {
    const result = addMonthsPreserveDay(new Date(2025, 10, 15), 3);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(15);
  });
});

describe('projectInspectionDatesForYear', () => {
  it('projeta datas de inspeção para um ano específico', () => {
    const datas = projectInspectionDatesForYear('2025-01-15', '2025-12-31', 3, 2025);
    expect(datas.length).toBeGreaterThan(0);
    datas.forEach(d => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('retorna array vazio se anchor for null', () => {
    expect(projectInspectionDatesForYear(null, '2025-12-31', 3, 2025)).toEqual([]);
  });

  it('retorna array vazio se intervalo for zero', () => {
    expect(projectInspectionDatesForYear('2025-01-15', '2025-12-31', 0, 2025)).toEqual([]);
  });

  it('não projeta datas além da validade', () => {
    const datas = projectInspectionDatesForYear('2025-01-15', '2025-06-30', 3, 2025);
    expect(datas.length).toBeLessThanOrEqual(3);
    datas.forEach(d => expect(d <= '2025-06-30').toBe(true));
  });

  it('filtra apenas datas do ano solicitado', () => {
    const datas = projectInspectionDatesForYear('2024-06-01', '2026-06-01', 6, 2025);
    datas.forEach(d => expect(d.startsWith('2025')).toBe(true));
  });
});

describe('isMonthBeforeToday', () => {
  it('retorna true para mês em ano anterior', () => {
    const today = new Date(2025, 5, 15);
    expect(isMonthBeforeToday(0, 2024, today)).toBe(true);
  });

  it('retorna true para mês anterior no mesmo ano', () => {
    const today = new Date(2025, 5, 15);
    expect(isMonthBeforeToday(3, 2025, today)).toBe(true);
  });

  it('retorna false para mês atual', () => {
    const today = new Date(2025, 5, 15);
    expect(isMonthBeforeToday(5, 2025, today)).toBe(false);
  });

  it('retorna false para mês futuro no mesmo ano', () => {
    const today = new Date(2025, 5, 15);
    expect(isMonthBeforeToday(8, 2025, today)).toBe(false);
  });

  it('retorna false para ano futuro', () => {
    const today = new Date(2025, 5, 15);
    expect(isMonthBeforeToday(0, 2026, today)).toBe(false);
  });
});
