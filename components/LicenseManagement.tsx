
import React, { useState, useEffect } from 'react';
import type { License, Branch, LicenseType } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { FilterIcon } from './icons/FilterIcon';
import { ImportIcon } from './icons/ImportIcon';
import { ColumnsIcon } from './icons/ColumnsIcon';
import { ImportLicensesModal } from './ImportLicensesModal';

interface LicenseManagementProps {
  licenses: License[];
  branches: Branch[];
  licenseTypes: LicenseType[];
  onAddLicense: (license: Omit<License, 'id'>) => void;
  onUpdateLicense: (license: License) => void;
  onDeleteLicense: (id: string) => void;
  onAddBranch: (branch: Omit<Branch, 'id'>) => Promise<string> | string;
}

const initialFormState: Omit<License, 'id'> = {
  unitId: '',
  licenseType: '',
  numberYear: '',
  description: '',
  licensingAgency: '',
  processNumber: '',
  issueDate: '',
  originalExpiryDate: '',
  prorrogaDate: '',
  processStartDate: '',
  observation: '',
  active: true,
  inactiveObservation: '',
};

// Definição das colunas padrão
const DEFAULT_COLUMNS = [
  { label: 'Unidade', key: 'unitId', visible: true },
  { label: 'Licença', key: 'licenseType', visible: true },
  { label: 'Nº/Ano', key: 'numberYear', visible: true },
  { label: 'Descrição', key: 'description', visible: true },
  { label: 'Órgão Licenciador', key: 'licensingAgency', visible: true },
  { label: 'FCEI-Nº do Processo', key: 'processNumber', visible: true },
  { label: 'Data Emissão', key: 'issueDate', visible: true },
  { label: 'Data Vencimento', key: 'originalExpiryDate', visible: true },
  { label: 'Prazo Prorrogação', key: 'prorrogaDate', visible: true },
  { label: 'Início Processo', key: 'processStartDate', visible: true },
  { label: 'Alerta', key: 'alert', visible: true },
  { label: 'Observação', key: 'observation', visible: true },
  { label: 'Ações', key: 'actions', visible: true },
];

function getInitialColumns() {
  const saved = localStorage.getItem('licenseTableColumns');
  if (saved) return JSON.parse(saved);
  return DEFAULT_COLUMNS;
}

