'use client';

import React, { createContext, useContext } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseContextProps {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
}

const FirebaseContext = createContext<FirebaseContextProps>({
  firebaseApp: null,
  firestore: null,
  auth: null,
  storage: null,
});

export const useFirebase = () => useContext(FirebaseContext);
export const useFirebaseApp = () => useContext(FirebaseContext).firebaseApp;
export const useFirestore = () => useContext(FirebaseContext).firestore;
export const useAuth = () => useContext(FirebaseContext).auth;
export const useStorage = () => useContext(FirebaseContext).storage;

export const FirebaseProvider: React.FC<{
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  children: React.ReactNode;
}> = ({ firebaseApp, firestore, auth, storage, children }) => {
  return (
    <FirebaseContext.Provider value={{ firebaseApp, firestore, auth, storage }}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};
