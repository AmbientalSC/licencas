import React, { useState, useEffect, useMemo } from 'react';
import type { Credor, CredorLicense, Attachment, Status } from '../types';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Modal } from './Modal';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';

interface CredorEditModalProps {
  open: boolean;
  onClose: () => void;
  credor: Credor | null;
  credorLicenses: CredorLicense[];
  onAddCredor: (credor: Omit<Credor, 'id'>) => Promise<string>;
  onUpdateCredor: (credor: Credor) => void;
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

const initialLicenseFormState = {
  tipo: '',
  numero: '',
  dataVencimento: '',
  observacao: '',
};

type PendingLicense = Omit<CredorLicense, 'id' | 'credorId'>;

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export const CredorEditModal: React.FC<CredorEditModalProps> = ({
  open,
  onClose,
  credor,
  credorLicenses,
  onAddCredor,
  onUpdateCredor,
  onAddCredorLicense,
  onUpdateCredorLicense,
  onDeleteCredorLicense,
}) => {
  const [activeTab, setActiveTab] = useState<'dados' | 'licencas'>('dados');
  const [formState, setFormState] = useState<Omit<Credor, 'id'>>(initialCredorState);
  const [formAttachments, setFormAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [licenseForm, setLicenseForm] = useState(initialLicenseFormState);
  const [pendingLicenses, setPendingLicenses] = useState<PendingLicense[]>([]);
  const [editingDetailLicense, setEditingDetailLicense] = useState<CredorLicense | null>(null);

  useEffect(() => {
    if (!open) return;
    setActiveTab('dados');
    setLicenseForm(initialLicenseFormState);
    setPendingLicenses([]);
    setEditingDetailLicense(null);
    if (credor) {
      const { id, attachments, ...data } = credor;
      setFormState(data);
      setFormAttachments(attachments || []);
    } else {
      setFormState(initialCredorState);
      setFormAttachments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, credor?.id]);

  const credorLicensesForModal = useMemo(() => {
    if (!credor) return [];
    return credorLicenses.filter(cl => cl.credorId === credor.id);
  }, [credor, credorLicenses]);

  const guardedClose = () => {
    if (uploading || saving) return;
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleLicenseFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLicenseForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setUploading(true);
    try {
      const credorId = credor ? credor.id : 'novo';
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

  const handleAddOrQueueLicense = () => {
    if (!licenseForm.tipo || !licenseForm.numero || !licenseForm.dataVencimento) {
      alert('Preencha tipo, número e data de vencimento da licença.');
      return;
    }
    if (credor) {
      onAddCredorLicense({ ...licenseForm, credorId: credor.id });
    } else {
      setPendingLicenses(prev => [...prev, { ...licenseForm }]);
    }
    setLicenseForm(initialLicenseFormState);
  };

  const removePendingLicense = (index: number) => {
    setPendingLicenses(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditDetailLicenseClick = (cl: CredorLicense) => {
    setEditingDetailLicense(cl);
    setLicenseForm({
      tipo: cl.tipo,
      numero: cl.numero,
      dataVencimento: cl.dataVencimento,
      observacao: cl.observacao,
    });
  };

  const handleSaveDetailLicense = () => {
    if (!editingDetailLicense) return;
    onUpdateCredorLicense({ ...editingDetailLicense, ...licenseForm });
    setEditingDetailLicense(null);
    setLicenseForm(initialLicenseFormState);
  };

  const handleCancelDetailEdit = () => {
    setEditingDetailLicense(null);
    setLicenseForm(initialLicenseFormState);
  };

  const handleSave = async () => {
    if (!formState.name) {
      alert('Por favor, preencha o nome do credor.');
      setActiveTab('dados');
      return;
    }
    setSaving(true);
    try {
      if (credor) {
        onUpdateCredor({ ...formState, id: credor.id, attachments: formAttachments });
      } else {
        const newCredorId = await onAddCredor({ ...formState, attachments: formAttachments });
        pendingLicenses.forEach(lic => onAddCredorLicense({ ...lic, credorId: newCredorId }));
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

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
    <Modal
      open={open}
      onClose={guardedClose}
      maxWidthClassName="max-w-3xl"
      ariaLabel={credor ? 'Editar Credor' : 'Novo Credor'}
    >
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-700 dark:text-white">
          {credor ? 'Editar Credor' : 'Novo Credor'}
        </h2>
        <button
          onClick={guardedClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6 border-b border-gray-200 dark:border-gray-700 flex gap-4">
        <button
          onClick={() => setActiveTab('dados')}
          className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'dados'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          Dados
        </button>
        <button
          onClick={() => setActiveTab('licencas')}
          className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'licencas'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          Licenças/Anexos
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === 'dados' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              {credor && (
                <span className={`mt-2 self-start px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(formState.status)}`}>
                  Situação atual: {formState.status}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-gray-600 dark:text-gray-300">
                  {editingDetailLicense ? 'Editar Licença' : 'Licenças do Credor'}
                </p>
                {credor && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Alterações aqui são salvas imediatamente
                  </span>
                )}
              </div>

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

              <div className="flex gap-2 mb-4">
                {editingDetailLicense ? (
                  <>
                    <button type="button" onClick={handleSaveDetailLicense} className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors">Salvar</button>
                    <button type="button" onClick={handleCancelDetailEdit} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors">Cancelar</button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddOrQueueLicense}
                    disabled={!licenseForm.tipo || !licenseForm.numero || !licenseForm.dataVencimento}
                    className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <PlusIcon /> Adicionar Licença
                  </button>
                )}
              </div>

              {credor ? (
                credorLicensesForModal.length > 0 ? (
                  <div className="space-y-2">
                    {credorLicensesForModal.map(cl => {
                      const isVencida = cl.dataVencimento && new Date(cl.dataVencimento) < new Date();
                      return (
                        <div key={cl.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-200">{cl.tipo}</span>
                            <span className="text-gray-500 dark:text-gray-400">{cl.numero}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${isVencida ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              Venc: {formatDate(cl.dataVencimento)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => handleEditDetailLicenseClick(cl)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"><PencilIcon /></button>
                            <button type="button" onClick={() => onDeleteCredorLicense(cl.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"><TrashIcon /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-6">Nenhuma licença cadastrada para este credor.</p>
                )
              ) : (
                pendingLicenses.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Licenças a cadastrar:</p>
                    <div className="space-y-2">
                      {pendingLicenses.map((lic, index) => (
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
                )
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
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
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
        <button type="button" onClick={guardedClose} disabled={saving} className="px-6 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50">
          Cancelar
        </button>
        <button type="button" onClick={handleSave} disabled={uploading || saving} className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50">
          {saving ? 'Salvando...' : credor ? 'Salvar Alterações' : 'Salvar Credor'}
        </button>
      </div>
    </Modal>
  );
};

export default CredorEditModal;