const LicenseManagement: React.FC<LicenseManagementProps> = ({ licenses, branches, licenseTypes, onAddLicense, onUpdateLicense, onDeleteLicense, onAddBranch }) => {
  const [formState, setFormState] = useState(initialFormState);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState<{ branchId: string; licenseType: string; onlyAlert: boolean }>({ branchId: '', licenseType: '', onlyAlert: false });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'originalExpiryDate', direction: 'asc' });
  const [showImport, setShowImport] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [columns, setColumns] = useState(getInitialColumns());
  // Adicionar ao estado:
  const [colWidths, setColWidths] = useState(() => {
    const saved = localStorage.getItem('licenseTableColWidths');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('licenseTableColumns', JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem('licenseTableColWidths', JSON.stringify(colWidths));
  }, [colWidths]);

  // Correções de tipagem e null check
  function handleToggleColumn(idx: number) {
    setColumns((cols: typeof columns) => cols.map((col: typeof columns[0], i: number) => i === idx ? { ...col, visible: !col.visible } : col));
  }

  function handleMoveColumn(from: number, to: number) {
    setColumns((cols: typeof columns) => {
      const arr = [...cols];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  }

  function handleResetColumns() {
    setColumns(DEFAULT_COLUMNS);
  }
  
  const handleAddNewClick = () => {
    setEditingLicense(null);
    setFormState(initialFormState);
    setIsFormOpen(true);
  };

  const handleEditClick = (license: License) => {
    setEditingLicense(license);
    const { id, ...licenseData } = license;
    setFormState(licenseData);
    setIsFormOpen(true);
  };
  
  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingLicense(null);
    setFormState(initialFormState);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => {
      let updated = { ...prev, [name]: value };
      // Atualiza prorrogaDate e processStartDate automaticamente se data de vencimento, tipo de licença ou ambos mudarem
      if (
        name === 'originalExpiryDate' ||
        name === 'licenseType'
      ) {
        const licenseTypeObj = licenseTypes.find(lt => lt.name === (name === 'licenseType' ? value : prev.licenseType));
        const expiryDate = name === 'originalExpiryDate' ? value : prev.originalExpiryDate;
        if (licenseTypeObj && expiryDate) {
          // Prazo para prorrogação
          const prorroga = new Date(expiryDate + 'T00:00:00');
          prorroga.setDate(prorroga.getDate() - (licenseTypeObj.renewalProtocolDays || 0));
          updated.prorrogaDate = !isNaN(prorroga.getTime()) ? prorroga.toISOString().slice(0, 10) : '';

          // Início do processo = Prazo para prorrogação - Prazo Início (dias)
          if (updated.prorrogaDate && licenseTypeObj.processStartDays) {
            const inicio = new Date(updated.prorrogaDate + 'T00:00:00');
            inicio.setDate(inicio.getDate() - (licenseTypeObj.processStartDays || 0));
            updated.processStartDate = !isNaN(inicio.getTime()) ? inicio.toISOString().slice(0, 10) : '';
          } else {
            updated.processStartDate = '';
          }
        } else {
          updated.prorrogaDate = '';
          updated.processStartDate = '';
        }
      }
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.unitId || !formState.licenseType) {
        alert('Por favor, selecione uma unidade e um tipo de licença.');
        return;
    }
    if (editingLicense) {
      onUpdateLicense({ ...formState, id: editingLicense.id });
    } else {
      onAddLicense(formState);
    }
    handleCancel();
  };

  const getBranchName = (branchId: string) => {
    return branches.find(b => b.id === branchId)?.name || 'Desconhecida';
  };
  
  const getDaysUntilExpiry = (expiryDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Handles date string from input which doesn't have timezone
    const expiry = new Date(expiryDate + 'T00:00:00');
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  function getValue(license: License, key: string) {
    if ([
      'issueDate',
      'originalExpiryDate',
      'prorrogaDate',
      'processStartDate'
    ].includes(key)) {
      return license[key as keyof License] ? new Date(license[key as keyof License] as string) : new Date(0);
    }
    if (key === 'alert') {
      // Criticidade: 0 = vencida, 1 = vence em X dias, 2 = ativa
      const daysUntil = getDaysUntilExpiry(license.originalExpiryDate);
      const licenseType = licenseTypes.find(lt => lt.name === license.licenseType);
      const renewalDays = licenseType ? licenseType.renewalProtocolDays : 180;
      if (daysUntil < 0) return 0;
      if (daysUntil <= renewalDays) return 1;
      return 2;
    }
    return (license[key as keyof License] || '').toString().toLowerCase();
  }

  // Correção 2: Tipagem explícita em map/filter
  // Exemplo de uso:
  // columns.filter((col: typeof columns[0]) => ...)
  // columns.map((col: typeof columns[0], idx: number) => ...)
  // sortedLicenses.map((license: License) => ...)
  //
  // Correção 3: Checagem de parentElement
  //
  // No trecho:
  // onMouseDown={e => {
  //   const startX = e.clientX;
  //   const startWidth = e.currentTarget.parentElement.offsetWidth;
  //   ...
  // }}
  //
  // Substituir por:
  function handleColResize(key: string, newWidth: number) {
    setColWidths((w: Record<string, number>) => ({ ...w, [key]: Math.max(80, newWidth) }));
  }

  // Ordenar filiais e tipos de licença alfabeticamente
  const sortedBranches = [...branches].sort((a, b) => a.name.localeCompare(b.name));
  const sortedLicenseTypes = [...licenseTypes].sort((a, b) => a.name.localeCompare(b.name));

  // Mostra apenas licenças ativas e filtradas
  const activeLicenses = licenses.filter(l => l.active);
  // Ajustar o filtro das licenças:
  const filteredLicenses = activeLicenses.filter(l =>
    (!filter.branchId || l.unitId === filter.branchId) &&
    (!filter.licenseType || l.licenseType === filter.licenseType) &&
    (!filter.onlyAlert || getValue(l, 'alert') !== 2)
  );
  const sortedLicenses = [...filteredLicenses].sort((a, b) => {
    const aValue = getValue(a, sortConfig.key);
    const bValue = getValue(b, sortConfig.key);
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getAlertBadge = (expiryDate: string, licenseTypeName: string) => {
    const daysUntil = getDaysUntilExpiry(expiryDate);
    const licenseType = licenseTypes.find(lt => lt.name === licenseTypeName);
    const renewalDays = licenseType ? licenseType.renewalProtocolDays : 180; // Fallback

    if (daysUntil < 0) {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
          Vencida há {Math.abs(daysUntil)} dia(s)
        </span>
      );
    }
    if (daysUntil <= renewalDays) {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Vence em {daysUntil} dia(s)
        </span>
      );
    }
    return (
      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
        Ativa
      </span>
    );
  };


  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
              {editingLicense ? 'Editar Licença' : 'Cadastro de Licenças'}
              <button type="button" onClick={() => setShowFilter(f => !f)} className="ml-2 p-2 rounded hover:bg-gray-100 transition">
                <FilterIcon />
              </button>
              <button type="button" onClick={() => setShowColumns(true)} className="ml-2 p-2 rounded hover:bg-gray-100 transition" title="Configurar colunas">
                <ColumnsIcon />
              </button>
            </h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowImport(true)} className="p-2 rounded hover:bg-gray-100 transition" title="Importar planilha">
                <ImportIcon />
              </button>
              <button
                onClick={isFormOpen ? handleCancel : handleAddNewClick}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-transform transform hover:scale-105"
              >
                {isFormOpen ? 'Fechar Formulário' : <><PlusIcon /> Nova Licença</>}
              </button>
            </div>
        </div>
        {showFilter && (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600 mb-1">Filtrar por Filial</label>
              <select value={filter.branchId} onChange={e => setFilter(f => ({ ...f, branchId: e.target.value }))} className="p-2 border border-gray-300 rounded">
                <option value="">Todas</option>
                {sortedBranches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600 mb-1">Filtrar por Tipo de Licença</label>
              <select value={filter.licenseType} onChange={e => setFilter(f => ({ ...f, licenseType: e.target.value }))} className="p-2 border border-gray-300 rounded">
                <option value="">Todas</option>
                {sortedLicenseTypes.map(lt => (
                  <option key={lt.id} value={lt.name}>{lt.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600 mb-1">&nbsp;</label>
              <label className="inline-flex items-center text-sm">
                <input type="checkbox" checked={filter.onlyAlert} onChange={e => setFilter(f => ({ ...f, onlyAlert: e.target.checked }))} className="mr-2" />
                Mostrar apenas licenças em alerta
              </label>
            </div>
            <button onClick={() => setFilter({ branchId: '', licenseType: '', onlyAlert: false })} className="mt-4 md:mt-6 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition">Limpar Filtros</button>
          </div>
        )}

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <div className="flex flex-col">
              <label htmlFor="unitId" className="mb-1 font-semibold text-gray-600">Unidade</label>
              <select name="unitId" id="unitId" value={formState.unitId} onChange={handleChange} required className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition">
                <option value="" disabled>Selecione uma Filial</option>
                {sortedBranches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
                <label htmlFor="licenseType" className="mb-1 font-semibold text-gray-600">Licença</label>
                <select name="licenseType" id="licenseType" value={formState.licenseType} onChange={handleChange} required className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition">
                    <option value="" disabled>Selecione o tipo</option>
                    {sortedLicenseTypes.map(lt => <option key={lt.id} value={lt.name}>{lt.name}</option>)}
                </select>
            </div>
            <div className="flex flex-col">
                <label htmlFor="numberYear" className="mb-1 font-semibold text-gray-600">Nº/Ano</label>
                <input type="text" name="numberYear" id="numberYear" value={formState.numberYear} onChange={handleChange} required className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
            </div>
            <div className="flex flex-col">
                <label htmlFor="description" className="mb-1 font-semibold text-gray-600">Descrição</label>
                <textarea name="description" id="description" value={formState.description} onChange={handleChange} rows={2} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"></textarea>
            </div>
            <div className="flex flex-col">
                <label htmlFor="licensingAgency" className="mb-1 font-semibold text-gray-600">Órgão Licenciador</label>
                <input type="text" name="licensingAgency" id="licensingAgency" value={formState.licensingAgency} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
            </div>
            <div className="flex flex-col">
                <label htmlFor="processNumber" className="mb-1 font-semibold text-gray-600">FCEI-Nº do Processo</label>
                <input type="text" name="processNumber" id="processNumber" value={formState.processNumber} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
            </div>
            <div className="flex flex-col">
                <label htmlFor="issueDate" className="mb-1 font-semibold text-gray-600">Data Emissão</label>
                <input type="date" name="issueDate" id="issueDate" value={formState.issueDate} onChange={handleChange} required className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
            </div>
            <div className="flex flex-col">
                <label htmlFor="originalExpiryDate" className="mb-1 font-semibold text-gray-600">Data Vencimento</label>
                <input type="date" name="originalExpiryDate" id="originalExpiryDate" value={formState.originalExpiryDate} onChange={handleChange} required className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
            </div>
            <div className="flex flex-col">
                <label htmlFor="prorrogaDate" className="mb-1 font-semibold text-gray-600">Prazo para Prorrogação</label>
                <input type="date" name="prorrogaDate" id="prorrogaDate" value={formState.prorrogaDate} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" readOnly />
            </div>
            <div className="flex flex-col">
                <label htmlFor="processStartDate" className="mb-1 font-semibold text-gray-600">Início do Processo</label>
                <input type="date" name="processStartDate" id="processStartDate" value={formState.processStartDate} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" readOnly />
            </div>
            <div className="flex items-center md:col-span-2">
              <input
                type="checkbox"
                id="active"
                name="active"
                checked={formState.active}
                onChange={e => setFormState(prev => ({ ...prev, active: e.target.checked, inactiveObservation: e.target.checked ? '' : prev.inactiveObservation }))}
                className="mr-2"
              />
              <label htmlFor="active" className="font-semibold text-gray-600">Licença Vigente</label>
            </div>
            {!formState.active && (
              <div className="md:col-span-2 flex flex-col">
                <label htmlFor="inactiveObservation" className="mb-1 font-semibold text-gray-600">Observação da Desativação</label>
                <textarea
                  name="inactiveObservation"
                  id="inactiveObservation"
                  value={formState.inactiveObservation}
                  onChange={handleChange}
                  rows={2}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                  required={!formState.active}
                ></textarea>
              </div>
            )}
            <div className="md:col-span-2 flex flex-col">
                <label htmlFor="observation" className="mb-1 font-semibold text-gray-600">Observação</label>
                <textarea name="observation" id="observation" value={formState.observation} onChange={handleChange} rows={2} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"></textarea>
            </div>
            <div className="md:col-span-2 flex justify-end gap-4">
              <button type="button" onClick={handleCancel} className="px-6 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors">
                  Cancelar
              </button>
              <button type="submit" className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors">
                {editingLicense ? 'Salvar Alterações' : 'Salvar Licença'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Licenças Registradas</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.filter((col: typeof columns[0]) => col.visible).map((col: typeof columns[0], idx: number) => (
                  <th
                    key={col.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none relative group"
                    style={{ width: colWidths[col.key] ? colWidths[col.key] + 'px' : undefined, minWidth: 80 }}
                    onClick={col.key && col.key !== 'alert' && col.key !== 'actions' ? () => handleSort(col.key) : undefined}
                  >
                    {col.label}
                    {col.key && sortConfig.key === col.key && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                    {/* Resizer */}
                    {col.key !== 'actions' && col.key !== 'alert' && (
                      <span
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize group-hover:bg-blue-200"
                        onMouseDown={e => {
                          const startX = e.clientX;
                          const parent = (e.currentTarget as HTMLElement).parentElement;
                          if (!parent) return;
                          const startWidth = parent.offsetWidth;
                          function onMove(ev: MouseEvent) {
                            handleColResize(String(col.key), startWidth + (ev.clientX - startX));
                          }
                          function onUp() {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                          }
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                        title="Arraste para redimensionar"
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedLicenses.map((license: License, idx: number) => (
                <tr key={license.id} className="hover:bg-gray-50 transition-colors">
                  {columns.filter((col: typeof columns[0]) => col.visible).map((col: typeof columns[0], colIdx: number) => {
                    switch (col.key) {
                      case 'unitId':
                        return <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getBranchName(license.unitId)}</td>;
                      case 'licenseType':
                        return <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.licenseType}</td>;
                      case 'numberYear':
                        return <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.numberYear}</td>;
                      case 'description':
                        return <td key={col.key} className="px-6 py-4 whitespace-normal text-sm text-gray-600 max-w-xs">{license.description}</td>;
                      case 'licensingAgency':
                        return <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.licensingAgency}</td>;
                      case 'processNumber':
                        return <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.processNumber}</td>;
                      case 'issueDate':
                        return <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.issueDate ? new Date(license.issueDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</td>;
                      case 'originalExpiryDate':
                        return <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.originalExpiryDate ? new Date(license.originalExpiryDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</td>;
                      case 'prorrogaDate':
                        return <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.prorrogaDate ? new Date(license.prorrogaDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</td>;
                      case 'processStartDate':
                        return <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.processStartDate ? new Date(license.processStartDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</td>;
                      case 'alert':
                        return <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm">{getAlertBadge(license.originalExpiryDate, license.licenseType)}</td>;
                      case 'observation':
                        return <td key={col.key} className="px-6 py-4 whitespace-normal text-sm text-gray-600 max-w-xs">{license.active ? license.observation : license.inactiveObservation}</td>;
                      case 'actions':
                        return <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm font-medium"><div className="flex items-center gap-2"><button onClick={() => handleEditClick(license)} className="text-blue-600 hover:text-blue-900 transition-colors"><PencilIcon /></button><button onClick={() => onDeleteLicense(license.id)} className="text-red-600 hover:text-red-900 transition-colors"><TrashIcon /></button></div></td>;
                      default:
                        return null;
                    }
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ImportLicensesModal
        open={showImport}
        onClose={() => setShowImport(false)}
        branches={branches}
        licenseTypes={licenseTypes}
        onAddBranch={onAddBranch}
        onImport={async (licenses) => {
          for (const lic of licenses) {
            await onAddLicense(lic);
          }
          setShowImport(false);
        }}
      />
      {showColumns && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={() => setShowColumns(false)}>&times;</button>
            <h3 className="text-lg font-bold mb-4">Configurar Colunas</h3>
            <div className="space-y-2">
              {columns.map((col: typeof columns[0], idx: number) => (
                <div key={col.key} className="flex items-center gap-2 cursor-move" draggable onDragStart={e => e.dataTransfer.setData('colIdx', String(idx))} onDrop={e => { e.preventDefault(); handleMoveColumn(Number(e.dataTransfer.getData('colIdx')), idx); }} onDragOver={e => e.preventDefault()}>
                  <input type="checkbox" checked={col.visible} onChange={() => handleToggleColumn(idx)} id={`col-${col.key}`} />
                  <label htmlFor={`col-${col.key}`}>{col.label}</label>
                  <span className="ml-auto text-gray-400">☰</span>
                </div>
              ))}
            </div>
            <button onClick={handleResetColumns} className="mt-4 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition">Restaurar padrão</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicenseManagement;