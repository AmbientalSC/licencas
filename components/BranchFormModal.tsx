import React, { useState, useEffect } from 'react';
import type { Branch } from '../types';
import { Modal } from './Modal';

interface BranchFormModalProps {
  open: boolean;
  onClose: () => void;
  editingBranch: Branch | null;
  onSave: (data: Omit<Branch, 'id'>, id?: string) => void;
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

export const BranchFormModal: React.FC<BranchFormModalProps> = ({
  open,
  onClose,
  editingBranch,
  onSave,
}) => {
  const [formState, setFormState] = useState<Omit<Branch, 'id'>>(initialFormState);

  useEffect(() => {
    if (!open) return;
    if (editingBranch) {
      const { id, ...data } = editingBranch;
      setFormState(data);
    } else {
      setFormState(initialFormState);
    }
  }, [open, editingBranch]);

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
    onSave(formState, editingBranch?.id);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={editingBranch ? 'Editar Filial' : 'Nova Filial'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-700 dark:text-white">
            {editingBranch ? 'Editar Filial' : 'Nova Filial'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label htmlFor="name" className="mb-1 font-semibold text-gray-600 dark:text-gray-300">Nome da Filial</label>
            <input type="text" id="name" name="name" value={formState.name} onChange={handleChange} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" required />
          </div>
          <div className="flex flex-col">
            <label htmlFor="cnpj" className="mb-1 font-semibold text-gray-600 dark:text-gray-300">CNPJ</label>
            <input type="text" id="cnpj" name="cnpj" value={formState.cnpj} onChange={handleChange} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="address" className="mb-1 font-semibold text-gray-600 dark:text-gray-300">Endereço</label>
            <input type="text" id="address" name="address" value={formState.address} onChange={handleChange} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="city" className="mb-1 font-semibold text-gray-600 dark:text-gray-300">Cidade</label>
            <input type="text" id="city" name="city" value={formState.city} onChange={handleChange} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="state" className="mb-1 font-semibold text-gray-600 dark:text-gray-300">Estado</label>
            <input type="text" id="state" name="state" value={formState.state} onChange={handleChange} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="contact" className="mb-1 font-semibold text-gray-600 dark:text-gray-300">Contato</label>
            <input type="text" id="contact" name="contact" value={formState.contact} onChange={handleChange} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="status" className="mb-1 font-semibold text-gray-600 dark:text-gray-300">Situação</label>
            <select name="status" id="status" value={formState.status} onChange={handleChange} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition">
              <option value="Ativa">Ativa</option>
              <option value="Vencida">Vencida</option>
              <option value="Em Renovação">Em Renovação</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-6 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors">
            {editingBranch ? 'Salvar Alterações' : 'Salvar Filial'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BranchFormModal;
