import React, { useState, useMemo } from 'react';
import type { Credor, CredorLicense, Attachment, Status } from '../types';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';

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

const initialCredorState: Omit<Credor, 'id'> = {
  name: '',
  cnpj: '',
  address: '',
  city: '',
  state: '',
  contact: '',
  status: 'Ativa',
};

const initialLicenseState = {
  tipo: '',
  numero: '',
  dataVencimento: '',
  observacao: '',
};

type PendingLicense = Omit<CredorLicense, 'id' | 'credorId'>;

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
  const [formState, setFormState] = useState<Omit<Credor, 'id'>>(initialCredorState);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCredor, setEditingCredor] = useState<Credor | null>(null);
  const [selectedCredorId, setSelectedCredorId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const [licenseForm, setLicenseForm] = useState(initialLicenseState);
  const [pendingFormLicenses, setPendingFormLicenses] = useState<PendingLicense[]>([]);
  const [removedExistingLicenses, setRemovedExistingLicenses] = useState<string[]>([]);

  const [detailLicenseForm, setDetailLicenseForm] = useState(initialLicenseState);
  const [editingDetailLicense, setEditingDetailLicense] = useState<CredorLicense | null>(null);

  const [uploading, setUploading] = useState(false);
  const [formAttachments, setFormAttachments] = useState<Attachment[]>([]);

  const resetAll = () => {
    setIsFormOpen(false);
    setEditingCredor(null);
    setFormState(initialCredorState);
    setLicenseForm(initialLicenseState);
    setPendingFormLicenses([]);
    setRemovedExistingLicenses([]);
    setEditingDetailLicense(null);
    setDetailLicenseForm(initialLicenseState);
    setFormAttachments([]);
  };

  const selectedCredor = useMemo(() => {
    return credores.find(c => c.id === selectedCredorId) || null;
  }, [credores, selectedCredorId]);

  const selectedCredorLicenses = useMemo(() => {
    if (!selectedCredorId) return [];
    return credorLicenses.filter(cl => cl.credorId === selectedCredorId);
  }, [selectedCredorId, credorLicenses]);

  const existingCredorLicenses = useMemo(() => {
    if (!editingCredor) return [];
    return credorLicenses.filter(cl => cl.credorId === editingCredor.id && !removedExistingLicenses.includes(cl.id));
  }, [editingCredor, credorLicenses, removedExistingLicenses]);

  const handleAddNewClick = () => {
    setEditingCredor(null);
    setFormState(initialCredorState);
    setLicenseForm(initialLicenseState);
    setPendingFormLicenses([]);
    setRemovedExistingLicenses([]);
    setFormAttachments([]);
    setIsFormOpen(true);
  };

  const handleEditClick = (credor: Credor) => {
    setEditingCredor(credor);
    const { id, attachments, ...credorData } = credor;
    setFormState(credorData);
    setLicenseForm(initialLicenseState);
    setPendingFormLicenses([]);
    setRemovedExistingLicenses([]);
    setFormAttachments(attachments || []);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    resetAll();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleLicenseFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLicenseForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDetailLicenseFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDetailLicenseForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setUploading(true);
    try {
      const credorId = editingCredor ? editingCredor.id : 'novo';
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const storagePath = `credores/${credorId}/${Date.now()}_${file.name}`;
          const storageRef = ref(storage, storagePath);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          return {
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            fileName: file.name,
            fileUrl: downloadURL,
            uploadedAt: new Date().toISOString(),
            storagePath,
          } as Attachment;
        })
      );
      setFormAttachments(prev => [...prev, ...uploaded]);
    } catch (error) {
      console.error('Erro ao fazer upload dos arquivos:', error);
      alert('Erro ao fazer upload de um ou mais arquivos.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    setFormAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const addPendingLicense = () => {
    if (!licenseForm.tipo || !licenseForm.numero || !licenseForm.dataVencimento) {
      alert('Preencha tipo, número e data de vencimento da licença.');
      return;
    }
    setPendingFormLicenses(prev => [...prev, { ...licenseForm }]);
    setLicenseForm(initialLicenseState);
  };

  const removePendingLicense = (index: number) => {
    setPendingFormLicenses(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingLicense = (id: string) => {
    setRemovedExistingLicenses(prev => [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name) {
      alert('Por favor, preencha o nome do credor.');
      return;
    }
    if (editingCredor) {
      onUpdateCredor({ ...formState, id: editingCredor.id, attachments: formAttachments });
      removedExistingLicenses.forEach(id => onDeleteCredorLicense(id));
      pendingFormLicenses.forEach(lic => {
        onAddCredorLicense({ ...lic, credorId: editingCredor.id });
      });
    } else {
      const newCredorId = await onAddCredor({ ...formState, attachments: formAttachments });
      pendingFormLicenses.forEach(lic => {
        onAddCredorLicense({ ...lic, credorId: newCredorId });
      });
    }
    resetAll();
  };

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

  const handleSelectCredor = (credorId: string) => {
    if (selectedCredorId === credorId) {
      setSelectedCredorId(null);
    } else {
      setSelectedCredorId(credorId);
      setEditingDetailLicense(null);
      setDetailLicenseForm(initialLicenseState);
    }
  };

  const handleDeleteCredor = (id: string) => {
    if (selectedCredorId === id) {
      setSelectedCredorId(null);
    }
    onDeleteCredor(id);
  };

  const handleAddDetailLicense = () => {
    if (!selectedCredorId) return;
    if (!detailLicenseForm.tipo || !detailLicenseForm.numero || !detailLicenseForm.dataVencimento) {
      alert('Preencha tipo, número e data de vencimento da licença.');
      return;
    }
    onAddCredorLicense({ ...detailLicenseForm, credorId: selectedCredorId });
    setDetailLicenseForm(initialLicenseState);
  };

  const handleEditDetailLicense = (cl: CredorLicense) => {
    setEditingDetailLicense(cl);
    setDetailLicenseForm({
      tipo: cl.tipo,
      numero: cl.numero,
      dataVencimento: cl.dataVencimento,
      observacao: cl.observacao,
    });
  };

  const handleSaveDetailLicense = () => {
    if (!editingDetailLicense) return;
    onUpdateCredorLicense({
      ...editingDetailLicense,
      tipo: detailLicenseForm.tipo,
      numero: detailLicenseForm.numero,
      dataVencimento: detailLicenseForm.dataVencimento,
      observacao: detailLicenseForm.observacao,
    });
    setEditingDetailLicense(null);
    setDetailLicenseForm(initialLicenseState);
  };

  const handleCancelDetailEdit = () => {
    setEditingDetailLicense(null);
    setDetailLicenseForm(initialLicenseState);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-700 dark:text-white">{editingCredor ? 'Editar Credor' : 'Cadastro de Credores'}</h2>
          <button
            onClick={isFormOpen ? handleCancel : handleAddNewClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-transform transform hover:scale-105"
          >
            {isFormOpen ? 'Fechar Formulário' : <><PlusIcon /> Novo Credor</>}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <div className="flex flex-col">
              <label htmlFor="name" className="mb-1 font-semibold text-gray-600 dark:text-gray-300">Nome</label>
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

            <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="font-semibold text-gray-600 dark:text-gray-300 mb-3">Anexos</p>
              <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                <label className="cursor-pointer block">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {uploading ? 'Enviando...' : 'Clique para adicionar anexos'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Selecione um ou mais arquivos
                    </span>
                  </div>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {formAttachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="text-lg flex-shrink-0">📄</div>
                        <div className="min-w-0">
                          <a
                            href={att.fileUrl}
                            download={att.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                          >
                            {att.fileName}
                          </a>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(att.uploadedAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors flex-shrink-0"
                        title="Remover anexo"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="font-semibold text-gray-600 dark:text-gray-300 mb-3">Licenças do Credor</p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div className="flex flex-col">
                  <label htmlFor="licTipo" className="mb-1 font-semibold text-gray-600 dark:text-gray-300 text-sm">Tipo</label>
                  <input type="text" id="licTipo" name="tipo" value={licenseForm.tipo} onChange={handleLicenseFormChange} placeholder="Ex: Licença de Operação" className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="licNumero" className="mb-1 font-semibold text-gray-600 dark:text-gray-300 text-sm">Número</label>
                  <input type="text" id="licNumero" name="numero" value={licenseForm.numero} onChange={handleLicenseFormChange} placeholder="Ex: 12345/2024" className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="licVencimento" className="mb-1 font-semibold text-gray-600 dark:text-gray-300 text-sm">Vencimento</label>
                  <input type="date" id="licVencimento" name="dataVencimento" value={licenseForm.dataVencimento} onChange={handleLicenseFormChange} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="licObs" className="mb-1 font-semibold text-gray-600 dark:text-gray-300 text-sm">Observação</label>
                  <input type="text" id="licObs" name="observacao" value={licenseForm.observacao} onChange={handleLicenseFormChange} placeholder="Observação" className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
                </div>
              </div>
              <button
                type="button"
                onClick={addPendingLicense}
                disabled={!licenseForm.tipo || !licenseForm.numero || !licenseForm.dataVencimento}
                className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 mb-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PlusIcon /> Adicionar Licença
              </button>

              {editingCredor && existingCredorLicenses.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Licenças já cadastradas:</p>
                  <div className="space-y-2">
                    {existingCredorLicenses.map(cl => (
                      <div key={cl.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-200">{cl.tipo}</span>
                          <span className="text-gray-500 dark:text-gray-400">{cl.numero}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${new Date(cl.dataVencimento) < new Date() ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            Venc: {formatDate(cl.dataVencimento)}
                          </span>
                        </div>
                        <button type="button" onClick={() => removeExistingLicense(cl.id)} className="text-red-500 hover:text-red-700 transition-colors"><TrashIcon /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingFormLicenses.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    {editingCredor ? 'Novas licenças a adicionar:' : 'Licenças a cadastrar:'}
                  </p>
                  <div className="space-y-2">
                    {pendingFormLicenses.map((lic, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-200">{lic.tipo}</span>
                          <span className="text-gray-500 dark:text-gray-400">{lic.numero}</span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
                            Venc: {formatDate(lic.dataVencimento)}
                          </span>
                        </div>
                        <button type="button" onClick={() => removePendingLicense(index)} className="text-red-500 hover:text-red-700 transition-colors"><TrashIcon /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex justify-end gap-4">
              <button type="button" onClick={handleCancel} className="px-6 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors">
                {editingCredor ? 'Salvar Alterações' : 'Salvar Credor'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-700 dark:text-white mb-4">Credores Registrados</h2>
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
                    className={`bg-white dark:bg-gray-800 transition-all duration-200 ease-out hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 dark:hover:bg-gray-700 cursor-pointer ${selectedCredorId === credor.id ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    onClick={() => handleSelectCredor(credor.id)}
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
                        <button onClick={() => handleEditClick(credor)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"><PencilIcon /></button>
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

      {selectedCredor && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg animate-fade-in">
          <h2 className="text-2xl font-bold text-gray-700 dark:text-white mb-4">
            Licenças de {selectedCredor.name}
          </h2>

          {selectedCredor.attachments && selectedCredor.attachments.length > 0 && (
            <div className="mb-6 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <p className="font-semibold text-gray-600 dark:text-gray-300 mb-3">Anexos do Credor</p>
              <div className="space-y-2">
                {selectedCredor.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-lg flex-shrink-0">📄</div>
                      <div className="min-w-0">
                        <a
                          href={att.fileUrl}
                          download={att.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                        >
                          {att.fileName}
                        </a>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {new Date(att.uploadedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <a
                      href={att.fileUrl}
                      download={att.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors flex-shrink-0"
                      title="Baixar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
            <p className="font-semibold text-gray-600 dark:text-gray-300 mb-3">
              {editingDetailLicense ? 'Editar Licença' : 'Nova Licença'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <div className="flex flex-col">
                <label htmlFor="detailTipo" className="mb-1 font-semibold text-gray-600 dark:text-gray-300 text-sm">Tipo</label>
                <input type="text" id="detailTipo" name="tipo" value={detailLicenseForm.tipo} onChange={handleDetailLicenseFormChange} placeholder="Ex: Licença de Operação" className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
              </div>
              <div className="flex flex-col">
                <label htmlFor="detailNumero" className="mb-1 font-semibold text-gray-600 dark:text-gray-300 text-sm">Número</label>
                <input type="text" id="detailNumero" name="numero" value={detailLicenseForm.numero} onChange={handleDetailLicenseFormChange} placeholder="Ex: 12345/2024" className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
              </div>
              <div className="flex flex-col">
                <label htmlFor="detailVencimento" className="mb-1 font-semibold text-gray-600 dark:text-gray-300 text-sm">Vencimento</label>
                <input type="date" id="detailVencimento" name="dataVencimento" value={detailLicenseForm.dataVencimento} onChange={handleDetailLicenseFormChange} className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
              </div>
              <div className="flex flex-col">
                <label htmlFor="detailObs" className="mb-1 font-semibold text-gray-600 dark:text-gray-300 text-sm">Observação</label>
                <input type="text" id="detailObs" name="observacao" value={detailLicenseForm.observacao} onChange={handleDetailLicenseFormChange} placeholder="Observação" className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
              </div>
            </div>
            <div className="flex gap-2">
              {editingDetailLicense ? (
                <>
                  <button onClick={handleSaveDetailLicense} className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors">Salvar</button>
                  <button onClick={handleCancelDetailEdit} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors">Cancelar</button>
                </>
              ) : (
                <button onClick={handleAddDetailLicense} className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                  <PlusIcon /> Adicionar Licença
                </button>
              )}
            </div>
          </div>

          {selectedCredorLicenses.length > 0 && (
            <div className="overflow-x-auto table-scrollbar" style={{ transform: 'rotateX(180deg)' }}>
              <table className="min-w-full bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700" style={{ transform: 'rotateX(180deg)' }}>
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Número</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vencimento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observação</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedCredorLicenses.map(cl => {
                    const isVencida = cl.dataVencimento && new Date(cl.dataVencimento) < new Date();
                    return (
                      <tr key={cl.id} className="bg-white dark:bg-gray-800 transition-all duration-200 ease-out hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{cl.tipo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{cl.numero}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isVencida ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {formatDate(cl.dataVencimento)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{cl.observacao || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditDetailLicense(cl)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"><PencilIcon /></button>
                            <button onClick={() => onDeleteCredorLicense(cl.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"><TrashIcon /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedCredorLicenses.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-center py-6">Nenhuma licença cadastrada para este credor.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CredoresManagement;
