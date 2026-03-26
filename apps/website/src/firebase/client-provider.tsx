'use client';

import React, { useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';

export const FirebaseClientProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { firebaseApp, firestore, auth, storage } = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      firestore={firestore}
      auth={auth}
      storage={storage}
    >
      {children}
    </FirebaseProvider>
  );
};
