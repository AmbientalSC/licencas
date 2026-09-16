import React, { useState, useEffect } from 'react';
import type { Branch, Status } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { BranchFormModal } from './BranchFormModal';

interface BranchManagementProps {
  branches: Branch[];
  onAddBranch: (branch: Omit<Branch, 'id'>) => void;
  onUpdateBranch: (branch: Branch) => void;
  onDeleteBranch: (id: string) => void;
}

const BranchManagement: React.FC<BranchManagementProps> = ({ branches, onAddBranch, onUpdateBranch, onDeleteBranch }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const handleAddNewClick = () => {
    setEditingBranch(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (branch: Branch) => {
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
  };

  const handleSave = (data: Omit<Branch, 'id'>, id?: string) => {
    if (id) {
      onUpdateBranch({ ...data, id });
    } else {
      onAddBranch(data);
    }
    handleCloseModal();
  };

  // Fecha o modal se a filial em edição for removida por outra sessão enquanto aberto.
  useEffect(() => {
    if (editingBranch && isModalOpen) {
      const updated = branches.find(b => b.id === editingBranch.id);
      if (!updated) {
        setIsModalOpen(false);
        setEditingBranch(null);
      }
    }
  }, [branches, isModalOpen, editingBranch]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  function getValue(branch: Branch, key: string) {
    return (branch[key as keyof Branch] || '').toString().toLowerCase();
  }

  const sortedBranches = [...branches].sort((a, b) => {
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
          <h2 className="text-2xl font-bold text-gray-700 dark:text-white">Filiais Registradas</h2>
          <button
            onClick={handleAddNewClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-transform transform hover:scale-105"
          >
            <PlusIcon /> Nova Filial
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
              {sortedBranches.map(branch => (
                <tr
                  key={branch.id}
                  onClick={() => handleEditClick(branch)}
                  className="bg-white dark:bg-gray-800 transition-all duration-200 ease-out hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{branch.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{branch.cnpj}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{branch.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{branch.city}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{branch.state}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{branch.contact}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(branch.status)}`}>{branch.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditClick(branch)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"><PencilIcon /></button>
                      <button onClick={() => onDeleteBranch(branch.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"><TrashIcon /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BranchFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        editingBranch={editingBranch}
        onSave={handleSave}
      />
    </div>
  );
};

export default BranchManagement;
