// Pull-to-refresh (tirer vers le bas pour rafraichir) pour les listes mobile.
// Enveloppe le contenu : quand on tire vers le bas alors que le scroll est en
// haut, on declenche onRefresh(). Indicateur visuel + retour haptique.
// Actif uniquement sur app native ; en web, rend juste les enfants.

import React, { useRef, useState, useCallback } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { ArrowDownward } from '@mui/icons-material';
import { isNativePlatform } from '../../utils/platform';

const THRESHOLD = 70;   // distance de declenchement (px)
const MAX_PULL = 110;   // tirage max affiche
const IS_NATIVE = isNativePlatform();

const haptic = async () => {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch { /* ignore */ }
};

export default function PullToRefresh({ onRefresh, children, disabled = false }) {
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);

  const atTop = () => {
    // Vrai si la page (ou le conteneur scrollable parent) est tout en haut.
    const el = containerRef.current;
    if (!el) return false;
    // On regarde le scroll de la fenetre (les listes scrollent la page).
    return (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
  };

  const onTouchStart = useCallback((e) => {
    if (disabled || refreshing || !IS_NATIVE) return;
    if (atTop()) startY.current = e.touches[0].clientY;
  }, [disabled, refreshing]);

  const onTouchMove = useCallback((e) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && atTop()) {
      // Resistance : on amortit le tirage.
      setPull(Math.min(MAX_PULL, dy * 0.5));
    } else {
      startY.current = null;
      setPull(0);
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (startY.current == null) return;
    const shouldRefresh = pull >= THRESHOLD;
    startY.current = null;
    if (shouldRefresh && onRefresh) {
      setRefreshing(true);
      setPull(THRESHOLD);
      haptic();
      try { await onRefresh(); } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, onRefresh]);

  // En web : pas de pull-to-refresh, on rend juste le contenu.
  if (!IS_NATIVE) return children;

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <Box
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      sx={{ position: 'relative' }}
    >
      {/* Indicateur de tirage */}
      <Box sx={{
        position: 'absolute', top: -52, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: 48, transform: `translateY(${pull}px)`,
        transition: startY.current == null ? 'transform 0.25s ease' : 'none',
        pointerEvents: 'none', zIndex: 5,
      }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'background.paper',
          boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          opacity: pull > 8 || refreshing ? 1 : 0,
        }}>
          {refreshing ? (
            <CircularProgress size={22} />
          ) : (
            <ArrowDownward sx={{
              fontSize: 22, color: 'primary.main',
              transform: `rotate(${progress >= 1 ? 180 : 0}deg)`,
              transition: 'transform 0.2s ease',
            }} />
          )}
        </Box>
      </Box>

      {/* Contenu, decale pendant le tirage */}
      <Box sx={{
        transform: `translateY(${pull}px)`,
        transition: startY.current == null ? 'transform 0.25s ease' : 'none',
      }}>
        {children}
      </Box>
    </Box>
  );
}
