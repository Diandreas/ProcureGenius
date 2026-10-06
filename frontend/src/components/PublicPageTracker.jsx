import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackVisit } from '../services/tracking';

// Pages du parcours d'achat mesurées en plus de l'accueil (qui se mesure
// elle-même dans Landing.jsx). Permet de voir où les visiteurs abandonnent :
// accueil -> tarifs -> inscription -> compte créé.
const PAGES_SUIVIES = ['/pricing', '/register'];

/** Enregistre une visite à chaque arrivée sur une page suivie, visiteurs non connectés seulement. */
export default function PublicPageTracker() {
  const { pathname } = useLocation();
  const derniere = useRef(null);

  useEffect(() => {
    // La ref évite le double appel du mode strict de React en développement.
    if (derniere.current === pathname) return;
    derniere.current = pathname;
    if (!PAGES_SUIVIES.includes(pathname)) return;
    let connecte = false;
    try {
      connecte = !!localStorage.getItem('authToken');
    } catch (_) { /* stockage indisponible : on compte comme anonyme */ }
    if (!connecte) trackVisit(pathname);
  }, [pathname]);

  return null;
}
