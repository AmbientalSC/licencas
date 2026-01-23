import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from '../firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';

interface User {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: 'admin' | 'colaborador';
  active: boolean;
  allowedScreens?: string[];
  visibleBranchIds?: string[];
  visibleLicenseTypes?: string[];
}

interface UserManagementProps {
  branches?: { id: string; name: string }[];
  licenseTypes?: { id: string; name: string }[];
}

const SCREENS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'licenses', label: 'Licenças Vigentes' },
  { id: 'sgaLicenses', label: 'Licenças SGA' },
  { id: 'deactivatedLicenses', label: 'Licenças Vencidas' },
  { id: 'licenseTypes', label: 'Tipos de Licença' },
  { id: 'branches', label: 'Filiais' },
  { id: 'users', label: 'Usuários' },
];

const UserManagement: React.FC<UserManagementProps> = ({ branches = [], licenseTypes = [] }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    allowedScreens: [] as string[],
    visibleBranchIds: [] as string[],
    visibleLicenseTypes: [] as string[],
    name: '',
    email: '',
    password: '',
    role: 'colaborador' as 'admin' | 'colaborador',
  });
  const [error, setError] = useState('');

  const handleToggleScreen = (screenId: string) => {
    setFormData(prev => {
      const arr = new Set(prev.allowedScreens);
      if (arr.has(screenId)) arr.delete(screenId); else arr.add(screenId);
      return { ...prev, allowedScreens: Array.from(arr) };
    });
  };

  const handleToggleBranch = (branchId: string) => {
    setFormData(prev => {
      const arr = new Set(prev.visibleBranchIds);
      if (arr.has(branchId)) arr.delete(branchId); else arr.add(branchId);
      return { ...prev, visibleBranchIds: Array.from(arr) };
    });
  };

  const handleSelectAllBranches = () => {
    setFormData(prev => {
      if (!branches || branches.length === 0) return prev;
      const allIds = branches.map(b => b.id);
      const allSelected = prev.visibleBranchIds.length === allIds.length;
      return { ...prev, visibleBranchIds: allSelected ? [] : allIds };
    });
  };

  const handleToggleLicenseType = (ltId: string) => {
    setFormData(prev => {
      const arr = new Set(prev.visibleLicenseTypes);
      if (arr.has(ltId)) arr.delete(ltId); else arr.add(ltId);
      return { ...prev, visibleLicenseTypes: Array.from(arr) };
    });
  };

  const handleSelectAllLicenseTypes = () => {
    setFormData(prev => {
      if (!licenseTypes || licenseTypes.length === 0) return prev;
      const allIds = licenseTypes.map(lt => lt.name);
      const allSelected = prev.visibleLicenseTypes.length === allIds.length;
      return { ...prev, visibleLicenseTypes: allSelected ? [] : allIds };
    });
  };
  const [success, setSuccess] = useState('');

  const usersCollectionRef = collection(db, 'users');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getDocs(usersCollectionRef);
      const usersData = data.docs.map(d => ({ ...d.data(), id: d.id } as User));
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      let next = { ...prev, [name]: value } as typeof prev;
      // If role changed to admin, automatically grant all permissions
      if (name === 'role' && value === 'admin') {
        const allScreens = SCREENS.map(s => s.id);
        next = {
          ...next,
          allowedScreens: allScreens,
          visibleBranchIds: branches.map(b => b.id),
          visibleLicenseTypes: licenseTypes.map(lt => lt.name),
        } as typeof prev;
      }
      return next;
    });
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', role: 'colaborador', allowedScreens: [], visibleBranchIds: [], visibleLicenseTypes: [] });
    setEditingUser(null);
    setError('');
    setSuccess('');
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Ensure admin role gets full permissions if role is admin
    if (formData.role === 'admin') {
      formData.allowedScreens = SCREENS.map(s => s.id);
      formData.visibleBranchIds = branches.map(b => b.id);
      formData.visibleLicenseTypes = licenseTypes.map(lt => lt.name);
    }

    if (editingUser) {
      // Update existing user (Firestore only)
      try {
        const userDoc = doc(db, 'users', editingUser.id);
        await updateDoc(userDoc, {
          allowedScreens: formData.allowedScreens || [],
          visibleBranchIds: formData.visibleBranchIds || [],
          visibleLicenseTypes: formData.visibleLicenseTypes || [],
          name: formData.name,
          role: formData.role,
        });
        setSuccess('Usuário atualizado com sucesso!');
        fetchUsers();
        setTimeout(resetForm, 1500);
      } catch (err: any) {
        setError('Erro ao atualizar usuário: ' + err.message);
      }
    } else {
      // Create new user (Auth + Firestore)
      if (!formData.password || formData.password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }

      try {
        // Create user in Firebase Auth using a secondary app to avoid logging out the current user
        const secondaryApp = initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);
        
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        const uid = userCredential.user.uid;
        
        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);

        // Create user document in Firestore
        await addDoc(usersCollectionRef, {
          uid: uid,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          allowedScreens: formData.allowedScreens || [],
          visibleBranchIds: formData.visibleBranchIds || [],
          visibleLicenseTypes: formData.visibleLicenseTypes || [],
          active: true,
          createdAt: new Date().toISOString()
        });

        setSuccess('Usuário criado com sucesso!');
        fetchUsers();
        setTimeout(resetForm, 1500);
      } catch (err: any) {
        console.error(err);
        if (err.code === 'auth/email-already-in-use') {
          setError('Este e-mail já está em uso.');
        } else {
          setError('Erro ao criar usuário: ' + err.message);
        }
      }
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Password not editable directly here
      role: user.role,
      allowedScreens: user.allowedScreens || [],
      visibleBranchIds: user.visibleBranchIds || [],
      visibleLicenseTypes: user.visibleLicenseTypes || [],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário? O acesso dele será revogado.')) {
      try {
        await deleteDoc(doc(db, 'users', id));
        // Note: This only deletes from Firestore. Deleting from Auth requires Admin SDK or Cloud Functions.
        // For this app, we assume checking the Firestore 'users' collection is enough to deny access/features.
        fetchUsers();
      } catch (err: any) {
        alert('Erro ao excluir usuário: ' + err.message);
      }
    }
  };

  const toggleActive = async (user: User) => {
    try {
      const userDoc = doc(db, 'users', user.id);
      await updateDoc(userDoc, { active: !user.active });
      fetchUsers();
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Gerenciamento de Usuários</h2>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Novo Usuário
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/90">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Função</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-black dark:text-gray-400">Carregando...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-black dark:text-gray-400">Nenhum usuário encontrado.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/90 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-gray-300">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-gray-300">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/90 dark:text-purple-200' 
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/90 dark:text-blue-200'
                      }`}>
                        {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button 
                        onClick={() => toggleActive(user)}
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer ${
                          user.active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/90 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/90 dark:text-red-200'
                        }`}
                      >
                        {user.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </h3>
            
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                  required
                  disabled={!!editingUser}
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required={!editingUser}
                    minLength={6}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Função</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="colaborador">Colaborador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Permissões (telas)</label>
                <div className="grid grid-cols-2 gap-2">
                  {SCREENS.map(s => (
                    <label key={s.id} className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={formData.allowedScreens.includes(s.id)} onChange={() => handleToggleScreen(s.id)} disabled={formData.role === 'admin'} />
                      <span className="text-sm">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Acesso por Filial</label>
                <div className="flex items-center gap-2 mb-2">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={branches.length > 0 && formData.visibleBranchIds.length === branches.length} onChange={handleSelectAllBranches} />
                    <span className="text-sm font-medium">Selecionar todos</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 max-h-32 overflow-y-auto gap-2 p-1 border rounded">
                  {branches.map(b => (
                    <label key={b.id} className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={formData.visibleBranchIds.includes(b.id)} onChange={() => handleToggleBranch(b.id)} disabled={formData.role === 'admin'} />
                      <span className="text-sm">{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Acesso por Tipo de Licença</label>
                <div className="flex items-center gap-2 mb-2">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={licenseTypes.length > 0 && formData.visibleLicenseTypes.length === licenseTypes.length} onChange={handleSelectAllLicenseTypes} />
                    <span className="text-sm font-medium">Selecionar todos</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 max-h-32 overflow-y-auto gap-2 p-1 border rounded">
                  {licenseTypes.map(lt => (
                    <label key={lt.id} className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={formData.visibleLicenseTypes.includes(lt.name)} onChange={() => handleToggleLicenseType(lt.name)} disabled={formData.role === 'admin'} />
                      <span className="text-sm">{lt.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
