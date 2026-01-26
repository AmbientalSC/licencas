import React, { useState, useEffect } from 'react';
import type { License, Branch, LicenseType, Attachment } from '../types';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';

interface LicenseDetailsModalProps {
  license: License | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (license: License) => void;
  branches: Branch[];
  licenseTypes: LicenseType[];
}

export const LicenseDetailsModal: React.FC<LicenseDetailsModalProps> = ({
  license,
  open,
  onClose,
  onUpdate,
  branches,
  licenseTypes,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'attachments'>('details');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<License | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [verifyingAttachments, setVerifyingAttachments] = useState(false);

  // Verificar e limpar anexos que foram deletados do Storage
  const verifyAndCleanAttachments = async (licenseToCheck: License) => {
    if (!licenseToCheck.attachments || licenseToCheck.attachments.length === 0) {
      return;
    }

    setVerifyingAttachments(true);
    try {
      const validAttachments: Attachment[] = [];

      // Verificar cada anexo
      for (const attachment of licenseToCheck.attachments) {
        try {
          if (attachment.storagePath) {
            // Tentar obter metadados do arquivo
            const fileRef = ref(storage, attachment.storagePath);
            await getMetadata(fileRef);
            // Se conseguiu, o arquivo existe
            validAttachments.push(attachment);
          } else {
            // Anexos antigos sem storagePath, manter na lista
            validAttachments.push(attachment);
          }
        } catch (error: any) {
          // Se der erro (arquivo não existe), não adiciona à lista
          console.log(`Arquivo deletado detectado: ${attachment.fileName}`);
        }
      }

      // Se tem anexos inválidos ou se houver fileUrl/fileName antigos, atualizar
      const hasValidAttachments = validAttachments.length > 0;
      const shouldCleanOldFields = licenseToCheck.fileUrl && validAttachments.length < licenseToCheck.attachments.length;
      
      if (validAttachments.length < licenseToCheck.attachments.length || shouldCleanOldFields) {
        const updatedLicense = {
          ...licenseToCheck,
          attachments: validAttachments,
          // Se temos anexos válidos, limpar os campos antigos
          ...(hasValidAttachments && { fileUrl: '', fileName: '' }),
        };
        setEditData(updatedLicense);
        // Salvar automaticamente no Firestore
        onUpdate(updatedLicense);
      }
    } catch (error) {
      console.error('Erro ao verificar anexos:', error);
    } finally {
      setVerifyingAttachments(false);
    }
  };

  // Sincronizar editData quando license muda (incluindo atualizações do backend)
  useEffect(() => {
    if (license && open) {
      setEditData(license);
      // Verificar se há anexos deletados quando abre o modal
      verifyAndCleanAttachments(license);
    }
  }, [license, open]);

  if (!open || !license) return null;

  const getBranchName = (branchId: string) => {
    return branches.find(b => b.id === branchId)?.name || 'Desconhecida';
  };

  const getDaysUntilExpiry = (expiryDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate + 'T00:00:00');
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (lic: License = license) => {
    if (!lic.active) {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
          Desativada
        </span>
      );
    }

    const daysUntil = getDaysUntilExpiry(lic.originalExpiryDate);
    const licenseType = licenseTypes.find(lt => lt.name === lic.licenseType);
    const renewalDays = licenseType ? (licenseType.renewalProtocolDays || 0) + (licenseType.processStartDays || 0) : 180;

    if (daysUntil < 0) {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
          Vencida há {Math.abs(daysUntil)} dia(s)
        </span>
      );
    }
    if (daysUntil <= renewalDays) {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Vence em {daysUntil} dia(s)
        </span>
      );
    }
    return (
      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
        Vigente
      </span>
    );
  };

  const handleEditChange = (field: keyof License, value: any) => {
    if (editData) {
      setEditData({
        ...editData,
        [field]: value,
      });
    }
  };

  const handleSaveChanges = () => {
    if (editData) {
      onUpdate(editData);
      setIsEditMode(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editData) {
      const file = e.target.files[0];
      setUploading(true);
      try {
        const storagePath = `licenses/${editData.id}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        const newAttachment: Attachment = {
          id: Date.now().toString(),
          fileName: file.name,
          fileUrl: downloadURL,
          uploadedAt: new Date().toISOString(),
          storagePath: storagePath,
        };

        const attachments = editData.attachments || [];
        setEditData({
          ...editData,
          attachments: [...attachments, newAttachment],
        });
      } catch (error) {
        console.error('Erro ao fazer upload do arquivo:', error);
        alert('Erro ao fazer upload do arquivo.');
      } finally {
        setUploading(false);
        // Reset input
        e.target.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    if (!editData || !window.confirm('Tem certeza que deseja excluir este anexo?')) {
      return;
    }

    setDeletingAttachmentId(attachment.id);
    try {
      // Tentar deletar do Storage se tiver o storagePath
      if (attachment.storagePath) {
        try {
          const fileRef = ref(storage, attachment.storagePath);
          await deleteObject(fileRef);
        } catch (storageError) {
          // Se não conseguir deletar do storage, continua mesmo assim
          console.warn('Arquivo já foi deletado ou não existe no Storage:', storageError);
        }
      }

      // Remover do array de anexos em qualquer caso
      const updatedAttachments = (editData.attachments || []).filter(a => a.id !== attachment.id);
      setEditData({
        ...editData,
        attachments: updatedAttachments,
      });
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      alert('Erro ao deletar o arquivo.');
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const displayData = editData || license;
  const attachments = (displayData?.attachments || []).filter((a): a is Attachment => a !== null && a !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {displayData.licenseType}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {displayData.numberYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                ✎ Editar
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200 dark:border-gray-700 flex gap-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            Detalhes
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'attachments'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            Anexos {attachments.length > 0 && `(${attachments.length})`}
            {verifyingAttachments && <span className="ml-1 animate-spin">↻</span>}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'details' ? (
            <div className="space-y-6">
              {/* Status and Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</h3>
                  <div className="mt-2">{getStatusBadge(displayData)}</div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoria</h3>
                  {isEditMode ? (
                    <select
                      value={displayData.category || 'Ambiental'}
                      onChange={(e) => handleEditChange('category', e.target.value as 'Ambiental' | 'SGA')}
                      className="mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="Ambiental">Ambiental</option>
                      <option value="SGA">SGA</option>
                    </select>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      {displayData.category || 'Ambiental'}
                    </p>
                  )}
                </div>
              </div>

              {/* Unidade and Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unidade/Filial</h3>
                  {isEditMode ? (
                    <select
                      value={displayData.unitId}
                      onChange={(e) => handleEditChange('unitId', e.target.value)}
                      className="mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-full"
                    >
                      <option value="">Selecione uma unidade</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      {getBranchName(displayData.unitId)}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo de Licença</h3>
                  {isEditMode ? (
                    <select
                      value={displayData.licenseType}
                      onChange={(e) => handleEditChange('licenseType', e.target.value)}
                      className="mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-full"
                    >
                      <option value="">Selecione um tipo</option>
                      {licenseTypes.map(lt => (
                        <option key={lt.id} value={lt.name}>{lt.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      {displayData.licenseType}
                    </p>
                  )}
                </div>
              </div>

              {/* Nº/Ano */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nº/Ano</h3>
                {isEditMode ? (
                  <input
                    type="text"
                    value={displayData.numberYear}
                    onChange={(e) => handleEditChange('numberYear', e.target.value)}
                    className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                ) : (
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {displayData.numberYear}
                  </p>
                )}
              </div>

              {/* Descrição */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descrição</h3>
                {isEditMode ? (
                  <textarea
                    value={displayData.description}
                    onChange={(e) => handleEditChange('description', e.target.value)}
                    rows={3}
                    className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-900 dark:text-white">
                    {displayData.description || '-'}
                  </p>
                )}
              </div>

              {/* Órgão Licenciador and Responsável */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Órgão Licenciador</h3>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={displayData.licensingAgency}
                      onChange={(e) => handleEditChange('licensingAgency', e.target.value)}
                      className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-gray-900 dark:text-white">
                      {displayData.licensingAgency || '-'}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Responsável</h3>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={displayData.responsible || ''}
                      onChange={(e) => handleEditChange('responsible', e.target.value)}
                      className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-gray-900 dark:text-white">
                      {displayData.responsible || '-'}
                    </p>
                  )}
                </div>
              </div>

              {/* Número do Processo */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nº do Processo (FCEI)</h3>
                {isEditMode ? (
                  <input
                    type="text"
                    value={displayData.processNumber}
                    onChange={(e) => handleEditChange('processNumber', e.target.value)}
                    className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-900 dark:text-white">
                    {displayData.processNumber || '-'}
                  </p>
                )}
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data de Emissão</h3>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={displayData.issueDate}
                      onChange={(e) => handleEditChange('issueDate', e.target.value)}
                      className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-gray-900 dark:text-white">
                      {displayData.issueDate
                        ? new Date(displayData.issueDate + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '-'}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data de Vencimento</h3>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={displayData.originalExpiryDate}
                      onChange={(e) => handleEditChange('originalExpiryDate', e.target.value)}
                      className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-gray-900 dark:text-white">
                      {displayData.originalExpiryDate
                        ? new Date(displayData.originalExpiryDate + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '-'}
                    </p>
                  )}
                </div>
              </div>

              {/* Prorrogação e Processo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prazo Prorrogação</h3>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={displayData.prorrogaDate}
                      onChange={(e) => handleEditChange('prorrogaDate', e.target.value)}
                      className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-gray-900 dark:text-white">
                      {displayData.prorrogaDate
                        ? new Date(displayData.prorrogaDate + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '-'}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Início do Processo</h3>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={displayData.processStartDate}
                      onChange={(e) => handleEditChange('processStartDate', e.target.value)}
                      className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-gray-900 dark:text-white">
                      {displayData.processStartDate
                        ? new Date(displayData.processStartDate + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '-'}
                    </p>
                  )}
                </div>
              </div>

              {/* Status de Ativação */}
              {isEditMode && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                  <input
                    type="checkbox"
                    id="active"
                    checked={displayData.active}
                    onChange={(e) => handleEditChange('active', e.target.checked)}
                    className="accent-blue-600"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-gray-900 dark:text-white">
                    Licença Vigente
                  </label>
                </div>
              )}

              {/* Observação */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observação</h3>
                {isEditMode ? (
                  <textarea
                    value={displayData.observation}
                    onChange={(e) => handleEditChange('observation', e.target.value)}
                    rows={2}
                    className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-900 dark:text-white">
                    {displayData.observation || '-'}
                  </p>
                )}
              </div>

              {/* Observação da Desativação */}
              {!displayData.active && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Motivo da Desativação</h3>
                  {isEditMode ? (
                    <textarea
                      value={displayData.inactiveObservation || ''}
                      onChange={(e) => handleEditChange('inactiveObservation', e.target.value)}
                      rows={2}
                      className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-gray-900 dark:text-white">
                      {displayData.inactiveObservation || '-'}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Attachments Tab */
            <div className="space-y-4">
              {isEditMode && (
                <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                  <label className="cursor-pointer block">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {uploading ? 'Enviando...' : 'Clique para adicionar anexo'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ou arraste um arquivo aqui
                      </span>
                    </div>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="text-2xl flex-shrink-0">📄</div>
                        <div className="min-w-0">
                          <a
                            href={attachment.fileUrl}
                            download={attachment.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                          >
                            {attachment.fileName}
                          </a>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(attachment.uploadedAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <a
                          href={attachment.fileUrl}
                          download={attachment.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                          title="Baixar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                        {isEditMode && (
                          <button
                            onClick={() => handleDeleteAttachment(attachment)}
                            disabled={deletingAttachmentId === attachment.id}
                            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900 transition-colors disabled:opacity-50"
                            title="Excluir"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Nenhum arquivo anexado a esta licença
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={() => {
                  setIsEditMode(false);
                  setEditData(license);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Salvar Alterações
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LicenseDetailsModal;
