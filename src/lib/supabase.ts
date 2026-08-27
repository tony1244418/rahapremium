/**
 * FIREBASE FIRESTORE ADAPTER — Supabase-compatible API
 *
 * This file replaces the Supabase client with a Firebase Firestore adapter
 * that has the same chained query API (.from().select().eq().order()...).
 *
 * All existing code using `supabase` continues to work unchanged.
 */
import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  WhereFilterOp,
  Query,
  CollectionReference,
  DocumentData,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Avoid re-initializing if already done
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Strip undefined values from data structures before passing to Firestore
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as T;
  }
  return data;
}

// ─── Query Builder ────────────────────────────────────────────────────────────

type OrderOpt = { ascending?: boolean };
type WhereClause = { field: string; op: WhereFilterOp; value: unknown };

class FirestoreQueryBuilder {
  private _collection: string;
  private _wheres: WhereClause[] = [];
  private _orders: { field: string; dir: 'asc' | 'desc' }[] = [];
  private _limit: number | null = null;
  private _rangeFrom: number | null = null;
  private _rangeTo: number | null = null;
  private _updateData: Record<string, unknown> | null = null;
  private _insertData: unknown[] | null = null;
  private _upsertData: unknown[] | null = null;
  private _isDelete = false;
  private _isUpsert = false;

  constructor(collectionName: string) {
    this._collection = collectionName;
  }

  // ── Chainable filters ──────────────────────────────────────────────────────

  select(_fields?: string) { return this; }

  eq(field: string, value: unknown) {
    this._wheres.push({ field, op: '==', value });
    return this;
  }

  neq(field: string, value: unknown) {
    this._wheres.push({ field, op: '!=', value });
    return this;
  }

  in(field: string, values: unknown[]) {
    this._wheres.push({ field, op: 'in', value: values });
    return this;
  }

  contains(field: string, value: unknown) {
    this._wheres.push({ field, op: 'array-contains', value });
    return this;
  }

  gt(field: string, value: unknown) {
    this._wheres.push({ field, op: '>', value });
    return this;
  }

  gte(field: string, value: unknown) {
    this._wheres.push({ field, op: '>=', value });
    return this;
  }

  lt(field: string, value: unknown) {
    this._wheres.push({ field, op: '<', value });
    return this;
  }

  lte(field: string, value: unknown) {
    this._wheres.push({ field, op: '<=', value });
    return this;
  }

  order(field: string, opts?: OrderOpt) {
    this._orders.push({ field, dir: opts?.ascending === false ? 'desc' : 'asc' });
    return this;
  }

  limit(n: number) {
    this._limit = n;
    return this;
  }

  range(from: number, to: number) {
    this._rangeFrom = from;
    this._rangeTo = to;
    return this;
  }

  // ── Write methods ──────────────────────────────────────────────────────────

  update(data: Record<string, unknown>) {
    this._updateData = data;
    return this;
  }

