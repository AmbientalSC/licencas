import React, { useState, useEffect, useMemo } from 'react';
import type { Credor, CredorLicense, CredorEvaluation, Status } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { CredorEditModal } from './CredorEditModal';

interface CredoresManagementProps {
  credores: Credor[];
  credorLicenses: CredorLicense[];
  credorEvaluations: CredorEvaluation[];
  onAddCredor: (credor: Omit<Credor, 'id'>) => Promise<string>;
  onUpdateCredor: (credor: Credor) => void;
  onDeleteCredor: (id: string) => void;
  onAddCredorLicense: (cl: Omit<CredorLicense, 'id'>) => void;
  onUpdateCredorLicense: (cl: CredorLicense) => void;
  onDeleteCredorLicense: (id: string) => void;
  onAddCredorEvaluation: (evaluation: Omit<CredorEvaluation, 'id'>) => void;
  onDeleteCredorEvaluation: (id: string) => void;
}

type LicenseColumnKey = 'credorName' | 'tipo' | 'numero' | 'dataVencimento' | 'observacao';

const licenseColumns: { label: string; key: LicenseColumnKey }[] = [
  { label: 'Credor', key: 'credorName' },
  { label: 'Tipo', key: 'tipo' },
  { label: 'Número', key: 'numero' },
  { label: 'Vencimento', key: 'dataVencimento' },
  { label: 'Observação', key: 'observacao' },
];

const initialLicenseColumnFilters: Record<LicenseColumnKey, string> = {
  credorName: '',
  tipo: '',
  numero: '',
  dataVencimento: '',
  observacao: '',
};

type CredorFilterKey = 'name' | 'cnpj' | 'address' | 'city' | 'state' | 'contact' | 'status' | 'serviceTypes';

const credorColumns: { label: string; sortKey: string; filterKey?: CredorFilterKey }[] = [
  { label: 'Nome', sortKey: 'name', filterKey: 'name' },
  { label: 'CNPJ', sortKey: 'cnpj', filterKey: 'cnpj' },
  { label: 'Endereço', sortKey: 'address', filterKey: 'address' },
  { label: 'Cidade', sortKey: 'city', filterKey: 'city' },
  { label: 'Estado', sortKey: 'state', filterKey: 'state' },
  { label: 'Contato', sortKey: 'contact', filterKey: 'contact' },
  { label: 'Situação', sortKey: 'status', filterKey: 'status' },
  { label: 'Serviços', sortKey: '', filterKey: 'serviceTypes' },
  { label: 'Licenças', sortKey: '' },
  { label: 'Avaliação', sortKey: '' },
  { label: 'Ações', sortKey: '' },
];

