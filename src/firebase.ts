import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { AccountEntity, CloudBackupInfo, TransactionEntity } from './types/models';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: Array<{
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const user = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified,
      isAnonymous: user?.isAnonymous,
      tenantId: user?.tenantId,
      providerInfo:
        user?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) ?? [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration: the client is offline.');
    }
  }
}

export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithEmailPassword(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
}

export async function registerWithEmailPassword(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (!result.user.emailVerified) {
    await sendEmailVerification(result.user);
  }
  return result.user;
}

export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('No signed-in user found.');
  }
  await sendEmailVerification(auth.currentUser);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function reloadCurrentUser(): Promise<User | null> {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export async function signOutGoogle(): Promise<void> {
  await signOut(auth);
}

export function observeCloudAccounts(
  uid: string,
  onData: (accounts: AccountEntity[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = `users/${uid}/accounts`;
  const colRef = collection(db, 'users', uid, 'accounts');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: AccountEntity[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name ?? 'Account'),
          type: (data.type as AccountEntity['type']) ?? 'CASH',
          institution: String(data.institution ?? ''),
          balance: Number(data.balance ?? 0),
          openingBalance: Number(data.openingBalance ?? 0),
          accountNumberLast4: String(data.accountNumberLast4 ?? ''),
          colorHex: String(data.colorHex ?? '#4F46E5'),
          iconName: String(data.iconName ?? 'account_balance'),
          isHidden: Boolean(data.isHidden ?? false),
          sortOrder: Number(data.sortOrder ?? 0),
          creditLimit: Number(data.creditLimit ?? 0),
          billingDate: String(data.billingDate ?? ''),
          paymentDueDate: String(data.paymentDueDate ?? ''),
          minPayment: Number(data.minPayment ?? 0),
          notes: String(data.notes ?? ''),
          includeInTotal: data.includeInTotal === undefined ? true : Boolean(data.includeInTotal),
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export function observeCloudTransactions(
  uid: string,
  onData: (transactions: TransactionEntity[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = `users/${uid}/transactions`;
  const colRef = collection(db, 'users', uid, 'transactions');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: TransactionEntity[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: (data.type as TransactionEntity['type']) ?? 'EXPENSE',
          amount: Number(data.amount ?? 0),
          title: String(data.title ?? 'Transaction'),
          category: String(data.category ?? 'Other Expenses'),
          subcategory: String(data.subcategory ?? ''),
          accountId: String(data.accountId ?? ''),
          toAccountId: data.toAccountId ? String(data.toAccountId) : null,
          timestamp: Number(data.timestamp ?? Date.now()),
          notes: String(data.notes ?? ''),
          isRecurring: Boolean(data.isRecurring ?? false),
          payeeOrPayer: String(data.payeeOrPayer ?? ''),
          debtId: data.debtId ? String(data.debtId) : null,
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function saveCloudAccount(uid: string, account: AccountEntity): Promise<void> {
  const docRef = doc(db, 'users', uid, 'accounts', account.id);
  const path = `users/${uid}/accounts/${account.id}`;
  try {
    const existing = await getDoc(docRef);
    const payload: Record<string, unknown> = {
      userId: uid,
      name: account.name.slice(0, 100) || 'Account',
      type: account.type,
      institution: account.institution.slice(0, 100),
      balance: account.balance,
      openingBalance: account.openingBalance,
      accountNumberLast4: account.accountNumberLast4.slice(0, 10),
      colorHex: account.colorHex.slice(0, 20),
      iconName: account.iconName.slice(0, 50),
      isHidden: account.isHidden,
      sortOrder: Math.trunc(account.sortOrder),
      creditLimit: account.creditLimit,
      billingDate: account.billingDate.slice(0, 30),
      paymentDueDate: account.paymentDueDate.slice(0, 30),
      minPayment: account.minPayment,
      notes: account.notes.slice(0, 1000),
      includeInTotal: account.includeInTotal,
      updatedAt: serverTimestamp(),
    };
    if (!existing.exists()) {
      payload.createdAt = serverTimestamp();
      await setDoc(docRef, payload);
    } else {
      await setDoc(docRef, payload, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCloudAccount(uid: string, accountId: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'accounts', accountId);
  const path = `users/${uid}/accounts/${accountId}`;
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCloudTransaction(uid: string, tx: TransactionEntity): Promise<void> {
  const docRef = doc(db, 'users', uid, 'transactions', tx.id);
  const path = `users/${uid}/transactions/${tx.id}`;
  try {
    const existing = await getDoc(docRef);
    const payload: Record<string, unknown> = {
      userId: uid,
      type: tx.type,
      amount: Math.abs(tx.amount),
      title: (tx.title.trim() || tx.category || 'Transaction').slice(0, 200),
      category: tx.category.slice(0, 100),
      subcategory: tx.subcategory.slice(0, 100),
      accountId: tx.accountId.slice(0, 100),
      toAccountId: tx.toAccountId && tx.toAccountId.trim() ? tx.toAccountId.slice(0, 100) : null,
      timestamp: Math.trunc(tx.timestamp),
      notes: tx.notes.slice(0, 1000),
      isRecurring: tx.isRecurring,
      payeeOrPayer: tx.payeeOrPayer.slice(0, 100),
      debtId: tx.debtId && tx.debtId.trim() ? tx.debtId.slice(0, 100) : null,
      updatedAt: serverTimestamp(),
    };
    if (!existing.exists()) {
      payload.createdAt = serverTimestamp();
      await setDoc(docRef, payload);
    } else {
      await setDoc(docRef, payload, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCloudTransaction(uid: string, txId: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'transactions', txId);
  const path = `users/${uid}/transactions/${txId}`;
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncLocalDataToCloud(
  uid: string,
  accounts: AccountEntity[],
  transactions: TransactionEntity[]
): Promise<void> {
  for (const acc of accounts) {
    await saveCloudAccount(uid, acc);
  }
  for (const tx of transactions) {
    await saveCloudTransaction(uid, tx);
  }
}

export async function saveCloudBackup(
  uid: string,
  jsonString: string,
  counts: {
    accountsCount: number;
    transactionsCount: number;
    categoriesCount: number;
    debtsCount: number;
  }
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'backups', 'latest');
  const path = `users/${uid}/backups/latest`;
  try {
    const fileSizeBytes = new TextEncoder().encode(jsonString).length;
    await setDoc(docRef, {
      userId: uid,
      backupJson: jsonString,
      backupDate: new Date().toISOString(),
      accountsCount: counts.accountsCount,
      transactionsCount: counts.transactionsCount,
      categoriesCount: counts.categoriesCount,
      debtsCount: counts.debtsCount,
      fileSizeBytes,
      uploadedAt: serverTimestamp(),
      uploadedAtMillis: Date.now(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchLatestCloudBackup(
  uid: string
): Promise<{ jsonString: string; info: CloudBackupInfo } | null> {
  const docRef = doc(db, 'users', uid, 'backups', 'latest');
  const path = `users/${uid}/backups/latest`;
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    const jsonString = String(data.backupJson ?? '');
    if (!jsonString) return null;
    return {
      jsonString,
      info: {
        backupDate: String(data.backupDate ?? 'Latest Cloud Backup'),
        uploadedAtTimestamp: Number(data.uploadedAtMillis ?? Date.now()),
        accountsCount: Number(data.accountsCount ?? 0),
        transactionsCount: Number(data.transactionsCount ?? 0),
        categoriesCount: Number(data.categoriesCount ?? 0),
        debtsCount: Number(data.debtsCount ?? 0),
        fileSizeBytes: Number(data.fileSizeBytes ?? jsonString.length),
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteAllCloudUserData(uid: string): Promise<void> {
  const basePath = `users/${uid}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'backups', 'latest'));
    const accountsSnap = await getDocs(collection(db, 'users', uid, 'accounts'));
    for (const d of accountsSnap.docs) {
      await deleteDoc(d.ref);
    }
    const txSnap = await getDocs(collection(db, 'users', uid, 'transactions'));
    for (const d of txSnap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, basePath);
  }
}
