// Connexion Google sur app native (Capacitor).
//
// Google interdit son ecran OAuth dans une webview embarquee
// ("disallowed_useragent"). On ouvre donc une page web pont
// (/mobile-auth, servie par le front sur https://procura.mirlab.cloud)
// dans le NAVIGATEUR SYSTEME via @capacitor/browser. Cette page fait le
// vrai flux Google web (autorise dans Chrome), recupere l'access_token,
// puis redirige vers le deep link procura://auth?token=XXX.
// L'app capte ce deep link via @capacitor/app et resout le token.

import { isNativePlatform } from '../utils/platform';

// URL de la page pont (meme origine que le front web de prod).
const BRIDGE_URL =
  (import.meta.env.VITE_MOBILE_API_URL || 'https://procura.mirlab.cloud').replace(/\/$/, '') +
  '/mobile-auth';

const DEEP_LINK_SCHEME = 'procura://auth';

/**
 * Lance la connexion Google native. Resout avec l'access_token Google,
 * ou rejette en cas d'annulation/erreur.
 */
export const signInWithGoogleNative = async () => {
  if (!isNativePlatform()) {
    throw new Error('signInWithGoogleNative ne doit etre appele qu en natif');
  }
  const { Browser } = await import('@capacitor/browser');
  const { App } = await import('@capacitor/app');

  return new Promise(async (resolve, reject) => {
    let settled = false;
    let urlListener = null;
    let finishListener = null;

    const cleanup = async () => {
      if (urlListener) { await urlListener.remove(); urlListener = null; }
      if (finishListener) { await finishListener.remove(); finishListener = null; }
    };

    // Capte le retour via deep link procura://auth?token=...
    urlListener = await App.addListener('appUrlOpen', async ({ url }) => {
      if (!url || !url.startsWith(DEEP_LINK_SCHEME)) return;
      settled = true;
      try {
        const params = new URL(url).searchParams;
        const token = params.get('token');
        const error = params.get('error');
        await Browser.close().catch(() => {});
        await cleanup();
        if (error) return reject(new Error(error));
        if (!token) return reject(new Error('Token Google manquant'));
        resolve(token);
      } catch (e) {
        await cleanup();
        reject(e);
      }
    });

    // Si l'utilisateur ferme le navigateur sans aller au bout.
    finishListener = await Browser.addListener('browserFinished', async () => {
      if (settled) return;
      await cleanup();
      reject(new Error('Connexion Google annulee'));
    });

    try {
      await Browser.open({ url: BRIDGE_URL, presentationStyle: 'popover' });
    } catch (e) {
      await cleanup();
      reject(e);
    }
  });
};
