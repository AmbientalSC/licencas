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
import type { Unit, License, LicenseType, Branch, User } from './types';
import LicenseManagement from './components/LicenseManagement';
import LicenseTypeManagement from './components/LicenseTypeManagement';
import BranchManagement from './components/BranchManagement';
import DeactivatedLicenses from './components/DeactivatedLicenses';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import { LicenseIcon } from './components/icons/LicenseIcon';
import { ExpiredIcon } from './components/icons/ExpiredIcon';
import { TypeIcon } from './components/icons/TypeIcon';
import { BuildingIcon } from './components/icons/BuildingIcon';
import { DashboardIcon } from './components/icons/DashboardIcon';
import { UsersIcon } from './components/icons/UsersIcon';
import logo from './assets/ambiental.svg';

type View = 'dashboard' | 'licenses' | 'sgaLicenses' | 'licenseTypes' | 'branches' | 'deactivatedLicenses' | 'users';

const unitsCollectionRef = collection(db, 'units');
const licensesCollectionRef = collection(db, 'licenses');
const licenseTypesCollectionRef = collection(db, 'licenseTypes');
const branchesCollectionRef = collection(db, 'branches');

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [units, setUnits] = useState<Unit[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'colaborador' | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', '==', user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          setUserProfile({ id: querySnapshot.docs[0].id, ...(docData as any) } as User);
          setUserRole(docData.role);
        } else {
          const allUsersSnapshot = await getDocs(usersRef);
          if (allUsersSnapshot.empty) {
            const newUserDoc = await addDoc(usersRef, {
              uid: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Admin',
              email: user.email,
              role: 'admin',
              active: true,
              allowedScreens: ['dashboard', 'licenses', 'deactivatedLicenses', 'licenseTypes', 'branches', 'users'],
              visibleBranchIds: [],
              visibleLicenseTypes: [],
              createdAt: new Date().toISOString()
            });
            setUserRole('admin');
            setUserProfile({ id: newUserDoc.id, uid: user.uid, name: user.displayName || user.email?.split('@')[0] || 'Admin', email: user.email, role: 'admin', active: true, allowedScreens: ['dashboard', 'licenses', 'deactivatedLicenses', 'licenseTypes', 'branches', 'users'] });
          } else {
            setUserRole('colaborador');
            setUserProfile({ id: '', uid: user.uid, name: user.displayName || '', email: user.email || '', role: 'colaborador', active: true, allowedScreens: ['dashboard'] });
          }
        }
      } else {
        setUserRole(null);
      }
    };
    fetchUserRole();
  }, [user]);

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

  const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => {
    return (
      <li
        onClick={onClick}
        className="flex items-center cursor-pointer p-3 rounded-lg transition-colors duration-200 mb-1 hover:bg-slate-700"
        style={active
          ? { backgroundColor: '#3b82f6', color: '#ffffff' }
          : { color: '#94a3b8' }
        }
      >
        <div className="mr-3" style={active ? { color: '#ffffff' } : { color: '#94a3b8' }}>
          {icon}
        </div>
        <span className="whitespace-nowrap">{label}</span>
      </li>
    );
  };

  const hasScreenAccess = (screen: View) => {
    if (userRole === 'admin') return true;
    return !!userProfile?.allowedScreens?.includes(screen);
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

  const visibleLicenses = (userRole === 'admin' || !userProfile) ? licenses : licenses.filter(l => {
    const byBranch = !userProfile?.visibleBranchIds || userProfile.visibleBranchIds.length === 0 || userProfile.visibleBranchIds.includes(l.unitId);
    const byType = !userProfile?.visibleLicenseTypes || userProfile.visibleLicenseTypes.length === 0 || userProfile.visibleLicenseTypes.includes(l.licenseType);
    return byBranch && byType;
  });

  const visibleBranches = (userRole === 'admin' || !userProfile) ? branches : branches.filter(b => !userProfile?.visibleBranchIds || userProfile.visibleBranchIds.length === 0 || userProfile.visibleBranchIds.includes(b.id));
  const visibleLicenseTypes = (userRole === 'admin' || !userProfile) ? licenseTypes : licenseTypes.filter(lt => !userProfile?.visibleLicenseTypes || userProfile.visibleLicenseTypes.length === 0 || userProfile.visibleLicenseTypes.includes(lt.name));

  void units; void addUnit; void updateUnit; void deleteUnit;

  return (
    <div className={`flex min-h-screen bg-gray-100 text-gray-800 ${theme === 'dark' ? 'dark bg-gray-900 text-gray-100' : ''}`}>
      {/* Botão toggle em posição fixa - left: 240px coloca a linha no centro do botão */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-600 hover:bg-slate-500 transition-all duration-300 text-white shadow-lg z-30"
        style={{ left: isSidebarOpen ? '240px' : '8px' }}
        aria-label={isSidebarOpen ? "Recolher sidebar" : "Expandir sidebar"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-0'} flex flex-col sticky top-0 h-screen shrink-0 z-20 transition-all duration-300 overflow-hidden`}
        style={{ backgroundColor: '#1e293b' }}
      >
        {/* Conteúdo da sidebar */}
        <div className={`${isSidebarOpen ? 'opacity-100' : 'opacity-0'} flex flex-col h-full transition-opacity duration-200`}>
          {/* Logo Area */}
          <div className="h-32 flex items-center justify-center shrink-0 p-4 border-b border-slate-700/50">
            <img src={logo} alt="Logo Ambiental" className="max-h-full max-w-full object-contain" />
          </div>

          {/* Navegação */}
          <nav className="flex-1 py-4 overflow-hidden">
            <ul className="px-3 space-y-1">
              {hasScreenAccess('dashboard') && (
                <SidebarItem
                  icon={<DashboardIcon />}
                  label="Dashboard"
                  active={view === 'dashboard'}
                  onClick={() => setView('dashboard')}
                />
              )}
              {hasScreenAccess('licenses') && (
                <SidebarItem
                  icon={<LicenseIcon />}
                  label="Licenças Vigentes"
                  active={view === 'licenses'}
                  onClick={() => setView('licenses')}
                />
              )}
              {hasScreenAccess('sgaLicenses') && (
                <SidebarItem
                  icon={<LicenseIcon />}
                  label="Licenças SGA"
                  active={view === 'sgaLicenses'}
                  onClick={() => setView('sgaLicenses')}
                />
              )}
              {hasScreenAccess('deactivatedLicenses') && (
                <SidebarItem
                  icon={<ExpiredIcon />}
                  label="Licenças Vencidas"
                  active={view === 'deactivatedLicenses'}
                  onClick={() => setView('deactivatedLicenses')}
                />
              )}
              {hasScreenAccess('licenseTypes') && (
                <SidebarItem
                  icon={<TypeIcon />}
                  label="Tipos de Licença"
                  active={view === 'licenseTypes'}
                  onClick={() => setView('licenseTypes')}
                />
              )}
              {hasScreenAccess('branches') && (
                <SidebarItem
                  icon={<BuildingIcon />}
                  label="Filiais"
                  active={view === 'branches'}
                  onClick={() => setView('branches')}
                />
              )}
              {hasScreenAccess('users') && (
                <SidebarItem
                  icon={<UsersIcon />}
                  label="Usuários"
                  active={view === 'users'}
                  onClick={() => setView('users')}
                />
              )}
            </ul>
          </nav>

          {/* Perfil do usuário no rodapé */}
          <div className="p-4 shrink-0">
            <div
              className="flex items-center p-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-700"
              onClick={() => signOut(auth)}
              title="Clique para sair"
            >
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {userProfile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-white font-medium text-sm truncate">
                  {userProfile?.name || user?.email?.split('@')[0]}
                </p>
                <p className="text-slate-400 text-xs truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <header
          className="h-14 flex items-center justify-between px-6 sticky top-0 z-10"
          style={{ backgroundColor: '#1e293b' }}
        >
          {/* Esquerda - Espaço reservado */}
          <div className="flex items-center gap-4 min-w-[200px]">
          </div>

          {/* Centro - Título */}
          <h1 className="text-lg font-semibold text-white">
            Gestão de Licenças Ambientais
          </h1>

          {/* Direita - Ícones de ação */}
          <div className="flex items-center gap-2 min-w-[200px] justify-end">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-white"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => signOut(auth)}
              className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
          <div className="w-full">
            {view === 'dashboard' && <Dashboard licenses={visibleLicenses} branches={branches} licenseTypes={licenseTypes} />}
            {view === 'licenses' && <LicenseManagement licenses={visibleLicenses} branches={visibleBranches} licenseTypes={visibleLicenseTypes} onAddLicense={addLicense} onUpdateLicense={updateLicense} onDeleteLicense={deleteLicense} onAddBranch={addBranch} category="Ambiental" />}
            {view === 'sgaLicenses' && <LicenseManagement licenses={visibleLicenses} branches={visibleBranches} licenseTypes={visibleLicenseTypes} onAddLicense={addLicense} onUpdateLicense={updateLicense} onDeleteLicense={deleteLicense} onAddBranch={addBranch} category="SGA" />}
            {view === 'deactivatedLicenses' && <DeactivatedLicenses licenses={visibleLicenses.filter(l => !l.active)} branches={visibleBranches} licenseTypes={visibleLicenseTypes} onUpdateLicense={updateLicense} />}
            {view === 'licenseTypes' && <LicenseTypeManagement licenseTypes={licenseTypes} onAddLicenseType={addLicenseType} onUpdateLicenseType={updateLicenseType} onDeleteLicenseType={deleteLicenseType} />}
            {view === 'branches' && <BranchManagement branches={branches} onAddBranch={addBranch} onUpdateBranch={updateBranch} onDeleteBranch={deleteBranch} />}
            {view === 'users' && <UserManagement branches={branches} licenseTypes={licenseTypes} />}
          </div>
        </main>

        <footer className="text-center text-gray-500 py-6 text-sm border-t border-gray-200 dark:border-gray-800 mt-auto bg-white dark:bg-gray-800">
          <p>&copy; {new Date().getFullYear()} Gestão Ambiental. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;