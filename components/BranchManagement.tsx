import React, { useState } from 'react';
import type { Branch, Status } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';

interface BranchManagementProps {
  branches: Branch[];
  onAddBranch: (branch: Omit<Branch, 'id'>) => void;
  onUpdateBranch: (branch: Branch) => void;
  onDeleteBranch: (id: string) => void;
}

const initialFormState: Omit<Branch, 'id'> = {
  name: '',
  cnpj: '',
  address: '',
  city: '',
  state: '',
  contact: '',
  status: 'Ativa',
};

const BranchManagement: React.FC<BranchManagementProps> = ({ branches, onAddBranch, onUpdateBranch, onDeleteBranch }) => {
  const [formState, setFormState] = useState<Omit<Branch, 'id'>>(initialFormState);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const handleAddNewClick = () => {
    setEditingBranch(null);
    setFormState(initialFormState);
    setIsFormOpen(true);
  };

  const handleEditClick = (branch: Branch) => {
    setEditingBranch(branch);
    const { id, ...branchData } = branch;
    setFormState(branchData);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingBranch(null);
    setFormState(initialFormState);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name) {
      alert('Por favor, preencha o nome da filial.');
      return;
    }
    if (editingBranch) {
      onUpdateBranch({ ...formState, id: editingBranch.id });
    } else {
      onAddBranch(formState);
    }
    handleCancel();
  };

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
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-700">{editingBranch ? 'Editar Filial' : 'Cadastro de Filiais'}</h2>
          <button
            onClick={isFormOpen ? handleCancel : handleAddNewClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-transform transform hover:scale-105"
          >
            {isFormOpen ? 'Fechar Formulário' : <><PlusIcon /> Nova Filial</>}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <div className="flex flex-col">
              <label htmlFor="name" className="mb-1 font-semibold text-gray-600">Nome da Filial</label>
              <input type="text" id="name" name="name" value={formState.name} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" required />
            </div>
            <div className="flex flex-col">
              <label htmlFor="cnpj" className="mb-1 font-semibold text-gray-600">CNPJ</label>
              <input type="text" id="cnpj" name="cnpj" value={formState.cnpj} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
            </div>
            <div className="flex flex-col">
              <label htmlFor="address" className="mb-1 font-semibold text-gray-600">Endereço</label>
              <input type="text" id="address" name="address" value={formState.address} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
            </div>
            <div className="flex flex-col">
              <label htmlFor="city" className="mb-1 font-semibold text-gray-600">Cidade</label>
              <input type="text" id="city" name="city" value={formState.city} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
            </div>
            <div className="flex flex-col">
              <label htmlFor="state" className="mb-1 font-semibold text-gray-600">Estado</label>
              <input type="text" id="state" name="state" value={formState.state} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
            </div>
            <div className="flex flex-col">
              <label htmlFor="contact" className="mb-1 font-semibold text-gray-600">Contato</label>
              <input type="text" id="contact" name="contact" value={formState.contact} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
            </div>
            <div className="flex flex-col">
              <label htmlFor="status" className="mb-1 font-semibold text-gray-600">Situação</label>
              <select name="status" id="status" value={formState.status} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition">
                <option value="Ativa">Ativa</option>
                <option value="Vencida">Vencida</option>
                <option value="Em Renovação">Em Renovação</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-4">
              <button type="button" onClick={handleCancel} className="px-6 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors">
                {editingBranch ? 'Salvar Alterações' : 'Salvar Filial'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Filiais Registradas</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white divide-y divide-gray-200">
            <thead className="bg-gray-50">
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
              {sortedBranches.map(branch => (
                <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{branch.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{branch.cnpj}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{branch.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{branch.city}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{branch.state}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{branch.contact}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(branch.status)}`}>{branch.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditClick(branch)} className="text-blue-600 hover:text-blue-900 transition-colors"><PencilIcon /></button>
                      <button onClick={() => onDeleteBranch(branch.id)} className="text-red-600 hover:text-red-900 transition-colors"><TrashIcon /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BranchManagement; 