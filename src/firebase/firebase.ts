import * as admin from 'firebase-admin';
import fs from 'fs';
import { config } from '../config/env';

let firestoreInstance: FirebaseFirestore.Firestore | null = null;

export function getFirestore(): FirebaseFirestore.Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  if (admin.apps.length === 0) {
    if (config.firebase.serviceAccountKeyPath && fs.existsSync(config.firebase.serviceAccountKeyPath)) {
      console.log(`[Firebase] Initializing with service account file: ${config.firebase.serviceAccountKeyPath}`);
      const serviceAccount = JSON.parse(fs.readFileSync(config.firebase.serviceAccountKeyPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else if (config.firebase.clientEmail && config.firebase.privateKey) {
      console.log('[Firebase] Initializing with environment credentials');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey
        })
      });
    } else {
      console.log(`[Firebase] Initializing with default credentials/emulator (Project ID: ${config.firebase.projectId || 'chat-app-project'})`);
      admin.initializeApp({
        projectId: config.firebase.projectId || 'chat-app-project'
      });
    }
  }

  firestoreInstance = admin.firestore();
  return firestoreInstance;
}
