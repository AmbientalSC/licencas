import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'colaborador' | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setAuthLoading(false);
      }
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
          if (docData.active === false) {
            setUserRole(null);
            setUserProfile(null);
            setAuthLoading(false);
            await signOut(auth);
            return;
          }
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
              allowedScreens: ['dashboard', 'licenses', 'sgaLicenses', 'deactivatedLicenses', 'licenseTypes', 'branches', 'laoConditions', 'users'],
              visibleBranchIds: [],
              visibleLicenseTypes: [],
              createdAt: new Date().toISOString()
            });
            setUserRole('admin');
            setUserProfile({ id: newUserDoc.id, uid: user.uid, name: user.displayName || user.email?.split('@')[0] || 'Admin', email: user.email, role: 'admin', active: true, allowedScreens: ['dashboard', 'licenses', 'sgaLicenses', 'deactivatedLicenses', 'licenseTypes', 'branches', 'laoConditions', 'users'] });
          } else {
            setUserRole('colaborador');
            setUserProfile({ id: '', uid: user.uid, name: user.displayName || '', email: user.email || '', role: 'colaborador', active: true, allowedScreens: ['dashboard'] });
          }
        }
        setAuthLoading(false);
      } else {
        setUserRole(null);
      }
    };
    fetchUserRole();
  }, [user]);

  return { user, userRole, userProfile, authLoading };
}
