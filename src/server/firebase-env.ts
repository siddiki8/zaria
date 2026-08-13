/**
 * Firebase web API key for server-side token verification.
 * Client uses import.meta.env; Cloudflare Workers dev uses .dev.vars → process.env.
 */
export function getFirebaseWebApiKey(): string | undefined {
  const fromVite = import.meta.env.VITE_FIREBASE_API_KEY
  if (typeof fromVite === 'string' && fromVite.length > 0) return fromVite

  const fromProcess =
    process.env.VITE_FIREBASE_API_KEY ?? process.env.FIREBASE_WEB_API_KEY
  if (typeof fromProcess === 'string' && fromProcess.length > 0) {
    return fromProcess
  }

  return undefined
}
