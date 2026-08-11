import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }
}

export function isFirebaseConfigured() {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID,
  )
}

let firebaseApp: FirebaseApp | undefined
let authClient: Auth | undefined
let firestoreClient: Firestore | undefined

function ensureFirebase() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env.local and add your Firebase web app config.',
    )
  }

  if (!firebaseApp) {
    firebaseApp =
      getApps().length > 0 ? getApps()[0]! : initializeApp(getFirebaseConfig())
    authClient = getAuth(firebaseApp)
    firestoreClient = getFirestore(firebaseApp)
  }

  return {
    app: firebaseApp,
    auth: authClient!,
    db: firestoreClient!,
  }
}

export function getFirebaseApp() {
  return ensureFirebase().app
}

export function getAuthClient() {
  return ensureFirebase().auth
}

export function getDb() {
  return ensureFirebase().db
}

export const googleProvider = new GoogleAuthProvider()
