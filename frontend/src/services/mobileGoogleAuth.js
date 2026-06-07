// Connexion Google sur app native (Capacitor) via le plugin natif
// @capgo/capacitor-social-login : ouvre le vrai selecteur de compte Google
// du systeme (pas de webview, pas de navigateur). Renvoie un idToken (JWT)
// que le backend verifie.
//
// Prerequis Google Cloud Console :
//  - 1 client OAuth "Web" (= VITE_GOOGLE_CLIENT_ID) -> sert de webClientId / audience
//  - 1 client OAuth "Android" lie au package cloud.mirlab.procura + SHA-1
//    (le client Android n'a pas de secret, il valide juste la signature de l'app)

import { isNativePlatform } from '../utils/platform';

// Client OAuth "Web" Google (le meme que pour le login web).
const WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

let initialized = false;

const ensureInitialized = async () => {
  if (initialized) return;
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  await SocialLogin.initialize({
    google: {
      // webClientId sert d'audience pour l'idToken (cote Android comme iOS).
      webClientId: WEB_CLIENT_ID,
    },
  });
  initialized = true;
};

/**
 * Lance la connexion Google native.
 * Resout avec { idToken, accessToken } (idToken privilegie par le backend).
 */
export const signInWithGoogleNative = async () => {
  if (!isNativePlatform()) {
    throw new Error('signInWithGoogleNative ne doit etre appele qu en natif');
  }
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  await ensureInitialized();

  // NB: ne PAS passer de `scopes` ici. Le plugin capgo exige une modification
  // de MainActivity pour les scopes custom ("You CANNOT use scopes without
  // modifying the main activity"). Sans scopes, on recupere quand meme
  // l'idToken + le profil de base (email/profile), ce qui suffit au backend.
  const res = await SocialLogin.login({
    provider: 'google',
    options: {},
  });

  // Forme du resultat capgo : { provider, result: { idToken, accessToken, profile, ... } }
  const result = res?.result || res || {};
  const idToken =
    result.idToken ||
    result.id_token ||
    (result.accessToken && result.accessToken.token) ||
    null;
  const accessToken =
    (result.accessToken && result.accessToken.token) ||
    result.accessToken ||
    null;

  if (!idToken && !accessToken) {
    throw new Error('Aucun token Google recupere');
  }
  return { idToken, accessToken };
};
