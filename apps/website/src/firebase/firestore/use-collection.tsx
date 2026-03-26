'use client';

import { useState, useEffect } from 'react';
import { Query, onSnapshot } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T>(query: Query | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(!!query);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        setData(snapshot.docs.map((doc) => doc.data() as T));
        setLoading(false);
      },
      async (err) => {
        // Find path from internal query object if possible or generic
        const permissionError = new FirestorePermissionError({
          path: 'collection',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [query]);

  return { data, loading, error };
}
