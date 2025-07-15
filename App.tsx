import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  where 
} from 'firebase/firestore';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { Unit, License, LicenseType, Branch } from './types';
import LicenseManagement from './components/LicenseManagement';
import LicenseTypeManagement from './components/LicenseTypeManagement';
import BranchManagement from './components/BranchManagement';
import DeactivatedLicenses from './components/DeactivatedLicenses';
import Login from './components/Login';

type View = 'licenses' | 'licenseTypes' | 'branches' | 'deactivatedLicenses';

// Define collection references outside the component for stability
const unitsCollectionRef = collection(db, 'units');
const licensesCollectionRef = collection(db, 'licenses');
const licenseTypesCollectionRef = collection(db, 'licenseTypes');
const branchesCollectionRef = collection(db, 'branches');

const App: React.FC = () => {
  const [view, setView] = useState<View>('licenses');
  const [units, setUnits] = useState<Unit[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const fetchUnits = useCallback(async () => {
    const data = await getDocs(unitsCollectionRef);
    const unitsData = data.docs.map(d => ({ ...d.data(), id: d.id } as Unit));
    setUnits(unitsData);
  }, []);

  const fetchLicenses = useCallback(async () => {
    const data = await getDocs(licensesCollectionRef);
    const licensesData = data.docs.map(d => ({ ...d.data(), id: d.id } as License));
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchUnits(), fetchLicenses(), fetchLicenseTypes(), fetchBranches()]);
      } catch (error) {
        console.error("Failed to fetch data from Firebase:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchUnits, fetchLicenses, fetchLicenseTypes, fetchBranches]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-xl font-semibold text-gray-700">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => setUser(auth.currentUser)} />;
  }

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
    await addDoc(licensesCollectionRef, license);
    await fetchLicenses();
  };
  
  const updateLicense = async (updatedLicense: License) => {
    const { id, ...licenseData } = updatedLicense;
    const licenseDocRef = doc(db, 'licenses', id);
    await updateDoc(licenseDocRef, { ...licenseData });
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

  const NavButton = ({ currentView, targetView, children }: { currentView: View, targetView: View, children: React.ReactNode }) => {
    const isActive = currentView === targetView;
    const baseClasses = 'px-6 py-3 text-lg font-semibold rounded-t-lg transition-colors duration-300 focus:outline-none';
    const activeClasses = 'bg-white text-blue-600 shadow-md';
    const inactiveClasses = 'bg-blue-500 text-white hover:bg-blue-600';
    return (
      <button onClick={() => setView(targetView)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
        {children}
      </button>
    );
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-xl font-semibold text-gray-700">Carregando dados...</p>
            </div>
        </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 text-gray-800 ${theme === 'dark' ? 'dark bg-gray-900 text-gray-100' : ''}`}>
      <header className="bg-blue-600 shadow-lg text-white p-6 pb-12 flex justify-between items-center relative">
        <h1 className="text-4xl font-bold text-center w-full">Gestão de Licenças Ambientais</h1>
        <div className="absolute right-8 top-8 flex gap-2">
          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
            aria-label="Alternar modo claro/escuro"
          >
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </button>
          <button onClick={() => signOut(auth)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">Sair</button>
        </div>
      </header>

      <nav className="flex justify-center -mt-8 z-10 relative">
        <NavButton currentView={view} targetView='licenses'>
          Licenças Vigentes
        </NavButton>
        <NavButton currentView={view} targetView='deactivatedLicenses'>
          Licenças Vencidas
        </NavButton>
        <NavButton currentView={view} targetView='licenseTypes'>
          Tipos de Licença
        </NavButton>
        <NavButton currentView={view} targetView='branches'>
          Filiais
        </NavButton>
      </nav>

      <main className="p-4 sm:p-6 lg:p-8">
        {view === 'licenses' && <LicenseManagement licenses={licenses} branches={branches} licenseTypes={licenseTypes} onAddLicense={addLicense} onUpdateLicense={updateLicense} onDeleteLicense={deleteLicense} onAddBranch={addBranch}/>} 
        {view === 'deactivatedLicenses' && <DeactivatedLicenses licenses={licenses.filter(l => !l.active)} branches={branches} licenseTypes={licenseTypes} onUpdateLicense={updateLicense} />} 
        {view === 'licenseTypes' && <LicenseTypeManagement licenseTypes={licenseTypes} onAddLicenseType={addLicenseType} onUpdateLicenseType={updateLicenseType} onDeleteLicenseType={deleteLicenseType}/>} 
        {view === 'branches' && <BranchManagement branches={branches} onAddBranch={addBranch} onUpdateBranch={updateBranch} onDeleteBranch={deleteBranch} />}
      </main>
      <footer className="text-center text-gray-500 py-4 text-sm">
        <p>&copy; {new Date().getFullYear()} Gestão Ambiental. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default App;