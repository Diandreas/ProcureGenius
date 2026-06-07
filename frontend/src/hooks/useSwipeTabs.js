// Detection du swipe horizontal pour naviguer entre onglets (mobile).
// Retourne des handlers a brancher sur un conteneur (onTouchStart/Move/End).
// Sur mobile uniquement ; ignore les gestes verticaux (scroll) et les swipes
// trop courts. Declenche un retour haptique leger au changement d'onglet.

import { useRef, useCallback } from 'react';
import { isNativePlatform } from '../utils/platform';

const SWIPE_MIN_X = 60;      // distance horizontale mini (px)
const SWIPE_MAX_OFF_Y = 50;  // tolerance verticale (au-dela = scroll, on ignore)

const lightHaptic = async () => {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* ignore */ }
};

/**
 * @param {number} activeIndex  index de l'onglet courant
 * @param {number} count        nombre d'onglets
 * @param {(i:number)=>void} setIndex  setter de l'onglet
 * @param {boolean} [enabled=true]  desactive si besoin
 */
export default function useSwipeTabs(activeIndex, count, setIndex, enabled = true) {
  const start = useRef(null);

  const onTouchStart = useCallback((e) => {
    if (!enabled) return;
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  }, [enabled]);

  const onTouchEnd = useCallback((e) => {
    if (!enabled || !start.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    start.current = null;

    if (Math.abs(dx) < SWIPE_MIN_X || Math.abs(dy) > SWIPE_MAX_OFF_Y) return;

    if (dx < 0 && activeIndex < count - 1) {
      setIndex(activeIndex + 1); // swipe gauche -> onglet suivant
      lightHaptic();
    } else if (dx > 0 && activeIndex > 0) {
      setIndex(activeIndex - 1); // swipe droite -> onglet precedent
      lightHaptic();
    }
  }, [enabled, activeIndex, count, setIndex]);

  return { onTouchStart, onTouchEnd };
}
