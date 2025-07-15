import React, { useState } from 'react';
import type { License, Branch, LicenseType } from '../types';
import { PencilIcon } from './icons/PencilIcon';
import { FilterIcon } from './icons/FilterIcon';

interface DeactivatedLicensesProps {
  licenses: License[];
  branches: Branch[];
  licenseTypes: LicenseType[];
  onUpdateLicense: (license: License) => void;
}

const DeactivatedLicenses: React.FC<DeactivatedLicensesProps> = ({ licenses, branches, licenseTypes, onUpdateLicense }) => {
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [formState, setFormState] = useState<License | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'originalExpiryDate', direction: 'asc' });
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState<{ branchId: string; licenseType: string }>({ branchId: '', licenseType: '' });
  
  const getBranchName = (branchId: string) => {
    return branches.find(b => b.id === branchId)?.name || 'Desconhecida';
  };

  const handleEditClick = (license: License) => {
    setEditingLicense(license);
    setFormState(license);
  };

  const handleCancel = () => {
    setEditingLicense(null);
    setFormState(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target;
    setFormState(prev => prev ? { ...prev, [name]: type === 'checkbox' ? checked : value } : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formState) {
      onUpdateLicense(formState);
      handleCancel();
    }
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
    return (license[key as keyof License] || '').toString().toLowerCase();
  }

  // Ordenar filiais e tipos de licença alfabeticamente
  const sortedBranches = [...branches].sort((a, b) => a.name.localeCompare(b.name));
  const sortedLicenseTypes = [...licenseTypes].sort((a, b) => a.name.localeCompare(b.name));

  // Filtrar licenças desativadas
  const filteredLicenses = licenses.filter(l =>
    (!filter.branchId || l.unitId === filter.branchId) &&
    (!filter.licenseType || l.licenseType === filter.licenseType)
  );
  const sortedLicenses = [...filteredLicenses].sort((a, b) => {
    const aValue = getValue(a, sortConfig.key);
    const bValue = getValue(b, sortConfig.key);
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          Licenças Desativadas
          <button type="button" onClick={() => setShowFilter(f => !f)} className="ml-2 p-2 rounded hover:bg-gray-100 transition">
            <FilterIcon />
          </button>
        </h2>
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
            <button onClick={() => setFilter({ branchId: '', licenseType: '' })} className="mt-4 md:mt-6 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition">Limpar Filtros</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { label: 'Unidade', key: 'unitId' },
                  { label: 'Licença', key: 'licenseType' },
                  { label: 'Nº/Ano', key: 'numberYear' },
                  { label: 'Descrição', key: 'description' },
                  { label: 'Órgão Licenciador', key: 'licensingAgency' },
                  { label: 'FCEI-Nº do Processo', key: 'processNumber' },
                  { label: 'Data Emissão', key: 'issueDate' },
                  { label: 'Data Vencimento', key: 'originalExpiryDate' },
                  { label: 'Prazo Prorrogação', key: 'prorrogaDate' },
                  { label: 'Início Processo', key: 'processStartDate' },
                  { label: 'Observação da Desativação', key: 'inactiveObservation' },
                  { label: 'Ações', key: '' },
                ].map(col => (
                  <th
                    key={col.label}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={col.key ? () => handleSort(col.key) : undefined}
                  >
                    {col.label}
                    {col.key && sortConfig.key === col.key && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedLicenses.map(license => (
                <tr key={license.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getBranchName(license.unitId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.licenseType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.numberYear}</td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-600 max-w-xs">{license.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.licensingAgency}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.processNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.issueDate ? new Date(license.issueDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.originalExpiryDate ? new Date(license.originalExpiryDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.prorrogaDate ? new Date(license.prorrogaDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{license.processStartDate ? new Date(license.processStartDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-red-600 max-w-xs">{license.inactiveObservation}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEditClick(license)} className="text-blue-600 hover:text-blue-900 transition-colors"><PencilIcon /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editingLicense && formState && (
        <div className="bg-white p-6 rounded-xl shadow-lg mt-6">
          <h3 className="text-xl font-bold text-gray-700 mb-4">Editar Licença Desativada</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <div className="flex flex-col">
              <label htmlFor="inactiveObservation" className="mb-1 font-semibold text-gray-600">Observação da Desativação</label>
              <textarea
                name="inactiveObservation"
                id="inactiveObservation"
                value={formState.inactiveObservation || ''}
                onChange={handleChange}
                rows={2}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                required
              ></textarea>
            </div>
            <div className="flex items-center md:col-span-2">
              <input
                type="checkbox"
                id="active"
                name="active"
                checked={formState.active}
                onChange={handleChange}
                className="mr-2"
              />
              <label htmlFor="active" className="font-semibold text-gray-600">Reativar Licença</label>
            </div>
            <div className="md:col-span-2 flex justify-end gap-4">
              <button type="button" onClick={handleCancel} className="px-6 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors">
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DeactivatedLicenses; 