import { useEffect, useRef } from 'react';
import { doc, setDoc, serverTimestamp, onDisconnect } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useOnlineStatus(userId) {
  const presenceRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const ref = doc(db, 'presence', userId);
    presenceRef.current = ref;

    // Set online
    setDoc(ref, {
      online: true,
      lastSeen: serverTimestamp(),
      userId,
    }).catch(() => {});

    // Handle page visibility
    const handleVisibility = () => {
      if (document.hidden) {
        setDoc(ref, { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
      } else {
        setDoc(ref, { online: true, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
      }
    };

    // Handle unload
    const handleUnload = () => {
      setDoc(ref, { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      setDoc(ref, { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    };
  }, [userId]);
}
