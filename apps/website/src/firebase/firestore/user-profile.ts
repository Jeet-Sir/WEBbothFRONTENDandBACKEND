import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { initializeFirebase } from '@/firebase';

const getDb = () => {
    const { firestore } = initializeFirebase();
    return firestore;
};

/**
 * Saves or updates the user profile in Firestore.
 * Using 'merge: true' to prevent overwriting existing fields that aren't passed.
 */
export const saveUserProfile = async (userId: string, data: Partial<UserProfile>) => {
    const db = getDb();
    const userRef = doc(db, 'users', userId);

    // We can add distinct updated_at timestamp if needed
    await setDoc(userRef, {
        ...data,
        updatedAt: new Date().toISOString()
    }, { merge: true });
};

/**
 * Fetches the user profile from Firestore.
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    const db = getDb();
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        return snap.data() as UserProfile;
    }
    return null;
};
