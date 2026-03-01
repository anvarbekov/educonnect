'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            setUserProfile({ id: profileDoc.id, ...profileDoc.data() });
          } else {
            setUserProfile({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Foydalanuvchi',
              email: firebaseUser.email,
              role: 'student',
            });
          }
        } catch (err) {
          console.warn('Profil yuklanmadi:', err.message);
          setUserProfile({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Foydalanuvchi',
            email: firebaseUser.email,
            role: 'student',
          });
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  };

  const register = async (email, password, name, role = 'student') => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });

    await setDoc(doc(db, 'users', result.user.uid), {
      name,
      email,
      role,
      createdAt: serverTimestamp(),
      isActive: true,
      isMuted: false,
    });

    return result;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (user) {
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      if (profileDoc.exists()) {
        setUserProfile({ id: profileDoc.id, ...profileDoc.data() });
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);