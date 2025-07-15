
export type Status = 'Ativa' | 'Vencida' | 'Em Renovação';

export interface Unit {
  id: string;
  name: string;
  licenseType: string;
  number: string;
  year: string;
  issueDate: string;
  expiryDate: string;
  company: string;
  city: string;
  contact: string;
  servicedCities: string;
  status: Status;
}

export interface License {
  id: string;
  unitId: string;
  licenseType: string;
  numberYear: string;
  description: string;
  licensingAgency: string;
  processNumber: string;
  issueDate: string;
  originalExpiryDate: string;
  prorrogaDate: string; // Prazo para prorrogação
  processStartDate: string; // Início do processo
  observation: string;
  active: boolean;
  inactiveObservation?: string;
}

export interface LicenseType {
  id: string;
  name: string;
  renewalProtocolDays: number;
  processStartDays: number;
}

export interface Branch {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  contact: string;
  status: Status;
}
