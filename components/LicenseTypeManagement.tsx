
import React, { useState } from 'react';
import type { LicenseType } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';

interface LicenseTypeManagementProps {
  licenseTypes: LicenseType[];
  onAddLicenseType: (licenseType: Omit<LicenseType, 'id'>) => void;
  onUpdateLicenseType: (licenseType: LicenseType) => void;
  onDeleteLicenseType: (id: string) => void;
}

const initialFormState: Omit<LicenseType, 'id'> = {
  name: '',
  renewalProtocolDays: 0,
  processStartDays: 0,
};

const LicenseTypeManagement: React.FC<LicenseTypeManagementProps> = ({ licenseTypes, onAddLicenseType, onUpdateLicenseType, onDeleteLicenseType }) => {
  const [formState, setFormState] = useState<Omit<LicenseType, 'id'>>(initialFormState);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLicenseType, setEditingLicenseType] = useState<LicenseType | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const handleAddNewClick = () => {
    setEditingLicenseType(null);
    setFormState(initialFormState);
    setIsFormOpen(true);
  };

  const handleEditClick = (licenseType: LicenseType) => {
    setEditingLicenseType(licenseType);
    const { id, ...data } = licenseType;
    setFormState(data);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingLicenseType(null);
    setFormState(initialFormState);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: e.target.type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLicenseType) {
      onUpdateLicenseType({ ...formState, id: editingLicenseType.id });
    } else {
      onAddLicenseType(formState);
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

  function getValue(licenseType: LicenseType, key: string) {
    return (licenseType[key as keyof LicenseType] || '').toString().toLowerCase();
  }

  const sortedLicenseTypes = [...licenseTypes].sort((a, b) => {
    const aValue = getValue(a, sortConfig.key);
    const bValue = getValue(b, sortConfig.key);
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-700">{editingLicenseType ? 'Editar Tipo de Licença' : 'Cadastro de Tipos de Licença'}</h2>
            <button
              onClick={isFormOpen ? handleCancel : handleAddNewClick}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-transform transform hover:scale-105"
            >
              {isFormOpen ? 'Fechar Formulário' : <><PlusIcon /> Novo Tipo de Licença</>}
            </button>
        </div>

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            <div className="flex flex-col">
              <label htmlFor="name" className="mb-1 font-semibold text-gray-600">Tipo de Licença</label>
              <input type="text" id="name" name="name" value={formState.name} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" required />
            </div>
            <div className="flex flex-col">
              <label htmlFor="renewalProtocolDays" className="mb-1 font-semibold text-gray-600">Prazo para Protocolo (dias)</label>
              <input type="number" id="renewalProtocolDays" name="renewalProtocolDays" value={formState.renewalProtocolDays} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" required />
            </div>
            <div className="flex flex-col">
              <label htmlFor="processStartDays" className="mb-1 font-semibold text-gray-600">Prazo para Início (dias)</label>
              <input type="number" id="processStartDays" name="processStartDays" value={formState.processStartDays} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" required />
            </div>
            
             <div className="md:col-span-3 flex justify-end gap-4">
                <button type="button" onClick={handleCancel} className="px-6 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors">
                    Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors">
                    {editingLicenseType ? 'Salvar Alterações' : 'Salvar Tipo'}
                </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Tipos de Licença Registrados</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { label: 'Tipo de Licença', key: 'name' },
                  { label: 'Prazo Protocolo (dias)', key: 'renewalProtocolDays' },
                  { label: 'Prazo Início (dias)', key: 'processStartDays' },
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
              {sortedLicenseTypes.map(lt => (
                <tr key={lt.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lt.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lt.renewalProtocolDays}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lt.processStartDays}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleEditClick(lt)} className="text-blue-600 hover:text-blue-900 transition-colors"><PencilIcon /></button>
                        <button onClick={() => onDeleteLicenseType(lt.id)} className="text-red-600 hover:text-red-900 transition-colors"><TrashIcon /></button>
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

export default LicenseTypeManagement;