import React, { useLayoutEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Pages publiques sous /en/… et /de/… : l'adresse fixe la langue (une adresse
 * par langue pour le référencement). Le choix est mémorisé pour la suite de la visite.
 */
export default function LangueUrl({ langue }) {
  const { i18n } = useTranslation();
  const actuelle = (i18n.resolvedLanguage || i18n.language || '').slice(0, 2);

  // À l'arrivée sur l'adresse seulement : si la personne choisit ensuite une autre
  // langue, le sélecteur l'emmène à l'adresse de cette langue (pas de bras de fer).
  useLayoutEffect(() => {
    if ((i18n.resolvedLanguage || i18n.language || '').slice(0, 2) !== langue) {
      i18n.changeLanguage(langue); // ressources déjà chargées : immédiat
      try { localStorage.setItem('appLanguage', langue); } catch { /* stockage bloqué */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langue]);

  // Rien tant que la langue de l'adresse n'est pas appliquée (évite un éclair dans l'autre langue)
  const [prete, setPrete] = React.useState(actuelle === langue);
  React.useEffect(() => { if (actuelle === langue) setPrete(true); }, [actuelle, langue]);
  return prete ? <Outlet /> : null;
}
