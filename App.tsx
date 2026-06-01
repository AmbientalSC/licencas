import React, { useState, lazy, Suspense } from 'react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import type {
  Unit,
  License,
  LicenseType,
  Branch,
  Credor,
  CredorLicense,
  User,
  LaoRecord,
  LaoCondition,
  LaoInspection
} from './types';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useFirestoreData } from './hooks/useFirestore';
import { usePermissions } from './hooks/usePermissions';
import Login from './components/Login';
import { LicenseIcon } from './components/icons/LicenseIcon';
import { ExpiredIcon } from './components/icons/ExpiredIcon';
import { TypeIcon } from './components/icons/TypeIcon';
import { BuildingIcon } from './components/icons/BuildingIcon';
import { DashboardIcon } from './components/icons/DashboardIcon';
import { UsersIcon } from './components/icons/UsersIcon';
import { CredoresIcon } from './components/icons/CredoresIcon';
import logo from './assets/ambiental.svg';

const Dashboard = lazy(() => import('./components/Dashboard'));
const LicenseManagement = lazy(() => import('./components/LicenseManagement'));
const LicenseTypeManagement = lazy(() => import('./components/LicenseTypeManagement'));
const BranchManagement = lazy(() => import('./components/BranchManagement'));
const DeactivatedLicenses = lazy(() => import('./components/DeactivatedLicenses'));
const LaoConditionsManagement = lazy(() => import('./components/LaoConditionsManagement'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const CredoresManagement = lazy(() => import('./components/CredoresManagement'));

type View =
  | 'dashboard'
  | 'licenses'
  | 'sgaLicenses'
  | 'licenseTypes'
  | 'branches'
  | 'deactivatedLicenses'
  | 'laoConditions'
  | 'credores'
  | 'users';

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { theme, toggleThemePreference } = useTheme();
  const { user, userRole, userProfile, authLoading } = useAuth();
  const {
    units,
    licenses,
    licenseTypes,
    branches,
    credores,
    credorLicenses,
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
    addLao,
    updateLao,
    deleteLao,
    addLaoCondition,
    updateLaoCondition,
    deleteLaoCondition,
    addLaoInspection,
  } = useFirestoreData();

  const {
    hasScreenAccess,
    licenses: visibleLicenses,
    branches: visibleBranches,
    licenseTypes: visibleLicenseTypes,
    credores: visibleCredores,
    credorLicenses: visibleCredorLicenses,
    laos: visibleLaos,
    laoConditions: visibleLaoConditions,
    laoInspections: visibleLaoInspections,
  } = usePermissions(
    userRole,
    userProfile,
    licenses,
    branches,
    licenseTypes,
    credores,
    credorLicenses,
    laos,
    laoConditions,
    laoInspections,
  );

  void units; void addUnit; void updateUnit; void deleteUnit;

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
    return <Login onLogin={() => { /* auth state reflects change via onAuthStateChanged */ }} />;
  }

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

  return (
    <div className={`flex min-h-screen bg-gray-100 text-gray-800 ${theme === 'dark' ? 'dark bg-gray-900 text-gray-100' : ''}`}>
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

      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-0'} flex flex-col sticky top-0 h-screen shrink-0 z-20 transition-all duration-300 overflow-hidden`}
        style={{ backgroundColor: '#1e293b' }}
      >
        <div className={`${isSidebarOpen ? 'opacity-100' : 'opacity-0'} flex flex-col h-full transition-opacity duration-200`}>
          <div className="h-32 flex items-center justify-center shrink-0 p-4 border-b border-slate-700/50">
            <img src={logo} alt="Logo Ambiental" className="max-h-full max-w-full object-contain" />
          </div>

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
              {hasScreenAccess('credores') && (
                <SidebarItem
                  icon={<CredoresIcon />}
                  label="Credores"
                  active={view === 'credores'}
                  onClick={() => setView('credores')}
                />
              )}
              {hasScreenAccess('laoConditions') && (
                <SidebarItem
                  icon={<TypeIcon />}
                  label="Condicionantes"
                  active={view === 'laoConditions'}
                  onClick={() => setView('laoConditions')}
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

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header
          className="h-14 flex items-center justify-between px-6 sticky top-0 z-10"
          style={{ backgroundColor: '#1e293b' }}
        >
          <div className="flex items-center gap-4 min-w-[200px]">
          </div>

          <h1 className="text-lg font-semibold text-white">
            Gestão de Licenças Ambientais
          </h1>

          <div className="flex items-center gap-2 min-w-[200px] justify-end">
            <button
              onClick={toggleThemePreference}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-white"
              aria-label="Alternar tema"
              title="Alternar tema"
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

        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
          <div className="w-full">
            <Suspense
              fallback={(
                <div className="py-10 text-center text-gray-600 dark:text-gray-300">
                  Carregando tela...
                </div>
              )}
            >
              {view === 'dashboard' && <Dashboard licenses={visibleLicenses} branches={branches} licenseTypes={licenseTypes} />}
              {view === 'licenses' && <LicenseManagement licenses={visibleLicenses} branches={visibleBranches} licenseTypes={visibleLicenseTypes} onAddLicense={addLicense} onUpdateLicense={updateLicense} onDeleteLicense={deleteLicense} onAddBranch={addBranch} category="Ambiental" />}
              {view === 'sgaLicenses' && <LicenseManagement licenses={visibleLicenses} branches={visibleBranches} licenseTypes={visibleLicenseTypes} onAddLicense={addLicense} onUpdateLicense={updateLicense} onDeleteLicense={deleteLicense} onAddBranch={addBranch} category="SGA" />}
              {view === 'deactivatedLicenses' && <DeactivatedLicenses licenses={visibleLicenses.filter(l => !l.active)} branches={visibleBranches} licenseTypes={visibleLicenseTypes} onUpdateLicense={updateLicense} />}
              {view === 'licenseTypes' && <LicenseTypeManagement licenseTypes={licenseTypes} onAddLicenseType={addLicenseType} onUpdateLicenseType={updateLicenseType} onDeleteLicenseType={deleteLicenseType} />}
              {view === 'branches' && <BranchManagement branches={branches} onAddBranch={addBranch} onUpdateBranch={updateBranch} onDeleteBranch={deleteBranch} />}
              {view === 'laoConditions' && (
                <LaoConditionsManagement
                  laos={visibleLaos}
                  conditions={visibleLaoConditions}
                  inspections={visibleLaoInspections}
                  branches={visibleBranches}
                  licenses={visibleLicenses}
                  canEdit={hasScreenAccess('laoConditions')}
                  onAddLao={addLao}
                  onUpdateLao={updateLao}
                  onDeleteLao={deleteLao}
                  onAddCondition={addLaoCondition}
                  onUpdateCondition={updateLaoCondition}
                  onDeleteCondition={deleteLaoCondition}
                  onAddInspection={addLaoInspection}
                />
              )}
              {view === 'users' && <UserManagement branches={branches} licenseTypes={licenseTypes} />}
              {view === 'credores' && (
                <CredoresManagement
                  credores={visibleCredores}
                  credorLicenses={visibleCredorLicenses}
                  onAddCredor={addCredor}
                  onUpdateCredor={updateCredor}
                  onDeleteCredor={deleteCredor}
                  onAddCredorLicense={addCredorLicense}
                  onUpdateCredorLicense={updateCredorLicense}
                  onDeleteCredorLicense={deleteCredorLicense}
                />
              )}
            </Suspense>
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
