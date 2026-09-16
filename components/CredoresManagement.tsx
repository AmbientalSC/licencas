import React, { useState, useEffect } from 'react';
import type { Credor, CredorLicense, Status } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { CredorEditModal } from './CredorEditModal';

interface CredoresManagementProps {
  credores: Credor[];
  credorLicenses: CredorLicense[];
  onAddCredor: (credor: Omit<Credor, 'id'>) => Promise<string>;
  onUpdateCredor: (credor: Credor) => void;
  onDeleteCredor: (id: string) => void;
  onAddCredorLicense: (cl: Omit<CredorLicense, 'id'>) => void;
  onUpdateCredorLicense: (cl: CredorLicense) => void;
  onDeleteCredorLicense: (id: string) => void;
}

const CredoresManagement: React.FC<CredoresManagementProps> = ({
  credores,
  credorLicenses,
  onAddCredor,
  onUpdateCredor,
  onDeleteCredor,
  onAddCredorLicense,
  onUpdateCredorLicense,
  onDeleteCredorLicense,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredor, setEditingCredor] = useState<Credor | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const handleAddNewClick = () => {
    setEditingCredor(null);
    setIsModalOpen(true);
  };

  const handleRowClick = (credor: Credor) => {
    setEditingCredor(credor);
    setIsModalOpen(true);
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

  const sortedCredores = [...credores].sort((a, b) => {
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

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-700 dark:text-white">Credores Registrados</h2>
          <button
            onClick={handleAddNewClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-transform transform hover:scale-105"
          >
            <PlusIcon /> Novo Credor
          </button>
        </div>

        <div className="overflow-x-auto table-scrollbar" style={{ transform: 'rotateX(180deg)' }}>
          <table className="min-w-full bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700" style={{ transform: 'rotateX(180deg)' }}>
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {[
                  { label: 'Nome', key: 'name' },
                  { label: 'CNPJ', key: 'cnpj' },
                  { label: 'Endereço', key: 'address' },
                  { label: 'Cidade', key: 'city' },
                  { label: 'Estado', key: 'state' },
                  { label: 'Contato', key: 'contact' },
                  { label: 'Situação', key: 'status' },
                  { label: 'Licenças', key: '' },
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
              {sortedCredores.map(credor => {
                const licCount = credorLicenses.filter(cl => cl.credorId === credor.id).length;
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">{licCount} licença{licCount !== 1 ? 's' : ''}</span>
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
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    Nenhum credor cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CredorEditModal
        open={isModalOpen}
        onClose={handleCloseModal}
        credor={editingCredor}
        credorLicenses={credorLicenses}
        onAddCredor={onAddCredor}
        onUpdateCredor={onUpdateCredor}
        onAddCredorLicense={onAddCredorLicense}
        onUpdateCredorLicense={onUpdateCredorLicense}
        onDeleteCredorLicense={onDeleteCredorLicense}
      />
    </div>
  );
};

export default CredoresManagement;