const initialCredorColumnFilters: Record<CredorFilterKey, string> = {
  name: '',
  cnpj: '',
  address: '',
  city: '',
  state: '',
  contact: '',
  status: '',
  serviceTypes: '',
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const CredoresManagement: React.FC<CredoresManagementProps> = ({
  credores,
  credorLicenses,
  credorEvaluations,
  onAddCredor,
  onUpdateCredor,
  onDeleteCredor,
  onAddCredorLicense,
  onUpdateCredorLicense,
  onDeleteCredorLicense,
  onAddCredorEvaluation,
  onDeleteCredorEvaluation,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'credores' | 'licencas'>('credores');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredor, setEditingCredor] = useState<Credor | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const [credorColumnFilters, setCredorColumnFilters] = useState<Record<CredorFilterKey, string>>(initialCredorColumnFilters);

  const [licenseSortConfig, setLicenseSortConfig] = useState<{ key: LicenseColumnKey; direction: 'asc' | 'desc' }>({ key: 'dataVencimento', direction: 'asc' });
  const [licenseColumnFilters, setLicenseColumnFilters] = useState<Record<LicenseColumnKey, string>>(initialLicenseColumnFilters);

  const handleAddNewClick = () => {
    setEditingCredor(null);
    setIsModalOpen(true);
  };

  const handleRowClick = (credor: Credor) => {
    setEditingCredor(credor);
    setIsModalOpen(true);
  };

  const handleLicenseRowClick = (credorId: string) => {
    const credor = credores.find(c => c.id === credorId);
    if (credor) {
      handleRowClick(credor);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCredor(null);
  };

  const handleDeleteCredor = (id: string) => {
    onDeleteCredor(id);
  };

  // Fecha o modal se o credor em edição for removido por outra sessão enquanto aberto,
  // e mantém a referência atualizada para refletir mudanças (ex.: novas licenças).
  useEffect(() => {
    if (editingCredor && isModalOpen) {
      const updated = credores.find(c => c.id === editingCredor.id);
      if (updated) {
        setEditingCredor(updated);
      } else {
        setIsModalOpen(false);
        setEditingCredor(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credores, isModalOpen]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  function getValue(credor: Credor, key: string) {
    return (credor[key as keyof Credor] || '').toString().toLowerCase();
  }

  const handleCredorFilterChange = (key: CredorFilterKey, value: string) => {
    setCredorColumnFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredCredores = credores.filter(credor => {
    return (Object.keys(credorColumnFilters) as CredorFilterKey[]).every(key => {
      const filterValue = credorColumnFilters[key].trim().toLowerCase();
      if (!filterValue) return true;
      if (key === 'serviceTypes') {
        return (credor.serviceTypes || []).some(st => st.toLowerCase().includes(filterValue));
      }
      return (credor[key] || '').toString().toLowerCase().includes(filterValue);
    });
  });

  const sortedCredores = [...filteredCredores].sort((a, b) => {
    const aValue = getValue(a, sortConfig.key);
    const bValue = getValue(b, sortConfig.key);
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case 'Ativa':
        return 'bg-green-100 text-green-800';
      case 'Vencida':
        return 'bg-red-100 text-red-800';
      case 'Em Renovação':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEvaluationSummary = (credorId: string) => {
    const evaluations = credorEvaluations.filter(ev => ev.credorId === credorId);
    if (evaluations.length === 0) return null;
    const avg = evaluations.reduce((sum, ev) => sum + ev.nota, 0) / evaluations.length;
    return { avg, count: evaluations.length };
  };

  const credorLicensesWithCredorName = useMemo(() => {
    return credorLicenses.map(cl => ({
      ...cl,
      credorName: credores.find(c => c.id === cl.credorId)?.name || 'Credor não identificado',
    }));
  }, [credorLicenses, credores]);

  const handleLicenseSort = (key: LicenseColumnKey) => {
    setLicenseSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleLicenseFilterChange = (key: LicenseColumnKey, value: string) => {
    setLicenseColumnFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredCredorLicenses = credorLicensesWithCredorName.filter(cl => {
    return licenseColumns.every(col => {
      const filterValue = licenseColumnFilters[col.key].trim().toLowerCase();
      if (!filterValue) return true;
      if (col.key === 'dataVencimento') {
        return formatDate(cl.dataVencimento).toLowerCase().includes(filterValue);
      }
      return (cl[col.key] || '').toString().toLowerCase().includes(filterValue);
    });
  });

  function getLicenseSortValue(cl: typeof credorLicensesWithCredorName[number], key: LicenseColumnKey) {
    if (key === 'dataVencimento') {
      return cl.dataVencimento ? new Date(cl.dataVencimento).getTime() : 0;
    }
    return (cl[key] || '').toString().toLowerCase();
  }

  const sortedCredorLicenses = [...filteredCredorLicenses].sort((a, b) => {
    const aValue = getLicenseSortValue(a, licenseSortConfig.key);
    const bValue = getLicenseSortValue(b, licenseSortConfig.key);
    if (aValue < bValue) return licenseSortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return licenseSortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-700 dark:text-white">
            {activeMainTab === 'credores' ? 'Credores Registrados' : 'Licenças de Credores'}
          </h2>
          {activeMainTab === 'credores' && (
            <button
              onClick={handleAddNewClick}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-transform transform hover:scale-105"
            >
              <PlusIcon /> Novo Credor
            </button>
          )}
        </div>

        <div className="mb-4 border-b border-gray-200 dark:border-gray-700 flex gap-4">
          <button
            onClick={() => setActiveMainTab('credores')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeMainTab === 'credores'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            Credores Registrados
          </button>
          <button
            onClick={() => setActiveMainTab('licencas')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeMainTab === 'licencas'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            Licenças de Credores
          </button>
        </div>

        {activeMainTab === 'credores' ? (
          <div className="overflow-x-auto table-scrollbar" style={{ transform: 'rotateX(180deg)' }}>
            <table className="min-w-full bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700" style={{ transform: 'rotateX(180deg)' }}>
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {credorColumns.map(col => (
                    <th
                      key={col.label}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
                      onClick={col.sortKey ? () => handleSort(col.sortKey) : undefined}
                    >
                      {col.label}
                      {col.sortKey && sortConfig.key === col.sortKey && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                  ))}
                </tr>
                <tr>
                  {credorColumns.map(col => (
                    <th key={col.label} className="px-6 py-2 bg-gray-50 dark:bg-gray-700">
                      {col.filterKey && (
                        <input
                          type="text"
                          value={credorColumnFilters[col.filterKey]}
                          onChange={e => handleCredorFilterChange(col.filterKey!, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          placeholder={`Pesquisar ${col.label.toLowerCase()}...`}
                          className="w-full p-1.5 text-xs font-normal normal-case border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedCredores.map(credor => {
                  const licCount = credorLicenses.filter(cl => cl.credorId === credor.id).length;
                  const evaluationSummary = getEvaluationSummary(credor.id);
                  return (
                    <tr
                      key={credor.id}
                      className="bg-white dark:bg-gray-800 transition-all duration-200 ease-out hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => handleRowClick(credor)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{credor.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{credor.cnpj}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{credor.address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{credor.city}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{credor.state}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{credor.contact}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(credor.status)}`}>{credor.status}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-normal text-sm max-w-xs">
                        {credor.serviceTypes && credor.serviceTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {credor.serviceTypes.map((serviceType, index) => (
                              <span key={index} className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                                {serviceType}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">{licCount} licença{licCount !== 1 ? 's' : ''}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {evaluationSummary ? (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
                            ★ {evaluationSummary.avg.toFixed(1)} ({evaluationSummary.count})
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">Sem avaliação</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleRowClick(credor)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"><PencilIcon /></button>
                          <button onClick={() => handleDeleteCredor(credor.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sortedCredores.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                      Nenhum credor cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto table-scrollbar" style={{ transform: 'rotateX(180deg)' }}>
            <table className="min-w-full bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700" style={{ transform: 'rotateX(180deg)' }}>
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {licenseColumns.map(col => (
                    <th
                      key={col.key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleLicenseSort(col.key)}
                    >
                      {col.label}
                      {licenseSortConfig.key === col.key && (
                        <span className="ml-1">{licenseSortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                  ))}
                </tr>
                <tr>
                  {licenseColumns.map(col => (
                    <th key={col.key} className="px-6 py-2 bg-gray-50 dark:bg-gray-700">
                      <input
                        type="text"
                        value={licenseColumnFilters[col.key]}
                        onChange={e => handleLicenseFilterChange(col.key, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        placeholder={`Pesquisar ${col.label.toLowerCase()}...`}
                        className="w-full p-1.5 text-xs font-normal normal-case border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedCredorLicenses.map(cl => {
                  const isVencida = cl.dataVencimento && new Date(cl.dataVencimento) < new Date();
                  return (
                    <tr
                      key={cl.id}
                      onClick={() => handleLicenseRowClick(cl.credorId)}
                      className="bg-white dark:bg-gray-800 transition-all duration-200 ease-out hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{cl.credorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{cl.tipo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{cl.numero}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isVencida ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {formatDate(cl.dataVencimento)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-600 dark:text-gray-300 max-w-xs">{cl.observacao || '-'}</td>
                    </tr>
                  );
                })}
                {sortedCredorLicenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                      Nenhuma licença encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CredorEditModal
        open={isModalOpen}
        onClose={handleCloseModal}
        credor={editingCredor}
        credorLicenses={credorLicenses}
        credorEvaluations={credorEvaluations}
        onAddCredor={onAddCredor}
        onUpdateCredor={onUpdateCredor}
        onAddCredorLicense={onAddCredorLicense}
        onUpdateCredorLicense={onUpdateCredorLicense}
        onDeleteCredorLicense={onDeleteCredorLicense}
        onAddCredorEvaluation={onAddCredorEvaluation}
        onDeleteCredorEvaluation={onDeleteCredorEvaluation}
      />
    </div>
  );
};

export default CredoresManagement;
