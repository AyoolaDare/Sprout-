'use client';
import { auth } from './firebase';

/**
 * Uploads a file to Firebase Storage by proxying it through a local API route.
 * This avoids client-side CORS issues.
 * @param file - The file object to upload.
 * @param onProgress - A callback function to receive upload progress updates (0-100).
 * @param oldLogoUrl - The optional URL of the old logo to delete.
 * @returns A promise that resolves with the public download URL of the file.
 */
export const uploadFile = async (file: File, onProgress?: (progress: number) => void, oldLogoUrl?: string | null): Promise<string> => {
    if (!file) {
        throw new Error('No file provided.');
    }
    
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User is not authenticated.');
    }
    
    const idToken = await user.getIdToken(true);
    const formData = new FormData();
    formData.append('file', file);
    if (oldLogoUrl) {
      formData.append('oldLogoUrl', oldLogoUrl);
    }


    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/proxy-upload', true);
        xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const percentComplete = (event.loaded / event.total) * 100;
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if(onProgress) onProgress(100);
                    resolve(response.downloadURL);
                } catch (e) {
                    reject(new Error('Invalid response from server.'));
                }
            } else {
                let errorMessage = `Upload failed with status: ${xhr.status}.`;
                 try {
                    const response = JSON.parse(xhr.responseText);
                    errorMessage = response.error || errorMessage;
                } catch (e) {
                    // Ignore if response is not JSON
                }
                reject(new Error(errorMessage));
            }
        };

        xhr.onerror = () => {
             reject(new Error('Network error during upload. Please try again.'));
        };

        xhr.send(formData);
    });
};
