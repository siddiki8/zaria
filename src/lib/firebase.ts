import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check'
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

export function isFirebaseClient() {
  return typeof window !== 'undefined'
}

let firebaseApp: FirebaseApp | undefined
let authClient: Auth | undefined
let firestoreClient: Firestore | undefined
let appCheckClient: AppCheck | undefined

function ensureAppCheck(app: FirebaseApp) {
  if (appCheckClient || typeof window === 'undefined') return

  const siteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY
  if (!siteKey) return

  if (import.meta.env.DEV) {
    const debugToken = import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(self as any).FIREBASE_APPCHECK_DEBUG_TOKEN =
      debugToken && debugToken.length > 0 ? debugToken : true
  }

  appCheckClient = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

function ensureFirebase() {
  if (!isFirebaseClient()) {
    throw new Error('Firebase client SDK is only available in the browser.')
  }

  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env.local and add your Firebase web app config.',
    )
  }

  if (!firebaseApp) {
    firebaseApp =
      getApps().length > 0 ? getApps()[0]! : initializeApp(getFirebaseConfig())
    ensureAppCheck(firebaseApp)
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
