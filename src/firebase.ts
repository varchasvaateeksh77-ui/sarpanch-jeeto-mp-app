import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export interface UserProfileRecord {
  uid: string;
  displayName: string;
  email: string;
  assignedPanchayatId: string;
  assignedPanchayatName: string;
  role: 'candidate' | 'worker';
}

export async function signInWithGoogleAndInitProfile(
  currentPanchayatId: string,
  currentPanchayatName: string
): Promise<{ user: User; profile: UserProfileRecord }> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  const safeDisplayName = (user.displayName || 'सरपंच उम्मीदवार').slice(0, 100);
  const safeEmail = (user.email || 'user@example.com').slice(0, 160);
  const safeGpId = (currentPanchayatId || 'sehore/sehore/mahodiya').slice(
    0,
    120
  );
  const safeGpName = (currentPanchayatName || 'महौदिया').slice(0, 120);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        user,
        profile: {
          uid: user.uid,
          displayName: String(data.displayName || safeDisplayName),
          email: String(data.email || safeEmail),
          assignedPanchayatId: String(data.assignedPanchayatId || safeGpId),
          assignedPanchayatName: String(
            data.assignedPanchayatName || safeGpName
          ),
          role: data.role === 'worker' ? 'worker' : 'candidate',
        },
      };
    }

    await setDoc(userRef, {
      uid: user.uid,
      displayName: safeDisplayName,
      email: safeEmail,
      assignedPanchayatId: safeGpId,
      assignedPanchayatName: safeGpName,
      role: 'candidate',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      user,
      profile: {
        uid: user.uid,
        displayName: safeDisplayName,
        email: safeEmail,
        assignedPanchayatId: safeGpId,
        assignedPanchayatName: safeGpName,
        role: 'candidate',
      },
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
}

export async function lockUserToPanchayatInFirestore(
  uid: string,
  panchayatId: string,
  panchayatName: string
): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      assignedPanchayatId: panchayatId.slice(0, 120),
      assignedPanchayatName: panchayatName.slice(0, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, userPath);
  }
}

export async function clearFirestoreTestRunsForCurrentUser(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;
  const campPath = `campaigns/${currentUser.uid}`;
  const campRef = doc(db, 'campaigns', currentUser.uid);
  try {
    const snap = await getDoc(campRef);
    if (snap.exists()) {
      await deleteDoc(campRef);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, campPath);
  }
}

export { onAuthStateChanged, signOut };
export type { User };
