// Détection de la plateforme d'exécution (web vs app native Capacitor).
// En natif, certaines fonctionnalités web ne marchent pas (ex: Google OAuth
// web est bloqué par Google dans les webviews -> "disallowed_useragent").

/** Vrai si l'app tourne dans le conteneur natif Capacitor (Android/iOS). */
export const isNativePlatform = () => {
  if (typeof window === 'undefined') return false;
  const cap = window.Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function') {
    return cap.isNativePlatform();
  }
  return Boolean(cap && cap.isNative);
};
