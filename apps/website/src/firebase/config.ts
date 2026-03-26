'use client';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "placeholder-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "placeholder-app-id",
};

const PLACEHOLDER_PREFIX = 'placeholder-';

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId &&
  !firebaseConfig.apiKey.startsWith(PLACEHOLDER_PREFIX) &&
  !firebaseConfig.authDomain.startsWith(PLACEHOLDER_PREFIX) &&
  !firebaseConfig.projectId.startsWith(PLACEHOLDER_PREFIX) &&
  !firebaseConfig.storageBucket.startsWith(PLACEHOLDER_PREFIX) &&
  !firebaseConfig.messagingSenderId.startsWith(PLACEHOLDER_PREFIX) &&
  !firebaseConfig.appId.startsWith(PLACEHOLDER_PREFIX)
);
