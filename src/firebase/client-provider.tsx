
'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { signInAnonymously } from 'firebase/auth';

export const FirebaseClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [instances, setInstances] = useState<ReturnType<typeof initializeFirebase> | null>(null);

  useEffect(() => {
    const { app, auth, db } = initializeFirebase();
    setInstances({ app, auth, db });
    
    // Auto sign-in anonymously to get a persistent UID
    signInAnonymously(auth).catch(err => console.error("Auth Error:", err));
  }, []);

  if (!instances) return null;

  return (
    <FirebaseProvider app={instances.app} auth={instances.auth} db={instances.db}>
      {children}
    </FirebaseProvider>
  );
};
