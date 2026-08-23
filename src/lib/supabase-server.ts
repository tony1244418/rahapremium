/**
 * FIREBASE FIRESTORE ADAPTER — Server-side (same API as Supabase server client)
 * Replaces supabaseServer with a Firebase Firestore adapter.
 * All existing API routes using `supabaseServer` continue to work unchanged.
 */
export { supabase as supabaseServer } from './supabase';
