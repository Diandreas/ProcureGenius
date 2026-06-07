// Bandeau d'etat hors-ligne / synchro (app native) :
// - hors-ligne : "Mode hors-ligne — donnees en cache"
// - en ligne avec des modifs en attente : "N modification(s) a synchroniser"
// No-op en web.

import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { CloudOff, CloudSync } from '@mui/icons-material';
import { isNativePlatform } from '../../utils/platform';
import { onPendingChange, syncNow } from '../../services/offline/syncEngine';

const IS_NATIVE = isNativePlatform();

export default function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false
  );
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (!IS_NATIVE) return undefined;
    const unsub = onPendingChange(setPending);
    return unsub;
  }, []);

  if (!IS_NATIVE) return null;

  // En ligne + modifs en attente : bandeau de synchro (cliquable pour relancer).
  if (!offline && pending > 0) {
    return (
      <Box
        onClick={() => syncNow()}
        sx={{
          position: 'sticky', top: 0, zIndex: 1300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 1, py: 0.75, px: 2, cursor: 'pointer',
          bgcolor: '#2563eb', color: '#fff',
          fontSize: '0.8rem', fontWeight: 600,
        }}
      >
        <CloudSync sx={{ fontSize: 18 }} />
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
          {pending} modification{pending > 1 ? 's' : ''} à synchroniser — toucher pour réessayer
        </Typography>
      </Box>
    );
  }

  if (!offline) return null;

  // Hors-ligne.
  return (
    <Box
      sx={{
        position: 'sticky', top: 0, zIndex: 1300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 1, py: 0.75, px: 2,
        bgcolor: '#5a6478', color: '#fff',
        fontSize: '0.8rem', fontWeight: 600,
      }}
    >
      <CloudOff sx={{ fontSize: 18 }} />
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
        Mode hors-ligne{pending > 0 ? ` — ${pending} en attente` : ' — données en cache'}
      </Typography>
    </Box>
  );
}