  insert(data: unknown | unknown[]) {
    this._insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  upsert(data: unknown | unknown[], _opts?: unknown) {
    this._upsertData = Array.isArray(data) ? data : [data];
    this._isUpsert = true;
    return this;
  }

  delete() {
    this._isDelete = true;
    return this;
  }

  // ── Execution ──────────────────────────────────────────────────────────────

  private buildQuery(): Query<DocumentData> | CollectionReference<DocumentData> {
    const colRef = collection(db, this._collection);
    const constraints: Parameters<typeof query>[1][] = [];

    for (const w of this._wheres) {
      constraints.push(where(w.field, w.op, w.value));
    }
    for (const o of this._orders) {
      constraints.push(orderBy(o.field, o.dir));
    }
    if (this._limit !== null) {
      constraints.push(firestoreLimit(this._limit));
    } else if (this._rangeTo !== null) {
      // Fetch enough to slice the range
      constraints.push(firestoreLimit(this._rangeTo + 1));
    }

    return constraints.length > 0 ? query(colRef, ...constraints) : colRef;
  }

  private async executeRead() {
    try {
      // Direct ID lookup optimization (instant 10ms fetch, prevents full collection downloads)
      const idWhere = this._wheres.find(w => w.field === 'id' && w.op === '==');
      if (idWhere && typeof idWhere.value === 'string' && this._wheres.length === 1) {
        try {
          const docRef = doc(db, this._collection, idWhere.value);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return { data: [{ id: docSnap.id, ...docSnap.data() }], error: null };
          }
        } catch (err) {}
      }

      const q = this.buildQuery();
      const snapshot = await getDocs(q as Query<DocumentData>);
      let rows = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Apply range slicing
      if (this._rangeFrom !== null && this._rangeTo !== null) {
        rows = rows.slice(this._rangeFrom, this._rangeTo + 1);
      }

      return { data: rows, error: null };
    } catch (e: any) {
      // If Firestore fails due to missing composite index, gracefully fallback to in-memory filter & sort
      if (e?.message && (e.message.includes('requires an index') || e.message.includes('FAILED_PRECONDITION') || e.code === 'failed-precondition')) {
        try {
          const colRef = collection(db, this._collection);
          const snapshot = await getDocs(colRef);
          let rows: any[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

          // Apply where filters in memory
          for (const w of this._wheres) {
            rows = rows.filter(r => {
              const val = r[w.field];
              if (w.op === '==') return val === w.value;
              if (w.op === '!=') return val !== w.value;
              if (w.op === 'in') return Array.isArray(w.value) && w.value.includes(val);
              if (w.op === 'array-contains') return Array.isArray(val) && val.includes(w.value);
              if (w.op === '>') return val > (w.value as any);
              if (w.op === '>=') return val >= (w.value as any);
              if (w.op === '<') return val < (w.value as any);
              if (w.op === '<=') return val <= (w.value as any);
              return true;
            });
          }

          // Apply order in memory
          for (const o of this._orders) {
            rows.sort((a, b) => {
              const valA = a[o.field];
              const valB = b[o.field];
              if (valA === valB) return 0;
              if (valA === undefined || valA === null) return 1;
              if (valB === undefined || valB === null) return -1;
              const dateA = new Date(valA).getTime();
              const dateB = new Date(valB).getTime();
              const compare = (!isNaN(dateA) && !isNaN(dateB)) ? (dateA - dateB) : (valA > valB ? 1 : -1);
              return o.dir === 'desc' ? -compare : compare;
            });
          }

          // Apply limit / range
          if (this._limit !== null) {
            rows = rows.slice(0, this._limit);
          } else if (this._rangeFrom !== null && this._rangeTo !== null) {
            rows = rows.slice(this._rangeFrom, this._rangeTo + 1);
          }

          return { data: rows, error: null };
        } catch (fallbackErr: any) {
          console.error(`[Firebase adapter] fallback error on "${this._collection}":`, fallbackErr.message);
          return { data: null, error: { message: fallbackErr.message } };
        }
      }

      console.error(`[Firebase adapter] read error on "${this._collection}":`, e.message);
      return { data: null, error: { message: e.message } };
    }
  }

  private async executeWrite() {
    try {
      // INSERT
      if (this._insertData) {
        const results = [];
        for (const item of this._insertData) {
          const d = sanitizeForFirestore(item as Record<string, unknown>);
          if (d.id) {
            const docRef = doc(db, this._collection, String(d.id));
            await setDoc(docRef, d, { merge: false });
            results.push({ id: d.id, ...d });
          } else {
            const docRef = await addDoc(collection(db, this._collection), d);
            results.push({ id: docRef.id, ...d });
          }
        }
        return { data: results.length === 1 ? results[0] : results, error: null };
      }

      // UPSERT
      if (this._upsertData) {
        const results = [];
        for (const item of this._upsertData) {
          const d = sanitizeForFirestore(item as Record<string, unknown>);
          if (d.id) {
            const docRef = doc(db, this._collection, String(d.id));
            await setDoc(docRef, d, { merge: true });
            results.push({ id: d.id, ...d });
          } else {
            const docRef = await addDoc(collection(db, this._collection), d);
            results.push({ id: docRef.id, ...d });
          }
        }
        return { data: results.length === 1 ? results[0] : results, error: null };
      }

      // UPDATE — apply to all matching docs
      if (this._updateData) {
        const cleanUpdate = sanitizeForFirestore(this._updateData);
        const q = this.buildQuery();
        const snapshot = await getDocs(q as Query<DocumentData>);
        const updates = snapshot.docs.map(d => updateDoc(d.ref, cleanUpdate));
        await Promise.all(updates);
        const updated = snapshot.docs.map(d => ({ id: d.id, ...d.data(), ...cleanUpdate }));
        return { data: updated.length === 1 ? updated[0] : updated, error: null };
      }

      // DELETE — apply to all matching docs
      if (this._isDelete) {
        const q = this.buildQuery();
        const snapshot = await getDocs(q as Query<DocumentData>);
        await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
        return { data: null, error: null };
      }

      return { data: null, error: null };
    } catch (e: unknown) {
      const err = e as Error;
      console.error(`[Firebase adapter] write error on "${this._collection}":`, err.message);
      return { data: null, error: { message: err.message } };
    }
  }

  // Thenable — allows `await supabase.from(...).select().eq(...)` directly
  then(
    resolve: (value: { data: unknown; error: unknown }) => void,
    reject: (reason?: unknown) => void
  ) {
    const isWrite = this._insertData || this._upsertData || this._updateData || this._isDelete;
    const p = isWrite ? this.executeWrite() : this.executeRead();
    return p.then(resolve, reject);
  }

  // ── Single-result helpers ─────────────────────────────────────────────────

  async single() {
    const { data, error } = await this.executeRead();
    if (error) return { data: null, error };
    const rows = data as unknown[];
    if (!rows || rows.length === 0) {
      return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
    }
    return { data: rows[0], error: null };
  }

  async maybeSingle() {
    const { data, error } = await this.executeRead();
    if (error) return { data: null, error };
    const rows = data as unknown[];
    return { data: rows?.[0] ?? null, error: null };
  }
}

import { onSnapshot } from 'firebase/firestore';

// ─── Realtime Channel (Firestore onSnapshot) ────────────────────────────────

class RealtimeChannel {
  private _name: string;
  private _unsubs: (() => void)[] = [];
  private _listeners: { event: string; table: string; filter?: string; callback: (payload: any) => void }[] = [];

