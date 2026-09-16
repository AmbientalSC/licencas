
import React, { useState, useEffect } from 'react';
import type { LicenseType } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { LicenseTypeFormModal } from './LicenseTypeFormModal';

interface LicenseTypeManagementProps {
  licenseTypes: LicenseType[];
  onAddLicenseType: (licenseType: Omit<LicenseType, 'id'>) => void;
  onUpdateLicenseType: (licenseType: LicenseType) => void;
  onDeleteLicenseType: (id: string) => void;
}

const LicenseTypeManagement: React.FC<LicenseTypeManagementProps> = ({ licenseTypes, onAddLicenseType, onUpdateLicenseType, onDeleteLicenseType }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLicenseType, setEditingLicenseType] = useState<LicenseType | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const handleAddNewClick = () => {
    setEditingLicenseType(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (licenseType: LicenseType) => {
    setEditingLicenseType(licenseType);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLicenseType(null);
  };

  const handleSave = (data: Omit<LicenseType, 'id'>, id?: string) => {
    if (id) {
      onUpdateLicenseType({ ...data, id });
    } else {
      onAddLicenseType(data);
    }
    handleCloseModal();
  };

  // Fecha o modal se o tipo em edição for removido por outra sessão enquanto aberto.
  useEffect(() => {
    if (editingLicenseType && isModalOpen) {
      const updated = licenseTypes.find(lt => lt.id === editingLicenseType.id);
      if (!updated) {
        setIsModalOpen(false);
        setEditingLicenseType(null);
      }
    }
  }, [licenseTypes, isModalOpen, editingLicenseType]);

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
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-700 dark:text-white">Tipos de Licença Registrados</h2>
            <button
              onClick={handleAddNewClick}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-transform transform hover:scale-105"
            >
              <PlusIcon /> Novo Tipo de Licença
            </button>
        </div>

        <div className="overflow-x-auto table-scrollbar" style={{ transform: 'rotateX(180deg)' }}>
          <table className="min-w-full bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700" style={{ transform: 'rotateX(180deg)' }}>
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {[
                  { label: 'Tipo de Licença', key: 'name' },
                  { label: 'Prazo Protocolo (dias)', key: 'renewalProtocolDays' },
                  { label: 'Prazo Início (dias)', key: 'processStartDays' },
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
              {sortedLicenseTypes.map(lt => (
                <tr
                  key={lt.id}
                  onClick={() => handleEditClick(lt)}
                  className="bg-white dark:bg-gray-800 transition-all duration-200 ease-out hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{lt.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{lt.renewalProtocolDays}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{lt.processStartDays}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleEditClick(lt)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"><PencilIcon /></button>
                        <button onClick={() => onDeleteLicenseType(lt.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"><TrashIcon /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LicenseTypeFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        editingLicenseType={editingLicenseType}
        onSave={handleSave}
      />
    </div>
  );
};

export default LicenseTypeManagement;
