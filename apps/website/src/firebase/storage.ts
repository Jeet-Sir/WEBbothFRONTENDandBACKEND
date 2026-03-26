import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export const uploadUserDocument = async (
    userId: string,
    file: File,
    docType: string,
    onProgress?: (progress: number) => void
): Promise<{ fileUrl: string; storagePath: string }> => {
    // Assumes the default app is already initialized by the provider
    const storage = getStorage();

    // Create a safer filename to avoid collisions or issues, but keeping extension
    const timestamp = Date.now();
    const safeName = `${docType}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storagePath = `users/${userId}/documents/${docType}/${safeName}`;

    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(progress);
            },
            (error) => {
                console.error("Upload failed:", error);
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({
                        fileUrl: downloadURL,
                        storagePath
                    });
                } catch (e) {
                    reject(e);
                }
            }
        );
    });
};
