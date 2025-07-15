import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { Branch, LicenseType, License } from '../types';

interface ImportLicensesModalProps {
  open: boolean;
  onClose: () => void;
  branches: Branch[];
  licenseTypes: LicenseType[];
  onAddBranch: (branch: Omit<Branch, 'id'>) => Promise<string> | string;
  onImport: (licenses: Omit<License, 'id'>[]) => Promise<void>;
}

const TEMPLATE_HEADERS = [
  'Unidade',
  'Licença',
  'Nº-Ano',
  'Descrição',
  'Órgão licenciador',
  'FCEI-Nº do processo',
  'Data emissão',
  'Vencimento',
  'Observação',
];

export const ImportLicensesModal: React.FC<ImportLicensesModalProps> = ({ open, onClose, branches, licenseTypes, onAddBranch, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Licenças');
    XLSX.writeFile(wb, 'modelo_licencas.xlsx');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMessage(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!rows.length || rows[0].length < TEMPLATE_HEADERS.length) {
        setMessage('Arquivo inválido ou colunas insuficientes.');
        setImporting(false);
        return;
      }
      const headers = rows[0].map((h: string) => h.trim());
      if (JSON.stringify(headers) !== JSON.stringify(TEMPLATE_HEADERS)) {
        setMessage('As colunas do arquivo não correspondem ao modelo.');
        setImporting(false);
        return;
      }
      const dataRows = rows.slice(1).filter(row => row.some(cell => cell));
      // Cadastro automático de filiais se necessário
      const branchMap: Record<string, string> = {};
      for (const row of dataRows) {
        const branchName = row[0]?.trim();
        if (!branchName) continue;
        let branch = branches.find(b => b.name.trim().toLowerCase() === branchName.toLowerCase());
        if (!branch && !branchMap[branchName]) {
          // Cadastrar filial com campos default
          const newBranch = {
            name: branchName,
            cnpj: '',
            address: '',
            city: '',
            state: '',
            contact: '',
            status: 'Ativa',
          };
          const id = await onAddBranch(newBranch);
          branchMap[branchName] = typeof id === 'string' ? id : '';
        } else if (branch) {
          branchMap[branchName] = branch.id;
        }
      }
      const licenses: Omit<License, 'id'>[] = dataRows.map((row) => {
        const licenseTypeObj = licenseTypes.find(lt => lt.name === row[1]);
        const expiryDate = excelDateToISO(row[7]);
        let prorrogaDate = '';
        let processStartDate = '';
        if (licenseTypeObj && expiryDate) {
          // Prazo para prorrogação
          const prorroga = new Date(expiryDate + 'T00:00:00');
          prorroga.setDate(prorroga.getDate() - (licenseTypeObj.renewalProtocolDays || 0));
          prorrogaDate = !isNaN(prorroga.getTime()) ? prorroga.toISOString().slice(0, 10) : '';
          // Início do processo
          if (prorrogaDate && licenseTypeObj.processStartDays) {
            const inicio = new Date(prorrogaDate + 'T00:00:00');
            inicio.setDate(inicio.getDate() - (licenseTypeObj.processStartDays || 0));
            processStartDate = !isNaN(inicio.getTime()) ? inicio.toISOString().slice(0, 10) : '';
          }
        }
        return {
          unitId: branchMap[row[0]?.trim()] || '',
          licenseType: row[1],
          numberYear: row[2],
          description: row[3],
          licensingAgency: row[4],
          processNumber: row[5],
          issueDate: excelDateToISO(row[6]),
          originalExpiryDate: expiryDate,
          prorrogaDate,
          processStartDate,
          observation: row[8],
          active: true,
          inactiveObservation: '',
        };
      });
      if (licenses.some(l => !l.unitId || !l.licenseType)) {
        setMessage('Algumas linhas estão sem Unidade ou Licença.');
        setImporting(false);
        return;
      }
      await onImport(licenses);
      setMessage('Licenças importadas com sucesso!');
    } catch (err) {
      setMessage('Erro ao importar: ' + (err as Error).message);
    }
    setImporting(false);
  };

  function findBranchId(name: string): string {
    const branch = branches.find(b => b.name.trim().toLowerCase() === name.trim().toLowerCase());
    return branch ? branch.id : '';
  }

  function excelDateToISO(value: any): string {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (typeof value === 'number') {
      // Excel date serial
      const date = XLSX.SSF.parse_date_code(value);
      if (!date) return '';
      const mm = String(date.m).padStart(2, '0');
      const dd = String(date.d).padStart(2, '0');
      return `${date.y}-${mm}-${dd}`;
    }
    return '';
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
        <h3 className="text-lg font-bold mb-4">Importar Licenças</h3>
        <div className="space-y-4">
          <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Baixar modelo Excel</button>
          <div>
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={importing}
              className="block w-full text-sm text-gray-700"
            />
          </div>
          {importing && <div className="text-blue-600">Importando...</div>}
          {message && <div className="text-sm text-center" style={{ color: message.includes('sucesso') ? 'green' : 'red' }}>{message}</div>}
        </div>
      </div>
    </div>
  );
}; 