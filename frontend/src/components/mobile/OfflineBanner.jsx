// Bandeau "Mode hors-ligne" affiche en haut de l'app quand il n'y a pas de
// reseau (app native). Indique a l'utilisateur qu'il consulte des donnees en
// cache. No-op en web.

import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { CloudOff } from '@mui/icons-material';
import { isNativePlatform } from '../../utils/platform';

const IS_NATIVE = isNativePlatform();

export default function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false
  );

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

  if (!IS_NATIVE || !offline) return null;

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
        Mode hors-ligne — donnees en cache
      </Typography>
    </Box>
  );
}
