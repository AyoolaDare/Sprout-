
// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

// This interface is a safeguard to ensure we have the correct structure for our service account key.
interface ServiceAccount {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
}

// Function to safely initialize the admin app
function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountString) {
    console.error("FATAL: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. The Firebase Admin SDK cannot be initialized.");
    throw new Error("Firebase Admin SDK credentials are not configured.");
  }

  try {
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountString);

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: 'bizbalance-o2v9w.firebasestorage.app',
    });
  } catch (error: any) {
    console.error(`FATAL: Could not initialize Firebase Admin SDK. Error parsing service account key: ${error.message}`);
    throw new Error(
      `Could not initialize Firebase Admin SDK. Check the FIREBASE_SERVICE_ACCOUNT_KEY environment variable.`
    );
  }
}

/**
 * Initializes the Firebase Admin SDK if not already initialized and returns the auth service.
 * This on-demand pattern is robust for serverless environments.
 */
export function getAdminAuth(): admin.auth.Auth {
  const app = initializeAdminApp();
  return app.auth();
}

/**
 * Initializes the Firebase Admin SDK if not already initialized and returns the storage service.
 */
export function getAdminStorage(): admin.storage.Storage {
  const app = initializeAdminApp();
  return app.storage();
}
