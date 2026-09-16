import React, { useState, useEffect } from 'react';
import type { License, Branch, LicenseType } from '../types';
import { PencilIcon } from './icons/PencilIcon';
import { FilterIcon } from './icons/FilterIcon';
import { LicenseDetailsModal } from './LicenseDetailsModal';

interface DeactivatedLicensesProps {
  licenses: License[];
  branches: Branch[];
  licenseTypes: LicenseType[];
  onUpdateLicense: (license: License) => void;
}

const DeactivatedLicenses: React.FC<DeactivatedLicensesProps> = ({ licenses, branches, licenseTypes, onUpdateLicense }) => {
  const [selectedLicenseForModal, setSelectedLicenseForModal] = useState<License | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'originalExpiryDate', direction: 'asc' });
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState<{ branchId: string; licenseType: string }>({ branchId: '', licenseType: '' });

  const getBranchName = (branchId: string) => {
    return branches.find(b => b.id === branchId)?.name || 'Desconhecida';
  };

  const handleRowClick = (license: License) => {
    setSelectedLicenseForModal(license);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLicenseForModal(null);
  };

  // Sincronizar o modal quando as licenças são recarregadas; fecha se a licença
  // saiu desta lista (ex.: foi reativada dentro do próprio modal). Só atualiza a
  // referência quando o conteúdo de fato mudou, para não disparar a reverificação
  // de anexos do LicenseDetailsModal a cada snapshot não relacionado do Firestore.
  useEffect(() => {
    if (selectedLicenseForModal && isModalOpen) {
      const updatedLicense = licenses.find(l => l.id === selectedLicenseForModal.id);
      if (!updatedLicense) {
        setIsModalOpen(false);
        setSelectedLicenseForModal(null);
      } else if (JSON.stringify(updatedLicense) !== JSON.stringify(selectedLicenseForModal)) {
        setSelectedLicenseForModal(updatedLicense);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenses, isModalOpen]);

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
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-700 dark:text-white mb-4 flex items-center gap-2">
          Licenças Desativadas
          <button type="button" onClick={() => setShowFilter(f => !f)} className="ml-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <FilterIcon />
          </button>
        </h2>
        {showFilter && (
          <div className="mb-4 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Filtrar por Filial</label>
              <select value={filter.branchId} onChange={e => setFilter(f => ({ ...f, branchId: e.target.value }))} className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                <option value="">Todas</option>
                {sortedBranches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Filtrar por Tipo de Licença</label>
              <select value={filter.licenseType} onChange={e => setFilter(f => ({ ...f, licenseType: e.target.value }))} className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                <option value="">Todas</option>
                {sortedLicenseTypes.map(lt => (
                  <option key={lt.id} value={lt.name}>{lt.name}</option>
                ))}
              </select>
            </div>
            <button onClick={() => setFilter({ branchId: '', licenseType: '' })} className="mt-4 md:mt-6 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition">Limpar Filtros</button>
          </div>
        )}
        <div className="overflow-x-auto table-scrollbar" style={{ transform: 'rotateX(180deg)' }}>
          <table className="min-w-full bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700" style={{ transform: 'rotateX(180deg)' }}>
            <thead className="bg-gray-50 dark:bg-gray-700">
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
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
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedLicenses.map(license => (
                <tr
                  key={license.id}
                  onClick={() => handleRowClick(license)}
                  className="bg-white dark:bg-gray-800 transition-all duration-200 ease-out hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{getBranchName(license.unitId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{license.licenseType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{license.numberYear}</td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-600 dark:text-gray-300 max-w-xs">{license.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{license.licensingAgency}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{license.processNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{license.issueDate ? new Date(license.issueDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{license.originalExpiryDate ? new Date(license.originalExpiryDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{license.prorrogaDate ? new Date(license.prorrogaDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{license.processStartDate ? new Date(license.processStartDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-red-600 dark:text-red-400 max-w-xs">{license.inactiveObservation}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleRowClick(license)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"><PencilIcon /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <LicenseDetailsModal
        license={selectedLicenseForModal}
        open={isModalOpen}
        onClose={handleCloseModal}
        onUpdate={onUpdateLicense}
        branches={branches}
        licenseTypes={licenseTypes}
      />
    </div>
  );
};

export default DeactivatedLicenses;
