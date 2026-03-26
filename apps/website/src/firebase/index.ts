import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

export function initializeFirebase() {
  let app: FirebaseApp;
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  const firestore = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);

  return { firebaseApp: app, firestore, auth, storage };
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-doc';
export * from './firestore/use-collection';
