import React, { useState, useEffect } from 'react';
import type { LicenseType } from '../types';
import { Modal } from './Modal';

interface LicenseTypeFormModalProps {
  open: boolean;
  onClose: () => void;
  editingLicenseType: LicenseType | null;
  onSave: (data: Omit<LicenseType, 'id'>, id?: string) => void;
}

const initialFormState: Omit<LicenseType, 'id'> = {
  name: '',
  renewalProtocolDays: 0,
  processStartDays: 0,
};

export const LicenseTypeFormModal: React.FC<LicenseTypeFormModalProps> = ({
  open,
  onClose,
  editingLicenseType,
  onSave,
}) => {
  const [formState, setFormState] = useState<Omit<LicenseType, 'id'>>(initialFormState);

  useEffect(() => {
    if (!open) return;
    if (editingLicenseType) {
      const { id, ...data } = editingLicenseType;
      setFormState(data);
    } else {
      setFormState(initialFormState);
    }
  }, [open, editingLicenseType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formState, editingLicenseType?.id);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={editingLicenseType ? 'Editar Tipo de Licença' : 'Novo Tipo de Licença'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-700 dark:text-white">
            {editingLicenseType ? 'Editar Tipo de Licença' : 'Novo Tipo de Licença'}
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

        <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-1 gap-6">
          <div className="flex flex-col">
            <label htmlFor="name" className="mb-1 font-semibold text-gray-600 dark:text-gray-300">Tipo de Licença</label>
            <input type="text" id="name" name="name" value={formState.name} onChange={handleChange} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" required />
          </div>
          <div className="flex flex-col">
            <label htmlFor="renewalProtocolDays" className="mb-1 font-semibold text-gray-600 dark:text-gray-300">Prazo para Protocolo (dias)</label>
            <input type="number" id="renewalProtocolDays" name="renewalProtocolDays" value={formState.renewalProtocolDays} onChange={handleChange} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" required />
          </div>
          <div className="flex flex-col">
            <label htmlFor="processStartDays" className="mb-1 font-semibold text-gray-600 dark:text-gray-300">Prazo para Início (dias)</label>
            <input type="number" id="processStartDays" name="processStartDays" value={formState.processStartDays} onChange={handleChange} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" required />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-6 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors">
            {editingLicenseType ? 'Salvar Alterações' : 'Salvar Tipo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default LicenseTypeFormModal;
