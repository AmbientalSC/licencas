import { useState, useCallback, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  deleteField,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import type {
  Unit,
  License,
  LicenseType,
  Branch,
  Credor,
  CredorLicense,
  CredorEvaluation,
  LaoRecord,
  LaoCondition,
  LaoInspection,
} from '../types';

const unitsCollectionRef = collection(db, 'units');
const licensesCollectionRef = collection(db, 'licenses');
const licenseTypesCollectionRef = collection(db, 'licenseTypes');
const branchesCollectionRef = collection(db, 'branches');
const credoresCollectionRef = collection(db, 'credores');
const credorLicensesCollectionRef = collection(db, 'credorLicenses');
const credorEvaluationsCollectionRef = collection(db, 'credorEvaluations');
const laoCollectionRef = collection(db, 'laos');
const laoConditionsCollectionRef = collection(db, 'laoConditions');
const laoInspectionsCollectionRef = collection(db, 'laoInspections');

const toFirestoreData = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(item => toFirestoreData(item));
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, fieldValue]) => fieldValue !== undefined)
        .map(([key, fieldValue]) => [key, toFirestoreData(fieldValue)]),
    );
  }
  return value;
};

export function useFirestoreData() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [credores, setCredores] = useState<Credor[]>([]);
  const [credorLicenses, setCredorLicenses] = useState<CredorLicense[]>([]);
  const [credorEvaluations, setCredorEvaluations] = useState<CredorEvaluation[]>([]);
  const [laos, setLaos] = useState<LaoRecord[]>([]);
  const [laoConditions, setLaoConditions] = useState<LaoCondition[]>([]);
  const [laoInspections, setLaoInspections] = useState<LaoInspection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    const data = await getDocs(unitsCollectionRef);
    const unitsData = data.docs.map(d => ({ ...d.data(), id: d.id } as Unit));
    setUnits(unitsData);
  }, []);

  const fetchLicenses = useCallback(async () => {
    const data = await getDocs(licensesCollectionRef);
    const licensesData = data.docs.map(d => {
      const licenseData = d.data();
      let attachments = licenseData.attachments || [];

      if ((licenseData.fileUrl || licenseData.fileName) && attachments.length === 0) {
        if (licenseData.fileUrl) {
          attachments = [{
            id: Date.now().toString(),
            fileName: licenseData.fileName || 'Arquivo',
            fileUrl: licenseData.fileUrl,
            uploadedAt: new Date().toISOString(),
          }];
        }
      }

      return {
        ...licenseData,
        id: d.id,
        attachments: attachments
      } as License;
    });
    setLicenses(licensesData);
  }, []);

  const fetchLicenseTypes = useCallback(async () => {
    const data = await getDocs(licenseTypesCollectionRef);
    const licenseTypesData = data.docs.map(d => ({ ...d.data(), id: d.id } as LicenseType));
    setLicenseTypes(licenseTypesData);
  }, []);

  const fetchBranches = useCallback(async () => {
    const data = await getDocs(branchesCollectionRef);
    const branchesData = data.docs.map(d => ({ ...d.data(), id: d.id } as Branch));
    setBranches(branchesData);
  }, []);

  const fetchCredores = useCallback(async () => {
    const data = await getDocs(credoresCollectionRef);
    const credoresData = data.docs.map(d => ({ ...d.data(), id: d.id } as Credor));
    setCredores(credoresData);
  }, []);

  const fetchCredorLicenses = useCallback(async () => {
    const data = await getDocs(credorLicensesCollectionRef);
    const credorLicensesData = data.docs.map(d => ({ ...d.data(), id: d.id } as CredorLicense));
    setCredorLicenses(credorLicensesData);
  }, []);

  const fetchCredorEvaluations = useCallback(async () => {
    const data = await getDocs(credorEvaluationsCollectionRef);
    const credorEvaluationsData = data.docs.map(d => ({ ...d.data(), id: d.id } as CredorEvaluation));
    setCredorEvaluations(credorEvaluationsData);
  }, []);

  const fetchLaos = useCallback(async () => {
    const data = await getDocs(laoCollectionRef);
    const laosData = data.docs.map(d => ({ ...d.data(), id: d.id } as LaoRecord));
    setLaos(laosData);
  }, []);

  const fetchLaoConditions = useCallback(async () => {
    const data = await getDocs(laoConditionsCollectionRef);
    const laoConditionsData = data.docs.map(
      d => ({ ...d.data(), id: d.id } as LaoCondition),
    );
    setLaoConditions(laoConditionsData);
  }, []);

  const fetchLaoInspections = useCallback(async () => {
    const data = await getDocs(laoInspectionsCollectionRef);
    const laoInspectionsData = data.docs.map(
      d => ({ ...d.data(), id: d.id } as LaoInspection),
    );
    setLaoInspections(laoInspectionsData);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchUnits(),
          fetchLicenses(),
          fetchLicenseTypes(),
          fetchBranches(),
          fetchCredores(),
          fetchCredorLicenses(),
          fetchCredorEvaluations(),
          fetchLaos(),
          fetchLaoConditions(),
          fetchLaoInspections(),
        ]);
      } catch (error) {
        console.error("Failed to fetch data from Firebase:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [
    fetchUnits,
    fetchLicenses,
    fetchLicenseTypes,
    fetchBranches,
    fetchCredores,
    fetchCredorLicenses,
    fetchCredorEvaluations,
    fetchLaos,
    fetchLaoConditions,
    fetchLaoInspections,
  ]);

  const addUnit = async (unit: Omit<Unit, 'id'>) => {
    await addDoc(unitsCollectionRef, unit);
    await fetchUnits();
  };

  const updateUnit = async (updatedUnit: Unit) => {
    const { id, ...unitData } = updatedUnit;
    const unitDocRef = doc(db, 'units', id);
    await updateDoc(unitDocRef, { ...unitData });
    await fetchUnits();
  };

  const deleteUnit = async (id: string) => {
    const batch = writeBatch(db);
    const unitDocRef = doc(db, 'units', id);
    batch.delete(unitDocRef);

    const q = query(licensesCollectionRef, where("unitId", "==", id));
    const licensesSnapshot = await getDocs(q);
    licensesSnapshot.forEach((licenseDoc) => {
      batch.delete(licenseDoc.ref);
    });

    await batch.commit();
    await Promise.all([fetchUnits(), fetchLicenses()]);
  };

  const addLicense = async (license: Omit<License, 'id'>) => {
    const licenseWithAttachments = {
      ...license,
      attachments: license.attachments || []
    };
    await addDoc(licensesCollectionRef, licenseWithAttachments);
    await fetchLicenses();
  };

  const updateLicense = async (updatedLicense: License) => {
    const { id, ...licenseData } = updatedLicense;
    const licenseWithAttachments = {
      ...licenseData,
      attachments: licenseData.attachments || []
    };
    const licenseDocRef = doc(db, 'licenses', id);
    await updateDoc(licenseDocRef, licenseWithAttachments);
    await fetchLicenses();
  };

  const deleteLicense = async (id: string) => {
    const licenseDocRef = doc(db, 'licenses', id);
    await deleteDoc(licenseDocRef);
    await fetchLicenses();
  };

  const addLicenseType = async (licenseType: Omit<LicenseType, 'id'>) => {
    const data = {
      ...licenseType,
      renewalProtocolDays: Number(licenseType.renewalProtocolDays) || 0,
      processStartDays: Number(licenseType.processStartDays) || 0,
    };
    await addDoc(licenseTypesCollectionRef, data);
    await fetchLicenseTypes();
  };

  const updateLicenseType = async (updatedLicenseType: LicenseType) => {
    const { id, ...licenseTypeData } = updatedLicenseType;
    const data = {
      ...licenseTypeData,
      renewalProtocolDays: Number(licenseTypeData.renewalProtocolDays) || 0,
      processStartDays: Number(licenseTypeData.processStartDays) || 0,
    };
    const licenseTypeDocRef = doc(db, 'licenseTypes', id);
    await updateDoc(licenseTypeDocRef, data);
    await fetchLicenseTypes();
  };

  const deleteLicenseType = async (id: string) => {
    const licenseTypeDocRef = doc(db, 'licenseTypes', id);
    await deleteDoc(licenseTypeDocRef);
    await fetchLicenseTypes();
  };

  const addBranch = async (branch: Omit<Branch, 'id'>) => {
    const docRef = await addDoc(branchesCollectionRef, branch);
    await fetchBranches();
    return docRef.id;
  };

  const updateBranch = async (updatedBranch: Branch) => {
    const { id, ...branchData } = updatedBranch;
    const branchDocRef = doc(db, 'branches', id);
    await updateDoc(branchDocRef, { ...branchData });
    await fetchBranches();
  };

  const deleteBranch = async (id: string) => {
    const branchDocRef = doc(db, 'branches', id);
    await deleteDoc(branchDocRef);
    await fetchBranches();
  };

  const addCredor = async (credor: Omit<Credor, 'id'>) => {
    const docRef = await addDoc(credoresCollectionRef, credor);
    await fetchCredores();
    return docRef.id;
  };

  const updateCredor = async (updatedCredor: Credor) => {
    const { id, ...credorData } = updatedCredor;
    const credorDocRef = doc(db, 'credores', id);
    await updateDoc(credorDocRef, { ...credorData });
    await fetchCredores();
  };

  const deleteCredor = async (id: string) => {
    const batch = writeBatch(db);
    const credorDocRef = doc(db, 'credores', id);
    batch.delete(credorDocRef);

    const q = query(credorLicensesCollectionRef, where('credorId', '==', id));
    const credorLicensesSnapshot = await getDocs(q);
    credorLicensesSnapshot.forEach(clDoc => {
      batch.delete(clDoc.ref);
    });

    const evaluationsQuery = query(credorEvaluationsCollectionRef, where('credorId', '==', id));
    const evaluationsSnapshot = await getDocs(evaluationsQuery);
    evaluationsSnapshot.forEach(evalDoc => {
      batch.delete(evalDoc.ref);
    });

    await batch.commit();
    await Promise.all([fetchCredores(), fetchCredorLicenses(), fetchCredorEvaluations()]);
  };

  const addCredorLicense = async (credorLicense: Omit<CredorLicense, 'id'>) => {
    const docRef = await addDoc(credorLicensesCollectionRef, credorLicense);
    await fetchCredorLicenses();
    return docRef.id;
  };

  const updateCredorLicense = async (updatedCredorLicense: CredorLicense) => {
    const { id, ...credorLicenseData } = updatedCredorLicense;
    const credorLicenseDocRef = doc(db, 'credorLicenses', id);
    await updateDoc(credorLicenseDocRef, { ...credorLicenseData });
    await fetchCredorLicenses();
  };

  const deleteCredorLicense = async (id: string) => {
    const credorLicenseDocRef = doc(db, 'credorLicenses', id);
    await deleteDoc(credorLicenseDocRef);
    await fetchCredorLicenses();
  };

  const addCredorEvaluation = async (credorEvaluation: Omit<CredorEvaluation, 'id'>) => {
    const docRef = await addDoc(credorEvaluationsCollectionRef, credorEvaluation);
    await fetchCredorEvaluations();
    return docRef.id;
  };

  const deleteCredorEvaluation = async (id: string) => {
    const credorEvaluationDocRef = doc(db, 'credorEvaluations', id);
    await deleteDoc(credorEvaluationDocRef);
    await fetchCredorEvaluations();
  };

  const addLao = async (lao: Omit<LaoRecord, 'id'>) => {
    const docRef = await addDoc(laoCollectionRef, toFirestoreData(lao));
    await fetchLaos();
    return docRef.id;
  };

  const updateLao = async (updatedLao: LaoRecord) => {
    const { id, ...laoData } = updatedLao;
    const laoDocRef = doc(db, 'laos', id);
    await updateDoc(laoDocRef, toFirestoreData({ ...laoData }));
    await fetchLaos();
  };

  const deleteLao = async (id: string) => {
    const batch = writeBatch(db);
    const laoDocRef = doc(db, 'laos', id);
    batch.delete(laoDocRef);

    const conditionsQuery = query(laoConditionsCollectionRef, where('laoId', '==', id));
    const conditionsSnapshot = await getDocs(conditionsQuery);
    conditionsSnapshot.forEach(conditionDoc => {
      batch.delete(conditionDoc.ref);
    });

    const inspectionsQuery = query(laoInspectionsCollectionRef, where('laoId', '==', id));
    const inspectionsSnapshot = await getDocs(inspectionsQuery);
    inspectionsSnapshot.forEach(inspectionDoc => {
      batch.delete(inspectionDoc.ref);
    });

    await batch.commit();
    await Promise.all([fetchLaos(), fetchLaoConditions(), fetchLaoInspections()]);
  };

  const addLaoCondition = async (condition: Omit<LaoCondition, 'id'>) => {
    const payload: any = toFirestoreData(condition);
    if (condition.frequencyPreset !== 'custom') {
      delete payload.customMonthsInterval;
    } else {
      payload.customMonthsInterval = Number(condition.customMonthsInterval || 0);
    }
    const docRef = await addDoc(laoConditionsCollectionRef, payload);
    await fetchLaoConditions();
    return docRef.id;
  };

  const updateLaoCondition = async (updatedCondition: LaoCondition) => {
    const { id, ...conditionData } = updatedCondition;
    const conditionDocRef = doc(db, 'laoConditions', id);
    const payload: any = toFirestoreData({ ...conditionData });
    if (conditionData.frequencyPreset !== 'custom') {
      payload.customMonthsInterval = deleteField();
    } else {
      payload.customMonthsInterval = Number(conditionData.customMonthsInterval || 0);
    }
    await updateDoc(conditionDocRef, payload);
    await fetchLaoConditions();
  };

  const deleteLaoCondition = async (id: string) => {
    const batch = writeBatch(db);
    const conditionDocRef = doc(db, 'laoConditions', id);
    batch.delete(conditionDocRef);

    const inspectionsQuery = query(laoInspectionsCollectionRef, where('conditionId', '==', id));
    const inspectionsSnapshot = await getDocs(inspectionsQuery);
    inspectionsSnapshot.forEach(inspectionDoc => {
      batch.delete(inspectionDoc.ref);
    });

    await batch.commit();
    await Promise.all([fetchLaoConditions(), fetchLaoInspections()]);
  };

  const updateConditionLastInspection = async (conditionId: string) => {
    const inspectionsQuery = query(
      laoInspectionsCollectionRef,
      where('conditionId', '==', conditionId),
    );
    const inspectionsSnapshot = await getDocs(inspectionsQuery);
    let lastInspectionDate: string | null = null;
    inspectionsSnapshot.forEach(item => {
      const inspectionDate = item.data().inspectionDate as string | undefined;
      if (!inspectionDate) return;
      if (!lastInspectionDate || inspectionDate > lastInspectionDate) {
        lastInspectionDate = inspectionDate;
      }
    });

    const conditionDocRef = doc(db, 'laoConditions', conditionId);
    await updateDoc(conditionDocRef, {
      lastInspectionDate,
      updatedAt: new Date().toISOString(),
    });
  };

  const addLaoInspection = async (inspection: Omit<LaoInspection, 'id'>) => {
    const existingQuery = query(
      laoInspectionsCollectionRef,
      where('conditionId', '==', inspection.conditionId),
    );
    const existingSnapshot = await getDocs(existingQuery);
    const hasDuplicate = existingSnapshot.docs.some(
      item => item.data().inspectionDate === inspection.inspectionDate,
    );
    if (hasDuplicate) {
      return null;
    }

    const docRef = await addDoc(laoInspectionsCollectionRef, toFirestoreData(inspection));
    await updateConditionLastInspection(inspection.conditionId);
    await Promise.all([fetchLaoInspections(), fetchLaoConditions()]);
    return docRef.id;
  };

  return {
    units,
    licenses,
    licenseTypes,
    branches,
    credores,
    credorLicenses,
    credorEvaluations,
    laos,
    laoConditions,
    laoInspections,
    loading,
    addUnit,
    updateUnit,
    deleteUnit,
    addLicense,
    updateLicense,
    deleteLicense,
    addLicenseType,
    updateLicenseType,
    deleteLicenseType,
    addBranch,
    updateBranch,
    deleteBranch,
    addCredor,
    updateCredor,
    deleteCredor,
    addCredorLicense,
    updateCredorLicense,
    deleteCredorLicense,
    addCredorEvaluation,
    deleteCredorEvaluation,
    addLao,
    updateLao,
    deleteLao,
    addLaoCondition,
    updateLaoCondition,
    deleteLaoCondition,
    addLaoInspection,
  };
}