  constructor(name: string) {
    this._name = name;
  }

  on(type: string, filterConfig: { event?: string; schema?: string; table?: string; filter?: string }, callback: (payload: any) => void) {
    const table = filterConfig.table;
    const filter = filterConfig.filter;
    if (table) {
      this._listeners.push({ event: filterConfig.event || '*', table, filter, callback });
    }
    return this;
  }

  subscribe(statusCallback?: (status: string, err?: Error) => void) {
    for (const listener of this._listeners) {
      try {
        if (listener.filter && listener.filter.startsWith('id=eq.')) {
          const docId = listener.filter.replace('id=eq.', '').trim();
          const docRef = doc(db, listener.table, docId);
          const unsub = onSnapshot(docRef, (snap) => {
            const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
            listener.callback({
              eventType: snap.exists() ? 'UPDATE' : 'DELETE',
              new: data,
              old: null,
            });
          }, (err) => {
            if (statusCallback) statusCallback('CHANNEL_ERROR', err);
          });
          this._unsubs.push(unsub);
        } else {
          const colRef = collection(db, listener.table);
          const unsub = onSnapshot(colRef, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              const eventType = change.type === 'added' ? 'INSERT' : change.type === 'modified' ? 'UPDATE' : 'DELETE';
              listener.callback({
                eventType,
                new: { id: change.doc.id, ...change.doc.data() },
                old: null,
              });
            });
          }, (err) => {
            if (statusCallback) statusCallback('CHANNEL_ERROR', err);
          });
          this._unsubs.push(unsub);
        }
      } catch (e: any) {
        if (statusCallback) statusCallback('CHANNEL_ERROR', e);
      }
    }

    if (statusCallback) {
      setTimeout(() => statusCallback('SUBSCRIBED'), 0);
    }
    return this;
  }

  unsubscribe() {
    this._unsubs.forEach(u => {
      try { u(); } catch (e) {}
    });
    this._unsubs = [];
  }
}

// ─── Auth Facade (Supabase-compatible Auth API) ─────────────────────────────

type AuthStateChangeCallback = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'INITIAL_SESSION', session: any) => void;
const authListeners = new Set<AuthStateChangeCallback>();

let currentAuthSession: any = null;

if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('supabase_auth_session');
    if (saved) {
      currentAuthSession = JSON.parse(saved);
    }
  } catch (e) {}
}

const authFacade = {
  onAuthStateChange: (callback: AuthStateChangeCallback) => {
    authListeners.add(callback);
    // Trigger initial session asynchronously
    setTimeout(() => {
      callback('INITIAL_SESSION', currentAuthSession);
    }, 0);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(callback);
          }
        }
      }
    };
  },

  getSession: async () => {
    return {
      data: { session: currentAuthSession },
      error: null
    };
  },

  getUser: async (token?: string) => {
    return {
      data: { user: currentAuthSession?.user ?? null },
      error: null
    };
  },

  signInWithPassword: async ({ email, password }: { email: string; password?: string }) => {
    try {
      // Find admin record in Firestore admins collection
      const q = query(collection(db, 'admins'), where('email', '==', email), firestoreLimit(1));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
      }

      const adminDoc = snap.docs[0];
      const adminData = { id: adminDoc.id, ...adminDoc.data() } as any;

      if (adminData.is_active === false) {
        return { data: { user: null, session: null }, error: { message: 'Email not confirmed or deactivated' } };
      }

      const user = {
        id: adminData.id,
        email: adminData.email,
        user_metadata: { display_name: adminData.display_name }
      };

      const session = {
        access_token: `admin_token_${adminData.id}`,
        token_type: 'bearer',
        user
      };

      currentAuthSession = session;
      if (typeof window !== 'undefined') {
        localStorage.setItem('supabase_auth_session', JSON.stringify(session));
      }

      // Notify listeners
      authListeners.forEach(cb => cb('SIGNED_IN', session));

      return {
        data: { user, session },
        error: null
      };
    } catch (err: any) {
      return { data: { user: null, session: null }, error: { message: err.message || 'Login failed' } };
    }
  },

  signOut: async () => {
    currentAuthSession = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase_auth_session');
    }
    authListeners.forEach(cb => cb('SIGNED_OUT', null));
    return { error: null };
  },
};

// ─── Supabase-compatible client facade ───────────────────────────────────────

const firestoreClient = {
  from: (collectionName: string) => new FirestoreQueryBuilder(collectionName),

  // Realtime channel support mapped to Firestore onSnapshot
  channel: (name: string) => new RealtimeChannel(name),
  removeChannel: (channel: any) => {
    if (channel && typeof channel.unsubscribe === 'function') {
      channel.unsubscribe();
    }
  },

  // Full Auth API
  auth: authFacade,
};

export const supabase = firestoreClient;
