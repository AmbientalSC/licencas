import React, { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { User } from '../types';

interface ForceChangePasswordProps {
  userProfile: User;
  onDone: () => void;
}

const ForceChangePassword: React.FC<ForceChangePasswordProps> = ({ userProfile, onDone }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      setError('Sessão inválida. Faça login novamente.');
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      if (userProfile.id) {
        await updateDoc(doc(db, 'users', userProfile.id), { mustChangePassword: false });
      }

      onDone();
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Senha atual incorreta.');
      } else if (err.code === 'auth/weak-password') {
        setError('A nova senha é muito fraca.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Aguarde um momento e tente novamente.');
      } else {
        setError('Erro ao trocar senha: ' + (err.message || 'tente novamente.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700">Troca de senha obrigatória</h2>
          <p className="mt-2 text-sm text-gray-500">
            Sua senha foi redefinida por um administrador. Defina uma nova senha para continuar.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="currentPassword" className="font-semibold text-gray-600">Senha temporária atual</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            required
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="newPassword" className="font-semibold text-gray-600">Nova senha</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            required
            minLength={8}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="confirmPassword" className="font-semibold text-gray-600">Confirmar nova senha</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            required
            minLength={8}
          />
        </div>

        {error && <div className="text-red-600 text-sm text-center">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Definir nova senha'}
        </button>
      </form>
    </div>
  );
};

export default ForceChangePassword;
